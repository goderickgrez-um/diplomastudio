/* ===== Marcos decorativos (unidades en mm). Cada uno declara el margen interior `pad` del contenido. ===== */
const sides = (c, W, H, i, fn) => [[i, i, 0, W - 2 * i], [W - i, i, 90, H - 2 * i], [W - i, H - i, 180, W - 2 * i], [i, H - i, 270, H - 2 * i]]
  .forEach(([x, y, a, l]) => { c.save(); c.translate(x, y); c.rotate(a * Math.PI / 180); fn(l); c.restore(); });
const corners = (c, W, H, i, fn) => [[i, i, 1, 1], [W - i, i, -1, 1], [W - i, H - i, -1, -1], [i, H - i, 1, -1]]
  .forEach(([x, y, sx, sy]) => { c.save(); c.translate(x, y); c.scale(sx, sy); fn(); c.restore(); });
const box = (c, W, H, i, lw, col) => { c.lineWidth = lw; c.strokeStyle = col; c.strokeRect(i, i, W - 2 * i, H - 2 * i); };
const dot = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
const leaf = (c, L, w) => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L / 2, -w, L, 0); c.quadraticCurveTo(L / 2, w, 0, 0); c.fill(); };
const star = (c, r, n = 8) => {
  c.beginPath();
  for (let k = 0; k < n * 2; k++) { const a = Math.PI * k / n - Math.PI / 2, q = k % 2 ? r * .4 : r; c[k ? 'lineTo' : 'moveTo'](q * Math.cos(a), q * Math.sin(a)); }
  c.closePath(); c.fill();
};
const arc = (c, r, a0 = 0, a1 = Math.PI / 2) => { c.beginPath(); c.arc(0, 0, r, a0, a1); c.stroke(); };
const line = (c, x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const along = (len, a, step, fn) => { for (let x = a, k = 0; x <= len - a + .01; x += step, k++) fn(x, k); };
const flower = (c, r, n, mid) => {
  for (let k = 0; k < n; k++) { c.save(); c.rotate(k * 2 * Math.PI / n); c.beginPath(); c.ellipse(r * .55, 0, r * .5, r * .3, 0, 0, 7); c.fill(); c.restore(); }
  c.fillStyle = mid; dot(c, 0, 0, r * .25);
};
const sprig = (c, len, step, size, fill) => {   // tallo con hojas por pares hacia adelante
  c.lineWidth = .4; line(c, 0, 0, len, 0); c.fillStyle = fill;
  for (let x = step; x < len; x += step) for (const s of [-1, 1]) { c.save(); c.translate(x, 0); c.rotate(s * .75); leaf(c, size * (1 - x / len * .4), size * .32); c.restore(); }
};
const hexPath = (c, r) => { c.beginPath(); for (let a = 0; a < 6; a++) c[a ? 'lineTo' : 'moveTo'](r * Math.cos(a * Math.PI / 3), r * Math.sin(a * Math.PI / 3)); c.closePath(); };
const cut = (c, W, H, i, k, notch) => {      // rectángulo con esquinas cortadas (recto) o con muescas cóncavas
  const P = [[i + k, i], [W - i - k, i], [W - i, i + k], [W - i, H - i - k], [W - i - k, H - i], [i + k, H - i], [i, H - i - k], [i, i + k]];
  c.beginPath();
  if (!notch) P.forEach(([x, y], n) => c[n ? 'lineTo' : 'moveTo'](x, y));
  else {
    c.moveTo(...P[0]); c.lineTo(...P[1]); c.arc(W - i, i, k, Math.PI, Math.PI / 2, true); c.lineTo(...P[3]);
    c.arc(W - i, H - i, k, -Math.PI / 2, Math.PI, true); c.lineTo(...P[5]); c.arc(i, H - i, k, 0, -Math.PI / 2, true); c.lineTo(...P[7]); c.arc(i, i, k, Math.PI / 2, 0, true);
  }
  c.closePath(); c.stroke();
};
const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], k) => c[k ? 'lineTo' : 'moveTo'](x, y)); c.closePath(); c.fill(); };

