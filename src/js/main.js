/* ===== Arranque: tema, pestañas móviles, navegación y zoom ===== */
function setTheme(t) {
  if (!['auto', 'light', 'dark'].includes(t)) t = 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
  $$('#themeSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.theme === t));
  try { localStorage.setItem('dip-theme', t); } catch { /* almacenamiento bloqueado: se usa el tema solo en esta sesión */ }
}
$('#themeSeg').onclick = e => { const b = e.target.closest('button'); if (b) setTheme(b.dataset.theme); };
$('.tabs').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  document.body.dataset.view = b.dataset.view;
  $$('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
  schedule();
};

const go = d => { const n = records().length; if (n) { cur = (cur + d + n) % n; schedule(); } };
$('#prev').onclick = () => go(-1);
$('#next').onclick = () => go(1);
$('#cv').addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else return;
  e.preventDefault();
});
const setZoom = z => { zoom = clamp(z, .25, 4); schedule(); };
$('#zIn').onclick = () => setZoom(zoom * 1.25);
$('#zOut').onclick = () => setZoom(zoom / 1.25);
$('#zFit').onclick = () => setZoom(1);

$('#pagePreset').onchange = e => { const p = PAGES[e.target.value]; if (p) { [, S.page.w, S.page.h] = p; sync(); touch(); } };
$('#btnSwap').onclick = () => { [S.page.w, S.page.h] = [S.page.h, S.page.w]; sync(); touch(); };

new ResizeObserver(schedule).observe($('#work'));
addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });

let saved = 'auto';
try { saved = localStorage.getItem('dip-theme') || 'auto'; } catch { /* sin almacenamiento */ }
setTheme(saved);
buildStatic();
rebuild();
say('Los cambios se ven al instante. Guarda el proyecto en .json para seguir trabajando después.');
