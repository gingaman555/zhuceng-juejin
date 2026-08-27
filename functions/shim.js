/* 把 Code.gs 需要的 Google Apps Script 全域，墊在 Node ＋ Firebase 上。
   只墊 Code.gs 真的用到的那些（已逐一比對過）。 */

const crypto = require('crypto');
const { getStorage } = require('firebase-admin/storage');

const TZ = 'Asia/Taipei';

/* GAS 的 Utilities.formatDate 支援的樣式，Code.gs 只用到這幾種 */
function formatDate(date, tz, pattern) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  if (p.hour === '24') p.hour = '00';
  return String(pattern || 'yyyy-MM-dd')
    .replace(/yyyy/g, p.year)
    .replace(/MM/g, p.month)
    .replace(/dd/g, p.day)
    .replace(/HH/g, p.hour)
    .replace(/mm/g, p.minute)
    .replace(/ss/g, p.second);
}

const Utilities = {
  getUuid: () => crypto.randomUUID(),
  formatDate,
  computeDigest: (_alg, value, _charset) =>
    Array.from(crypto.createHash('sha256').update(String(value), 'utf8').digest())
      .map(b => (b > 127 ? b - 256 : b)),          /* GAS 回傳有號 byte */
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  Charset: { UTF_8: 'UTF_8' },
  base64Encode: (bytes) =>
    Buffer.isBuffer(bytes) ? bytes.toString('base64')
      : Buffer.from(Uint8Array.from(bytes.map(b => (b < 0 ? b + 256 : b)))).toString('base64'),
  base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')),
  newBlob: (bytes, mime, name) => makeBlob(
    Buffer.isBuffer(bytes) ? bytes : Buffer.from(Uint8Array.from(bytes.map(b => (b < 0 ? b + 256 : b)))),
    mime, name)
};

function makeBlob(buf, mime, name) {
  return {
    _buf: buf,
    getBytes: () => Array.from(buf),
    getContentType: () => mime || 'application/octet-stream',
    getName: () => name || '未命名檔案',
    getSize: () => buf.length
  };
}

const Session = { getScriptTimeZone: () => TZ };

/* 排他：真正的互斥由 index.js 的交易負責，這裡只留介面 */
const LockService = {
  getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }),
  getDocumentLock() { return this.getScriptLock(); },
  getUserLock() { return this.getScriptLock(); }
};

/* 設定值改放 Firestore 的 _meta/props；由 index.js 在請求開始時載入 */
function makeProperties(cache, onSet) {
  const api = {
    getProperty: (k) => (k in cache ? String(cache[k]) : null),
    setProperty: (k, v) => { cache[k] = String(v); onSet(k, String(v)); return api; },
    deleteProperty: (k) => { delete cache[k]; onSet(k, null); return api; },
    getProperties: () => Object.assign({}, cache)
  };
  return api;
}

/* Cloud Storage 當 Drive 用。資料夾＝物件路徑前綴。 */
function makeDrive(pending) {
  const bucket = () => getStorage().bucket();

  function fileHandle(path, meta) {
    return {
      getId: () => path,
      getName: () => meta.name,
      getMimeType: () => meta.mime,
      getSize: () => meta.size,
      setSharing: () => fileHandle(path, meta),      /* bucket 本來就不公開 */
      setTrashed: (yes) => { if (yes !== false) pending.deletes.push(path); },
      getBlob: () => meta.blob
    };
  }

  function folder(prefix) {
    return {
      getId: () => prefix,
      createFolder: (name) => folder(prefix + safe(name) + '/'),
      getFoldersByName: (name) => {
        let used = false;
        return { hasNext: () => !used, next: () => { used = true; return folder(prefix + safe(name) + '/'); } };
      },
      createFile: (blob) => {
        const path = prefix + Date.now() + '_' + safe(blob.getName());
        pending.uploads.push({ path, buf: blob._buf, mime: blob.getContentType(), name: blob.getName() });
        return fileHandle(path, { name: blob.getName(), mime: blob.getContentType(), size: blob.getSize(), blob });
      }
    };
  }

  const safe = (s) => String(s).replace(new RegExp("[/\\\\]", 'g'), '_');

  return {
    Access: { PRIVATE: 'PRIVATE' },
    Permission: { NONE: 'NONE' },
    createFolder: (name) => folder(safe(name) + '/'),
    getFolderById: (id) => folder(String(id).replace(/\/*$/, '/')),
    getFileById: (id) => {
      const got = pending.reads[String(id)];
      if (!got) throw new Error('找不到這個檔案。');
      return fileHandle(String(id), got);
    },
    _bucket: bucket
  };
}

/* Code.gs 的 doGet/include 在 Firebase 用不到（網頁由 Hosting 送） */
const HtmlService = {
  createTemplateFromFile: () => ({ evaluate: () => htmlOut() }),
  createHtmlOutputFromFile: () => ({ getContent: () => '' }),
  XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
};
function htmlOut() {
  const o = { setTitle: () => o, addMetaTag: () => o, setXFrameOptionsMode: () => o, getContent: () => '' };
  return o;
}

const MimeType = { CSV: 'text/csv', PLAIN_TEXT: 'text/plain', JSON: 'application/json' };

module.exports = { Utilities, Session, LockService, makeProperties, makeDrive, HtmlService, MimeType, makeBlob, TZ };