const FRAMES = {
  guilloche: { name: 'Guilloché ornamental', pad: 23, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, 1.2, c1); box(c, W, H, 8, .3, c1); box(c, W, H, 15, .3, c1); box(c, W, H, 17.5, .8, c1);
    sides(c, W, H, 11.5, len => {
      c.lineWidth = .16;
      for (let p = 0; p < 4; p++) {
        c.strokeStyle = p % 2 ? c2 : c1; c.beginPath();
        for (let x = 6; x <= len - 6; x += .3) c[x === 6 ? 'moveTo' : 'lineTo'](x, 2.6 * Math.sin(x * Math.PI / 5 + p * Math.PI / 2));
        c.stroke();
      }
    });
    corners(c, W, H, 11.5, () => {
      c.strokeStyle = c1; c.lineWidth = .4; arc(c, 5.7, 0, 7);
      c.strokeStyle = c2; c.lineWidth = .22;
      for (let q = 0; q < 2; q++) {
        c.beginPath();
        for (let a = 0; a <= 6.29; a += .03) { const r = 5 * (.6 + .4 * Math.cos(8 * a + q * Math.PI / 8)); c[a ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); }
        c.stroke();
      }
      c.fillStyle = c1; dot(c, 0, 0, 1.2);
    });
  } },
  classic: { name: 'Clásico', pad: 20, draw(c, W, H, c1, c2) {
    box(c, W, H, 8, 1.6, c1); box(c, W, H, 12, .4, c1);
    c.strokeStyle = c2; c.lineWidth = .35; c.fillStyle = c2;
    corners(c, W, H, 12, () => { [4, 7, 10].forEach(r => arc(c, r)); dot(c, 3.2, 3.2, .9); });
    sides(c, W, H, 10, len => poly(c, [[len / 2 - 3.5, 0], [len / 2, -2.2], [len / 2 + 3.5, 0], [len / 2, 2.2]]));
  } },
  serious: { name: 'Serio', pad: 18, draw(c, W, H, c1, c2) {
    box(c, W, H, 8, 1.4, c1); box(c, W, H, 11, .35, c1);
    c.fillStyle = c2; corners(c, W, H, 11, () => c.fillRect(-1.6, -1.6, 3.2, 3.2));
  } },
  fantasy: { name: 'Fantasía', pad: 22, draw(c, W, H, c1, c2) {
    box(c, W, H, 16, .4, c2);
    sides(c, W, H, 9, len => {
      c.strokeStyle = c1; c.lineWidth = .55; c.fillStyle = c2;
      const n = Math.floor((len - 30) / 6), x0 = (len - n * 6) / 2;
      for (let k = 0; k < n; k++) { c.beginPath(); c.arc(x0 + k * 6 + 3, 0, 3, Math.PI, 0, true); c.stroke(); dot(c, x0 + k * 6, 0, .5); }
      c.save(); c.translate(len / 2, 4.2); star(c, 2.2, 6); c.restore();
    });
    corners(c, W, H, 9, () => {
      c.strokeStyle = c1; c.lineWidth = .9;
      [16, 11].forEach((r, k) => { c.lineWidth = k ? .45 : .9; c.beginPath(); c.moveTo(0, r); c.bezierCurveTo(0, r * .45, r * .45, 0, r, 0); c.stroke(); });
      c.fillStyle = c2; c.save(); c.translate(6, 6); star(c, 3.6); c.restore();
    });
  } },
  vines: { name: 'Enredaderas', pad: 25, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .5, c1); box(c, W, H, 20, .3, c1);
    sides(c, W, H, 13, len => {
      c.strokeStyle = c1; c.lineWidth = .45; c.beginPath();
      for (let x = 10; x <= len - 10; x += .5) c[x === 10 ? 'moveTo' : 'lineTo'](x, 1.8 * Math.sin(x / 5));
      c.stroke();
      let k = 0;
      for (let x = 14; x < len - 12; x += 6.5, k++) {
        const up = k % 2 ? 1 : -1, y = 1.8 * Math.sin(x / 5);
        c.save(); c.translate(x, y); c.rotate(Math.atan(.36 * Math.cos(x / 5)) + up * .95); c.fillStyle = c1; c.globalAlpha = .9; leaf(c, 5.2, 1.7); c.restore();
        if (k % 3 === 2) { c.fillStyle = c2; dot(c, x, y - up * 2.4, .9); }
      }
    });
    corners(c, W, H, 13, () => {
      c.strokeStyle = c1; c.lineWidth = .5; c.beginPath();
      for (let a = 0; a <= 12.6; a += .1) { const r = .38 * a + .4; c[a ? 'lineTo' : 'moveTo'](4 + r * Math.cos(a + 3.14), 4 + r * Math.sin(a + 3.14)); }
      c.stroke(); c.fillStyle = c1;
      [.2, 1.37].forEach(a => { c.save(); c.translate(5, 5); c.rotate(a); leaf(c, 8, 2.2); c.restore(); });
      c.fillStyle = c2; dot(c, 4, 4, 1.1);
    });
  } },
  deco: { name: 'Art déco', pad: 21, draw(c, W, H, c1, c2) {
    box(c, W, H, 7, 1.2, c1); box(c, W, H, 10, .4, c2); box(c, W, H, 12.5, .4, c1);
    c.strokeStyle = c1; c.lineWidth = .4;
    corners(c, W, H, 7, () => {
      [5, 9, 13, 17].forEach(r => arc(c, r));
      for (let a = 0; a <= 90; a += 15) { const q = a * Math.PI / 180; line(c, 5 * Math.cos(q), 5 * Math.sin(q), 17 * Math.cos(q), 17 * Math.sin(q)); }
    });
    c.fillStyle = c1; sides(c, W, H, 7, len => poly(c, [[len / 2 - 9, 0], [len / 2, 5], [len / 2 + 9, 0], [len / 2, 1.2]]));
  } },
  minimal: { name: 'Minimalista', pad: 15, draw(c, W, H, c1, c2) {
    box(c, W, H, 10, .35, c1);
    c.strokeStyle = c2; c.lineWidth = 1;
    corners(c, W, H, 10, () => { c.beginPath(); c.moveTo(0, 9); c.lineTo(0, 0); c.lineTo(9, 0); c.stroke(); });
  } },
  none: { name: 'Sin marco', pad: 12, draw() {} }
};

