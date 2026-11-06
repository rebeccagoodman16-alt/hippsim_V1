/* Extracted from Little Neural Guide modellab.js [416102:451299] — section: the connectome as a graph */
/* ===================== ML FOR NEUROSCIENCE: the connectome as a graph =====================
   /ml/connectome-graph/  A real nervous system (C. elegans, 302 neurons + 95 body-wall muscles; Cook et al. 2019) as nodes and edges:
   directed weighted chemical synapses, undirected gap junctions, transmitter signs. Explore a neuron's partners, read the adjacency
   matrix, compute degree / clustering / path length / small-worldness / reciprocity / feed-forward loops against randomised graphs,
   trace sensory → muscle paths, and run a signed threshold cascade. Everything is computed live in the browser from the data. */
const CEG = { cls: { S: ['sensory', '#3d6a8c'], I: ['interneuron', '#7a3fa6'], M: ['motor', '#a62962'], B: ['body-wall muscle', '#d08a2e'], '?': ['other', '#8c7664'] } };
function ceBuild() {
  if (CEG.g) return CEG.g;
  const D = CE_NET, N = D.nodes.length, out = Array.from({ length: N }, () => []), inn = Array.from({ length: N }, () => []), gap = Array.from({ length: N }, () => []);
  D.chem.forEach(([a, b, w]) => { out[a].push([b, w]); inn[b].push([a, w]); });
  D.gap.forEach(([a, b, w]) => { gap[a].push([b, w]); gap[b].push([a, w]); });
  const sign = i => { const t = D.nodes[i][2]; return t === 'GABA' ? -1 : t === 'muscle' ? 0 : 1; };   // GABA inhibitory; ACh/others excitatory (Glu can be either: see text)
  const idx = Object.fromEntries(D.nodes.map((n, i) => [n[0], i]));
  return (CEG.g = { D, N, out, inn, gap, sign, idx });
}
/** undirected neighbour sets (chemical either direction + gap), optionally neurons only */
function ceUndirected(g, neuronsOnly = true) {
  const ok = i => g.D.nodes[i][4] && (!neuronsOnly || g.D.nodes[i][1] !== 'B'), nb = Array.from({ length: g.N }, () => new Set());
  g.D.chem.forEach(([a, b]) => { if (ok(a) && ok(b)) { nb[a].add(b); nb[b].add(a); } }); g.D.gap.forEach(([a, b]) => { if (ok(a) && ok(b)) { nb[a].add(b); nb[b].add(a); } });
  return nb.map(s => [...s]);
}
function ceMetrics(nb) {   // largest component: average clustering, characteristic path length, Brandes betweenness
  const N = nb.length, comp = new Int32Array(N).fill(-1); let best = -1, bestN = 0, c = 0;
  for (let s = 0; s < N; s++) { if (comp[s] >= 0 || !nb[s].length) continue; const q = [s]; comp[s] = c; let k = 0; while (k < q.length) { const v = q[k++]; nb[v].forEach(u => { if (comp[u] < 0) { comp[u] = c; q.push(u); } }); } if (q.length > bestN) { bestN = q.length; best = c; } c++; }
  const V = [...Array(N).keys()].filter(i => comp[i] === best), inV = new Set(V);
  let Csum = 0; V.forEach(v => { const ns = nb[v], k = ns.length; if (k < 2) return; const S = new Set(ns); let t = 0; ns.forEach(a => nb[a].forEach(b => { if (b > a && S.has(b)) t++; })); Csum += 2 * t / (k * (k - 1)); });
  let Lsum = 0, pairs = 0; const bc = new Float64Array(N);
  V.forEach(s => { const S = [], P = new Map(), sig = new Float64Array(N), d = new Int32Array(N).fill(-1); sig[s] = 1; d[s] = 0; const q = [s]; let k = 0;
    while (k < q.length) { const v = q[k++]; S.push(v); nb[v].forEach(w => { if (!inV.has(w)) return; if (d[w] < 0) { d[w] = d[v] + 1; q.push(w); } if (d[w] === d[v] + 1) { sig[w] += sig[v]; if (!P.has(w)) P.set(w, []); P.get(w).push(v); } }); }
    V.forEach(t => { if (t !== s && d[t] > 0) { Lsum += d[t]; pairs++; } });
    const del = new Float64Array(N); while (S.length) { const w = S.pop(); (P.get(w) || []).forEach(v => del[v] += sig[v] / sig[w] * (1 + del[w])); if (w !== s) bc[w] += del[w]; } });
  const n = V.length, m = V.reduce((a, v) => a + nb[v].length, 0) / 2;
  return { n, m, C: Csum / n, L: Lsum / pairs, bc: [...bc].map(b => b / ((n - 1) * (n - 2))) };
}
function ceRandom(n, m, seed) {   // Erdős–Rényi G(n, m)
  let s = seed; const r = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296, nb = Array.from({ length: n }, () => new Set()); let e = 0;
  while (e < m) { const a = Math.floor(r() * n), b = Math.floor(r() * n); if (a !== b && !nb[a].has(b)) { nb[a].add(b); nb[b].add(a); e++; } }
  return nb.map(x => [...x]);
}
function ceFFL(edges, N) {   // feed-forward loops a→b, a→c, c→b ; reciprocity
  const out = Array.from({ length: N }, () => new Set()); edges.forEach(([a, b]) => out[a].add(b)); let ffl = 0, rec = 0;
  edges.forEach(([a, b]) => { if (out[b].has(a)) rec++; out[a].forEach(c => { if (c !== b && out[c].has(b)) ffl++; }); });
  return { ffl, recip: rec / edges.length };
}
function ceSwap(edges, nSwap, seed) {   // degree-preserving rewiring (Maslov & Sneppen 2002)
  let s = seed; const r = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296, E = edges.map(e => [e[0], e[1]]), has = new Set(E.map(([a, b]) => a + ',' + b));
  for (let k = 0; k < nSwap; k++) { const i = Math.floor(r() * E.length), j = Math.floor(r() * E.length); const [a, b] = E[i], [c, d] = E[j]; if (a === d || c === b || a === c || b === d || has.has(a + ',' + d) || has.has(c + ',' + b)) continue; has.delete(a + ',' + b); has.delete(c + ',' + d); E[i] = [a, d]; E[j] = [c, b]; has.add(a + ',' + d); has.add(c + ',' + b); }
  return E;
}

