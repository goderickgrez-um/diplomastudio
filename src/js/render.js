/* ===== Motor de dibujo único: vista previa, PNG y PDF usan paint() ===== */
const SAMPLE = { names: ['María José Fernández Soto', 'Andrés Ignacio Rojas Pérez'], ruts: ['12.345.678-5', '15.987.654-3'] };
const sample = two => ({ ...SAMPLE, two });
let zoom = 1;

/* Imágenes: caché por contenido (data URL) */
const imgs = new Map();
const getImg = src => {
  if (!src) return null;
  let i = imgs.get(src);
  if (!i) { i = new Image(); i.onload = schedule; i.src = src; imgs.set(src, i); }
  return i.complete && i.naturalWidth ? i : null;
};
const allSrcs = () => PROJ.groups.flatMap(g => [g.bg.src, g.logo.src, ...g.sign.list.flatMap(x => [x.sig, x.seal]), ...g.layers.map(l => l.src)]).filter(Boolean);
const loadAll = () => Promise.all(allSrcs().map(s => (getImg(s), imgs.get(s).decode().catch(() => {}))));

/* Fuentes: se espera a que carguen antes de dibujar en canvas */
const fontStr = (r, sz, w = 400, it = false) => `${it ? 'italic ' : ''}${w} ${sz}px "${r.f}", serif`;
const fontJobs = new Map();
const ensureFonts = () => Promise.all([...new Set(PROJ.groups.flatMap(g => [...ROLES.map(([k]) => g.t[k].f), ...g.boxes.map(b => b.f)]))]
  .flatMap(f => [400, 700].flatMap(w => [false, true].map(it => {
    const key = `${it}${w}${f}`;
    return fontJobs.get(key) ?? fontJobs.set(key, document.fonts.load(fontStr({ f }, 16, w, it)).catch(() => {})).get(key);
  }))));

/* Texto centrado con estilo de rol; reduce el tamaño si excede maxW. Devuelve el tamaño usado (mm). */
function txt(c, s, cx, y, r, { w = 400, k = 1, ls = 0, maxW = 1e9, it = false } = {}) {
  let sz = r.s * PT * k;
  const apply = () => { c.font = fontStr(r, sz, w, it); if ('letterSpacing' in c) c.letterSpacing = ls * sz + 'px'; };
  apply();
  const m = c.measureText(s).width;
  if (m > maxW) { sz *= maxW / m; apply(); }
  c.textAlign = 'center'; c.fillStyle = r.c; c.fillText(s, cx, y);
  return sz;
}
/* Dibuja `im` contenida en la caja (x,y,mw,mh) con anclaje (ax,ay) en 0..1 */
function put(c, im, x, y, mw, mh, ax = .5, ay = .5) {
  const k = Math.min(mw / im.naturalWidth, mh / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
  c.drawImage(im, x + (mw - w) * ax, y + (mh - h) * ay, w, h);
  return h;
}

let grainPat;
function grain(c, W, H) {
  if (!grainPat) {
    const g = el('canvas', { width: 256, height: 256 }), x = g.getContext('2d'), d = x.createImageData(256, 256);
    let s = 7;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; d.data.fill(s % 256, i, i + 3); d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); grainPat = c.createPattern(g, 'repeat'); grainPat.setTransform(new DOMMatrix([.2, 0, 0, .2, 0, 0]));
  }
  c.save(); c.globalAlpha = .06; c.fillStyle = grainPat; c.fillRect(0, 0, W, H); c.restore();
}
function background(c, W, H) {
  const b = S.bg;
  c.fillStyle = b.c1;
  if (b.grad) { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, b.c1); g.addColorStop(1, b.c2); c.fillStyle = g; }
  c.fillRect(0, 0, W, H);
  const im = getImg(b.src);
  if (im) { const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); }
  if (b.grain) grain(c, W, H);
}
function layers(c, W, H, z) {
  for (const l of S.layers) {
    const im = l.on && l.z === z && getImg(l.src);
    if (!im) continue;
    const w = l.w / 100 * W, h = w * im.naturalHeight / im.naturalWidth;
    c.save(); c.globalAlpha = clamp(l.op / 100, 0, 1); c.drawImage(im, l.x / 100 * W - w / 2, l.y / 100 * H - h / 2, w, h); c.restore();
  }
}