/* --- Floral y naturaleza --- */
Object.assign(FRAMES, {
  laurel: { name: 'Laurel', pad: 22, draw(c, W, H, c1, c2) {
    box(c, W, H, 7, .9, c1); box(c, W, H, 9.5, .25, c1);
    corners(c, W, H, 12, () => {
      c.strokeStyle = c1; c.lineWidth = .4; arc(c, 14, 0, Math.PI / 2);
      for (let a = .12; a < 1.5; a += .17) for (const s of [-1, 1]) { c.save(); c.translate(14 * Math.cos(a), 14 * Math.sin(a)); c.rotate(a + Math.PI / 2 + s * .8); c.fillStyle = c1; leaf(c, 5.2, 1.6); c.restore(); }
      c.fillStyle = c2; [.4, .78, 1.16].forEach(a => dot(c, 9.5 * Math.cos(a), 9.5 * Math.sin(a), .9));
    });
  } },
  roses: { name: 'Rosas', pad: 23, draw(c, W, H, c1, c2) {
    box(c, W, H, 7, .8, c1); box(c, W, H, 10, .25, c2);
    sides(c, W, H, 13, len => { c.strokeStyle = c1; c.lineWidth = .3; line(c, 18, 0, len - 18, 0); c.fillStyle = c2; along(len, 24, 9, x => dot(c, x, 0, .7)); });
    corners(c, W, H, 13, () => {
      c.fillStyle = c1; [.25, .85, 1.35].forEach(a => { c.save(); c.rotate(a); leaf(c, 14, 3.4); c.restore(); });
      c.strokeStyle = c2; c.lineWidth = .5; [1.6, 3, 4.4, 5.8].forEach((r, k) => arc(c, r, k * 1.2, k * 1.2 + 4.6)); c.fillStyle = c2; dot(c, 0, 0, .8);
    });
  } },
  fern: { name: 'Helechos', pad: 20, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .5, c1);
    sides(c, W, H, 12, len => { c.translate(10, 0); c.strokeStyle = c1; sprig(c, len - 20, 3, 4.4, c1); });
    c.fillStyle = c2; corners(c, W, H, 12, () => dot(c, 0, 0, 1.6));
  } },
  wildflowers: { name: 'Flores silvestres', pad: 22, draw(c, W, H, c1, c2) {
    box(c, W, H, 7, .5, c1);
    sides(c, W, H, 12, len => {
      c.strokeStyle = c1; c.lineWidth = .35; line(c, 14, 0, len - 14, 0);
      along(len, 17, 13, x => { c.save(); c.translate(x, 0); c.rotate(.9); c.fillStyle = c1; leaf(c, 4, 1.2); c.restore(); });
      along(len, 24, 13, (x, k) => { c.save(); c.translate(x, 0); c.rotate(k); c.fillStyle = k % 2 ? c1 : c2; flower(c, 3.4, 5, '#fff7d6'); c.restore(); });
    });
    corners(c, W, H, 12, () => { c.fillStyle = c2; flower(c, 7, 6, c1); });
  } },
  bamboo: { name: 'Bambú', pad: 19, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .4, c2);
    sides(c, W, H, 11, len => {
      c.lineCap = 'round';
      for (let x = 6; x < len - 8; x += 22) {
        const e = Math.min(x + 19, len - 6);
        c.strokeStyle = c1; c.lineWidth = 3; line(c, x, 0, e, 0); c.strokeStyle = c2; c.lineWidth = .5; line(c, e, -1.6, e, 1.6);
      }
    });
    c.fillStyle = c2; corners(c, W, H, 11, () => [.6, 1, 1.4].forEach(a => { c.save(); c.rotate(a); leaf(c, 12, 2.2); c.restore(); }));
  } },
  olive: { name: 'Olivo', pad: 23, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .35, c1); box(c, W, H, 8, .9, c1);
    for (const s of [1, -1]) {
      c.save(); c.translate(W / 2, s > 0 ? 15 : H - 15); c.scale(1, s);
      for (const r of [0, Math.PI]) { c.save(); c.rotate(r); c.translate(4, 0); c.strokeStyle = c1; sprig(c, W / 2 - 34, 6, 6.4, c1); c.restore(); }
      c.fillStyle = c2; dot(c, 0, 0, 1.6); c.restore();
    }
  } },
});

