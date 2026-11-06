/* Extracted from Little Neural Guide modellab.js [530491:552947] — section: HIPPOCAMPAL CELL ATLAS (3D) */
/* ===================== HIPPOCAMPAL CELL ATLAS (3D) + SIGNAL FLOW THROUGH THE NETWORK =====================
   /biology/cell-atlas/  reconstructed neurons from DG, CA3 and CA1 with their recording source and model,
                         a 3D viewer, and signal propagation through a single cell (spike or synaptic input)
   /biology/network/     a reduced spiking model of EC → DG → CA3 → CA1 with interneurons; spikes travel along
                         the real pathways with conduction delays (simulation code: hipponet.js inside modellab.js) */

/* ---------- cell metadata: what it is, where it was recorded, which model it comes from ---------- */
const MDB = id => `https://modeldb.science/${id}`;
const ATLAS = [
  { id: 'ca1-a', from: () => CA1_MORPH[0], name: 'CA1 pyramidal cell', code: 'mpg141209_A', region: 'CA1', group: 'Pyramidal & principal cells', layer: 'Soma in stratum pyramidale; basal dendrites in oriens, apical dendrite through radiatum to lacunosum-moleculare',
    species: 'Rat', how: 'Filled during whole-cell recording in hippocampal slices, imaged and traced in Neurolucida, with the layer boundaries traced too.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Data-driven multicompartment models; ion-channel densities optimised to each cell’s recordings'],
    role: 'Main output of the hippocampus. Integrates CA3 input (Schaffer collaterals, middle dendrites) with entorhinal input (distal tuft) and projects to subiculum and entorhinal cortex.', soma: 'pyr' },
  { id: 'ca1-b', from: () => CA1_MORPH[1], name: 'CA1 pyramidal cell', code: 'mpg141208_B', region: 'CA1', group: 'Pyramidal & principal cells', layer: 'As above', species: 'Rat', how: 'As above: slice recording, fill and Neurolucida tracing with traced layer boundaries.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Same workflow; compare how two cells of one type differ in branching'], role: 'A second CA1 pyramidal cell: real neurons of one type vary a lot in shape, which is why models are fitted per cell.', soma: 'pyr' },
  { id: 'ca3-cell1zr', name: 'CA3b pyramidal cell', code: 'cell1zr', region: 'CA3', group: 'Pyramidal & principal cells', layer: 'Soma in stratum pyramidale of CA3b; thorny excrescences on proximal apical dendrites receive mossy-fibre boutons in stratum lucidum',
    species: 'Rat', how: 'Recorded in acute hippocampal slices, filled and reconstructed; used to build a compartmental model of CA3b firing classes.', model: ['Hemond et al. (2008) Hippocampus 18:411–424', 101629, 'Explains regular-spiking vs bursting CA3b cells with K⁺ channel densities'],
    role: 'Receives mossy fibres from dentate granule cells and dense recurrent collaterals from other CA3 cells (thought to support pattern completion), and sends Schaffer collaterals to CA1.', soma: 'pyr' },
  { id: 'gc-3319201', name: 'Dentate granule cell', code: '3319201', region: 'DG', group: 'Pyramidal & principal cells', layer: 'Soma in the granule cell layer; dendrites fan out through the molecular layer toward the hippocampal fissure',
    species: 'Rat', how: 'Reconstructed in the Claiborne lab (Claiborne archive on NeuroMorpho.Org). Only the dendrites are traced; the axon in the model package was added by the modellers, so it is hidden here.', model: ['Beining et al. (2017) eLife 6:e26517 (T2N)', 231862, 'Granule-cell model built with the TREES toolbox and T2N, validated against rat and mouse data'], dropAxon: true,
    role: 'First stage of the trisynaptic loop. Receives perforant-path input from entorhinal layer II, fires very sparsely, and drives CA3 through powerful mossy-fibre synapses.', soma: 'gc' },
  { id: 'gc-0306', name: 'Mature dentate granule cell', code: '03.06', region: 'DG', group: 'Pyramidal & principal cells', layer: 'Granule cell layer and molecular layer', species: 'Rat', how: 'Labelled with an AAV-GFP vector, imaged and reconstructed in Beining et al. (2017). The model’s axon was added by the modellers and is hidden here.', model: ['Beining et al. (2017) eLife 6:e26517 (T2N)', 231862, 'Same granule-cell model applied across reconstructions'], dropAxon: true, role: 'A second granule cell, from a different lab and labelling method: compare dendritic length and branching with the Claiborne cell.', soma: 'gc' },
  { id: 'ca1-jarsky', name: 'CA1 pyramidal cell', code: 'Jarsky 2005 cell', region: 'CA1', group: 'Pyramidal & principal cells', layer: 'Basal dendrites in oriens; apical trunk, obliques and tuft through radiatum into lacunosum-moleculare',
    species: 'Rat', how: 'Reconstructed CA1 pyramidal neuron from the Spruston lab used in Jarsky et al. (2005). The package adds a separate model axon (not shown). Dendrites only here: the apical tree is the dendA5 subtree in the model files.', model: ['Jarsky, Roxin, Kath & Spruston (2005) Nat Neurosci 8:1667–1676', 116084, 'Shows that perforant-path dendritic spikes in the tuft reach the soma only when Schaffer input “gates” them'],
    role: 'Classic cell for the gating question: does distal entorhinal input matter on its own, or only when paired with CA3 input?', soma: 'pyr' },
  { id: 'ca1-5038804', name: 'CA1 pyramidal cell', code: 'n5038804', region: 'CA1', group: 'Pyramidal & principal cells', layer: 'Oriens, radiatum and lacunosum-moleculare; many oblique branches off the apical trunk',
    species: 'Rat', how: 'Reconstruction from the Duke–Southampton archive (Turner lab; distributed via L-Neuron / NeuroMorpho.Org), used by Migliore et al. (2005). In the model file the apical trunk and tuft are named “user5” and the obliques “apical_dendrite”; both are shown as apical here. Only a short axon stub is traced.', model: ['Migliore, Ferrante & Ascoli (2005) J Neurophysiol 94:4145–4155', 55035, 'Back- and forward-propagation of action potentials in oblique dendrites depends on local branch geometry and channels'],
    role: 'Many obliques: a good cell for seeing how branch points load the trunk and attenuate signals.', soma: 'pyr' },
  { id: 'gc-sh1', name: 'Dentate granule cell', code: 'cell 1 (Schmidt-Hieber)', region: 'DG', group: 'Pyramidal & principal cells', layer: 'Granule cell layer; dendrites through the molecular layer',
    species: 'Rat', how: 'Filled with biocytin during whole-cell recording in hippocampal slices and reconstructed (Schmidt-Hieber, Jonas & Bischofberger 2007). Dendrites only; section 0 is the soma.', model: ['Schmidt-Hieber, Jonas & Bischofberger (2007) J Neurosci 27:8430–8441', 95960, 'Passive cable models fitted to dual soma–dendrite recordings: strong dendritic attenuation, coincidence detection in the soma'],
    role: 'Fitted cable model: a good check on how much perforant-path EPSPs shrink before reaching a granule-cell soma.', soma: 'gc' },
  { id: 'gc-sh6', name: 'Dentate granule cell', code: 'cell 6 (Schmidt-Hieber)', region: 'DG', group: 'Pyramidal & principal cells', layer: 'Granule cell layer, molecular layer; proximal mossy-fibre axon',
    species: 'Rat', how: 'As cell 1, but here the proximal axon was traced too (15 axon sections, the start of the mossy fibre).', model: ['Schmidt-Hieber, Jonas & Bischofberger (2007) J Neurosci 27:8430–8441', 95960, 'Same model family'], role: 'Shows where the mossy-fibre axon leaves the soma, heading toward the hilus and CA3.', soma: 'gc' },
  { id: 'bcdg-1', name: 'DG fast-spiking basket cell', code: 'BC1 (Nörenberg)', region: 'DG', group: 'Interneurons', layer: 'Soma at the granule cell layer / hilus border; “apical” dendrites into the molecular layer, “basal” into the hilus; axon in the granule cell layer',
    species: 'Rat', how: 'Recorded and filled in hippocampal slices, traced in Neurolucida, imported with NEURON’s Import3D (Nörenberg et al. 2010). Axon fully traced (1302 sections).', model: ['Nörenberg, Hu, Vida, Bartos & Jonas (2010) PNAS 107:894–899', 140789, 'Detailed passive models: thick proximal and thin distal dendrites with non-uniform cable properties speed up activation'],
    role: 'Perisomatic inhibition of granule cells. Its dense axon in the granule cell layer is the “basket” around granule somata.', soma: 'int' },
  { id: 'pvb-1', name: 'PV fast-spiking basket cell', code: 'Somogyi_1', region: 'CA3', group: 'Interneurons', layer: 'Soma near stratum pyramidale; dendrites radial across layers; axon forms baskets around pyramidal cell somata',
    species: 'Rat', how: 'Recorded and labelled in vivo by Tukker et al. (2013), reconstructed, and shared through NeuroMorpho.Org. The model authors used the axon of one reconstruction (B13a) for all five models, so the axons shown are shared.', model: ['Tzilivaki, Kastellakis & Poirazi (2019) Nat Commun 10:3664', 237595, 'Shows that FS basket-cell dendrites integrate inputs non-linearly (“two-stage integrators”)'],
    role: 'Perisomatic inhibition of pyramidal cells; paces gamma oscillations and controls spike timing. Reduced PV-cell function is reported in some AD mouse models (Verret et al., 2012).', soma: 'int' },
  { id: 'pvb-4', name: 'PV fast-spiking basket cell', code: 'Somogyi_4', region: 'CA3', group: 'Interneurons', layer: 'As above', species: 'Rat', how: 'As above (Tukker et al., 2013, via NeuroMorpho.Org; shared axon B13a).', model: ['Tzilivaki, Kastellakis & Poirazi (2019) Nat Commun 10:3664', 237595, 'Second hippocampal FS basket-cell reconstruction from the same model package'], role: 'Compare its dendrites with Somogyi_1: same class, different shape.', soma: 'int' },
  { id: 'olm-starfish', flip: true, name: 'O-LM interneuron', code: '“Starfish”', region: 'CA1', group: 'Interneurons', layer: 'Soma and horizontal dendrites in stratum oriens; axon ascends to stratum lacunosum-moleculare',
    species: 'Mouse', how: 'Reconstructed O-LM cell from earlier work; electrophysiology from mouse O-LM cells (Lawrence et al., 2006). The reconstructions are not the same cells as the recordings.', model: ['Sekulic et al. (2015) Front Synaptic Neurosci 7:2', 182797, 'Tests where h-channels sit in O-LM dendrites using multicompartment models'],
    role: 'Feedback inhibition onto the distal tuft of pyramidal cells, where entorhinal input arrives: O-LM cells gate cortical input and are linked to theta rhythm.', soma: 'int' },
  { id: 'olm-richy', flip: true, name: 'O-LM interneuron', code: '“Richy” (axon truncated)', region: 'CA1', group: 'Interneurons', layer: 'Stratum oriens', species: 'Mouse', how: 'As above. The axon of this reconstruction is truncated.', model: ['Sekulic et al. (2015) Front Synaptic Neurosci 7:2', 182797, 'Second O-LM model cell'], role: 'Dendrites only: compare the horizontal oriens dendrites with the full Starfish reconstruction.', soma: 'int' },
  { id: 'ca1-i1', from: () => CA1_MORPH[2], name: 'CA1 interneuron', code: '060314AM2 (cNAC)', region: 'CA1', group: 'Interneurons', layer: 'CA1; dense local axon', species: 'Rat', how: 'Slice recording, fill and Neurolucida tracing.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Modelled as a continuous non-accommodating (cNAC) firing type'], role: 'Classified by firing pattern (e-type) rather than morphological type in the model paper. Most of its tracing is axon, typical of local interneurons.', soma: 'int' },
  { id: 'ca1-i2', from: () => CA1_MORPH[3], name: 'CA1 interneuron', code: '011023HP2 (bAC)', region: 'CA1', group: 'Interneurons', layer: 'CA1', species: 'Rat', how: 'Slice recording, fill and Neurolucida tracing.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Modelled as bursting accommodating (bAC)'], role: 'E-type classification: bursting accommodating.', soma: 'int' },
  { id: 'int-971114B', name: 'CA1 interneuron', code: '971114B (bAC)', region: 'CA1', group: 'Interneurons', layer: 'CA1', species: 'Rat', how: 'Slice recording, fill and Neurolucida tracing.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Bursting accommodating model'], role: 'Another bAC interneuron: compare axon extent with 011023HP2.', soma: 'int' },
  { id: 'int-980120A', name: 'CA1 interneuron', code: '980120A (cAC)', region: 'CA1', group: 'Interneurons', layer: 'CA1', species: 'Rat', how: 'Slice recording, fill and Neurolucida tracing.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Continuous accommodating model'], role: 'E-type: continuous accommodating.', soma: 'int' },
  { id: 'int-980513B', name: 'CA1 interneuron', code: '980513B (cNAC / cAC)', region: 'CA1', group: 'Interneurons', layer: 'CA1', species: 'Rat', how: 'Slice recording, fill and Neurolucida tracing.', model: ['Migliore et al. (2018) PLoS Comput Biol 14:e1006423', 244688, 'Used for both a cNAC and a cAC model'], role: 'One morphology, two firing-type models: morphology alone does not decide firing pattern.', soma: 'int' },
  { id: 'aac-schematic', name: 'Axo-axonic (chandelier) cell', code: 'illustration', region: 'CA1', group: 'Interneurons', schematic: true, layer: 'Soma at the pyramidale/oriens border; dendrites span all layers; axon forms vertical “cartridges” of boutons on pyramidal-cell axon initial segments',
    species: '—', how: 'Not a reconstruction: a drawing generated to show the characteristic cartridge axon. No chandelier-cell reconstruction could be fetched for this guide; real ones are on NeuroMorpho.Org and Hippocampome.org. The Bezaire et al. (2016) CA1 network includes axo-axonic cells with simplified geometry.', model: ['Bezaire et al. (2016) eLife 5:e18566 (full-scale CA1 network)', 187604, 'Axo-axonic cells are one of nine CA1 cell types; their connectivity is used on the network page'],
    role: 'Each axo-axonic cell contacts hundreds of pyramidal cells at the axon initial segment, the site of spike initiation, so it can veto or (debated) promote output.', soma: 'int' },
];
/** Procedurally drawn chandelier cell: radial dendrites and an axon of vertical bouton cartridges. Labelled schematic in the UI. */
function chandelierSchematic() {
  const r = mulberry(11), secs = [];
  const dend = (ang, len) => { let x = 0, y = 0, z = 0; const pts = [0, 0, 0], rs = [1.2]; const n = Math.round(len / 12); for (let k = 0; k < n; k++) { x += 12 * Math.sin(ang) + 3 * (r() - .5); y += 12 * Math.cos(ang); z += 3 * (r() - .5); pts.push(x, y, z); rs.push(Math.max(0.4, 1.2 - k * 0.03)); } secs.push([ang > Math.PI / 2 && ang < 3 * Math.PI / 2 ? 3 : 4, -1, pts, rs]); };
  [-0.25, -0.1, 0.12, 0.3].forEach(a => dend(a, 380 + 120 * r())); [Math.PI - 0.3, Math.PI, Math.PI + 0.35].forEach(a => dend(a, 130 + 40 * r()));
  // axon: descends to the pyramidale/oriens border (y ≈ −30), spreads horizontally, gives off vertical cartridges into the pyramidal layer (pyramidal AISs point down into oriens)
  secs.push([2, -1, [0, 0, 0, 0, -20, 2, 0, -30, 0], [0.5, 0.4, 0.4]]); const root = secs.length - 1;
  [-1, 1].forEach(dir => {
    let x = 0, y = -30, pts = [0, -30, 0], rs = [0.35]; for (let k = 0; k < 14; k++) { x += dir * 18; y += 4 * (r() - .5); pts.push(x, y, 6 * (r() - .5)); rs.push(0.3); }
    secs.push([2, root, pts, rs]); const trunk = secs.length - 1;
    for (let k = 1; k < 15; k++) { const bx = pts[3 * k], by = pts[3 * k + 1], c = [bx, by, 0], cr = [0.25]; for (let j = 1; j <= 6; j++) { c.push(bx + 1.5 * (r() - .5), by - 5 * j, 3 * (r() - .5)); cr.push(j % 2 ? 0.9 : 0.25); } secs.push([2, trunk, c, cr]); }
  });
  return { label: 'Axo-axonic (chandelier) cell, schematic', soma: [5, 4, 0, 7, -5, 4, -6, -3, 0, -6, 6, -3], sections: secs, contours: {} };
}
function atlasCell(m) {
  if (m._c) return m._c;
  if (m.from) m._c = m.from(); else if (m.schematic) m._c = chandelierSchematic();
  else {
    const h = HIPPO_MORPH.find(x => x.id === m.id) || NM_STORE.morph.find(x => x.id === m.id); let secs = h.sections, soma = h.soma;
    m._orig = secs.map((_, i) => i);
    if (m.crop) {   // long-range cells: keep dendrites + axon branches that start within m.crop µm of the soma (descendants of dropped branches go too)
      const keep = []; secs.forEach((s, i) => { keep[i] = s[0] !== 2 || ((s[1] < 0 || keep[s[1]]) && Math.hypot(s[2][0], s[2][1], s[2][2]) <= m.crop); });
      const idx = []; let k = 0; keep.forEach((v, i) => { idx[i] = v ? k++ : -1; }); m._orig = m._orig.filter((_, i) => keep[i]); secs = secs.filter((_, i) => keep[i]).map(s => [s[0], s[1] >= 0 ? idx[s[1]] : -1, s[2], s[3]]);
    }
    if (m.dropAxon) { const keep = secs.map(s => s[0] !== 2), idx = []; let k = 0; keep.forEach((v, i) => { idx[i] = v ? k++ : -1; }); m._orig = m._orig.filter((_, i) => keep[i]); secs = secs.filter((_, i) => keep[i]).map(s => [s[0], s[1] >= 0 ? idx[s[1]] : -1, s[2], s[3]]); }
    if (m.flip) { const f = xyz => xyz.map((v, i) => i % 3 === 2 ? v : -v); secs = secs.map(s => [s[0], s[1], f(s[2]), s[3]]); soma = soma.map(v => -v); }   // rotate 180° so the axon points toward lacunosum-moleculare (up)
    m._c = { label: m.name, soma, sections: secs, contours: {} };
  }
  return m._c;
}

