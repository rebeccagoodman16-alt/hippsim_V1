/* Extracted from Little Neural Guide modellab.js [625591:628091] — section: LOAD YOUR OWN .SWC */
/* ======================= LOAD YOUR OWN .SWC ======================= */
/** Parse an SWC file (NeuroMorpho standard) into the viewer's section format, soma-centred, apical up. */
function parseSWC(text) {
  const nodes = new Map();
  text.split(/\r?\n/).forEach(l => { l = l.trim(); if (!l || l[0] === '#') return; const p = l.split(/\s+/).map(Number); if (p.length < 7 || p.some(isNaN)) return; nodes.set(p[0], { id: p[0], t: p[1], x: p[2], y: p[3], z: p[4], r: p[5], par: p[6], kids: [] }); });
  if (!nodes.size) throw new Error('No SWC points found.');
  nodes.forEach(n => { const p = nodes.get(n.par); if (p) p.kids.push(n); });
  const typ = n => n.t === 1 ? 1 : n.t === 2 ? 2 : n.t === 4 ? 4 : 3;
  const soma = [...nodes.values()].filter(n => typ(n) === 1);
  const cx = soma.length ? soma.reduce((s, n) => s + n.x, 0) / soma.length : 0, cy = soma.length ? soma.reduce((s, n) => s + n.y, 0) / soma.length : 0, cz = soma.length ? soma.reduce((s, n) => s + n.z, 0) / soma.length : 0;
  const secs = [], stack = [];
  nodes.forEach(n => { if (typ(n) !== 1 && (!nodes.get(n.par) || typ(nodes.get(n.par)) === 1)) stack.push([n, -1, nodes.get(n.par)]); });
  while (stack.length) {
    const [n0, psec, pn] = stack.pop(), pts = [], rs = []; let cur = n0;
    if (pn && typ(pn) !== 1) { pts.push(pn.x - cx, pn.y - cy, pn.z - cz); rs.push(n0.r); }
    for (;;) { pts.push(cur.x - cx, cur.y - cy, cur.z - cz); rs.push(cur.r); if (cur.kids.length === 1 && typ(cur.kids[0]) === typ(cur)) { cur = cur.kids[0]; continue; } break; }
    if (pts.length >= 6) secs.push([typ(n0), psec, pts, rs]);
    const me = pts.length >= 6 ? secs.length - 1 : psec;
    cur.kids.forEach(k => { if (typ(k) !== 1) stack.push([k, me, cur]); });
  }
  // rotate so apical (or all dendrites) point up
  const dir = secs.filter(s => s[0] === 4).length ? 4 : 3; let vx = 0, vy = 0; secs.forEach(s => { if (s[0] === dir) for (let k = 0; k < s[2].length; k += 3) { vx += s[2][k]; vy += s[2][k + 1]; } });
  const ang = Math.atan2(vx, vy), ca = Math.cos(ang), sa = Math.sin(ang);
  if (dir === 4) secs.forEach(s => { for (let k = 0; k < s[2].length; k += 3) { const x = s[2][k], y = s[2][k + 1]; s[2][k] = ca * x - sa * y; s[2][k + 1] = sa * x + ca * y; } });
  const r0 = soma.length ? Math.max(4, Math.max(...soma.map(n => n.r))) : 6, poly = []; for (let k = 0; k < 12; k++) poly.push(r0 * Math.cos(k * Math.PI / 6), r0 * Math.sin(k * Math.PI / 6));
  return { soma: poly, sections: secs, contours: {}, npts: nodes.size };
}