/* --- Vintage y retro --- */
Object.assign(FRAMES, {
  postal: { name: 'Correo aéreo', pad: 21, draw(c, W, H, c1, c2) {
    c.save(); c.beginPath(); c.rect(5, 5, W - 10, H - 10); c.rect(11, 11, W - 22, H - 22); c.clip('evenodd');
    for (let x = 0; x < W + H; x += 8) { c.fillStyle = c1; poly(c, [[x, 0], [x + 3.6, 0], [x + 3.6 - H, H], [x - H, H]]); c.fillStyle = c2; poly(c, [[x + 4, 0], [x + 7.6, 0], [x + 7.6 - H, H], [x + 4 - H, H]]); }
    c.restore(); box(c, W, H, 4, .4, c1); box(c, W, H, 12.5, .4, c1);
  } },
  scallop: { name: 'Festón', pad: 20, draw(c, W, H, c1, c2) {
    box(c, W, H, 8, .5, c1); box(c, W, H, 11.5, .3, c1);
    sides(c, W, H, 5, len => { c.strokeStyle = c2; c.lineWidth = .55; for (let x = 3; x + 4 <= len - 3; x += 4) { c.beginPath(); c.arc(x + 2, 0, 2, Math.PI, 2 * Math.PI); c.stroke(); } });
    c.fillStyle = c2; corners(c, W, H, 8, () => dot(c, 0, 0, 1.5));
  } },
  ticket: { name: 'Boleto', pad: 22, draw(c, W, H, c1, c2) {
    c.strokeStyle = c1; c.lineWidth = 1; cut(c, W, H, 8, 4.5, 1);
    c.strokeStyle = c2; c.lineWidth = .4; c.setLineDash([1.2, 1.6]); cut(c, W, H, 13, 3, 1);
  } },
  oxford: { name: 'Regla Oxford', pad: 20, draw(c, W, H, c1, c2) {
    c.strokeStyle = c1; c.lineWidth = 1.6; c.strokeRect(8, 8, W - 16, H - 16);
    c.strokeStyle = c2; c.lineWidth = .35; const o = 10.6;
    line(c, 5, o, W - 5, o); line(c, 5, H - o, W - 5, H - o); line(c, o, 5, o, H - 5); line(c, W - o, 5, W - o, H - 5);
  } },
  rope: { name: 'Cuerda', pad: 20, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .4, c2); box(c, W, H, 13, .4, c2);
    sides(c, W, H, 9.5, len => { c.lineCap = 'round'; c.strokeStyle = c1; c.lineWidth = 1.1; along(len, 6, 2.1, x => line(c, x, -1.3, x + 1.2, 1.3)); });
    c.fillStyle = c2; corners(c, W, H, 9.5, () => star(c, 3.4, 5));
  } },
  atomic: { name: 'Atómico', pad: 22, draw(c, W, H, c1, c2) {
    box(c, W, H, 7, .5, c1);
    corners(c, W, H, 7, () => {
      c.strokeStyle = c2; c.lineWidth = .3; for (let a = 0; a <= 90; a += 9) { const q = a * Math.PI / 180, L = a % 18 ? 8 : 15; line(c, 0, 0, L * Math.cos(q), L * Math.sin(q)); }
      c.fillStyle = c1; c.save(); c.translate(9.5, 9.5); star(c, 4.4, 4); c.restore();
    });
    c.fillStyle = c2; sides(c, W, H, 7, len => along(len, 22, 8, x => poly(c, [[x, -1.3], [x + 1.3, 0], [x, 1.3], [x - 1.3, 0]])));
  } },
});