/* ---------- geometry: segments, path distances, a graph for propagation ---------- */
function cellGeometry(c) {
  const segs = [], lastSeg = new Array(c.sections.length).fill(-1), len = { 2: 0, 3: 0, 4: 0 }; let maxD = 0, tips = 0, branches = 0;
  const kids = new Array(c.sections.length).fill(0); c.sections.forEach(s => { if (s[1] >= 0) kids[s[1]]++; });
  const ends = new Array(c.sections.length).fill(0), adj = [];
  c.sections.forEach((s, i) => {
    const [t, par, xyz, r] = s, n = xyz.length / 3; let d = par >= 0 ? ends[par] : 0;
    let px = xyz[0], py = xyz[1], pz = xyz[2], prev = par >= 0 ? lastSeg[par] : -1;
    if (par >= 0) { const pp = c.sections[par][2], m = pp.length; px = pp[m - 3]; py = pp[m - 2]; pz = pp[m - 1]; }
    for (let k = 0; k < n; k++) {
      const x = xyz[3 * k], y = xyz[3 * k + 1], z = xyz[3 * k + 2], L = Math.hypot(x - px, y - py, z - pz);
      if (k || par >= 0) { const id = segs.length; segs.push({ x1: px, y1: py, z1: pz, x2: x, y2: y, z2: z, r: r[k], t, d0: d, d1: d + L, L, sec: i, root: prev < 0 }); adj.push([]); if (prev >= 0) { adj[prev].push(id); adj[id].push(prev); } prev = id; d += L; len[t] += L; }
      px = x; py = y; pz = z;
    }
    lastSeg[i] = prev; ends[i] = d; if (t !== 2) { maxD = Math.max(maxD, d); if (!kids[i]) tips++; if (kids[i] > 1) branches++; }
  });
  const roots = segs.map((s, i) => s.root ? i : -1).filter(i => i >= 0);           // segments touching the soma are linked through it
  return { segs, adj, roots, len, maxD, tips, branches };
}
/** Dijkstra over the segment graph from a set of source segments (soma = all root segments). */
function pathFrom(G, sources) {
  const n = G.segs.length, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n), heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  sources.forEach(i => { dist[i] = G.segs[i].L / 2; push(dist[i], i); });
  const viaSoma = sources.some(i => G.segs[i].root);
  while (heap.length) {
    const [d, i] = pop(); if (done[i]) continue; done[i] = 1;
    const nb = G.adj[i].slice(); if (G.segs[i].root) G.roots.forEach(j => nb.push(j));
    for (const j of nb) { const nd = d + (G.segs[i].L + G.segs[j].L) / 2; if (nd < dist[j]) { dist[j] = nd; push(nd, j); } }
  }
  return { dist, viaSoma };
}

