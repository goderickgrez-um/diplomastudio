/* ===== Interfaz: enlaces de datos, paneles generados y editor de texto ===== */
const touch = () => { dirty = true; schedule(); };
const fld = (label, ctrl) => el('label', {}, el('span', { text: label }), ctrl);
const input = (k, type, o = {}) => el('input', { type, 'data-k': k, ...o });

/* --- Fuentes --- */
const customFonts = new Set();
function fontOpts() {
  const f = document.createDocumentFragment(), groups = {};
  const all = [...FONTS, ...PROJ.fonts.map(x => ({ name: x.name, cat: 'custom' }))];
  for (const x of all) {
    const g = groups[x.cat] ??= f.appendChild(el('optgroup', { label: CATS[x.cat] }));
    const o = g.appendChild(el('option', { value: x.name, text: x.name }));
    o.style.fontFamily = `"${x.name}"`;
  }
  return f;
}
const refreshFontSelects = () => $$('select.font').forEach(s => { const v = s.value; s.replaceChildren(fontOpts()); s.value = v; });
async function registerFont(f) {
  if (customFonts.has(f.name)) return;
  const face = new FontFace(f.name, b64bytes(f.data).buffer);
  document.fonts.add(await face.load());
  customFonts.add(f.name);
}

/* --- Paneles generados (se reconstruyen al cargar un proyecto) --- */
function buildStatic() {
  $('#tpls').replaceChildren(...TEMPLATES.map((t, i) => {
    const b = el('button', { type: 'button', 'data-tpl': i }, el('span', { text: t.name }), el('span', { class: 'sw' }, ...t.sw.map(c => { const s = el('i'); s.style.background = c; return s; })));
    return b;
  }));
  $('#pagePreset').replaceChildren(...PAGES.map(([n, w, h], i) => el('option', { value: i, text: `${n} · ${w} × ${h} mm` })), el('option', { value: 'x', text: 'Personalizado' }));
  $('#xPaper').replaceChildren(el('option', { value: 0, text: 'Igual al tamaño del diploma' }), ...PAPERS.map(([n, w, h], i) => el('option', { value: i + 1, text: `${n} · ${w} × ${h} mm` })));
  $('#roles').replaceChildren(...ROLES.map(([k, label]) => el('fieldset', {}, el('legend', { text: label }),
    el('select', { class: 'font', 'data-k': `t.${k}.f`, 'aria-label': `Fuente de ${label}` }),
    el('div', { class: 'row' },
      input(`t.${k}.s`, 'number', { min: 4, max: 200, 'aria-label': `Tamaño de ${label} en puntos` }),
      input(`t.${k}.c`, 'color', { 'aria-label': `Color de ${label}` })))));
}
const imgBtns = (path, label) => el('div', { class: 'row' }, el('button', { type: 'button', 'data-img': path, text: label }), el('button', { type: 'button', 'data-clear': path, text: 'Quitar' }));
function buildSigners() {
  $('#signers').replaceChildren(...S.sign.list.slice(0, S.sign.n).map((_, i) => {
    const p = `sign.list.${i}`;
    return el('fieldset', {}, el('legend', { text: `Firmante ${i + 1}` }),
      fld('Nombre', input(`${p}.name`, 'text', { maxlength: 80, autocomplete: 'off' })), fld('Cargo', input(`${p}.role`, 'text', { maxlength: 80, autocomplete: 'off' })),
      imgBtns(`${p}.sig`, 'Firma (imagen)'), imgBtns(`${p}.seal`, 'Timbre / sello'));
  }));
}
function buildLayers() {
  $('#layers').replaceChildren(...S.layers.map((l, i) => {
    const p = `layers.${i}`, num = (k, label, max = 100) => fld(label, input(`${p}.${k}`, 'number', { min: 0, max }));
    return el('fieldset', {}, el('legend', { text: `${i + 1}. ${l.name || 'Capa'}` }),
      el('label', { class: 'check' }, input(`${p}.on`, 'checkbox'), 'Visible'),
      fld('Posición', el('select', { 'data-k': `${p}.z` }, el('option', { value: 'back', text: 'Detrás del texto' }), el('option', { value: 'front', text: 'Delante del texto' }))),
      el('div', { class: 'row' }, num('x', 'X (%)'), num('y', 'Y (%)'), num('w', 'Ancho (%)', 200), num('op', 'Opacidad (%)')),
      el('button', { type: 'button', 'data-del': i, text: 'Eliminar capa' }));
  }));
}

