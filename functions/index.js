/* 逐層掘進 · Cloud Functions 後端
   ------------------------------------------------------------------
   Code.gs 一行都沒改，整份原封不動載進來跑。換掉的只有它底下那四個
   資料原語（readRaw_ / writeTable_ / appendRow_ / upsert_）與幾個
   Google Apps Script 專屬全域。

   同步 vs 非同步怎麼解：
     1. 請求進來 → 把資料表整份載成記憶體快照（版本沒變就沿用上一輪）
     2. 同步跑 Code.gs 的 API（它看到的就是一般陣列，跟在 GAS 上一樣）
     3. 寫入先進佇列，API 回傳後再批次寫回 Firestore
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const shim = require('./shim');
const store = require('./store');

admin.initializeApp();
setGlobalOptions({ region: 'asia-east1', maxInstances: 10 });

const SRC = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');

/* SHEET_DEFS 是純字面值，單獨取出來當作表格清單 */
const HEADS = (function () {
  const m = SRC.match(/var SHEET_DEFS = \{[\s\S]*?\n\};/);
  if (!m) throw new Error('Code.gs 裡找不到 SHEET_DEFS。');
  const box = vm.createContext({});
  return vm.runInContext(m[0] + '\nSHEET_DEFS;', box);
})();

const TABLES = Object.keys(HEADS);

/* ---------- 一次請求的工作單元 ---------- */

function newUnit() {
  return {
    tables: {},          /* name -> rows（含 __row） */
    dirty: {},           /* name -> true，代表要寫回 */
    props: {},
    propWrites: {},
    drive: { uploads: [], deletes: [], reads: {} },
    rows: function (name) {
      if (!this.tables[name]) this.tables[name] = [];
      return this.tables[name];
    }
  };
}

/* 執行個體層級的表格快取；版本號放在 _meta/versions，跨執行個體失效 */
const CACHE = { tables: {} };
const copy = (rows) => rows.map((r) => Object.assign({}, r));

async function loadSnapshot(unit) {
  const versions = await store.loadVersions();
  const missing = [];
  TABLES.forEach((name) => {
    const v = versions[name] || 0;
    const hit = CACHE.tables[name];
    if (hit && hit.v === v) unit.tables[name] = copy(hit.rows);
    else missing.push({ name, v });
  });
  await Promise.all(missing.map(async ({ name, v }) => {
    const rows = await store.readCollection(name, HEADS[name]);
    CACHE.tables[name] = { v, rows: copy(rows) };
    unit.tables[name] = rows;
  }));
}

/* ---------- Code.gs 的執行環境 ---------- */

function buildContext(unit) {
  const sandbox = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
    isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    Utilities: shim.Utilities,
    Session: shim.Session,
    LockService: shim.LockService,
    HtmlService: shim.HtmlService,
    MimeType: shim.MimeType,
    SpreadsheetApp: null,
    DriveApp: shim.makeDrive(unit.drive),
    PropertiesService: {
      getScriptProperties: () => shim.makeProperties(unit.props, (k, v) => { unit.propWrites[k] = v; }),
      getUserProperties() { return this.getScriptProperties(); },
      getDocumentProperties() { return this.getScriptProperties(); }
    },
    CacheService: {
      getScriptCache: () => ({
        get: () => null, getAll: () => ({}), put() {}, putAll() {}, remove() {}, removeAll() {}
      }),
      getUserCache() { return this.getScriptCache(); },
      getDocumentCache() { return this.getScriptCache(); }
    }
  };
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(SRC, ctx, { filename: 'Code.gs' });

  /* ---- 換底座 ---- */
  const gone = () => { throw new Error('Firebase 版不使用試算表。'); };
  ctx.ss_ = gone;
  ctx.sheet_ = gone;

  ctx.readRaw_ = (name) => copy(unit.rows(name));

  ctx.writeTable_ = (name, rows) => {
    unit.tables[name] = copy(rows || []);
    unit.dirty[name] = true; delete ctx.MEMO_.tables[name];
  };

  ctx.appendRow_ = (name, obj) => {
    unit.rows(name).push(Object.assign({}, obj));
    unit.dirty[name] = true; delete ctx.MEMO_.tables[name];
  };

  ctx.upsert_ = (name, keys, obj) => {
    const rows = unit.rows(name);
    const at = rows.findIndex((r) => (keys || []).every((k) => String(r[k]) === String(obj[k])));
    if (at < 0) rows.push(Object.assign({}, obj));
    else rows[at] = Object.assign({}, rows[at], obj);
    unit.dirty[name] = true; delete ctx.MEMO_.tables[name];
  };

  /* Code.gs 自己那層快取關掉，這裡由 loadSnapshot 統一管 */
  ctx.cacheGet_ = () => null;
  ctx.cachePut_ = () => {};
  /* Code.gs 的 readTable_ 有一層 MEMO_，寫入之後一定要清掉 */
  ctx.cacheBust_ = (name) => { delete ctx.MEMO_.tables[name]; };
  ctx.cacheVer_ = () => 0;
  ctx.MEMO_ = { ss: null, sheets: {}, tables: {} };

  return ctx;
}

