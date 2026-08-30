/* Firestore 版的資料層。
   Code.gs 裡所有商業邏輯都只透過 readRaw_ / writeTable_ / appendRow_ / upsert_
   這四個原語碰資料，所以換掉它們就等於換掉整個底座，48 支 API 一行都不用改。

   一張工作表 = 一個 collection，一列 = 一份文件。
   文件 ID 由該表的主鍵組出來，才有辦法只寫「真的改掉的那幾列」。

   併發：Apps Script 版靠 LockService 排他。這裡改用樂觀鎖——
   讀的時候記下每張表的版本號，寫回前在交易裡確認沒人動過，
   有人動過就整個請求重跑。效果一樣，但不用真的鎖住整個後端。 */

const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

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
  Codes: ['revId', 'coder'],
  Checks: ['ckId']
};

/* Firestore 文件 ID 不能有 / . # $ [ ] 也不能太長 */
function docId(name, row) {
  const keys = PK[name];
  if (!keys) return null;
  const parts = keys.map((k) => String(row[k] === undefined || row[k] === null ? '' : row[k]));
  if (parts.some((p) => p === '')) return null;
  const id = parts.join('__').replace(/[/\\.#$[\]]/g, '_');
  return id.length > 480 ? id.slice(0, 480) : id;
}

function db() { return getFirestore(); }
const verRef = () => db().collection('_meta').doc('versions');

async function loadVersions() {
  const snap = await verRef().get();
  return snap.exists ? (snap.data() || {}) : {};
}

/* 讀一整張表 */
async function readCollection(name, head) {
  const snap = await db().collection(name).get();
  const out = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const row = {};
    head.forEach((k) => {
      let v = d[k];
      if (v === undefined || v === null) v = '';
      else if (v && typeof v.toDate === 'function') v = v.toDate();   /* Timestamp → Date */
      row[k] = v;
    });
    row.__row = doc.id;
    out.push(row);
  });
  return out;
}

function cellOut(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return Timestamp.fromDate(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function rowOut(head, r) {
  const o = {};
  head.forEach((k) => { o[k] = cellOut(r[k]); });
  return o;
}

/* 比較前後兩份快照，算出真的要動的文件 */
function diff(name, head, before, after) {
  const key = (r) => docId(name, r) || ('auto__' + JSON.stringify(head.map((k) => r[k])));
  const was = new Map();
  (before || []).forEach((r) => { was.set(r.__row || key(r), r); });

  const writes = [];
  const seen = new Set();

  (after || []).forEach((r) => {
    const id = key(r);
    seen.add(id);
    const old = was.get(id);
    if (!old) { writes.push({ id, data: rowOut(head, r) }); return; }
    const changed = head.some((k) => {
      const a = old[k], b = r[k];
      if (a instanceof Date || b instanceof Date) {
        return String(a && a.getTime ? a.getTime() : a) !== String(b && b.getTime ? b.getTime() : b);
      }
      return String(a === undefined || a === null ? '' : a) !== String(b === undefined || b === null ? '' : b);
    });
    if (changed) writes.push({ id, data: rowOut(head, r) });
  });

  const deletes = [];
  was.forEach((_r, id) => { if (!seen.has(id)) deletes.push(id); });

  return { writes, deletes };
}

/**
 * 把這一次請求改掉的東西寫回去。
 * base 是讀取當下的版本號；寫之前會在交易裡確認沒人插隊。
 * 回傳 false 代表有人插隊，呼叫端應該整個請求重跑。
 */
async function commit(plans, base) {
  const names = plans.map((p) => p.name);
  if (!names.length) return true;

  const ops = plans.reduce((n, p) => n + p.writes.length + p.deletes.length, 0);

  /* 交易一次最多 500 個動作。超過的是管理端的大批操作（貼名單、清空資料），
     那些本來就只有研究者一個人在做，直接分批寫。 */
  if (ops > 400) {
    for (const p of plans) {
      let batch = db().batch(), n = 0;
      const flush = async () => { if (n) { await batch.commit(); batch = db().batch(); n = 0; } };
      for (const w of p.writes) {
        batch.set(db().collection(p.name).doc(w.id), w.data);
        if (++n >= 400) await flush();
      }
      for (const id of p.deletes) {
        batch.delete(db().collection(p.name).doc(id));
        if (++n >= 400) await flush();
      }
      await flush();
    }
    const bump = {};
    names.forEach((nm) => { bump[nm] = FieldValue.increment(1); });
    await verRef().set(bump, { merge: true });
    return true;
  }

  let clean = true;
  await db().runTransaction(async (t) => {
    clean = true;
    const snap = await t.get(verRef());
    const now = snap.exists ? (snap.data() || {}) : {};
    for (const nm of names) {
      if ((now[nm] || 0) !== (base[nm] || 0)) { clean = false; return; }
    }
    for (const p of plans) {
      p.writes.forEach((w) => { t.set(db().collection(p.name).doc(w.id), w.data); });
      p.deletes.forEach((id) => { t.delete(db().collection(p.name).doc(id)); });
    }
    const bump = {};
    names.forEach((nm) => { bump[nm] = (now[nm] || 0) + 1; });
    t.set(verRef(), bump, { merge: true });
  });
  return clean;
}

module.exports = { db, PK, docId, loadVersions, readCollection, rowOut, diff, commit };