/* Galería de marcos por estilo: miniaturas redibujadas solo si cambian colores o tamaño de página */
let thumbSig = '';
function buildFrames() {
  $('#frameGal').replaceChildren(...FRAME_CATS.map(([n, ids]) => el('details', { open: ids.includes(S.frame.id) }, el('summary', { text: n }),
    el('div', { class: 'grid fr' }, ...ids.map(id => el('button', { type: 'button', 'data-frame': id, 'aria-label': FRAMES[id].name }, el('canvas', { width: 180 }), el('span', { text: FRAMES[id].name })))))));
  thumbSig = '';
}
function drawThumbs() {
  const { w: W, h: H } = S.page, sig = [S.bg.c1, S.frame.c1, S.frame.c2, W, H].join();
  if (sig === thumbSig) return;
  thumbSig = sig;
  for (const cv of $$('#frameGal canvas')) {
    const c = cv.getContext('2d'), fr = FRAMES[cv.parentElement.dataset.frame];
    cv.height = Math.round(180 * H / W); c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    c.fillStyle = S.bg.c1; c.fillRect(0, 0, W, H);
    c.save(); fr.draw(c, W, H, S.frame.c1, S.frame.c2); c.restore();
  }
}
function buildGroups() {
  $('#grpSel').replaceChildren(...PROJ.groups.map((g, i) => el('option', { value: i, text: `${i + 1}. ${g.name}` })));
  $('#grpSel').value = PROJ.cur;
}
function buildBoxes() {
  $('#boxes').replaceChildren(...S.boxes.map((b, i) => {
    const p = `boxes.${i}`, num = (k, label, min, max) => fld(label, input(`${p}.${k}`, 'number', { min, max }));
    const sel = (k, label, opts) => fld(label, el('select', { 'data-k': `${p}.${k}` }, ...opts.map(([v, t]) => el('option', { value: v, text: t }))));
    return el('fieldset', {}, el('legend', { text: `Cuadro ${i + 1}` }),
      el('label', { class: 'check' }, input(`${p}.on`, 'checkbox'), 'Visible'),
      fld('Texto (usa {nombre1} {nombre2} {rut1} {rut2})', el('textarea', { 'data-k': `${p}.text`, rows: 3, maxlength: 500, spellcheck: 'false' })),
      fld('Fuente', el('select', { class: 'font', 'data-k': `${p}.f` })),
      el('div', { class: 'row' }, num('s', 'Tamaño (pt)', 4, 200), fld('Color', input(`${p}.c`, 'color')), el('label', { class: 'check' }, input(`${p}.b`, 'checkbox'), 'Negrita')),
      el('div', { class: 'row' }, el('label', { class: 'check' }, input(`${p}.bgOn`, 'checkbox'), 'Fondo'), fld('Color de fondo', input(`${p}.bg`, 'color')), num('bgo', 'Opacidad (%)', 0, 100)),
      el('div', { class: 'row' }, num('r', 'Esquinas (mm)', 0, 30), num('pad', 'Margen (mm)', 0, 30), sel('al', 'Alineación', [['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']])),
      el('div', { class: 'row' }, num('x', 'X centro (%)', -50, 150), num('y', 'Y centro (%)', -50, 150), num('w', 'Ancho (%)', 5, 100)),
      sel('fl', 'Texto del diploma', [['over', 'Superpuesto (sin afectar el texto)'], ['around', 'Fluye alrededor del cuadro'], ['after', 'Empieza después (debajo) del cuadro']]),
      el('button', { type: 'button', 'data-delbox': i, text: 'Eliminar cuadro' }));
  }));
}

/* --- Sincronizar estado → controles --- */
function sync() {
  for (const e of $$('[data-k]')) {
    const v = get(root(e.dataset.k), e.dataset.k);
    if (e.type === 'checkbox') e.checked = !!v; else e.value = v ?? '';
  }
  for (const e of $$('[data-img]')) e.classList.toggle('has', !!get(S, e.dataset.img));
  const idx = PAGES.findIndex(([, w, h]) => w === S.page.w && h === S.page.h);
  $('#pagePreset').value = idx < 0 ? 'x' : idx;
  $('#slot2').hidden = bodyMode < 2;
  $$('[data-bm]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.bm === bodyMode));
  $$('[data-frame]').forEach(b => b.setAttribute('aria-pressed', b.dataset.frame === S.frame.id));
  drawThumbs();
  $('#xPdf').hidden = PROJ.exp.fmt !== 'pdf';
  styleEditor();
  if (document.activeElement !== ED()) $('#selSize').value = S.t.body.s;
  const r = records(), two = r.filter(x => x.two).length;
  $('#listInfo').textContent = `${r.length} diploma${r.length === 1 ? '' : 's'}` + (two ? ` (${two} con 2 personas)` : '') + (r.bad.length ? ` · RUT inválido en línea${r.bad.length > 1 ? 's' : ''}: ${r.bad.slice(0, 8).join(', ')}` : ' · RUT válidos');
}
function rebuild() { buildGroups(); buildFrames(); buildSigners(); buildLayers(); buildBoxes(); refreshFontSelects(); buildEditor(); sync(); schedule(); }

/* --- Cambios en cualquier control con data-k --- */
document.addEventListener('input', e => {
  const t = e.target, k = t.dataset?.k;
  if (!k) return;
  let v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.type === 'number' || 'num' in t.dataset) { v = parseFloat(v); if (!Number.isFinite(v)) return; if (t.min && t.max) v = clamp(v, +t.min, +t.max); }
  set(root(k), k, v);
  if (k === 'sign.n') buildSigners();
  if (k === 'name') buildGroups();
  if (['list', 'exp.fmt', 'page.w', 'page.h'].includes(k)) sync();
  touch();
});
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  try {
    if (d.img) { const [f] = await pick('image/png,image/jpeg,image/webp,image/gif,image/svg+xml'); if (f) { set(S, d.img, await readImage(f)); sync(); touch(); } }
    else if (d.clear) { set(S, d.clear, ''); sync(); touch(); }
    else if (d.tpl) { deepAssign(S, structuredClone(TEMPLATES[d.tpl].p)); sync(); touch(); say(`Plantilla «${TEMPLATES[d.tpl].name}» aplicada.`); }
    else if (d.del) { S.layers.splice(+d.del, 1); buildLayers(); sync(); touch(); }
    else if (d.delbox) { S.boxes.splice(+d.delbox, 1); buildBoxes(); refreshFontSelects(); sync(); touch(); }
    else if (d.frame) { S.frame.id = d.frame; sync(); touch(); }
    else if (d.bm) { bodyMode = +d.bm; buildEditor(); sync(); }
  } catch (err) { say(err.message); }
});

