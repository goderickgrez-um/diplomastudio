/* ===== Utilidades generales ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'text') e.textContent = v;
    else if (k === 'class') e.className = v;
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...kids);
  return e;
};
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const set = (o, p, v) => { const k = p.split('.'), l = k.pop(); k.reduce((a, x) => a[x], o)[l] = v; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const PT = 25.4 / 72; // 1 pt en mm

const say = m => { $('#status').textContent = m; };
const download = (blob, name) => {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e4);
};
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-')
  .replace(/^-|-$/g, '').slice(0, 40) || 'diploma';
const readFile = (f, as) => new Promise((ok, no) => {
  const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r[as](f);
});
const pick = (accept, multiple = false) => new Promise(ok => {
  const i = el('input', { type: 'file', accept, multiple });
  i.onchange = () => ok([...i.files]); i.oncancel = () => ok([]); i.click();
});
const b64bytes = d => Uint8Array.from(atob(d.slice(d.indexOf(',') + 1)), c => c.charCodeAt(0));

/* RUT chileno: módulo 11 */
const rutDV = n => {
  let s = 0, m = 2;
  for (let i = n.length - 1; i >= 0; i--) { s += n[i] * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
};
function parseRut(raw) {
  const t = String(raw ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (t.length < 2) return { txt: String(raw ?? '').trim(), ok: !t.length };
  const body = t.slice(0, -1);
  return { txt: body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + t.slice(-1), ok: /^\d{1,8}$/.test(body) && rutDV(body) === t.slice(-1) };
}

/* CSV con comillas; detecta , ; o tabulación */
function parseCSV(t) {
  t = t.replace(/^﻿/, '');
  const first = t.split('\n')[0];
  const d = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  row.push(cur); rows.push(row);
  return rows.filter(r => r.some(x => x.trim()));
}

/* ZIP sin compresión (los PNG ya están comprimidos) */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = u => { let c = ~0; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
  for (const f of files) {
    const n = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 33, true);
    h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, n.length, true);
    parts.push(h.buffer, n, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 33, true);
    c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, n.length, true); c.setUint32(42, off, true);
    cd.push(c.buffer, n);
    off += 30 + n.length + sz;
  }
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cd.reduce((a, b) => a + b.byteLength, 0), true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cd, e.buffer], { type: 'application/zip' });
}
