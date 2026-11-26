/* ===== Estado, validación de proyectos (.json) y plantillas ===== */
const ROLES = [['inst', 'Institución'], ['title', 'Título'], ['body', 'Texto del diploma'], ['name', 'Nombre del premiado'], ['rut', 'RUT'], ['sign', 'Firmas']];
const CATS = { elegant: 'Elegantes', serious: 'Serias', classic: 'Clásicas', tech: 'Tecnológicas', lettering: 'Lettering y manuscritas', floral: 'Floral y naturaleza', vintage: 'Vintage y retro', kids: 'Infantil y lúdico', sport: 'Deportivo y competencia', custom: 'Importadas' };
const PAGES = [['A4 horizontal', 297, 210], ['Carta horizontal', 279.4, 215.9], ['A4 vertical', 210, 297], ['Carta vertical', 215.9, 279.4],
  ['Oficio horizontal', 330, 216], ['A3 horizontal', 420, 297], ['Cuadrado', 250, 250]];
const PAPERS = [['A4', 210, 297], ['Carta', 215.9, 279.4], ['Oficio', 216, 330], ['Legal', 215.9, 355.6], ['A3', 297, 420]];

const newLayer = (name = '', src = '') => ({ name, src, x: 50, y: 50, w: 40, op: 100, z: 'back', on: true });
const newSigner = (name = '', role = '') => ({ name, role, sig: '', seal: '' });
const role = (f, s, c, text) => ({ f, s, c, ...(text === undefined ? {} : { text }) });

const newBox = () => ({ on: true, text: 'Texto con {nombre1}', f: 'Cormorant Garamond', s: 14, c: '#2b2118', b: false, bgOn: true, bg: '#f3e9c6', bgo: 100, r: 2, pad: 3, al: 'center', fl: 'over', x: 50, y: 50, w: 40 });

/* Un grupo = un diseño completo + su propia lista de premiados */
const group = () => ({
  name: 'Grupo 1',
  page: { w: 297, h: 210 },
  bg: { c1: '#fbf7ec', c2: '#e9dcc0', grad: false, grain: true, src: '' },
  frame: { id: 'guilloche', c1: '#b08d3c', c2: '#7a1f2b' },
  t: {
    inst: role('Cinzel', 14, '#7a1f2b', '[NOMBRE DE LA INSTITUCIÓN]'),
    title: role('Cormorant Garamond', 46, '#2b2118', 'Diploma de Honor'),
    body: role('Cormorant Garamond', 17, '#2b2118'),
    name: role('Great Vibes', 42, '#7a1f2b'),
    rut: role('Cormorant Garamond', 11, '#2b2118'),
    sign: role('Cormorant Garamond', 12, '#2b2118')
  },
  body: [{ t: 'Se otorga el presente reconocimiento a' }, { br: 1 }, { slot: 1 }, { br: 1 }, { t: 'por su excelencia y compromiso ejemplar durante el año ' }, { t: '2026', b: 1 }, { t: '.' }],
  body2: [{ t: 'Se otorga el presente reconocimiento a' }, { br: 1 }, { slot: 1 }, { t: ' y ' }, { slot: 2 }, { br: 1 }, { t: 'por su excelencia y compromiso ejemplar durante el año ' }, { t: '2026', b: 1 }, { t: '.' }],
  list: 'María José Fernández Soto ; 12.345.678-5\nAndrés Ignacio Rojas Pérez ; 15.987.654-3',
  showRut: true,
  sign: { n: 2, list: [newSigner('[NOMBRE DEL FIRMANTE]', '[CARGO]'), newSigner('[NOMBRE DEL FIRMANTE]', '[CARGO]'), newSigner(), newSigner(), newSigner(), newSigner()] },
  logo: { src: '', pos: 'top', w: 24 },
  layers: [], boxes: []
});
const defaults = () => ({
  app: 'diplomas-studio', v: 2, cur: 0, groups: [group()], fonts: [],
  exp: { fmt: 'pdf', which: 'all', scope: 'all', dpi: 300, paper: 0, margin: 10, lossless: false }
});
const MAX_GROUPS = 30;

