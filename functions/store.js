/* Firestore 版的資料層。
   Code.gs 裡所有商業邏輯都只透過 readRaw_ / writeTable_ / appendRow_ / upsert_
   這四個原語碰資料，所以換掉它們就等於換掉整個底座，48 支 API 一行都不用改。

   一張工作表 = 一個 collection，一列 = 一份文件。
   文件 ID 由該表的主鍵組出來，upsert 才能是天然的 set(merge)。 */

const admin = require('firebase-admin');

const PK = {
  Config: ['key'],
  Users: ['userId'],
  Sessions: ['token'],
  Classes: ['classId'],
  Teams: ['teamId'],
  Tasks: ['taskId'],
  TeamTasks: ['teamId', 'taskId'],
  Submissions: ['subId'],
  Files: ['fileId'],
  Roster: ['rosterId'],
  Finales: ['teamId'],
  Reviews: ['revId'],
  Plans: ['teamId', 'taskId'],
  Passes: ['passId'],
  Reads: ['readId'],
  Codes: ['revId', 'coder']
};

/* Firestore 的文件 ID 不能有 / 也不能太長 */
function docId(name, row) {
  const keys = PK[name];
  if (!keys) return null;
  const parts = keys.map(k => String(row[k] === undefined || row[k] === null ? '' : row[k]));
  if (parts.some(p => p === '')) return null;
  const id = parts.join('__').replace(/[\/\.#$\[\]]/g, '_');
  return id.length > 480 ? id.slice(0, 480) : id;
}

function db() { return admin.firestore(); }

/* 版本號：跨執行個體讓快取失效。一次呼叫只讀這一份文件。 */
const VER_DOC = () => db().collection('_meta').doc('versions');

async function loadVersions() {
  const snap = await VER_DOC().get();
  return snap.exists ? (snap.data() || {}) : {};
}

async function bumpVersion(name) {
  await VER_DOC().set(
    { [name]: admin.firestore.FieldValue.increment(1) },
    { merge: true }
  );
}

/* 讀一整張表。Date 交給 Code.gs 自己格式化，這裡先還原成 JS Date。 */
async function readCollection(name, head) {
  const snap = await db().collection(name).get();
  const out = [];
  snap.forEach(doc => {
    const d = doc.data() || {};
    const row = {};
    head.forEach(k => {
      let v = d[k];
      if (v === undefined || v === null) v = '';
      else if (v && typeof v.toDate === 'function') v = v.toDate();
      row[k] = v;
    });
    row.__row = doc.id;          /* upsert_ 用得到；readTable_ 會把它濾掉 */
    out.push(row);
  });
  return out;
}

function cellOut(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return admin.firestore.Timestamp.fromDate(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function rowOut(head, r) {
  const o = {};
  head.forEach(k => { o[k] = cellOut(r[k]); });
  return o;
}

async function replaceCollection(name, head, rows) {
  const col = db().collection(name);
  const old = await col.get();
  let batch = db().batch(), n = 0;
  const flush = async () => { if (n) { await batch.commit(); batch = db().batch(); n = 0; } };
  for (const doc of old.docs) { batch.delete(doc.ref); if (++n >= 400) await flush(); }
  await flush();
  for (const r of (rows || [])) {
    const id = docId(name, r);
    batch.set(id ? col.doc(id) : col.doc(), rowOut(head, r));
    if (++n >= 400) await flush();
  }
  await flush();
  await bumpVersion(name);
}

async function appendDoc(name, head, obj) {
  const col = db().collection(name);
  const id = docId(name, obj);
  await (id ? col.doc(id) : col.doc()).set(rowOut(head, obj));
  await bumpVersion(name);
}

/* upsert：主鍵組得出 ID 就直接 merge；組不出來（少了鍵）就退回全表掃描 */
async function upsertDoc(name, head, keys, obj, existing) {
  const col = db().collection(name);
  const id = docId(name, obj);
  if (id && (PK[name] || []).join() === (keys || []).join()) {
    const snap = await col.doc(id).get();
    const merged = Object.assign({}, snap.exists ? snap.data() : {}, rowOut(head, obj));
    await col.doc(id).set(merged);
    await bumpVersion(name);
    return;
  }
  const hit = (existing || []).find(r =>
    (keys || []).every(k => String(r[k]) === String(obj[k])));
  if (!hit) { await appendDoc(name, head, obj); return; }
  const merged = Object.assign({}, hit, obj);
  delete merged.__row;
  await col.doc(String(hit.__row)).set(rowOut(head, merged));
  await bumpVersion(name);
}

module.exports = { db, PK, docId, loadVersions, bumpVersion, readCollection, replaceCollection, appendDoc, upsertDoc, rowOut };