/* --- Editor de texto: el modelo (S.body) es la fuente de verdad; el DOM solo se construye con textContent --- */
const ED = () => $('#body');
const edSize = r => (r.s || S.t.body.s) / S.t.body.s + 'em';
function runNode(r) {
  if (r.br) return el('br');
  if (r.slot) return el('span', { class: 'slot', contentEditable: 'false', 'data-slot': r.slot, text: `Nombre ${r.slot}` });
  const n = el('span', { text: r.t });
  if (r.s) n.dataset.s = r.s;
  if (r.b) n.dataset.b = 1;
  if (r.i) n.dataset.i = 1;
  return n;
}
const bk = () => bodyMode === 2 ? 'body2' : 'body';
const buildEditor = () => ED().replaceChildren(...S[bk()].map(runNode));
function styleEditor() {
  for (const n of $$('span:not(.slot)', ED())) {
    n.style.fontSize = edSize({ s: +n.dataset.s });
    n.style.fontWeight = n.dataset.b ? 700 : ''; n.style.fontStyle = n.dataset.i ? 'italic' : '';
  }
  ED().style.fontFamily = `"${S.t.body.f}", serif`;
}
function readEditor() {
  const out = [];
  const walk = (node, st) => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) { if (c.data) out.push({ t: c.data, ...st }); }
      else if (c.dataset?.slot) out.push({ slot: +c.dataset.slot });
      else if (c.tagName === 'BR') out.push({ br: 1 });
      else if (c.nodeType === 1) {
        const block = /^(DIV|P)$/.test(c.tagName);
        if (block && out.length && !out.at(-1).br) out.push({ br: 1 });
        const s = { ...st };
        for (const k of 'sbi') if (k in c.dataset) { const v = +c.dataset[k]; if (v) s[k] = v; else delete s[k]; }
        walk(c, s);
      }
    }
  };
  walk(ED(), {});
  S[bk()] = out; touch();
}
let lastRange = null;
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && ED().contains(s.anchorNode)) {
    lastRange = s.getRangeAt(0).cloneRange();
    const sp = (s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode).closest?.('[data-s]');
    $('#selSize').value = sp ? sp.dataset.s : S.t.body.s;
  }
});
function selRange() {
  const s = getSelection();
  if (lastRange) { s.removeAllRanges(); s.addRange(lastRange); }
  return lastRange;
}
function wrapSelection(prop, val) {
  const r = selRange();
  if (!r || r.collapsed) { say('Selecciona primero el texto que quieres modificar.'); return; }
  const frag = r.extractContents(), w = el('span');
  w.append(frag);
  w.dataset[prop] = val;
  for (const n of $$('span:not(.slot)', w)) n.dataset[prop] = val;
  r.insertNode(w);
  getSelection().selectAllChildren(w); lastRange = getSelection().getRangeAt(0).cloneRange();
  ED().normalize(); styleEditor(); readEditor();
}
$('#tools').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
$('#tools').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const cursz = +$('#selSize').value || S.t.body.s, a = b.dataset.act;
  if (a === 'slot') {
    ED().focus();
    const r = selRange() || (() => { const x = document.createRange(); x.selectNodeContents(ED()); x.collapse(false); return x; })();
    r.deleteContents();
    const slot = runNode({ slot: +b.dataset.n });
    r.insertNode(slot); r.setStartAfter(slot); r.collapse(true);
    getSelection().removeAllRanges(); getSelection().addRange(r); lastRange = r.cloneRange();
    readEditor();
  } else if (a === 'size') wrapSelection('s', clamp(cursz + +b.dataset.d, 4, 200));
  else {
    const n = (getSelection().anchorNode?.parentElement || ED()).closest(`[data-${a}="1"]`);
    wrapSelection(a, n ? '' : 1);
  }
});
$('#selSize').addEventListener('change', e => wrapSelection('s', clamp(+e.target.value || S.t.body.s, 4, 200)));
ED().addEventListener('input', readEditor);
ED().addEventListener('paste', e => {   // solo texto plano: evita pegar HTML ajeno
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  const r = getSelection().getRangeAt(0); r.deleteContents(); r.insertNode(document.createTextNode(t)); r.collapse(false);
  readEditor();
});