/* ---------- shared 3D drawing ---------- */
const AT_COL = { 4: '#a62962', 3: '#6f4c27', 2: 'rgba(20,17,17,.4)' };
function atProj(yaw, pitch) { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); return (x, y, z) => { const X = x * cy + z * sy, Z = -x * sy + z * cy; return [X, y * cp - Z * sp, y * sp + Z * cp]; }; }
function atDraw(cv, c, G, o) {
  const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const P = atProj(o.yaw || 0, o.pitch || 0), all = G.segs.map((s, i) => [s, i]).filter(([s]) => o.axon || s.t !== 2);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; all.forEach(([s]) => { const a = P(s.x2, s.y2, s.z2); x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, -a[1]); y1 = Math.max(y1, -a[1]); });
  const pad = o.pad ?? 24, sc = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1)), ox = w / 2 - sc * (x0 + x1) / 2, oy = h / 2 - sc * (y0 + y1) / 2;
  const X = v => ox + v * sc, Y = v => oy - v * sc;                     // +y (apical) points up the screen
  const sorted = all.map(([s, i]) => ({ s, i, a: P(s.x1, s.y1, s.z1), b: P(s.x2, s.y2, s.z2) })).sort((p, q) => (p.a[2] + p.b[2]) - (q.a[2] + q.b[2]));
  ctx.lineCap = 'round';
  sorted.forEach(({ s, i, a, b }) => {
    let col = o.mode === 'dist' ? `hsl(${330 - Math.min(1, s.d1 / Math.max(G.maxD, 1)) * 300} 60% ${s.t === 2 ? 70 : 38}%)` : AT_COL[s.t];
    let lw = Math.max(s.t === 2 ? .45 : .8, s.r * 2 * sc * (s.t === 2 ? .6 : 1));
    if (o.segCol) col = o.segCol(i, s);
    if (o.glow) { const gval = o.glow(i, s); if (gval > 0.02) { col = `rgba(237,131,176,${Math.min(1, 0.25 + gval)})`; lw = Math.max(lw, 1.5 + 3 * gval); } else if (o.glowDim) col = s.t === 2 ? 'rgba(20,17,17,.15)' : 'rgba(140,118,100,.35)'; }
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke();
  });
  const so = c.soma; if (so && so.length > 2) { ctx.fillStyle = o.somaCol || '#141111'; ctx.beginPath(); for (let i = 0; i < so.length; i += 2) { const a = P(so[i], so[i + 1], 0); i ? ctx.lineTo(X(a[0]), Y(a[1])) : ctx.moveTo(X(a[0]), Y(a[1])); } ctx.closePath(); ctx.fill(); }
  if (o.bar !== false) { const bar = 100 * sc; ctx.fillStyle = '#141111'; ctx.fillRect(w - 16 - bar, h - 14, bar, 3); ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.fillText('100 µm', w - 16, h - 19); ctx.textAlign = 'left'; }
  return { P, X, Y, sc };
}