/* --- Infantil y lúdico --- */
Object.assign(FRAMES, {
  clouds: { name: 'Nubes', pad: 20, draw(c, W, H, c1, c2) {
    sides(c, W, H, 8, len => {
      c.strokeStyle = c1; c.lineWidth = 1;
      for (let x = 8, k = 0; x < len - 12; k++) { const r = k % 2 ? 3.2 : 4.4; c.beginPath(); c.arc(x + r, 0, r, Math.PI, 2 * Math.PI); c.stroke(); x += 2 * r; }
      c.fillStyle = c2; along(len, 14, 12, x => dot(c, x, 6, .8));
    });
    c.fillStyle = c2; corners(c, W, H, 8, () => star(c, 3, 5));
  } },
  stars: { name: 'Estrellas', pad: 20, draw(c, W, H, c1, c2) {
    c.save(); c.setLineDash([1.2, 1.6]); box(c, W, H, 12.5, .4, c2); c.restore();
    sides(c, W, H, 8, len => along(len, 16, 9, (x, k) => { c.save(); c.translate(x, 0); c.fillStyle = k % 2 ? c1 : c2; star(c, k % 2 ? 2.3 : 3.3, 5); c.restore(); }));
    c.fillStyle = c1; corners(c, W, H, 8, () => star(c, 6, 5));
  } },
  crayon: { name: 'Trazo de crayón', pad: 20, draw(c, W, H, c1, c2) {
    sides(c, W, H, 8, len => {
      c.lineCap = c.lineJoin = 'round'; c.lineWidth = 1.5; c.globalAlpha = .9;
      [[c1, 0, 0], [c2, 2.4, 2]].forEach(([col, o, s]) => {
        c.strokeStyle = col; c.beginPath();
        for (let x = 0; x <= len; x += 2) c[x ? 'lineTo' : 'moveTo'](x, o + 1.1 * Math.sin(x * .31 + s) + .6 * Math.sin(x * .83 + s * 2));
        c.stroke();
      });
    });
    c.strokeStyle = c2; c.lineWidth = .5; corners(c, W, H, 8, () => { c.save(); c.translate(7, 7); arc(c, 2.2, 0, 7); for (let a = 0; a < 8; a++) { c.rotate(Math.PI / 4); line(c, 3.4, 0, 5.2, 0); } c.restore(); });
  } },
  confetti: { name: 'Confeti', pad: 19, draw(c, W, H, c1, c2) {
    sides(c, W, H, 8, len => along(len, 6, 5, (x, k) => {
      c.save(); c.translate(x, (k % 3 - 1) * .9); c.rotate(k * 1.7); c.fillStyle = k % 2 ? c1 : c2; c.globalAlpha = k % 4 === 3 ? .55 : 1;
      if (k % 3 === 0) dot(c, 0, 0, 1.2); else if (k % 3 === 1) c.fillRect(-1, -1, 2, 2); else poly(c, [[-1.4, 1.2], [1.4, 1.2], [0, -1.4]]);
      c.restore();
    }));
    corners(c, W, H, 8, () => { c.fillStyle = c1; dot(c, 0, 0, 4); c.fillStyle = c2; dot(c, 5, 3, 2.4); dot(c, 3, 6, 1.6); });
  } },
  rainbow: { name: 'Arcoíris', pad: 22, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .6, c1);
    corners(c, W, H, 6, () => [[16, c1, 1], [13.2, c2, 1], [10.4, c1, .5], [7.6, c2, .5]].forEach(([r, col, a]) => { c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = 2.4; arc(c, r, 0, Math.PI / 2); }));
  } },
  blocks: { name: 'Bloques', pad: 20, draw(c, W, H, c1, c2) {
    box(c, W, H, 12.5, .35, c1);
    sides(c, W, H, 7, len => { c.beginPath(); along(len, 12, 7, (x, k) => { c.fillStyle = k % 3 === 1 ? c2 : c1; c.globalAlpha = k % 3 === 2 ? .55 : 1; c.beginPath(); c.roundRect(x - 2.7, -2.6, 5.4, 5.2, 1.2); c.fill(); }); });
    c.fillStyle = c2; corners(c, W, H, 7, () => { c.beginPath(); c.roundRect(-4, -4, 8, 8, 2); c.fill(); });
  } },
});

