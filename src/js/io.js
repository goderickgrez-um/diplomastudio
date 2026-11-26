/* ===== Entrada/salida: imágenes, fuentes, proyectos, hojas de cálculo y exportación ===== */
async function readImage(f) {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(f.type)) throw new Error('Formato de imagen no admitido (usa PNG, JPG, WebP, GIF o SVG).');
  if (f.size > 12e6) throw new Error('La imagen supera los 12 MB.');
  return readFile(f, 'readAsDataURL');
}
const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { say(e.message || 'Ocurrió un error inesperado.'); } };
const fail = m => { throw new Error(m); };

/* Capas, fuentes y proyecto */
$('#btnLayer').onclick = guard(async () => {
  for (const f of await pick('image/png,image/jpeg,image/webp,image/gif,image/svg+xml', true)) {
    if (S.layers.length >= 20) fail('Máximo 20 capas.');
    S.layers.push(newLayer(f.name.slice(0, 40), await readImage(f)));
  }
  buildLayers(); sync(); touch();
});
$('#btnFont').onclick = guard(async () => {
  const [f] = await pick('.ttf,.otf,.woff,.woff2,font/*'); if (!f) return;
  if (f.size > 4e6) fail('La fuente supera los 4 MB.');
  if (PROJ.fonts.length >= 12) fail('Máximo 12 fuentes importadas.');
  let name = f.name.replace(/\.[^.]+$/, '').replace(/["\\;{}<>]/g, '').slice(0, 60) || 'Fuente';
  if (FONTS.some(x => x.name === name)) name += ' (importada)';
  const ft = { name, data: await readFile(f, 'readAsDataURL') };
  await registerFont(ft).catch(() => fail('El archivo no es una fuente válida.'));
  PROJ.fonts = PROJ.fonts.filter(x => x.name !== name).concat(ft);
  refreshFontSelects(); sync(); touch();
  say(`Fuente «${name}» importada: elígela en las listas de fuentes (grupo Importadas).`);
});
$('#btnSave').onclick = () => {
  const one = PROJ.groups.length === 1;
  download(new Blob([JSON.stringify(PROJ)], { type: 'application/json' }), `${one ? slug(S.t.title.text) : 'proyecto'}.diplomas.json`);
  dirty = false; say(`Proyecto guardado (${PROJ.groups.length} grupo${one ? '' : 's'}). Contiene imágenes y fuentes importadas.`);
};
$('#btnOpen').onclick = guard(async () => {
  const [f] = await pick('.json,application/json'); if (!f) return;
  let o; try { o = JSON.parse(await readFile(f, 'readAsText')); } catch { fail('El archivo no es JSON válido.'); }
  if (o?.app !== 'diplomas-studio') fail('El archivo no es un proyecto de Diplomas Studio.');
  PROJ = normalize(o); setCur(PROJ.cur);
  await Promise.all(PROJ.fonts.map(x => registerFont(x).catch(() => {})));
  rebuild(); dirty = false; say(`Proyecto «${f.name}» abierto (${PROJ.groups.length} grupo${PROJ.groups.length > 1 ? 's' : ''}).`);
});

/* Grupos: cada uno es un diseño completo con su propia lista */
const pickGroup = i => { setCur(i); rebuild(); };
$('#grpSel').onchange = e => pickGroup(+e.target.value);
const addGroup = g => {
  if (PROJ.groups.length >= MAX_GROUPS) fail(`Máximo ${MAX_GROUPS} grupos.`);
  PROJ.groups.push(g); pickGroup(PROJ.groups.length - 1); dirty = true;
};
$('#grpDup').onclick = guard(() => { const g = structuredClone(S); g.name = `${S.name} (copia)`.slice(0, 60); g.list = ''; addGroup(g); say('Grupo duplicado con el mismo diseño y textos; la lista de premiados está vacía.'); });
$('#grpNew').onclick = guard(() => { const g = group(); g.name = `Grupo ${PROJ.groups.length + 1}`; addGroup(g); });
$('#grpDel').onclick = guard(() => {
  if (PROJ.groups.length < 2) fail('Debe quedar al menos un grupo.');
  if (!confirm(`¿Eliminar el grupo «${S.name}»? No se puede deshacer.`)) return;
  PROJ.groups.splice(PROJ.cur, 1); pickGroup(Math.min(PROJ.cur, PROJ.groups.length - 1)); dirty = true;
});
$('#btnBox').onclick = guard(() => {
  if (S.boxes.length >= 30) fail('Máximo 30 cuadros de texto por grupo.');
  S.boxes.push(newBox()); buildBoxes(); refreshFontSelects(); sync(); touch();
});

/* Hojas de cálculo: Excel, CSV y Google Sheets → lista de premiados */
function applyRows(rows) {
  const head = rows.length && !rows[0].some(c => /\d/.test(c));
  if (head) rows = rows.slice(1);
  S.list = rows.map(r => { const c = Array.from({ length: 4 }, (_, i) => String(r[i] ?? '').replace(/[;\t\r\n]+/g, ' ').trim()); while (c.length > 2 && !c.at(-1)) c.pop(); return c.join(' ; '); })
    .filter(l => l.replace(/[; ]/g, '')).join('\n');
  sync(); touch();
  say(`${records().length} filas importadas${head ? ' (primera fila tomada como encabezado)' : ''}.`);
}
$('#btnSheet').onclick = guard(async () => {
  const [f] = await pick('.xlsx,.csv,.tsv,.txt,text/csv'); if (!f) return;
  if (f.size > 20e6) fail('El archivo supera los 20 MB.');
  let rows;
  try {
    if (/\.xlsx$/i.test(f.name)) { const r = await readXlsxFile(f); rows = Array.isArray(r) && r[0] && !Array.isArray(r[0]) ? r[0].data : r; }
    else rows = parseCSV(await readFile(f, 'readAsText'));
  } catch { fail('No se pudo leer el archivo. Usa .xlsx (Excel) o .csv; los .xls antiguos deben guardarse como .xlsx.'); }
  applyRows(rows.map(r => r.map(c => c ?? '')));
});
$('#btnGs').onclick = guard(async () => {
  const m = $('#gsUrl').value.trim().match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)(?:.*[#?&]gid=(\d+))?/);
  if (!m) fail('Pega un enlace de Google Sheets (https://docs.google.com/spreadsheets/d/…).');
  say('Descargando hoja…');
  try {
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${m[2] ? '&gid=' + m[2] : ''}`, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!r.ok) throw 0;
    applyRows(parseCSV(await r.text()));
  } catch { fail('No se pudo descargar. Comparte la hoja como «Cualquier persona con el enlace» o descárgala como .csv e impórtala con el botón de arriba.'); }
});

/* Exportación */
let abort = false;
$('#btnExport').onclick = () => { sync(); $('#xMsg').textContent = ''; $('#xProg').hidden = true; abort = false; $('#dlg').showModal(); };
$('#dlg').addEventListener('close', () => { abort = true; });
async function exportAll() {
  const x = PROJ.exp, ppm = x.dpi / 25.4, pdf = x.fmt === 'pdf';
  const jobs = (x.which === 'current' ? [S] : x.scope === 'cur' ? [S] : PROJ.groups).map(g => ({
    g, recs: x.which === 'blank' ? [{ names: ['', ''], ruts: ['', ''], two: false }] : x.which === 'current' ? [records(g)[cur] || sample(bodyMode === 2)] : records(g)
  })).filter(j => j.recs.length);
  const total = jobs.reduce((n, j) => n + j.recs.length, 0);
  if (!total) fail('No hay premiados en la lista.');
  if (jobs.some(j => j.g.page.w * j.g.page.h * ppm * ppm > 2.6e8)) fail('La resolución elegida es demasiado alta para el tamaño de algún diploma.');
  await Promise.all([ensureFonts(), loadAll()]);
  const prog = $('#xProg'), msg = $('#xMsg'), cv = el('canvas'), files = [], multi = jobs.length > 1, orig = S;
  prog.hidden = false; prog.max = total; prog.value = 0;
  let doc, n = 0;
  try {
    for (const [gi, { g, recs }] of jobs.entries()) {
      S = g;
      const { w: W, h: H } = g.page;
      let pw = W, ph = H;
      if (pdf && x.paper) { [pw, ph] = PAPERS[x.paper - 1].slice(1); [pw, ph] = W >= H ? [Math.max(pw, ph), Math.min(pw, ph)] : [Math.min(pw, ph), Math.max(pw, ph)]; }
      const ori = pw >= ph ? 'l' : 'p', dir = multi ? `${String(gi + 1).padStart(2, '0')}-${slug(g.name)}/` : '';
      for (const rec of recs) {
        if (abort) fail('Exportación cancelada.');
        paint(cv, rec, ppm);
        if (pdf) {
          const m = x.margin, k = Math.min((pw - 2 * m) / W, (ph - 2 * m) / H), type = x.lossless ? 'PNG' : 'JPEG';
          if (!doc) { doc = new window.jspdf.jsPDF({ orientation: ori, unit: 'mm', format: [pw, ph], compress: true }); doc.setProperties({ title: multi ? 'Diplomas' : g.t.title.text }); }
          else doc.addPage([pw, ph], ori);
          doc.addImage(cv.toDataURL('image/' + type.toLowerCase(), .95), type, (pw - W * k) / 2, (ph - H * k) / 2, W * k, H * k, undefined, 'FAST');
        } else {
          const b = await new Promise(r => cv.toBlob(r, 'image/png'));
          if (!b) fail(`El navegador no pudo generar la imagen (${cv.width} × ${cv.height} px): prueba con una resolución menor.`);
          files.push({ name: `${dir}${String(files.length - files.filter(f => !f.name.startsWith(dir)).length + 1).padStart(3, '0')}-${slug(rec.names[0] || 'diploma')}.png`, data: new Uint8Array(await b.arrayBuffer()) });
        }
        prog.value = ++n; msg.textContent = `Procesando ${n} de ${total}…`;
        await new Promise(r => setTimeout(r));
      }
    }
  } finally { S = orig; cv.width = 0; }
  const base = multi ? 'diplomas' : slug(jobs[0].g.t.title.text);
  if (pdf) download(doc.output('blob'), `${base}.pdf`);
  else if (files.length === 1) download(new Blob([files[0].data], { type: 'image/png' }), files[0].name);
  else download(zip(files), `${base}.zip`);
  msg.textContent = `Listo: ${total} diploma${total > 1 ? 's' : ''} de ${jobs.length} grupo${multi ? 's' : ''} exportado${total > 1 ? 's' : ''}.`;
}
$('#xGo').onclick = async () => {
  const b = $('#xGo'); b.disabled = true; abort = false;
  try { await exportAll(); } catch (e) { $('#xMsg').textContent = e.message || 'Error al exportar.'; $('#xProg').hidden = true; }
  b.disabled = false;
};