/* Texto del diploma: tokens (palabras, espacios de nombre, saltos), líneas y flujo alrededor de cuadros */
function tokens(c, rec, maxW) {
  const base = S.t.body, toks = [];
  const measure = (s, sz, w, it, r) => { c.font = fontStr(r, sz, w, it); if ('letterSpacing' in c) c.letterSpacing = '0px'; return c.measureText(s).width; };
  for (const run of rec.two ? S.body2 : S.body) {
    if (run.br) toks.push({ br: 1 });
    else if (run.slot) {
      const n = rec.names[run.slot - 1] || '', r = S.t.name;
      let sz = r.s * PT, wd = n ? measure(n, sz, 400, false, r) : 55;
      if (wd > maxW) { sz *= maxW / wd; wd = maxW; }
      toks.push({ s: n, sz, w: 400, it: false, r, blank: !n, wd });
    } else {
      for (const p of run.t.split(/(\s+)/)) {
        if (!p) continue;
        const sz = (run.s || base.s) * PT, w = run.b ? 700 : 400, it = !!run.i;
        toks.push({ s: p, sz, w, it, r: base, sp: !p.trim(), wd: measure(p, sz, w, it, base) });
      }
    }
  }
  return toks;
}
/* Una línea que cabe en `width`, desde el token i */
function take(toks, i, width) {
  const ln = { it: [], w: 0, sz: 0 };
  for (; i < toks.length; i++) {
    const t = toks[i];
    if (t.br) { i++; break; }
    if (t.sp && !ln.it.length) continue;
    if (!t.sp && ln.w + t.wd > width && ln.it.length) break;
    ln.it.push(t); ln.w += t.wd; ln.sz = Math.max(ln.sz, t.sz);
  }
  while (ln.it.at(-1)?.sp) ln.w -= ln.it.pop().wd;
  return { ln, i };
}
/* Coloca las líneas desde y0 evitando los obstáculos {x,y,w,h}: en cada línea usa el tramo libre más ancho */
function flow(toks, cx, maxW, y0, obst) {
  const lines = [], lh0 = S.t.body.s * PT * 1.38;
  let i = 0, y = y0;
  for (let g = 0; i < toks.length && g < 600; g++) {
    let segs = [[cx - maxW / 2, cx + maxW / 2]];
    for (const o of obst) if (o.y < y + lh0 && o.y + o.h > y) segs = segs.flatMap(([a, b]) => [[a, Math.min(b, o.x)], [Math.max(a, o.x + o.w), b]]).filter(([a, b]) => b - a > 1);
    const [a, b] = segs.reduce((m, s) => s[1] - s[0] > m[1] - m[0] ? s : m, [0, 0]);
    if (b - a < Math.min(30, maxW * .4)) { y += lh0 / 2; continue; }
    const r = take(toks, i, b - a); i = r.i;
    const ln = r.ln; ln.lh = (ln.sz || S.t.body.s * PT) * 1.38; ln.x = (a + b) / 2 - ln.w / 2; ln.y = y;
    lines.push(ln); y += ln.lh;
  }
  return { lines, h: y - y0 };
}
function drawBody(c, L) {
  c.textAlign = 'left';
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  for (const l of L.lines) {
    let x = l.x; const base = l.y + l.lh * .76;
    for (const t of l.it) {
      if (t.blank) {
        c.save(); c.strokeStyle = t.r.c; c.lineWidth = .35; c.lineCap = 'round'; c.setLineDash([.5, 1.1]);
        c.beginPath(); c.moveTo(x, base + .6); c.lineTo(x + t.wd, base + .6); c.stroke(); c.restore();
      } else { c.font = fontStr(t.r, t.sz, t.w, t.it); c.fillStyle = t.r.c; c.fillText(t.s, x, base); }
      x += t.wd;
    }
  }
}

/* Cuadros de texto con fondo; admiten {nombre1} {nombre2} {rut1} {rut2} */
const fill = (t, rec) => t.replace(/\{(nombre|rut)([12])\}/gi, (_, k, n) => (k.toLowerCase() === 'nombre' ? rec.names : rec.ruts)[n - 1] || '');
function boxLayout(c, b, rec, W, H) {
  const w = b.w / 100 * W, inW = w - 2 * b.pad, sz = b.s * PT, lh = sz * 1.3, lines = [];
  c.font = fontStr(b, sz, b.b ? 700 : 400); if ('letterSpacing' in c) c.letterSpacing = '0px';
  for (const para of fill(b.text, rec).split('\n')) {
    let ln = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = ln ? ln + ' ' + word : word;
      if (ln && c.measureText(t).width > inW) { lines.push(ln); ln = word; } else ln = t;
    }
    lines.push(ln);
  }
  const h = lines.length * lh + 2 * b.pad;
  return { x: b.x / 100 * W - w / 2, y: b.y / 100 * H - h / 2, w, h, lines, sz, lh };
}
function drawBox(c, b, r) {
  if (b.bgOn) {
    c.save(); c.globalAlpha = b.bgo / 100; c.fillStyle = b.bg; c.beginPath(); c.roundRect(r.x, r.y, r.w, r.h, b.r); c.fill(); c.restore();
  }
  c.font = fontStr(b, r.sz, b.b ? 700 : 400); c.fillStyle = b.c; c.textAlign = b.al; c.textBaseline = 'alphabetic';
  const x = b.al === 'left' ? r.x + b.pad : b.al === 'right' ? r.x + r.w - b.pad : r.x + r.w / 2;
  r.lines.forEach((t, i) => c.fillText(t, x, r.y + b.pad + r.lh * i + r.lh * .76));
}