/* --- Deportivo y competencia --- */
Object.assign(FRAMES, {
  chevron: { name: 'Chevrones', pad: 20, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .5, c1);
    sides(c, W, H, 10, len => along(len, 10, 4.5, (x, k) => { c.fillStyle = k % 2 ? c1 : c2; poly(c, [[x, -2.5], [x + 2.2, 0], [x, 2.5], [x - 1.6, 2.5], [x + .6, 0], [x - 1.6, -2.5]]); }));
  } },
  chamfer: { name: 'Esquinas cortadas', pad: 20, draw(c, W, H, c1, c2) {
    c.strokeStyle = c1; c.lineWidth = 2.2; cut(c, W, H, 7, 9);
    c.strokeStyle = c2; c.lineWidth = .7; cut(c, W, H, 11.5, 9);
    c.fillStyle = c2; corners(c, W, H, 7, () => poly(c, [[2, 2], [2, 8], [8, 2]]));
  } },
  champion: { name: 'Campeón', pad: 24, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .5, c1);
    sides(c, W, H, 11, len => { c.strokeStyle = c1; c.translate(len / 2, 0); for (const r of [0, Math.PI]) { c.save(); c.rotate(r); c.translate(9, 0); sprig(c, len / 2 - 24, 5, 5.4, c1); c.restore(); } });
    c.fillStyle = c2; c.save(); c.translate(W / 2, 11); star(c, 4.4, 5); c.restore();
  } },
  checker: { name: 'Meta a cuadros', pad: 21, draw(c, W, H, c1, c2) {
    box(c, W, H, 15, .3, c1);
    sides(c, W, H, 6, len => { const n = Math.floor(len / 3), o = (len - n * 3) / 2; c.fillStyle = c1; for (let k = 0; k < n; k++) for (let r = 0; r < 2; r++) if ((k + r) % 2 === 0 && o + k * 3 >= 6 && o + k * 3 + 3 <= len - 6) c.fillRect(o + k * 3, r * 3, 3, 3); });
    c.fillStyle = c2; corners(c, W, H, 6, () => c.fillRect(0, 0, 6, 6));
  } },
  speed: { name: 'Velocidad', pad: 22, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .4, c1);
    for (const s of [0, 1]) {
      c.save(); if (s) { c.translate(W, H); c.rotate(Math.PI); }
      for (let x = 12, k = 0; x < W - 18; x += 7, k++) { c.fillStyle = k % 3 ? c1 : c2; poly(c, [[x, 8], [x + 4.4, 8], [x + 2, 13.4], [x - 2.4, 13.4]]); }
      c.restore();
    }
  } },
  hexagons: { name: 'Hexágonos', pad: 21, draw(c, W, H, c1, c2) {
    box(c, W, H, 6, .4, c1);
    sides(c, W, H, 10, len => along(len, 14, 7.5, (x, k) => { c.save(); c.translate(x, 0); hexPath(c, 3); if (k % 2) { c.fillStyle = c1; c.fill(); } else { c.strokeStyle = c2; c.lineWidth = .5; c.stroke(); } c.restore(); }));
    corners(c, W, H, 10, () => { c.strokeStyle = c1; c.lineWidth = 1; hexPath(c, 6); c.stroke(); c.fillStyle = c2; hexPath(c, 3); c.fill(); });
  } }
});

/* Galería: id de cada estilo agrupado por categoría */
const FRAME_CATS = [
  ['Clásicos y ornamentales', ['guilloche', 'classic', 'deco']],
  ['Serios y minimalistas', ['serious', 'minimal', 'none']],
  ['Fantasía', ['fantasy']],
  ['Floral y naturaleza', ['vines', 'laurel', 'roses', 'fern', 'wildflowers', 'bamboo', 'olive']],
  ['Vintage y retro', ['postal', 'scallop', 'ticket', 'oxford', 'rope', 'atomic']],
  ['Infantil y lúdico', ['clouds', 'stars', 'crayon', 'confetti', 'rainbow', 'blocks']],
  ['Deportivo y competencia', ['chevron', 'chamfer', 'champion', 'checker', 'speed', 'hexagons']]
];