/* Fusiona `src` (no confiable) sobre `def`: solo claves y tipos conocidos, con límites. */
const IMG = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const COLOR = /^#[0-9a-f]{6}$/i;
function merge(def, src) {
  if (src === null || typeof src !== 'object') return def;
  const out = Array.isArray(def) ? [] : {};
  for (const k of Object.keys(def)) {
    const d = def[k], v = src[k];
    if (Array.isArray(d)) out[k] = Array.isArray(v) ? d.map((x, i) => merge(x, v[i])) : d;
    else if (d && typeof d === 'object') out[k] = merge(d, v);
    else if (typeof d === 'number') out[k] = Number.isFinite(v) ? v : d;
    else if (typeof d === 'boolean') out[k] = typeof v === 'boolean' ? v : d;
    else if (typeof v !== 'string') out[k] = d;
    else if (/^(c\d?|bg)$/.test(k)) out[k] = COLOR.test(v) ? v : d;
    else if (['src', 'sig', 'seal'].includes(k)) out[k] = v === '' || IMG.test(v) ? v : '';
    else out[k] = v.slice(0, k === 'list' ? 1e6 : 500);
  }
  return out;
}
const arr = (a, max) => (Array.isArray(a) ? a : []).slice(0, max);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const nbody = (a, max, d) => !Array.isArray(a) ? d : a.slice(0, 2000).flatMap(r => {
  if (r?.slot >= 1 && r.slot <= max) return [{ slot: r.slot }];
  if (r?.br) return [{ br: 1 }];
  if (typeof r?.t !== 'string') return [];
  const o = { t: r.t.slice(0, 2000) };
  if (Number.isFinite(r.s)) o.s = clamp(r.s, 4, 200);
  if (r.b) o.b = 1;
  if (r.i) o.i = 1;
  return [o];
});
function ngroup(src) {
  const d = group(), s = merge(d, src);
  s.name = s.name.slice(0, 60) || 'Grupo';
  s.layers = arr(src.layers, 20).map(l => merge(newLayer(), l));
  s.boxes = arr(src.boxes, 30).map(b => {
    const o = merge(newBox(), b);
    o.al = oneOf(o.al, ['left', 'center', 'right'], 'center'); o.fl = oneOf(o.fl, ['over', 'around', 'after'], 'over');
    o.s = clamp(o.s, 4, 200); o.w = clamp(o.w, 5, 100); o.r = clamp(o.r, 0, 30); o.pad = clamp(o.pad, 0, 30);
    o.bgo = clamp(o.bgo, 0, 100); o.x = clamp(o.x, -50, 150); o.y = clamp(o.y, -50, 150);
    return o;
  });
  s.body = nbody(src.body, 1, d.body); s.body2 = nbody(src.body2, 2, d.body2);
  s.sign.n = clamp(Math.round(s.sign.n), 1, 6);
  s.page.w = clamp(s.page.w, 60, 1000); s.page.h = clamp(s.page.h, 60, 1000);
  return s;
}
function normalize(src) {
  const D = defaults(), v1 = !Array.isArray(src.groups);
  const gs = v1 ? [{ ...src, ...(src.persons === 2 ? { body2: src.body, body: undefined } : {}) }] : src.groups.slice(0, MAX_GROUPS);
  const P = {
    app: D.app, v: 2, groups: gs.filter(g => g && typeof g === 'object').map(ngroup), exp: merge(D.exp, src.exp),
    fonts: arr(src.fonts, 12).filter(f => typeof f?.name === 'string' && /^data:[\w/+.-]*;base64,[A-Za-z0-9+/=]+$/.test(f.data))
      .map(f => ({ name: f.name.replace(/["\;{}<>]/g, '').slice(0, 60), data: f.data }))
  };
  if (!P.groups.length) P.groups = D.groups;
  P.cur = clamp(Math.round(Number(src.cur) || 0), 0, P.groups.length - 1);
  const x = P.exp;
  x.fmt = oneOf(x.fmt, ['pdf', 'png'], 'pdf'); x.which = oneOf(x.which, ['all', 'current', 'blank'], 'all'); x.scope = oneOf(x.scope, ['all', 'cur'], 'all');
  x.dpi = oneOf(x.dpi, [150, 300, 600], 300); x.paper = clamp(Math.round(x.paper), 0, PAPERS.length); x.margin = clamp(x.margin, 0, 50);
  return P;
}

/* Plantillas: parches que se aplican sobre el proyecto actual */
const TEMPLATES = [
  { name: 'Clásico ornamental', sw: ['#fbf7ec', '#b08d3c', '#7a1f2b'], p: {
    bg: { c1: '#fbf7ec', c2: '#e9dcc0', grad: false, grain: true }, frame: { id: 'guilloche', c1: '#b08d3c', c2: '#7a1f2b' },
    t: { inst: { f: 'Cinzel', c: '#7a1f2b' }, title: { f: 'Cormorant Garamond', c: '#2b2118' }, body: { f: 'Cormorant Garamond', c: '#2b2118' },
      name: { f: 'Great Vibes', c: '#7a1f2b' }, rut: { c: '#2b2118' }, sign: { c: '#2b2118' } } } },
  { name: 'Institucional serio', sw: ['#ffffff', '#1d3557', '#8d99ae'], p: {
    bg: { c1: '#ffffff', c2: '#e8edf3', grad: true, grain: false }, frame: { id: 'serious', c1: '#1d3557', c2: '#8d99ae' },
    t: { inst: { f: 'Libre Baskerville', c: '#1d3557' }, title: { f: 'Playfair Display', c: '#1d3557' }, body: { f: 'Lora', c: '#222222' },
      name: { f: 'Pinyon Script', c: '#1d3557' }, rut: { c: '#222222' }, sign: { c: '#222222' } } } },
  { name: 'Fantasía', sw: ['#1c1530', '#d4af37', '#8e6bd1'], p: {
    bg: { c1: '#1c1530', c2: '#342860', grad: true, grain: false }, frame: { id: 'fantasy', c1: '#d4af37', c2: '#8e6bd1' },
    t: { inst: { f: 'Cinzel Decorative', c: '#d4af37' }, title: { f: 'Cinzel Decorative', c: '#f3e9c6' }, body: { f: 'EB Garamond', c: '#f3e9c6' },
      name: { f: 'Allura', c: '#d4af37' }, rut: { c: '#f3e9c6' }, sign: { c: '#f3e9c6' } } } },
  { name: 'Enredaderas', sw: ['#f6f3e4', '#3f6b3a', '#b23a48'], p: {
    bg: { c1: '#f6f3e4', c2: '#e3ead2', grad: true, grain: true }, frame: { id: 'vines', c1: '#3f6b3a', c2: '#b23a48' },
    t: { inst: { f: 'Playfair Display', c: '#3f6b3a' }, title: { f: 'Playfair Display', c: '#2d4a2a' }, body: { f: 'EB Garamond', c: '#27331f' },
      name: { f: 'Parisienne', c: '#b23a48' }, rut: { c: '#27331f' }, sign: { c: '#27331f' } } } },
  { name: 'Art déco', sw: ['#14141a', '#d9b45a', '#f1e6c8'], p: {
    bg: { c1: '#14141a', c2: '#23232c', grad: true, grain: false }, frame: { id: 'deco', c1: '#d9b45a', c2: '#f1e6c8' },
    t: { inst: { f: 'Cinzel', c: '#d9b45a' }, title: { f: 'Cinzel', c: '#f1e6c8' }, body: { f: 'Cormorant Garamond', c: '#f1e6c8' },
      name: { f: 'Sacramento', c: '#d9b45a' }, rut: { c: '#f1e6c8' }, sign: { c: '#f1e6c8' } } } },
  { name: 'Tecnológico', sw: ['#0b1220', '#22d3ee', '#94a3b8'], p: {
    bg: { c1: '#0b1220', c2: '#16233b', grad: true, grain: false }, frame: { id: 'minimal', c1: '#22d3ee', c2: '#94a3b8' },
    t: { inst: { f: 'Orbitron', c: '#22d3ee' }, title: { f: 'Orbitron', c: '#e2e8f0' }, body: { f: 'Exo 2', c: '#e2e8f0' },
      name: { f: 'Rajdhani', c: '#22d3ee' }, rut: { c: '#94a3b8' }, sign: { c: '#e2e8f0' } } } }
  ,
  { name: 'Floral', sw: ['#f7f3ea', '#b5475f', '#4f7a45'], p: {
    bg: { c1: '#f7f3ea', c2: '#e6efd9', grad: true, grain: true }, frame: { id: 'roses', c1: '#b5475f', c2: '#4f7a45' },
    t: { inst: { f: 'Quintessential', c: '#4f7a45' }, title: { f: 'Cormorant Upright', c: '#3c5a35' }, body: { f: 'EB Garamond', c: '#2f3a2b' },
      name: { f: 'Italianno', c: '#b5475f' }, rut: { c: '#2f3a2b' }, sign: { c: '#2f3a2b' } } } },
  { name: 'Vintage', sw: ['#efe2c3', '#7a3b1e', '#b08d3c'], p: {
    bg: { c1: '#efe2c3', c2: '#d9c49a', grad: true, grain: true }, frame: { id: 'postal', c1: '#7a3b1e', c2: '#b08d3c' },
    t: { inst: { f: 'Special Elite', c: '#7a3b1e' }, title: { f: 'Abril Fatface', c: '#4a2412' }, body: { f: 'Lora', c: '#3a2a1c' },
      name: { f: 'Caveat', c: '#7a3b1e' }, rut: { c: '#3a2a1c' }, sign: { c: '#3a2a1c' } } } },
  { name: 'Infantil', sw: ['#fff8e1', '#ff7043', '#29b6f6'], p: {
    bg: { c1: '#fff8e1', c2: '#e1f5fe', grad: true, grain: false }, frame: { id: 'rainbow', c1: '#ff7043', c2: '#29b6f6' },
    t: { inst: { f: 'Baloo 2', c: '#29b6f6' }, title: { f: 'Fredoka', c: '#ff7043' }, body: { f: 'Patrick Hand', c: '#37474f' },
      name: { f: 'Pacifico', c: '#e64a19' }, rut: { c: '#37474f' }, sign: { c: '#37474f' } } } },
  { name: 'Deportivo', sw: ['#0f172a', '#f59e0b', '#ef4444'], p: {
    bg: { c1: '#0f172a', c2: '#1e293b', grad: true, grain: false }, frame: { id: 'chevron', c1: '#f59e0b', c2: '#ef4444' },
    t: { inst: { f: 'Oswald', c: '#f59e0b' }, title: { f: 'Anton', c: '#f8fafc' }, body: { f: 'Oswald', c: '#e2e8f0' },
      name: { f: 'Bebas Neue', c: '#f59e0b' }, rut: { c: '#94a3b8' }, sign: { c: '#e2e8f0' } } } }
];
const deepAssign = (t, p) => { for (const [k, v] of Object.entries(p)) v && typeof v === 'object' ? deepAssign(t[k] ??= {}, v) : (t[k] = v); };

let PROJ = defaults();   // proyecto: grupos + fuentes importadas + opciones de exportación
let S = PROJ.groups[0];  // grupo activo
let cur = 0;             // diploma mostrado en la vista previa
let bodyMode = 1;        // texto que se edita: 1 = una persona, 2 = dos personas
let dirty = false;
const root = k => /^(exp|fonts)\b/.test(k) ? PROJ : S;
const setCur = i => { PROJ.cur = i; S = PROJ.groups[i]; cur = 0; };

/* Filas de la lista → registros {names, ruts, two}; `bad` = líneas con RUT inválido.
   Una fila con Nombre 2 usa el texto de dos personas. */
function records(g = S) {
  const rows = [], bad = [];
  g.list.split(/\r?\n/).forEach((ln, i) => {
    if (!ln.trim()) return;
    const c = ln.split(/[;\t]/).map(x => x.trim()), two = !!(c[2] || c[3]);
    const r = { two, names: [c[0] || '', two ? c[2] || '' : ''] };
    r.ruts = [1, 3].map((t, j) => { if (j && !two) return ''; const p = parseRut(c[t]); if (!p.ok) bad.push(i + 1); return p.txt; });
    rows.push(r);
  });
  rows.bad = [...new Set(bad)];
  return rows;
}