function content(c, W, H, rec, pad) {
  const T = S.t, n = S.sign.n, cx = W / 2, innerW = W - 2 * pad;
  const slotW = innerW / n, half = Math.min(slotW * .38, 40), lineY = H - pad - 12;
  const logo = getImg(S.logo.src), lw = S.logo.w;
  let top = pad + 1, bottom = lineY - 18;
  if (logo) {
    const lh = Math.min(lw, lw * logo.naturalHeight / logo.naturalWidth);
    if (S.logo.pos === 'top') { put(c, logo, cx - lw / 2, top, lw, lw, .5, 0); top += lh + 2; }
    else if (n % 2 === 0 && slotW - 2 * half >= lw + 4) put(c, logo, cx - lw / 2, lineY + 9 - lw, lw, lw, .5, 1);
    else { put(c, logo, cx - lw / 2, bottom - lw, lw, lw, .5, 1); bottom -= lh + 3; }
  }
  if (T.inst.text) top += txt(c, T.inst.text, cx, top + T.inst.s * PT, T.inst, { ls: .2, maxW: innerW }) * 1.9;
  if (T.title.text) top += txt(c, T.title.text, cx, top + T.title.s * PT * .92, T.title, { w: 700, maxW: innerW }) * 1.35;

  const boxes = S.boxes.filter(x => x.on).map(b => [b, boxLayout(c, b, rec, W, H)]);
  const obst = boxes.filter(([b]) => b.fl === 'around').map(([, r]) => ({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 }));
  for (const [b, r] of boxes) if (b.fl === 'after') top = Math.max(top, r.y + r.h + 2);
  const ruts = S.showRut ? rec.ruts.slice(0, rec.two ? 2 : 1).filter(Boolean).map(r => 'RUT ' + r).join('   ·   ') : '';
  const toks = tokens(c, rec, innerW * .8), mw = innerW * .8, rutH = ruts ? T.rut.s * PT * 2.4 : 0;
  let L = flow(toks, cx, mw, top, obst);
  const y0 = top + Math.max(0, (bottom - top - L.h - rutH) / 2);
  if (y0 > top) L = flow(toks, cx, mw, y0, obst);
  drawBody(c, L);
  if (ruts) txt(c, ruts, cx, y0 + L.h + T.rut.s * PT * 1.7, T.rut, { ls: .08, maxW: innerW });

  for (let k = 0; k < n; k++) {
    const sg = S.sign.list[k], x = pad + slotW * (k + .5), sig = getImg(sg.sig), seal = getImg(sg.seal);
    if (sig) put(c, sig, x - half * .9, lineY - 16, half * 1.8, 15, .5, 1);
    if (seal) { c.save(); c.globalAlpha = .92; put(c, seal, (sig ? x + half * .55 : x) - 12, lineY - 19, 24, 24); c.restore(); }
    c.strokeStyle = T.sign.c; c.lineWidth = .3; c.beginPath(); c.moveTo(x - half, lineY); c.lineTo(x + half, lineY); c.stroke();
    if (sg.name) txt(c, sg.name, x, lineY + 5, T.sign, { w: 700, maxW: 2 * half + 8 });
    if (sg.role) txt(c, sg.role, x, lineY + 5 + T.sign.s * PT * 1.2, T.sign, { k: .85, it: true, maxW: 2 * half + 8 });
  }
  for (const [b, r] of boxes) drawBox(c, b, r);
}

function paint(cv, rec, ppm) {
  const { w: W, h: H } = S.page, c = cv.getContext('2d');
  cv.width = Math.round(W * ppm); cv.height = Math.round(H * ppm);
  c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); c.textBaseline = 'alphabetic';
  const fr = FRAMES[S.frame.id] || FRAMES.none;
  background(c, W, H); layers(c, W, H, 'back');
  c.save(); fr.draw(c, W, H, S.frame.c1, S.frame.c2); c.restore();
  content(c, W, H, rec, fr.pad); layers(c, W, H, 'front');
}

/* Vista previa */
let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(async () => { await ensureFonts(); pending = false; drawPreview(); });
}
function drawPreview() {
  const cv = $('#cv'), wk = $('#work'), { w: W, h: H } = S.page, all = records();
  cur = clamp(cur, 0, Math.max(0, all.length - 1));
  const rec = all[cur] || sample(bodyMode === 2);
  const k = Math.max(.3, Math.min((wk.clientWidth - 24) / W, (wk.clientHeight - 24) / H)) * zoom;
  cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
  paint(cv, rec, Math.min(k * (devicePixelRatio || 1), 12));
  cv.setAttribute('aria-label', `Vista previa del diploma ${all.length ? cur + 1 : 0} de ${all.length}: ${rec.names.slice(0, rec.two ? 2 : 1).filter(Boolean).join(' y ') || 'espacio en blanco'}`);
  $('#navLbl').textContent = all.length ? `${cur + 1} / ${all.length}` : 'Ejemplo';
  $('#zoomLbl').textContent = Math.round(zoom * 100) + '%';
}