const ceMLPage = {
  slug: 'connectome-graph', title: 'The connectome as a graph', level: 'Real networks',
  blurb: 'A whole nervous system as nodes and edges: the 302 neurons of C. elegans with every chemical synapse and gap junction. Explore partners, the adjacency matrix, hubs, small-worldness, motifs and sensory → muscle paths, computed live.',
  lead: 'A connectome is a graph. Each neuron is a node; each chemical synapse is a directed, weighted edge (weight = number of synapses), each gap junction an undirected edge, and the transmitter gives the edge a sign. The worm C. elegans is the only animal whose entire nervous system has been mapped in several individuals, so it is the place to learn graph ideas on real data.',
  jumps: [['cg-vocab', 'Vocabulary'], ['experiment', 'Explore the worm'], ['cg-matrix', 'Adjacency matrix'], ['cg-stats', 'Graph measures'], ['cg-path', 'Sensory → muscle'], ['cg-cascade', 'Signals on the graph'], ['cg-code', 'Python']],
  html: () => `<section class="lesson-section" id="cg-vocab"><p class="eyebrow">01 · Vocabulary</p><h2>Graph words, and what they are in a nervous system</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Graph term</th><th>In the worm</th><th>In an artificial network</th></tr></thead><tbody>
      <tr><td><b>Node</b> (vertex)</td><td>a neuron, or a muscle cell</td><td>a unit</td></tr>
      <tr><td><b>Directed, weighted edge</b></td><td>chemical synapse(s) from A to B; weight = number of synaptic contacts seen in electron micrographs</td><td>a weight W<sub>BA</sub></td></tr>
      <tr><td><b>Undirected edge</b></td><td>gap junction (electrical synapse): current flows both ways</td><td>a symmetric weight</td></tr>
      <tr><td><b>Sign</b></td><td>set by transmitter and receptor: ACh mostly excitatory, GABA inhibitory, glutamate either (glutamate-gated Cl⁻ channels inhibit)</td><td>positive or negative weight; Dale’s principle: one sign per presynaptic node</td></tr>
      <tr><td><b>In- / out-degree</b></td><td>how many neurons talk to it / it talks to</td><td>fan-in / fan-out</td></tr>
      <tr><td><b>Path length</b></td><td>fewest synapses from one neuron to another</td><td>depth</td></tr>
      <tr><td><b>Clustering</b></td><td>how often a neuron’s partners are also partners of each other</td><td>local recurrence</td></tr>
      <tr><td><b>Hub / betweenness</b></td><td>neurons that many shortest paths pass through (command interneurons AVA, AVB…)</td><td>bottleneck units</td></tr>
      <tr><td><b>Motif</b></td><td>a small wiring pattern that appears more than chance, e.g. the feed-forward loop</td><td>a reusable sub-circuit</td></tr>
      <tr><td><b>Adjacency matrix</b></td><td>A<sub>ij</sub> = synapses from neuron j to neuron i</td><td>the weight matrix W</td></tr></tbody></table></div>
      <p class="muted">Data: Cook et al. 2019 (hermaphrodite, all chemical and electrical synapses), via OpenWorm c302. Neuron classes, transmitters and receptors from OpenWorm owmeta (WormAtlas; Pereira et al. 2015; Gendrel et al. 2016; Bentley et al. 2016). Layout after Varshney et al. 2011: height = signal-flow depth (sensory at the top, muscles at the bottom), left–right = the Laplacian’s Fiedler vector.</p></section>
    <section class="lesson-section lab" id="experiment"><p class="eyebrow">02 · Interactive</p><h2>Explore the worm’s nervous system</h2>
      <p>Tap any node. Its inputs light up blue, its outputs red and its gap-junction partners green. Search by name (try <b>AVAL</b>, <b>ASHL</b>, <b>ALML</b>, <b>RIML</b>).</p>
      <div class="nv-wrap"><div class="at-stage"><canvas id="cgCv" class="nv-canvas" style="height:560px" aria-label="C. elegans connectome graph"></canvas><div id="cgInfo" class="ml-fp"></div></div>
      <div class="lab-controls nv-controls nl-ctl"><details open><summary>Find</summary><div class="control-row"><input id="cgQ" list="cgList" placeholder="neuron name" style="width:100%"><datalist id="cgList"></datalist></div></details>
        <details open><summary>Show</summary><div class="nl-chips"><label><input type="checkbox" id="cgChem" checked> chemical synapses</label><label><input type="checkbox" id="cgGap" checked> gap junctions</label><label><input type="checkbox" id="cgMus" checked> muscles</label><label><input type="checkbox" id="cgAll"> all edges (faint)</label></div>
          <div class="nl-ch"><label for="cgMin">Hide edges with fewer than … synapses</label><input type="range" id="cgMin" min="1" max="20" step="1" value="1"><output id="cgMino">1</output></div>
          <div class="control-row"><select id="cgCol"><option value="cls">colour by class</option><option value="nt">colour by transmitter</option><option value="deg">colour by degree</option></select></div></details>
        <details open><summary>Legend</summary><div id="cgLeg" class="muted"></div></details></div></div></section>
    <section class="lesson-section lab" id="cg-matrix"><p class="eyebrow">03 · The same graph as a matrix</p><h2>Adjacency matrix</h2>
      <p>Rows are targets, columns are sources (the convention of the nodes-and-edges page: W<sub>ij</sub> is from j to i). Neurons are sorted by class, then by depth. Darker = more synapses; green = gap junctions. Hover to read a pair; tap to select the source neuron.</p>
      <canvas id="cgMx" class="uth-plot" style="height:520px;max-width:560px" aria-label="Adjacency matrix"></canvas><div id="cgMxInfo" class="muted"></div></section>
    <section class="lesson-section lab" id="cg-stats"><p class="eyebrow">04 · Measures</p><h2>Is the worm’s wiring special? Compare with random graphs</h2>
      <p>Each measure is computed here from the data, then on random graphs with the same number of nodes and edges (Erdős–Rényi) or the same degree of every node (degree-preserving rewiring). A brain is “small-world” when it is clustered like a lattice but has short paths like a random graph: $\\sigma = \\dfrac{C/C_{rand}}{L/L_{rand}} > 1$.</p>
      <div class="nl-bar"><button id="cgRun">▶ Compute</button><span class="muted" id="cgSt"></span></div><div id="cgStats" class="ml-fp"></div>
      <canvas id="cgDeg" class="uth-plot" style="height:220px" aria-label="Degree distribution"></canvas></section>
    <section class="lesson-section lab" id="cg-path"><p class="eyebrow">05 · From sensation to movement</p><h2>Shortest paths from a sensory neuron to muscle</h2>
      <p>The gentle-touch circuit was worked out by laser-killing neurons (Chalfie et al. 1985): touch receptor neurons (ALM, AVM, PLM) → command interneurons (AVA, AVD for backward; PVC, AVB for forward) → motor neurons (VA/DA backward; VB/DB forward) → body-wall muscles. Ask the graph for the shortest chemical-synapse paths and compare.</p>
      <div class="control-row"><label>From <select id="cgFrom"></select></label> <label>to <select id="cgTo"><option value="VA">VA/DA (backward motor)</option><option value="muscle">any body-wall muscle</option><option value="VB">VB/DB (forward motor)</option><option value="AVA">AVA (backward command)</option></select></label> <label class="nl-inl"><input type="checkbox" id="cgW" checked> prefer strong synapses (weight = 1/synapses)</label> <label class="nl-inl"><input type="checkbox" id="cgGJ" checked> allow gap junctions</label> <button id="cgGo">Find paths</button></div>
      <div id="cgPaths" class="ml-fp"></div></section>
    <section class="lesson-section lab" id="cg-cascade"><p class="eyebrow">06 · Signals on the graph</p><h2>A signed threshold cascade</h2>
      <p>A toy dynamics on the real wiring: start with the chosen sensory neurons active; at each step a cell becomes active if the signed synapses it receives from active cells (GABA counted negative; gap junctions both ways) make up more than a set fraction of all its input synapses. Activity spreads hop by hop down the signal-flow depth. This is a teaching simplification, not a biophysical worm model (for that see c302, Gleeson et al. 2018).</p>
      <div class="control-row"><label>Start <select id="cgStart"><option value="ALML,ALMR,AVM">touch head (ALM, AVM)</option><option value="PLML,PLMR">touch tail (PLM)</option><option value="ASHL,ASHR">nociception (ASH)</option><option value="AWCL,AWCR">smell (AWC)</option><option value="AFDL,AFDR">temperature (AFD)</option></select></label>
        <div class="nl-ch"><label for="cgTh">Threshold (% of a cell’s input synapses that must be active)</label><input type="range" id="cgTh" min="2" max="60" step="1" value="15"><output id="cgTho">15</output></div><button id="cgStep">Step ▶</button><button class="secondary" id="cgPlay">▶▶ Play</button><button class="secondary" id="cgReset">Reset</button></div>
      <div id="cgCasc" class="ml-fp"></div></section>
    <section class="lesson-section" id="cg-code"><p class="eyebrow">Do it in Python</p><h2>The same analysis with NetworkX</h2><div class="code-toolbar"><span>Python 3 · pandas, networkx</span></div><pre><code>import pandas as pd, networkx as nx
url = "https://raw.githubusercontent.com/openworm/c302/master/c302/data/herm_full_edgelist.csv"
df = pd.read_csv(url, skipinitialspace=True); df.columns = [c.strip() for c in df.columns]
df["Source"], df["Target"] = df.Source.str.strip(), df.Target.str.strip()
chem = df[df.Type.str.strip() == "chemical"]
G = nx.from_pandas_edgelist(chem, "Source", "Target", edge_attr="Weight", create_using=nx.DiGraph)
print(G.number_of_nodes(), "nodes", G.number_of_edges(), "directed edges")
print("reciprocity", nx.reciprocity(G))
U = nx.Graph(G); U.add_edges_from(df[df.Type.str.strip() != "chemical"][["Source", "Target"]].values)
H = U.subgraph(max(nx.connected_components(U), key=len))
C, L = nx.average_clustering(H), nx.average_shortest_path_length(H)
R = nx.gnm_random_graph(H.number_of_nodes(), H.number_of_edges(), seed=1)
R = R.subgraph(max(nx.connected_components(R), key=len))
print(f"C = {C:.3f} vs random {nx.average_clustering(R):.3f}; L = {L:.2f} vs random {nx.average_shortest_path_length(R):.2f}")
bc = nx.betweenness_centrality(H); print(sorted(bc, key=bc.get, reverse=True)[:10])
print(nx.shortest_path(G, "ALML", "AVAL"))</code></pre>
      <p class="muted">Reference values from the build script (NetworkX on the 300-neuron component, chemical + gap): C = ${CE_NET.ref.C.toFixed(3)}, L = ${CE_NET.ref.L.toFixed(2)}, reciprocity = ${CE_NET.ref.recip.toFixed(3)}, top betweenness: ${CE_NET.ref.topBC.join(', ')}.</p></section>
    <section class="lesson-section reading"><p class="eyebrow">Sources</p><h2>Papers and data</h2><ol class="gf-refs"><li>White JG, Southgate E, Thomson JN, Brenner S (1986). The structure of the nervous system of <i>C. elegans</i>. <i>Phil Trans R Soc B</i> 314:1–340.</li><li>Varshney LR, Chen BL, Paniagua E, Hall DH, Chklovskii DB (2011). Structural properties of the <i>C. elegans</i> neuronal network. <i>PLoS Comput Biol</i> 7:e1001066.</li><li>Cook SJ et al. (2019). Whole-animal connectomes of both <i>C. elegans</i> sexes. <i>Nature</i> 571:63–71.</li><li>Watts DJ, Strogatz SH (1998). Collective dynamics of ‘small-world’ networks. <i>Nature</i> 393:440–442.</li><li>Milo R et al. (2002). Network motifs: simple building blocks of complex networks. <i>Science</i> 298:824–827.</li><li>Maslov S, Sneppen K (2002). Specificity and stability in topology of protein networks. <i>Science</i> 296:910–913.</li><li>Chalfie M et al. (1985). The neural circuit for touch sensitivity in <i>C. elegans</i>. <i>J Neurosci</i> 5:956–964.</li><li>Towlson EK, Vértes PE, Ahnert SE, Schafer WR, Bullmore ET (2013). The rich club of the <i>C. elegans</i> neuronal connectome. <i>J Neurosci</i> 33:6380–6387.</li><li>Gleeson P et al. (2018). c302: a multiscale framework for modelling the nervous system of <i>C. elegans</i>. <i>Phil Trans R Soc B</i> 373:20170379.</li></ol></section>`,
  pit: ['Treating synapse counts as synaptic strength. Counts are anatomy; strength also depends on receptors, release probability and neuromodulation.', 'Assuming every connection has a known sign. Glutamate can excite (AMPA-like) or inhibit (glutamate-gated Cl⁻) depending on the receptor in the target.', 'Forgetting extrasynaptic signalling. Neuropeptides and monoamines act outside the wired graph (Bentley et al. 2016 call it the “wireless” connectome).', 'Comparing to the wrong random graph. Erdős–Rényi ignores the degree sequence; degree-preserving rewiring is the stricter test for motifs.'],
  quiz: [{ q: 'In this page’s adjacency matrix, A<sub>ij</sub> counts synapses…', o: ['from neuron i to neuron j', 'from neuron j to neuron i', 'in both directions'], a: 1, why: 'Rows are targets and columns are sources, matching W<sub>ij</sub> in rate models.' },
    { q: 'A gap junction is best represented as…', o: ['a directed edge', 'an undirected (symmetric) edge', 'a node'], a: 1, why: 'Current flows both ways through connexin/innexin channels, so the edge is symmetric.' },
    { q: 'A network is small-world when, compared with a random graph of the same size, it has…', o: ['higher clustering and similar path length', 'lower clustering and longer paths', 'the same clustering and shorter paths'], a: 0, why: 'σ = (C/C_rand)/(L/L_rand) > 1: lattice-like clustering with random-like short paths (Watts & Strogatz 1998).' },
    { q: 'Why test motifs against degree-preserving rewired graphs rather than Erdős–Rényi graphs?', o: ['They are faster to make', 'Hubs alone create many motifs; keeping each node’s degree removes that explanation', 'Erdős–Rényi graphs are directed'], a: 1, why: 'A few high-degree neurons inflate triangle counts; rewiring that preserves degrees tests whether the pattern exceeds what the degrees predict.' }],
  init() {
    const g = ceBuild(), D = g.D, nodes = D.nodes; let sel = null, hov = null, cascade = null, casStep = 0, play = 0;
    const pos = nodes.map(n => n[4]); const xs = pos.filter(Boolean).map(p => p[0]), ys = pos.filter(Boolean).map(p => p[1]);
    // spread x by rank (the Fiedler vector bunches up), keep depth for y
    const order = [...nodes.keys()].filter(i => pos[i]).sort((a, b) => pos[a][0] - pos[b][0]), xr = new Float64Array(nodes.length); order.forEach((i, k) => xr[i] = k / (order.length - 1));
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    const deg = nodes.map((_, i) => g.out[i].length + g.inn[i].length + g.gap[i].length), maxDeg = Math.max(...deg);
    const ntCol = t => ({ Acetylcholine: '#a62962', GABA: '#3d6a8c', Glutamate: '#2f7d5b', Dopamine: '#d08a2e', Serotonin: '#7a3fa6', muscle: '#c9b6a2' })[t.split('/')[0]] || '#8c7664';
    $('cgList').innerHTML = nodes.map(n => `<option value="${n[0]}">`).join('');
    const fromList = ['ALML', 'ALMR', 'AVM', 'PLML', 'PLMR', 'ASHL', 'ASHR', 'AWCL', 'AFDL', 'ADLL', 'ASEL'].filter(n => g.idx[n] != null); $('cgFrom').innerHTML = fromList.map(n => `<option>${n}</option>`).join('');
    const legend = () => { const m = $('cgCol').value; $('cgLeg').innerHTML = m === 'cls' ? Object.values(CEG.cls).map(([l, c]) => `<span style="color:${c}">●</span> ${l}`).join('<br>') : m === 'nt' ? [['acetylcholine', '#a62962'], ['GABA', '#3d6a8c'], ['glutamate', '#2f7d5b'], ['dopamine', '#d08a2e'], ['serotonin', '#7a3fa6'], ['unknown / other', '#8c7664']].map(([l, c]) => `<span style="color:${c}">●</span> ${l}`).join('<br>') : 'size and darkness ∝ total degree'; };
    let geo = null;
    const XY = (i, W, H) => [24 + (W - 48) * xr[i], 20 + (H - 40) * (pos[i][1] - ymin) / (ymax - ymin)];
    const colOf = i => { const m = $('cgCol').value; if (m === 'nt') return ntCol(nodes[i][2] || ''); if (m === 'deg') { const f = deg[i] / maxDeg; return `rgb(${Math.round(230 - 200 * f)},${Math.round(200 - 170 * f)},${Math.round(220 - 120 * f)})`; } return CEG.cls[nodes[i][1]][1]; };
    const draw = () => { const [x, W, H] = gfCanvas('cgCv'); geo = { W, H }; const mn = +$('cgMin').value, showM = $('cgMus').checked, vis = i => pos[i] && (showM || nodes[i][1] !== 'B');
      x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('sensory ↑ (shallow)', 4, 12); x.fillText('muscles ↓ (deep)', 4, H - 4);
      const act = cascade ? cascade.act : null;
      if ($('cgAll').checked) { x.strokeStyle = 'rgba(120,100,90,.06)'; x.lineWidth = 0.6; x.beginPath(); D.chem.forEach(([a, b, w]) => { if (w < mn || !vis(a) || !vis(b)) return; const [x1, y1] = XY(a, W, H), [x2, y2] = XY(b, W, H); x.moveTo(x1, y1); x.lineTo(x2, y2); }); x.stroke(); }
      if (sel != null) { const [sx, sy] = XY(sel, W, H);
        const edge = (j, w, col) => { if (w < mn || !vis(j)) return; const [jx, jy] = XY(j, W, H); x.strokeStyle = col; x.lineWidth = Math.min(4, 0.6 + Math.log2(1 + w)); x.beginPath(); x.moveTo(sx, sy); x.lineTo(jx, jy); x.stroke(); };
        if ($('cgChem').checked) { g.inn[sel].forEach(([j, w]) => edge(j, w, 'rgba(61,106,140,.55)')); g.out[sel].forEach(([j, w]) => edge(j, w, 'rgba(196,60,60,.55)')); }
        if ($('cgGap').checked) g.gap[sel].forEach(([j, w]) => edge(j, w, 'rgba(47,125,91,.7)')); }
      if (CEG.path) { x.strokeStyle = '#e8495f'; x.lineWidth = 3; CEG.path.forEach(p => { x.beginPath(); p.forEach((i, k) => { const [px, py] = XY(i, W, H); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); }); }
      const nbSet = sel != null ? new Set([...g.inn[sel], ...g.out[sel], ...g.gap[sel]].map(e => e[0])) : null;
      nodes.forEach((n, i) => { if (!vis(i)) return; const [px, py] = XY(i, W, H), r = n[1] === 'B' ? 2.2 : 2.6 + 3.2 * Math.sqrt(deg[i] / maxDeg); let c = colOf(i), a = 1;
        if (sel != null && i !== sel && !nbSet.has(i)) a = 0.18; if (act) { a = act[i] ? 1 : 0.15; if (act[i]) c = '#e8495f'; }
        x.globalAlpha = a; x.fillStyle = c; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.globalAlpha = 1; });
      const lab = new Set([sel, hov, ...(CEG.path ? CEG.path.flat() : [])].filter(v => v != null)); if (sel != null && nbSet.size < 25) nbSet.forEach(j => lab.add(j));
      x.font = '11px system-ui'; lab.forEach(i => { if (!vis(i)) return; const [px, py] = XY(i, W, H); x.fillStyle = 'rgba(255,250,244,.85)'; const w = x.measureText(nodes[i][0]).width; x.fillRect(px + 5, py - 9, w + 4, 13); x.fillStyle = i === sel ? '#141111' : '#4a3a2a'; x.fillText(nodes[i][0], px + 7, py + 1); }); };
    const info = i => { if (i == null) { $('cgInfo').innerHTML = `<div><b>${D.nodes.filter(n => n[1] !== 'B').length}</b> neurons · <b>${D.nodes.filter(n => n[1] === 'B').length}</b> muscles · <b>${D.chem.length}</b> chemical connections (${D.chem.reduce((a, e) => a + e[2], 0).toLocaleString()} synapses) · <b>${D.gap.length}</b> gap-junction pairs</div><div class="muted">Tap a node.</div>`; return; }
      const n = nodes[i], top = (arr, k = 6) => arr.slice().sort((a, b) => b[1] - a[1]).slice(0, k).map(([j, w]) => `${nodes[j][0]} (${w})`).join(', ') || '—';
      $('cgInfo').innerHTML = `<div><b>${n[0]}</b> · ${CEG.cls[n[1]][0]}${n[2] && n[2] !== 'muscle' ? ' · transmitter: ' + n[2] : ''}</div><div><b>in</b> ${g.inn[i].length} neurons (${g.inn[i].reduce((a, e) => a + e[1], 0)} synapses) · <b>out</b> ${g.out[i].length} (${g.out[i].reduce((a, e) => a + e[1], 0)}) · <b>gap</b> ${g.gap[i].length}</div><div><span style="color:#3d6a8c">strongest inputs</span>: ${top(g.inn[i])}</div><div><span style="color:#c43c3c">strongest outputs</span>: ${top(g.out[i])}</div><div><span style="color:#2f7d5b">gap junctions</span>: ${top(g.gap[i])}</div>${n[3] && n[3].length ? `<div class="muted">receptors: ${n[3].join(', ')}</div>` : ''}`; };
    const pick = (ev, cv) => { const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top; let best = null, bd = 144; nodes.forEach((n, i) => { if (!pos[i] || (!$('cgMus').checked && n[1] === 'B')) return; const [px, py] = XY(i, geo.W, geo.H), d = (px - mx) ** 2 + (py - my) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };
    $('cgCv').onclick = ev => { sel = pick(ev, $('cgCv')); CEG.path = null; info(sel); draw(); drawMx(); };
    $('cgCv').onmousemove = ev => { const h = pick(ev, $('cgCv')); if (h !== hov) { hov = h; draw(); } };
    $('cgQ').onchange = () => { const i = g.idx[$('cgQ').value.trim().toUpperCase()] ?? g.idx[$('cgQ').value.trim()]; if (i != null) { sel = i; CEG.path = null; info(i); draw(); drawMx(); } };
    ['cgChem', 'cgGap', 'cgMus', 'cgAll', 'cgCol'].forEach(id => $(id).onchange = () => { legend(); draw(); });
    $('cgMin').oninput = () => { $('cgMino').textContent = $('cgMin').value; draw(); };
    /* adjacency matrix */
    const mxOrder = [...nodes.keys()].filter(i => pos[i]).sort((a, b) => ('SIMB?'.indexOf(nodes[a][1]) - 'SIMB?'.indexOf(nodes[b][1])) || (pos[a][1] - pos[b][1])), rank = new Int32Array(nodes.length).fill(-1); mxOrder.forEach((i, k) => rank[i] = k);
    let mxG = null;
    const drawMx = () => { const [x, W, H] = gfCanvas('cgMx'), S = Math.min(W, H) - 30, n = mxOrder.length, c = S / n, o = 24; mxG = { o, c, n };
      x.fillStyle = '#fffdf9'; x.fillRect(o, o, S, S);
      D.chem.forEach(([a, b, w]) => { if (rank[a] < 0 || rank[b] < 0) return; x.fillStyle = `rgba(20,17,17,${Math.min(1, 0.25 + Math.log2(1 + w) / 5)})`; x.fillRect(o + rank[a] * c, o + rank[b] * c, Math.max(1, c), Math.max(1, c)); });
      D.gap.forEach(([a, b]) => { if (rank[a] < 0 || rank[b] < 0) return; x.fillStyle = 'rgba(47,125,91,.8)'; x.fillRect(o + rank[a] * c, o + rank[b] * c, Math.max(1, c), Math.max(1, c)); x.fillRect(o + rank[b] * c, o + rank[a] * c, Math.max(1, c), Math.max(1, c)); });
      let k0 = 0; 'SIMB'.split('').forEach(t => { const k1 = mxOrder.filter(i => nodes[i][1] === t).length; x.fillStyle = CEG.cls[t][1]; x.fillRect(o + k0 * c, o - 8, k1 * c, 5); x.fillRect(o - 8, o + k0 * c, 5, k1 * c); x.strokeStyle = 'rgba(0,0,0,.15)'; x.strokeRect(o + k0 * c, o, 0.01, S); x.strokeRect(o, o + k0 * c, S, 0.01); k0 += k1; });
      x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('source (from) →', o, 12); x.save(); x.translate(10, o + 110); x.rotate(-Math.PI / 2); x.fillText('target (to) →', 0, 0); x.restore();
      if (sel != null && rank[sel] >= 0) { x.strokeStyle = '#e8495f'; x.lineWidth = 1; x.strokeRect(o + rank[sel] * c, o, c, S); x.strokeRect(o, o + rank[sel] * c, S, c); } };
    const mxAt = ev => { const r = $('cgMx').getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, cI = Math.floor((mx - mxG.o) / mxG.c), rI = Math.floor((my - mxG.o) / mxG.c); return cI >= 0 && rI >= 0 && cI < mxG.n && rI < mxG.n ? [mxOrder[cI], mxOrder[rI]] : null; };
    $('cgMx').onmousemove = ev => { const p = mxAt(ev); if (!p) return; const [a, b] = p, w = (g.out[a].find(e => e[0] === b) || [0, 0])[1], gj = (g.gap[a].find(e => e[0] === b) || [0, 0])[1]; $('cgMxInfo').textContent = `${nodes[a][0]} → ${nodes[b][0]}: ${w} chemical synapses${gj ? `, ${gj} gap junction contacts` : ''}`; };
    $('cgMx').onclick = ev => { const p = mxAt(ev); if (p) { sel = p[0]; info(sel); draw(); drawMx(); } };
    /* measures */
    $('cgRun').onclick = () => { $('cgSt').textContent = 'computing…'; setTimeout(() => {
      const nb = ceUndirected(g), M = ceMetrics(nb), Rs = [1, 2, 3].map(s => ceMetrics(ceRandom(M.n, M.m, s * 7919))), Cr = Rs.reduce((a, r) => a + r.C, 0) / 3, Lr = Rs.reduce((a, r) => a + r.L, 0) / 3, sigma = (M.C / Cr) / (M.L / Lr);
      const neur = i => nodes[i][1] !== 'B', E = D.chem.filter(([a, b]) => neur(a) && neur(b)).map(([a, b]) => [a, b]), real = ceFFL(E, nodes.length), rw = [1, 2, 3].map(s => ceFFL(ceSwap(E, E.length * 10, s * 104729), nodes.length));
      const fm = rw.reduce((a, r) => a + r.ffl, 0) / 3, fsd = Math.sqrt(rw.reduce((a, r) => a + (r.ffl - fm) ** 2, 0) / 3) || 1, rm = rw.reduce((a, r) => a + r.recip, 0) / 3;
      const top = M.bc.map((b, i) => [i, b]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([i, b]) => `${nodes[i][0]} (${b.toFixed(3)})`).join(', ');
      $('cgStats').innerHTML = `<div><b>Largest component</b>: ${M.n} neurons, ${M.m} undirected links</div><div><b>Clustering C</b> ${M.C.toFixed(3)} vs random ${Cr.toFixed(3)} (×${(M.C / Cr).toFixed(1)})</div><div><b>Path length L</b> ${M.L.toFixed(2)} vs random ${Lr.toFixed(2)}</div><div><b>Small-world σ</b> ${sigma.toFixed(2)} ${sigma > 1 ? '(small-world)' : ''}</div>
        <div><b>Reciprocity</b> (A→B and B→A) ${(100 * real.recip).toFixed(1)} % vs ${(100 * rm).toFixed(1)} % after degree-preserving rewiring</div><div><b>Feed-forward loops</b> ${real.ffl.toLocaleString()} vs ${Math.round(fm).toLocaleString()} ± ${Math.round(fsd)} rewired (z = ${((real.ffl - fm) / fsd).toFixed(1)})</div><div><b>Highest betweenness</b>: ${top}</div><div class="muted">Check: NetworkX gives C = ${D.ref.C.toFixed(3)}, L = ${D.ref.L.toFixed(2)} on the same component.</div>`;
      // degree distributions
      const [x, W, H] = gfCanvas('cgDeg'), ins = [], outs = []; nodes.forEach((n, i) => { if (n[1] === 'B' || !pos[i]) return; ins.push(g.inn[i].filter(e => neur(e[0])).length); outs.push(g.out[i].filter(e => neur(e[0])).length); });
      const mx = Math.max(...ins, ...outs), bins = 20, bw = Math.ceil((mx + 1) / bins), hist = a => { const h = new Array(bins).fill(0); a.forEach(v => h[Math.min(bins - 1, Math.floor(v / bw))]++); return h; }, hi = hist(ins), ho = hist(outs), top2 = Math.max(...hi, ...ho), Lm = 40, Bw = (W - Lm - 10) / bins;
      hi.forEach((v, k) => { x.fillStyle = 'rgba(61,106,140,.6)'; x.fillRect(Lm + k * Bw, H - 22 - (H - 40) * v / top2, Bw / 2 - 1, (H - 40) * v / top2); }); ho.forEach((v, k) => { x.fillStyle = 'rgba(196,60,60,.6)'; x.fillRect(Lm + k * Bw + Bw / 2, H - 22 - (H - 40) * v / top2, Bw / 2 - 1, (H - 40) * v / top2); });
      x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; for (let k = 0; k <= bins; k += 4) x.fillText(k * bw, Lm + k * Bw - 4, H - 8); x.fillText('number of partner neurons', W / 2 - 60, H - 8); x.fillStyle = '#3d6a8c'; x.fillText('■ in-degree', W - 160, 14); x.fillStyle = '#c43c3c'; x.fillText('■ out-degree', W - 80, 14); x.fillStyle = '#6f4c27'; x.fillText(top2, 8, 22); x.fillText('0', 8, H - 22);
      $('cgSt').textContent = ''; }, 30); };
    /* shortest paths */
    $('cgGo').onclick = () => { const s = g.idx[$('cgFrom').value], tgt = $('cgTo').value, isT = i => tgt === 'muscle' ? nodes[i][1] === 'B' : tgt === 'VA' ? /^(VA|DA)\d/.test(nodes[i][0]) : tgt === 'VB' ? /^(VB|DB)\d/.test(nodes[i][0]) : /^AVA[LR]$/.test(nodes[i][0]);
      const wt = $('cgW').checked, dist = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), done = new Uint8Array(nodes.length); dist[s] = 0;
      for (;;) { let u = -1, bd = Infinity; for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; } if (u < 0 || isT(u)) break; done[u] = 1; const relax = ([v, w]) => { const nd = dist[u] + (wt ? 1 / w : 1); if (nd < dist[v]) { dist[v] = nd; prev[v] = u; } }; g.out[u].forEach(relax); if ($('cgGJ').checked) g.gap[u].forEach(relax); }
      const ends = [...nodes.keys()].filter(i => isT(i) && isFinite(dist[i])).sort((a, b) => dist[a] - dist[b]).slice(0, 4);
      CEG.path = ends.map(e => { const p = []; for (let v = e; v >= 0; v = prev[v]) p.unshift(v); return p; });
      $('cgPaths').innerHTML = CEG.path.length ? CEG.path.map(p => `<div>${p.map((i, k) => `<b style="color:${CEG.cls[nodes[i][1]][1]}">${nodes[i][0]}</b>${k < p.length - 1 ? (() => { const c = g.out[i].find(e => e[0] === p[k + 1]), gj = g.gap[i].find(e => e[0] === p[k + 1]); return c ? ` <span class="muted">—${c[1]}→</span> ` : ` <span style="color:#2f7d5b">≈${gj ? gj[1] : '?'}≈</span> `; })() : ''}`).join('')} · ${p.length - 1} synapses</div>`).join('') + '<div class="muted">—n→ chemical synapses (count); ≈n≈ gap junction contacts. Paths are drawn in red on the graph above.</div>' : 'No path found.';
      sel = s; info(s); draw(); document.getElementById('experiment').scrollIntoView({ behavior: 'smooth' }); };
    /* cascade */
    const totIn = new Float64Array(nodes.length); D.chem.forEach(([s, t, w]) => totIn[t] += w); D.gap.forEach(([s, t, w]) => { totIn[t] += w; totIn[s] += w; });
    const casInit = () => { const act = new Uint8Array(nodes.length); $('cgStart').value.split(',').forEach(n => { if (g.idx[n] != null) act[g.idx[n]] = 1; }); cascade = { act, hist: [act.slice()] }; casStep = 0; casOut(); draw(); };
    const casStepF = () => { if (!cascade) casInit(); const th = +$('cgTh').value, a = cascade.act, inp = new Float64Array(nodes.length);
      D.chem.forEach(([s, t, w]) => { if (a[s]) inp[t] += g.sign(s) * w; }); D.gap.forEach(([s, t, w]) => { if (a[s]) inp[t] += w; if (a[t]) inp[s] += w; });
      const nx = a.slice(); for (let i = 0; i < nodes.length; i++) if (totIn[i] > 0 && inp[i] / totIn[i] >= th / 100) nx[i] = 1; cascade.act = nx; cascade.hist.push(nx.slice()); casStep++; casOut(); draw(); };
    const casOut = () => { const a = cascade.act, cnt = t => [...a].filter((v, i) => v && nodes[i][1] === t).length, newly = casStep ? [...a].map((v, i) => v && !cascade.hist[casStep - 1][i] ? nodes[i][0] : null).filter(Boolean) : [];
      $('cgCasc').innerHTML = `<div><b>Step ${casStep}</b>: active sensory ${cnt('S')} · interneurons ${cnt('I')} · motor ${cnt('M')} · muscles ${cnt('B')}</div><div class="muted">${casStep ? 'newly active: ' + (newly.slice(0, 30).join(', ') || 'none (activity has stopped spreading)') + (newly.length > 30 ? ` … +${newly.length - 30}` : '') : 'Press Step to propagate one synaptic hop.'}</div>`; };
    $('cgStep').onclick = () => { document.getElementById('experiment').scrollIntoView({ behavior: 'smooth' }); casStepF(); };
    $('cgPlay').onclick = () => { const my = ++play; casInit(); document.getElementById('experiment').scrollIntoView({ behavior: 'smooth' }); let k = 0; const st = () => { if (my !== play || k++ > 10) return; casStepF(); setTimeout(st, 900); }; setTimeout(st, 700); };
    $('cgReset').onclick = () => { play++; cascade = null; $('cgCasc').innerHTML = ''; draw(); };
    $('cgTh').oninput = () => $('cgTho').textContent = $('cgTh').value; $('cgStart').onchange = () => { play++; casInit(); };
    legend(); info(null); draw(); drawMx();
    window.addEventListener('resize', () => { if (document.getElementById('cgCv')) { draw(); drawMx(); } });
  }
};
mlpages.splice(1, 0, ceMLPage);