/* ---------- 寫回 ---------- */

async function flush(unit) {
  for (const name of Object.keys(unit.dirty)) {
    const rows = unit.rows(name).map((r) => {
      const o = Object.assign({}, r);
      delete o.__row;
      return o;
    });
    await store.replaceCollection(name, HEADS[name], rows);
    delete CACHE.tables[name];
  }

  const keys = Object.keys(unit.propWrites);
  if (keys.length) {
    const patch = {};
    keys.forEach((k) => {
      patch[k] = unit.propWrites[k] === null
        ? admin.firestore.FieldValue.delete()
        : unit.propWrites[k];
    });
    await store.db().collection('_meta').doc('props').set(patch, { merge: true });
  }

  for (const up of unit.drive.uploads) {
    await admin.storage().bucket().file(up.path).save(up.buf, {
      contentType: up.mime,
      metadata: { metadata: { originalName: up.name } }
    });
  }
  for (const p of unit.drive.deletes) {
    try { await admin.storage().bucket().file(p).delete(); } catch (e) { /* 已經不在就算了 */ }
  }
}

/* 讀檔是同步的，Code.gs 跑之前要先把內容備妥 */
async function preloadFile(unit, fileId) {
  const id = String(fileId || '');
  if (!id) return;
  try {
    const f = admin.storage().bucket().file(id);
    const [buf] = await f.download();
    const [meta] = await f.getMetadata();
    const name = (meta.metadata && meta.metadata.originalName) || path.basename(id);
    unit.drive.reads[id] = {
      name,
      mime: meta.contentType || 'application/octet-stream',
      size: Number(meta.size) || buf.length,
      blob: shim.makeBlob(buf, meta.contentType, name)
    };
  } catch (e) { /* Code.gs 會自己回「找不到這個檔案」 */ }
}

/* ---------- 進入點 ---------- */

exports.api = onRequest(
  { cors: true, memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ ok: false, error: '只收 POST。' }); return; }

    const body = req.body || {};
    const name = String(body.api || '');
    const args = Array.isArray(body.args) ? body.args : [];

    if (!/^api[A-Za-z]+$/.test(name)) {
      res.status(400).json({ ok: false, error: '不認得這個呼叫。' });
      return;
    }

    try {
      const unit = newUnit();

      const propSnap = await store.db().collection('_meta').doc('props').get();
      unit.props = propSnap.exists ? Object.assign({}, propSnap.data()) : {};

      if (name === 'apiGetFile') await preloadFile(unit, args[1]);

      await loadSnapshot(unit);

      const ctx = buildContext(unit);
      const fn = ctx[name];
      if (typeof fn !== 'function') {
        res.status(404).json({ ok: false, error: '沒有這支 API。' });
        return;
      }

      const out = fn.apply(null, args);

      const wrote = Object.keys(unit.dirty).length || Object.keys(unit.propWrites).length ||
        unit.drive.uploads.length || unit.drive.deletes.length;
      if (wrote) await flush(unit);

      res.json(out === undefined ? { ok: true } : out);
    } catch (e) {
      logger.error(name, e);
      res.status(200).json({ ok: false, error: String((e && e.message) || e) });
    }
  }
);
