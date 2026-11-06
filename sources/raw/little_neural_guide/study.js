/* ===================== STUDY HUB + MIND MAP =====================
   /study/              textbook view: the whole guide as parts and chapters, with objectives and progress
   /study/progress/     progress dashboard: coverage, quizzes, activity calendar, learning journal, report export
   /study/flashcards/   spaced-repetition flashcards (Leitner boxes) built from equations, glossaries and quizzes
   /study/research/     research notebook: directions linked to pages, status, steps, milestones, export
   /connections/mindmap/ a force-directed mind map of every page and every link between them
   All state is per-viewer browser storage (light convenience only; export to keep a permanent copy). */

const ST = { quiz: 'ng-quiz-v1', cards: 'ng-cards-v1', log: 'ng-log-v1', journal: 'ng-journal-v1', research: 'ng-research-v1', miles: 'ng-miles-v1' };
const stGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const stSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const $L = () => document.getElementById('lesson');
/** HiDPI canvas setup (the model-lab bundle has its own private copy). */
function prep(cv) { const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); } const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h }; }

/* ---------- activity log + quiz tracking (hooks into existing navigation and quizzes) ---------- */
(function hook() {
  const prev = window.ngAfterRender;
  window.ngAfterRender = function () {
    if (prev) prev.apply(this, arguments);
    const log = stGet(ST.log, []); log.push([ngPath(), Date.now()]); stSet(ST.log, log.slice(-3000));
    if (ngPath() === '/connections/') injectMindmapSwitch();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mlq]'); if (!b) return;
    const box = b.closest('.ml-q'), qi = b.dataset.mlq, id = ngPath() + '#' + qi, rec = stGet(ST.quiz, {});
    const r = rec[id] || { tries: 0, first: null, last: null, t: 0 }; r.tries++; const ok = b.dataset.ok === '1';
    if (r.first === null) r.first = ok; r.last = ok; r.t = Date.now(); r.q = (box.querySelector('p') || {}).textContent || ''; rec[id] = r; stSet(ST.quiz, rec);
  });
})();
function injectMindmapSwitch() {
  const L = $L(); if (!L || L.querySelector('.st-viewswitch')) return;
  const hero = L.querySelector('.hero') || L.firstElementChild;
  hero.insertAdjacentHTML('afterend', '<div class="st-viewswitch" role="tablist" aria-label="View"><a class="st-tab" aria-selected="true" href="/connections/">Diagram view</a><a class="st-tab" href="/connections/mindmap/">Mind map view: every page, every link →</a></div>');
}

/* ---------- textbook structure ---------- */
const PARTS = [
  { umb: 'cells', title: 'Neurons, channels & resonance', obj: ['Explain the membrane as an RC circuit and the role of driving force', 'Read and run the Hodgkin–Huxley equations', 'Explain how Ih and the M-current create theta resonance in CA1'] },
  { umb: 'morph', title: 'Neurons & morphology', obj: ['Find, compare and simulate real reconstructed neurons', 'Describe how branching and diameter change signal propagation', 'Estimate attenuation with cable theory and compartments', 'Explain why dendritic location matters for CA1 inputs'] },
  { umb: 'dyn', title: 'Dynamical systems', obj: ['Draw phase portraits, nullclines and fixed points', 'Classify stability and recognise saddle-node and Hopf bifurcations', 'Link resonance to the eigenvalues of a linearised system'] },
  { umb: 'circ', title: 'Synapses, circuits & networks', obj: ['Model synapses as conductances with reversal potentials', 'Explain E/I balance and the regimes of spiking networks', 'Derive a population rate model and state its assumptions'] },
  { umb: 'body', title: 'Brain, body & behaviour', obj: ['Trace a reflex from receptor to muscle, including the NMJ and excitation–contraction coupling', 'Explain how place cells, grid cells and theta support navigation', 'Outline the AD cascade from molecules to circuits'] },
  { umb: 'ml', title: 'Learning & machine learning', obj: ['Relate plasticity rules and attractors to computation', 'Carry out backpropagation by hand and check it numerically', 'Show that a mean-field model is a small recurrent network'] },
  { umb: 'fit', title: 'Data, fitting & validation', obj: ['Fit a membrane model to patch-clamp data', 'Read a loss landscape and spot unidentifiable parameters', 'Compare models with held-out error, AIC and BIC'] },
  { umb: 'sim', title: 'Simulators & tools', obj: ['Run a biophysical, a spiking, a mean-field, a plasticity and an ML model and say what each keeps and drops', 'Use phase planes and bifurcation diagrams on any two-variable model', 'Measure a model the way a lab would (f–I, impedance, I–V)'] },
  { umb: 'practice', title: 'Practice', obj: ['Turn a question into a minimal model and debug it', 'Calibrate confidence and review papers and proposals critically', 'Explain a model in plain language and answer panel questions'] },
];
const umbPages = id => { const u = ngTree().find(x => x.id === id); return u ? u.pages.flatMap(p => p.kids ? p.kids.map(k => ({ href: k[0], label: k[1], group: p.label })) : [{ href: p.href, label: p.label, group: p.group }]) : []; };
const doneTopics = () => { try { return new Set(JSON.parse(localStorage.getItem('neural-topics-complete') || '[]')); } catch (e) { return new Set(); } };
function textbookOrder() { return PARTS.flatMap(p => umbPages(p.umb)); }
function bar(frac, label = '') { return `<div class="st-bar" title="${Math.round(frac * 100)}%"><div style="width:${Math.round(frac * 100)}%"></div></div>${label ? `<small>${label}</small>` : ''}`; }

window.studyNavPages = () => [['/study/', 'Textbook: contents & objectives'], ['/study/progress/', 'Progress & learning journal'], ['/study/flashcards/', 'Flashcards (spaced repetition)'], ['/study/research/', 'Research notebook & directions']];
const stHeader = (title, lead, pill) => `<div class="breadcrumbs"><a href="/">Home</a><span>›</span><a href="/study/">Study hub</a><span>›</span><span>${title}</span></div><div class="hero"><span class="pill">${pill}</span><h1>${title}</h1><p class="lead">${lead}</p></div>
  <nav class="st-tabs">${studyNavPages().map(([h, t]) => `<a href="${h}" ${ngPath() === h ? 'aria-current="page"' : ''}>${t.split(':')[0].split(' (')[0]}</a>`).join('')}</nav>`;

/* ======================= 1. TEXTBOOK ======================= */
function renderTextbook() {
  const vis = ngVisited(), order = textbookOrder(), last = stGet('ng-last-v1', null) || (() => { try { return localStorage.getItem('ng-last-v1'); } catch (e) { return null; } })();
  const next = order.find(p => !vis.has(p.href)), total = order.length, seen = order.filter(p => vis.has(p.href)).length;
  $L().innerHTML = stHeader('The guide as a textbook', 'The core text comes first: ten numbered chapters with worked examples, exercises and a glossary. After it, every other page of the guide in reading order, grouped by area. Ticks show what you have opened.', `STUDY HUB · ${total} PAGES · ${Math.round(100 * seen / total)}% OPENED`)
    + `<div class="st-cta">${next ? `<a class="primary" href="${next.href}">Next unread: ${esc(next.label)} →</a>` : '<span class="pill">Every page opened ✓</span>'}${last && last !== '/study/' ? `<a class="secondary" href="${last}">Continue where you left off</a>` : ''}<a class="secondary" href="/study/flashcards/">Review flashcards</a><a class="secondary" href="/connections/mindmap/">See the mind map</a></div>
    <div class="box tan"><h2>How to study with this guide</h2><ol class="ml-how">
      <li><b>Predict before you play.</b> Every model page asks for a prediction first. Committing to an answer, then checking, beats passive reading.</li>
      <li><b>Test yourself.</b> Quizzes and flashcards use retrieval practice, one of the best-supported learning techniques (Roediger & Karpicke, 2006; Dunlosky et al., 2013).</li>
      <li><b>Space it out.</b> The flashcards bring each card back after 1, 3, 7 and 16 days. A little every day beats one long session.</li>
      <li><b>Interleave.</b> Alternate between parts (e.g. a model page, then the matching experiment page) instead of finishing one part at a time.</li>
      <li><b>Explain it.</b> Write one line in your learning journal after each session: what you learned and what is still unclear.</li></ol></div>
    ${PARTS.map((P, pi) => {
      const ch = umbPages(P.umb), n = ch.filter(c => vis.has(c.href)).length, u = ngTree().find(x => x.id === P.umb);
      if (!ch.length) return '';
      let grp = null;
      return `<section class="lesson-section st-part"><p class="eyebrow">Area ${pi + 1} · ${u ? esc(u.title) : ''}</p><h2>${P.title}</h2>${bar(n / ch.length, `${n} of ${ch.length} pages opened`)}
        <details class="st-obj"><summary>Learning objectives</summary><ul class="skill-tips">${P.obj.map(o => `<li>${o}</li>`).join('')}</ul></details>
        <ol class="st-ch">${ch.map(c => { const g = c.group && c.group !== grp ? `<li class="st-grp">${esc(grp = c.group)}</li>` : ''; return g + `<li class="${vis.has(c.href) ? 'seen' : ''}"><a href="${c.href}"><span class="st-tick">${vis.has(c.href) ? '✓' : ''}</span>${esc(c.label)}</a></li>`; }).join('')}</ol></section>`;
    }).join('')}`;
}

/* ======================= 2. PROGRESS + JOURNAL ======================= */
function stats() {
  const vis = ngVisited(), all = ngAllPages(), uniq = [...new Map(all.map(p => [p.href, p])).values()];
  const quiz = stGet(ST.quiz, {}), qv = Object.values(quiz), cards = stGet(ST.cards, {}), log = stGet(ST.log, []);
  const days = [...new Set(log.map(([, t]) => new Date(t).toISOString().slice(0, 10)))].sort();
  let streak = 0; { const d = new Date(); for (;;) { const k = d.toISOString().slice(0, 10); if (days.includes(k)) { streak++; d.setDate(d.getDate() - 1); } else if (streak === 0 && k === today()) { d.setDate(d.getDate() - 1); } else break; } }
  return { vis, uniq, seen: uniq.filter(p => vis.has(p.href)).length, quiz, qv, qFirst: qv.filter(r => r.first).length, cards, mastered: Object.values(cards).filter(c => c.box >= 4).length, nCards: Object.keys(cards).length, log, days, streak, topics: doneTopics().size };
}
function renderProgress() {
  const S = stats(), tree = ngTree();
  const perUmb = tree.map(u => { const ps = [...new Set(u.pages.flatMap(p => p.kids ? p.kids.map(k => k[0]) : [p.href]))]; return [u, ps.filter(h => S.vis.has(h)).length, ps.length]; });
  // activity calendar: last 12 weeks
  const counts = {}; S.log.forEach(([, t]) => { const k = new Date(t).toISOString().slice(0, 10); counts[k] = (counts[k] || 0) + 1; });
  const start = new Date(); start.setDate(start.getDate() - 83 - start.getDay()); const cells = [];
  for (let i = 0; i < 84 + new Date().getDay() + 1; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const k = d.toISOString().slice(0, 10), c = counts[k] || 0; cells.push(`<i title="${k}: ${c} page view${c === 1 ? '' : 's'}" class="l${c ? Math.min(4, 1 + Math.floor(c / 4)) : 0}"></i>`); }
  // weak pages from quizzes
  const byPage = {}; Object.entries(S.quiz).forEach(([id, r]) => { const p = id.split('#')[0]; (byPage[p] = byPage[p] || { n: 0, ok: 0 }).n++; if (r.first) byPage[p].ok++; });
  const label = h => (S.uniq.find(p => p.href === h) || { label: h }).label;
  const weak = Object.entries(byPage).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 6);
  const J = stGet(ST.journal, []);
  $L().innerHTML = stHeader('Your progress', 'A record of what you have covered, how your quizzes went, and what you were thinking along the way. Export it any time as a Markdown report for your notes, a mentor or a lab meeting.', 'STUDY HUB · PROGRESS & JOURNAL')
    + `<div class="st-stats">
      <div><b>${S.seen}</b><span>of ${S.uniq.length} pages opened</span></div>
      <div><b>${S.topics}</b><span>concept topics marked complete</span></div>
      <div><b>${S.qv.length ? Math.round(100 * S.qFirst / S.qv.length) + '%' : '—'}</b><span>quiz questions right first time (${S.qv.length} answered)</span></div>
      <div><b>${S.mastered}</b><span>flashcards mastered (of ${S.nCards} studied)</span></div>
      <div><b>${S.days.length}</b><span>days active</span></div>
      <div><b>${S.streak}</b><span>day streak</span></div></div>
    <section class="lesson-section"><p class="eyebrow">Coverage</p><h2>By area</h2><div class="st-umbs">${perUmb.map(([u, a, b]) => `<div class="st-umb"><span>${esc(u.title)}</span>${bar(a / Math.max(1, b))}<small>${a}/${b}</small></div>`).join('')}</div></section>
    <section class="lesson-section"><p class="eyebrow">Activity</p><h2>The last 12 weeks</h2><div class="st-cal" aria-label="Activity calendar">${cells.join('')}</div><p class="muted">Each square is a day; darker means more pages viewed. Consistency matters more than volume.</p></section>
    <section class="lesson-section"><p class="eyebrow">Quizzes</p><h2>Where to review next</h2>${weak.length ? `<div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Page</th><th>Right first time</th><th></th></tr></thead><tbody>${weak.map(([h, r]) => `<tr><td>${esc(label(h))}</td><td>${r.ok}/${r.n}</td><td><a href="${h}#ml-quiz">Review →</a></td></tr>`).join('')}</tbody></table></div>` : '<p>Answer the quizzes at the bottom of model, experiment, fitting and ML pages and your weakest pages will appear here.</p>'}</section>
    <section class="lesson-section" id="journal"><p class="eyebrow">Learning journal</p><h2>What you learned, what is still unclear</h2>
      <div class="box tan st-jform"><label for="stJText">Today’s entry</label><textarea id="stJText" rows="3" placeholder="e.g. Backprop’s weight gradient is δ(target) × activity(source). Still unclear: how dendrites could carry δ in CA1."></textarea>
      <div class="st-jrow"><input id="stJTags" placeholder="tags, e.g. backprop, CA1" aria-label="Tags"><button class="primary" id="stJAdd">Save entry</button></div></div>
      <div id="stJList">${J.length ? J.slice().reverse().map((e, i) => `<div class="st-jentry"><small>${e.d}${e.page ? ` · after <a href="${e.page}">${esc(label(e.page))}</a>` : ''}${e.tags ? ' · ' + esc(e.tags) : ''}</small><p>${esc(e.t)}</p><button class="secondary st-jdel" data-j="${J.length - 1 - i}">Delete</button></div>`).join('') : '<p class="muted">No entries yet.</p>'}</div></section>
    <section class="lesson-section"><p class="eyebrow">Documentation</p><h2>Export your progress report</h2><p>A Markdown file with coverage, quiz results, your journal and your research notebook. Paste it into your lab notebook, a GitHub repo or an email to a mentor.</p>
      <div class="lab-actions"><button class="primary" id="stExport">Download report (.md)</button><button class="secondary" id="stCopy">Copy report</button><button class="secondary" id="stReset">Reset quiz & activity data</button></div><p class="muted" id="stExportMsg" role="status"></p></section>`;
  document.getElementById('stJAdd').onclick = () => { const t = document.getElementById('stJText').value.trim(); if (!t) return; const J = stGet(ST.journal, []); const prevPage = (stGet(ST.log, []).slice().reverse().find(([p]) => !p.startsWith('/study/')) || [])[0]; J.push({ d: today(), t, tags: document.getElementById('stJTags').value.trim(), page: prevPage || '' }); stSet(ST.journal, J); renderProgress(); };
  document.querySelectorAll('.st-jdel').forEach(b => b.onclick = () => { const J = stGet(ST.journal, []); J.splice(+b.dataset.j, 1); stSet(ST.journal, J); renderProgress(); });
  document.getElementById('stExport').onclick = async () => { const r = await ngSaveFile(`neural-guide-progress-${today()}.md`, reportMD()); document.getElementById('stExportMsg').textContent = r === 'saved' ? 'Report saved.' : r === 'declined' ? 'Download cancelled.' : 'Download is not available here; use Copy report instead.'; };
  document.getElementById('stCopy').onclick = async () => { try { await navigator.clipboard.writeText(reportMD()); document.getElementById('stExportMsg').textContent = 'Report copied to the clipboard.'; } catch (e) { document.getElementById('stExportMsg').innerHTML = '<textarea rows="8" style="width:100%">' + esc(reportMD()) + '</textarea>'; } };
  document.getElementById('stReset').onclick = () => { if (!document.getElementById('stReset').dataset.armed) { document.getElementById('stReset').dataset.armed = 1; document.getElementById('stReset').textContent = 'Click again to confirm reset'; return; } stSet(ST.quiz, {}); stSet(ST.log, []); renderProgress(); };
}
function reportMD() {
  const S = stats(), tree = ngTree(), R = researchState(), J = stGet(ST.journal, []), M = stGet(ST.miles, []);
  const lines = [`# Little Neural Guide · progress report`, `_Generated ${today()}_`, '', '## Summary', `- Pages opened: ${S.seen} of ${S.uniq.length}`, `- Concept topics complete: ${S.topics}`, `- Quiz questions answered: ${S.qv.length} (${S.qv.length ? Math.round(100 * S.qFirst / S.qv.length) : 0}% right first time)`, `- Flashcards mastered: ${S.mastered} of ${S.nCards} studied`, `- Days active: ${S.days.length} · current streak: ${S.streak}`, '', '## Coverage by area'];
  tree.forEach(u => { const ps = [...new Set(u.pages.flatMap(p => p.kids ? p.kids.map(k => k[0]) : [p.href]))]; lines.push(`- ${u.title}: ${ps.filter(h => S.vis.has(h)).length}/${ps.length}`); });
  lines.push('', '## Research notebook');
  R.dirs.forEach(d => { lines.push(`### ${d.title} — _${d.status}_`, `**Question.** ${d.q}`, ''); const st = d.steps.map((s, i) => `- [${R.done[d.id + ':' + i] ? 'x' : ' '}] ${s}`); lines.push(...st); if (R.notes[d.id]) lines.push('', `**Notes.** ${R.notes[d.id]}`); lines.push(''); });
  if (M.length) { lines.push('## Milestones'); M.forEach(m => lines.push(`- ${m.d}: ${m.t}`)); lines.push(''); }
  if (J.length) { lines.push('## Learning journal'); J.forEach(e => lines.push(`- **${e.d}**${e.tags ? ` (${e.tags})` : ''}: ${e.t}`)); }
  return lines.join('\n');
}

/* ======================= 3. FLASHCARDS ======================= */
const EQ_CARDS = [
  ['Sholl analysis', '\\(N(r)\\) = number of dendritic segments crossing a sphere of radius \\(r\\) around the soma; area under \\(N(r)\\) ≈ total dendritic length', '/biology/cell-atlas/'],
  ['Generalised winding number (point in mesh)', '\\(w(p)=\\frac{1}{4\\pi}\\sum_t\\Omega_t(p)\\); inside if \\(|w|>\\tfrac12\\)', '/biology/whole-brain/'],
  ['A-type K⁺ gradient (Migliore 2005)', '\\(\\bar g_{KA}(d)=30\\,(1+d/100)\\) mS/cm² (kap ≤100 µm, kad beyond); scale it to find the bAP strong/weak switch', '/biology/active-dendrites/'],
  ['Ih gradient (Migliore 2005)', '\\(\\bar g_h(d)=0.05\\,(1+3d/100)\\) mS/cm²; V½ −73 mV proximal, −81 mV distal', '/biology/active-dendrites/'],
  ['Synaptic conductance at the AIS', '\\(I=g(t)(V-E_{GABA})\\), \\(g(t)\\propto e^{-t/\\tau_2}-e^{-t/\\tau_1}\\); the sign depends on \\(V\\) vs \\(E_{GABA}\\)', '/biology/axo-axonic/'],
  ['Mixed electrical–chemical synapse', 'gap junction \\(I_{gap}=g_c(V_{pre}-V_{post})\\) (instant) + chemical (delayed); GF→TTMn latency 0.85 ms with ShakB, 1.62 ms without', '/biology/giant-fiber/'],
  ['Hodgkin–Huxley current balance', '\\(C_m\\dot V=I_{ext}-\\bar g_{Na}m^3h(V-E_{Na})-\\bar g_Kn^4(V-E_K)-g_L(V-E_L)\\)', '/lab/hh/'],
  ['Gate kinetics', '\\(\\dot x=\\alpha_x(V)(1-x)-\\beta_x(V)x\\), equivalently \\(\\tau_x\\dot x=x_\\infty(V)-x\\)', '/topics/channels/hh-gates/'],
  ['Nernst potential', '\\(E_X=\\frac{RT}{zF}\\ln\\frac{[X]_o}{[X]_i}\\) (≈ 61.5 mV × log₁₀ ratio at 37 °C, z = 1)', '/topics/channels/membrane-circuit/'],
  ['Membrane time constant', '\\(\\tau_m=R_mC_m=C/g_L\\)', '/experiments/ephys/'],
  ['Cable length constant', '\\(\\lambda=\\sqrt{\\frac{d\\,R_m}{4R_i}}\\); steady-state attenuation \\(V(x)=V_0e^{-x/\\lambda}\\)', '/workbench/morphology/'],
  ['Leaky integrate-and-fire', '\\(\\tau_m\\dot V=-(V-E_L)+RI\\); spike and reset when \\(V\\ge V_{th}\\)', '/fitting/fi-curve/'],
  ['LIF firing rate', '\\(f=\\Big[t_{ref}+\\tau_m\\ln\\frac{RI}{RI-(V_{th}-E_L)}\\Big]^{-1}\\) for \\(RI>V_{th}-E_L\\)', '/fitting/fi-curve/'],
  ['Wilson–Cowan', '\\(\\tau_E\\dot E=-E+S(w_{EE}E-w_{EI}I+P)\\), \\(\\tau_I\\dot I=-I+S(w_{IE}E-w_{II}I+Q)\\)', '/lab/wilson-cowan/'],
  ['Stability of a 2-D fixed point', 'Eigenvalues \\(\\lambda=\\tfrac12(\\mathrm{tr}J\\pm\\sqrt{\\mathrm{tr}J^2-4\\det J})\\); stable iff tr J < 0 and det J > 0', '/lab/wilson-cowan/'],
  ['STDP window', '\\(\\Delta w=A_+e^{-\\Delta t/\\tau_+}\\) for pre-before-post (Δt > 0); \\(-A_-e^{\\Delta t/\\tau_-}\\) otherwise', '/lab/stdp/'],
  ['Skaggs spatial information', '\\(I=\\sum_i p_i\\frac{\\lambda_i}{\\bar\\lambda}\\log_2\\frac{\\lambda_i}{\\bar\\lambda}\\) bits/spike', '/experiments/place-cells/'],
  ['Bayesian position decoding', '\\(P(\\mathbf x\\mid\\mathbf n)\\propto\\prod_i\\lambda_i(\\mathbf x)^{n_i}e^{-\\tau\\lambda_i(\\mathbf x)}\\) (flat prior)', '/experiments/place-cells/'],
  ['A node', '\\(a=\\varphi(\\sum_j w_jx_j+b)\\)', '/ml/nodes-edges/'],
  ['Backprop weight gradient', '\\(\\partial L/\\partial w_{ij}=\\delta_i\\,a_j\\), with \\(\\delta_i=\\varphi\'(z_i)\\sum_k w_{ki}\\delta_k\\)', '/ml/backprop/'],
  ['Gradient-descent stability', '\\(\\eta<2/\\lambda_{max}\\) of the Hessian; condition number \\(\\kappa=\\lambda_{max}/\\lambda_{min}\\)', '/ml/gradient-descent/'],
  ['Random RNN transition', '\\(\\tau\\dot{\\mathbf x}=-\\mathbf x+J\\tanh\\mathbf x\\), \\(J_{ij}\\sim\\mathcal N(0,g^2/N)\\): silent for g < 1, chaotic for g > 1', '/ml/rnn-dynamics/'],
  ['Corrected mean field', '\\(\\tau\\dot R_a=-R_a+\\langle S(\\mu_a+\\sigma_az)\\rangle_z\\)', '/ml/mean-field-bridge/'],
  ['Poisson negative log-likelihood', '\\(-\\ln L=\\sum_j(\\lambda_j-n_j\\ln\\lambda_j+\\ln n_j!)\\)', '/fitting/place-field/'],
  ['AIC and BIC', '\\(\\mathrm{AIC}=2k-2\\ln L\\), \\(\\mathrm{BIC}=k\\ln n-2\\ln L\\)', '/fitting/model-comparison/'],
];
function cardBank() {
  const cards = [];
  EQ_CARDS.forEach(([f, b, h], i) => cards.push({ id: 'eq' + i, deck: 'Equations', front: `Write the equation: <b>${f}</b>`, back: b, href: h, math: true }));
  try { lessons.forEach((l, i) => (l.terms || []).forEach(([t, d], j) => cards.push({ id: `t${i}-${j}`, deck: 'Concepts', front: `Define: <b>${esc(t)}</b>`, back: esc(d), href: overviewURL(i) }))); } catch (e) {}
  (window.ML_GLOSS || []).forEach(([t, d], i) => cards.push({ id: 'g' + i, deck: 'ML terms', front: `Define: <b>${t}</b>`, back: d, href: '/ml/' }));
  (window.ngQuizBank ? ngQuizBank() : []).forEach(q => cards.push({ id: 'q' + q.id, deck: 'Quiz questions', front: q.q, back: `<b>${q.a}</b><br>${q.why}`, href: q.href }));
  try { subtopics.forEach((st, i) => st.forEach((s, j) => { if (s[3] && s[4]) cards.push({ id: `sq${i}-${j}`, deck: 'Quiz questions', front: esc(s[3]), back: `<b>${esc(s[4][s[5]])}</b><br>${esc(s[6] || '')}`, href: topicURL(i, j) }); })); } catch (e) {}
  return cards;
}
const BOX_DAYS = [0, 1, 3, 7, 16, 35];
function renderFlashcards() {
  const bank = cardBank(), decks = ['All', ...new Set(bank.map(c => c.deck))];
  let deck = 'All', queue = [], cur = null, flipped = false, done = 0;
  $L().innerHTML = stHeader('Flashcards', 'Spaced repetition over everything in the guide: equations, concept and ML terms, and every quiz question. Cards you know come back less often; cards you miss come back tomorrow.', `STUDY HUB · ${bank.length} CARDS`)
    + `<div class="st-fc"><div class="st-fc-top"><div class="lab-actions" id="stDecks">${decks.map(d => `<button class="secondary" data-deck="${d}" aria-pressed="${d === 'All'}">${d} <small>${d === 'All' ? bank.length : bank.filter(c => c.deck === d).length}</small></button>`).join('')}</div><div id="stBoxes" class="st-boxes"></div></div>
      <div class="st-card" id="stCard" tabindex="0" aria-live="polite"></div>
      <div class="lab-actions st-rate" id="stRate" hidden><button class="secondary" data-r="0">Again <small>1</small></button><button class="secondary" data-r="1">Hard <small>2</small></button><button class="primary" data-r="2">Good <small>3</small></button><button class="secondary" data-r="3">Easy <small>4</small></button></div>
      <p class="muted st-fc-help">Space flips the card · 1–4 rate it · New cards are introduced 15 at a time.</p></div>`;
  const state = () => stGet(ST.cards, {});
  const due = () => { const s = state(), now = Date.now(), pool = bank.filter(c => deck === 'All' || c.deck === deck);
    const dueOld = pool.filter(c => s[c.id] && s[c.id].due <= now), fresh = pool.filter(c => !s[c.id]).slice(0, Math.max(0, 15 - done));
    return [...dueOld.sort(() => Math.random() - 0.5), ...fresh]; };
  const boxes = () => { const s = state(), pool = bank.filter(c => deck === 'All' || c.deck === deck), cnt = [0, 0, 0, 0, 0, 0]; pool.forEach(c => cnt[s[c.id] ? s[c.id].box : 0]++);
    document.getElementById('stBoxes').innerHTML = ['new', 'box 1', 'box 2', 'box 3', 'box 4', 'box 5'].map((n, i) => `<span><b>${cnt[i]}</b>${n}</span>`).join(''); };
  const show = () => {
    boxes(); queue = queue.length ? queue : due(); cur = queue[0]; flipped = false; document.getElementById('stRate').hidden = true;
    const C = document.getElementById('stCard');
    if (!cur) { C.innerHTML = `<div class="st-face"><p class="eyebrow">All caught up</p><h3>No cards due in this deck.</h3><p>Come back tomorrow, or pick another deck. ${done ? `You reviewed ${done} card${done === 1 ? '' : 's'} this session.` : ''}</p></div>`; return; }
    C.innerHTML = `<div class="st-face"><p class="eyebrow">${cur.deck} · ${queue.length} left</p><div class="st-q">${cur.front}</div><button class="primary" id="stFlip">Show answer</button></div>`;
    document.getElementById('stFlip').onclick = flip; mathTypeset(C);
  };
  const flip = () => { if (!cur || flipped) return; flipped = true; const C = document.getElementById('stCard');
    C.innerHTML = `<div class="st-face"><p class="eyebrow">${cur.deck}</p><div class="st-q">${cur.front}</div><div class="st-a">${cur.back}</div><a class="st-src" href="${cur.href}">Open the page this comes from →</a></div>`;
    document.getElementById('stRate').hidden = false; mathTypeset(C); };
  const rate = r => { if (!cur || !flipped) return; const s = state(), c = s[cur.id] || { box: 0 }; c.box = r === 0 ? 1 : r === 1 ? Math.max(1, c.box) : Math.min(5, c.box + (r === 2 ? 1 : 2));
    c.due = r === 0 ? Date.now() + 60 * 1000 : Date.now() + BOX_DAYS[c.box] * 864e5; c.seen = (c.seen || 0) + 1; s[cur.id] = c; stSet(ST.cards, s); done++;
    queue.shift(); if (r === 0) queue.splice(Math.min(queue.length, 3), 0, cur); show(); };
  document.getElementById('stRate').onclick = e => { const b = e.target.closest('[data-r]'); if (b) rate(+b.dataset.r); };
  document.getElementById('stDecks').onclick = e => { const b = e.target.closest('[data-deck]'); if (!b) return; deck = b.dataset.deck; document.querySelectorAll('[data-deck]').forEach(x => x.setAttribute('aria-pressed', x === b)); queue = []; show(); };
  const key = e => { if (!document.getElementById('stCard')) { document.removeEventListener('keydown', key); return; } if (e.target.closest('input,textarea,select')) return;
    if (e.key === ' ') { e.preventDefault(); flip(); } else if ('1234'.includes(e.key) && e.key.length === 1) rate(+e.key - 1); };
  document.addEventListener('keydown', key);
  show();
}
function mathTypeset(node) {
  if (window.MathJax && MathJax.typesetPromise) { MathJax.typesetPromise([node]).catch(() => {}); return; }
  if (!document.getElementById('mathjax-src')) {
    window.MathJax = { tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] }, svg: { fontCache: 'global' }, startup: { typeset: true } };
    const s = document.createElement('script'); s.id = 'mathjax-src'; s.async = true; s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js'; document.head.appendChild(s);
  }
}

/* ======================= 4. RESEARCH NOTEBOOK ======================= */
const STATUSES = ['idea', 'reading', 'modeling', 'analyzing', 'writing', 'done'];
const DIRS = [
  { id: 'bap-switch', title: 'Morphology-dependent strong/weak back-propagation in CA1',
    q: 'Does each CA1 pyramidal cell flip from strong to weak spike back-propagation at a morphology-specific A-type K⁺ density, and do AD-related Kv4.2 losses push cells across that switch?',
    why: 'Distal bAP amplitude is bimodal across CA1 cells (Golding et al. 2001). On the active-dendrites page, five real reconstructions with identical channels flip at different A-type densities (0.81×–1.19×). Kv4.2 depletion is reported in an AD mouse model (Hall et al. 2015).',
    approach: 'Run the validated Migliore-2005 pipeline on many CA1 reconstructions (NeuroMorpho), extract each switch point, and regress it on morphometrics (oblique count, trunk diameter, Sholl profile). Then scale A-type down to mimic Kv4.2 loss.',
    data: 'CA1 pyramidal reconstructions with measured diameters (NeuroMorpho); published bAP amplitude vs distance; Kv4.2 changes in AD models.',
    steps: ['Open the active-dendrites page and note each cell’s switch point', 'Run the active-dendrites notebook on 10+ NeuroMorpho CA1 cells', 'Compute morphometrics in the atlas notebook and regress switch point on them', 'Predict which morphological feature best explains the switch', 'Write the falsifiable prediction for dendritic patch recordings'],
    pages: [['/biology/active-dendrites/', 'Active dendrites in real cells'], ['/biology/cell-atlas/', 'Neuron atlas'], ['/biology/alzheimers/', 'Alzheimer’s cascade']],
    refs: ['Golding, Kath & Spruston (2001) J Neurophysiol', 'Migliore, Ferrante & Ascoli (2005) J Neurophysiol', 'Hall et al. (2015) J Neurosci', 'Hoffman et al. (1997) Nature'] },
  { id: 'aac-sign', title: 'Sign and timing of axo-axonic control (CA1 and fly GF)',
    q: 'Under which chloride gradients and timings do axo-axonic synapses veto vs promote spikes, and is the fly GF’s excitatory axo-axonic input the cholinergic analogue of the same gating motif?',
    why: 'A real-CA1 NEURON model shows a ~1 ms veto window with hyperpolarising GABA and spike advancement with depolarising GABA. In the MANC connectome, cholinergic AN08B098 cells contact the GF axon and raise its excitability (Ceballos et al. 2026).',
    approach: 'Extend the AIS model with Nav1.6/1.2 and Kv1, sweep E_GABA and AIS position, and compare with the GF threshold model fed by your MANC contact positions along the axon.',
    data: 'Your MANC exports (bodies 10000/10002), real chandelier reconstructions in the atlas, AIS channel kinetics.',
    steps: ['Read the AIS page and note the veto window', 'Run the AIS sweep for your E_GABA values in your axoaxonic-learning-model', 'Pull body 10002 in the GF notebook and settle the 2,352-synapse question', 'Map Axc contacts along the GF cable and place a model AIS/SIZ', 'State one prediction for an optogenetic experiment'],
    pages: [['/biology/axo-axonic/', 'Axo-axonic synapses at the AIS'], ['/biology/giant-fiber/', 'Drosophila giant fiber'], ['/biology/cell-atlas/', 'Real chandelier cells']],
    refs: ['Szabadics et al. (2006) Science', 'Glickfeld et al. (2009) Nat Neurosci', 'Dudok et al. (2021) Neuron', 'Ceballos et al. (2026) iScience'] },
  { id: 'resonance-ad', title: 'Theta resonance of CA1 pyramidal cells in AD models',
    q: 'Does h-current-dependent theta resonance in CA1 pyramidal dendrites change in AD mouse models, and does that change how CA1 responds to theta-rhythmic input?',
    why: 'HCN (h) channels set CA1’s preferred input frequency (resonance) and are densest in distal dendrites, where entorhinal input arrives. Entorhinal cortex is among the first regions affected in AD (Braak & Braak, 1991).',
    approach: 'Fit a passive + Ih compartment model to ZAP / chirp impedance data, then compare resonance frequency and Q between conditions; extend to a multi-compartment cell to see dendritic location effects.',
    data: 'Whole-cell recordings with chirp current injection (or published impedance profiles); morphology reconstructions.',
    steps: ['Read Hu, Vervaeke & Storm (2002) on two forms of theta resonance', 'Work through the patch clamp → model page and its impedance fit', 'Write down which Ih parameters (g_h, V½, τ) you expect to change', 'Simulate resonance vs g_h and V½ and plot f_res and Q', 'Draft a one-paragraph hypothesis with a falsifiable prediction'],
    pages: [['/experiments/ephys/', 'Patch clamp → model'], ['/topics/channels/hh-to-ca1/', 'From HH to CA1'], ['/biology/cell-atlas/', 'Neuron atlas'], ['/fitting/model-comparison/', 'Compare models'], ['/biology/alzheimers/', 'Alzheimer’s cascade']],
    refs: ['Hu, Vervaeke & Storm (2002) J Physiol', 'Narayanan & Johnston (2007) Neuron', 'Magee (1998) J Neurosci'] },
  { id: 'hyperexcitability', title: 'Network hyperexcitability and E/I balance',
    q: 'Can a shift in E/I balance in a CA1-like network reproduce the early hippocampal hyperactivity reported in AD models, and which parameter changes push it there?',
    why: 'Aberrant excitatory activity and hyperactive neurons appear early in AD mouse models (Palop et al., 2007; Busche et al., 2012).',
    approach: 'Map regimes of a spiking E–I network (Brunel) and its mean-field reduction while weakening inhibition or increasing excitability; compare firing rates, synchrony and oscillation frequency.',
    data: 'Published firing-rate distributions and LFP spectra from AD vs wild-type mice.',
    steps: ['Run the Brunel lab across g and η and note regime boundaries', 'Reproduce the same shift in Wilson–Cowan (mean field) and compare', 'List which biological changes map onto g, η and w_EI', 'Define a quantitative signature of “hyperexcitability” to fit'],
    pages: [['/lab/brunel/', 'Brunel network'], ['/lab/wilson-cowan/', 'Wilson–Cowan'], ['/ml/mean-field-bridge/', 'Networks → mean field'], ['/biology/alzheimers/', 'Alzheimer’s cascade']],
    refs: ['Palop et al. (2007) Neuron', 'Busche et al. (2012) PNAS', 'Brunel (2000) J Comput Neurosci'] },
  { id: 'interneurons-gamma', title: 'Interneuron dysfunction and gamma oscillations',
    q: 'How does reduced PV interneuron excitability change gamma rhythms and inhibitory control of CA1 pyramidal cells?',
    why: 'Reduced Nav1.1 in PV interneurons impairs gamma and contributes to network dysfunction in an AD mouse model (Verret et al., 2012).',
    approach: 'Add a PV population to an E–I rate or spiking model; lower its gain and measure oscillation frequency, power and pyramidal rate.',
    data: 'LFP gamma power and interneuron firing from AD models.',
    steps: ['Review the CA1 circuit page: which interneurons target which compartments', 'Lower the inhibitory gain in Wilson–Cowan and track the oscillation', 'Sketch a three-population model (E, PV, OLM) as a graph on the nodes & edges page'],
    pages: [['/experiments/ca1-circuit/', 'The CA1 circuit'], ['/lab/wilson-cowan/', 'Wilson–Cowan'], ['/ml/nodes-edges/', 'Graph builder']],
    refs: ['Verret et al. (2012) Cell', 'Bezaire & Soltesz (2013) Hippocampus'] },
  { id: 'place-replay', title: 'Place-cell stability and replay',
    q: 'Which changes (field drift, broader fields, weaker theta locking, fewer ripples) best explain decoding deficits in AD models?',
    why: 'Place-cell firing correlates with memory deficits in Tg2576 mice (Cacucci et al., 2008); sharp-wave ripples are reduced in apoE4 mice (Gillespie et al., 2016).',
    approach: 'Use the place-cell simulation to vary one factor at a time and measure spatial information, decoding error and replay fidelity; ask which factor matches published effect sizes.',
    data: 'Spike trains and positions from tetrode or calcium-imaging studies.',
    steps: ['Run the place-cell page with the AD slider and record decoding error vs degradation', 'Separate the factors (drift vs width vs theta) in code', 'Find one dataset with place-field stability across days'],
    pages: [['/experiments/place-cells/', 'Place cells & behavior'], ['/fitting/place-field/', 'Fit a place field']],
    refs: ['Cacucci et al. (2008) PNAS', 'Gillespie et al. (2016) Neuron', 'Diba & Buzsáki (2007) Nat Neurosci'] },
  { id: 'fit-wt-ad', title: 'Fitting single-cell models to WT vs AD recordings',
    q: 'Are differences between wild-type and AD-model CA1 cells identifiable as specific conductance changes, or are several explanations equally good?',
    why: 'Different parameter combinations can produce the same voltage response; any claim about “altered g_h” needs identifiability checks.',
    approach: 'Fit the same model to both groups, compare with held-out error and AIC/BIC, and use profile likelihoods or bootstrap to see which parameter differences survive.',
    data: 'Current-clamp steps and sag responses from both groups.',
    steps: ['Do the loss-landscape page and note which parameters trade off', 'Fit both a passive and an Ih model to the same synthetic data', 'Bootstrap the fitted g_h and V½'],
    pages: [['/fitting/landscape/', 'Loss landscapes'], ['/fitting/model-comparison/', 'Compare models'], ['/experiments/ephys/', 'Patch clamp → model']],
    refs: ['Raue et al. (2009) Bioinformatics', 'Akaike (1974)', 'Efron (1979)'] },
  { id: 'rnn-hippocampus', title: 'Trained RNNs and mean-field models of hippocampal dynamics',
    q: 'Can a recurrent network trained to generate theta sequences or path integration be reduced to a few population variables, and does that reduction predict how damage affects it?',
    why: 'Trained RNNs can be reverse-engineered with fixed-point analysis (Sussillo & Barak, 2013), and low-rank networks reduce exactly to a few latent variables (Mastrogiuseppe & Ostojic, 2018).',
    approach: 'Train a small rate RNN, analyse its fixed points and eigenvalues, then lesion weights to mimic synaptic loss and compare with a mean-field prediction.',
    data: 'Simulated; later compare with population recordings.',
    steps: ['Work through the ML section in order', 'Implement a 50-unit rate RNN in PyTorch with BPTT', 'Find its fixed points and linearize around them'],
    pages: [['/ml/rnn-dynamics/', 'RNN dynamics'], ['/ml/mean-field-bridge/', 'Networks → mean field'], ['/ml/backprop/', 'Backprop'], ['/ml/learning-rules/', 'Biological learning']],
    refs: ['Sussillo & Barak (2013) Neural Comput', 'Mastrogiuseppe & Ostojic (2018) Neuron', 'Bittner et al. (2017) Science'] },
];
function researchState() {
  const s = stGet(ST.research, { status: {}, done: {}, notes: {}, custom: [] });
  const dirs = [...DIRS, ...(s.custom || [])].map(d => ({ ...d, status: s.status[d.id] || 'idea', steps: d.steps || [] }));
  return { s, dirs, done: s.done || {}, notes: s.notes || {} };
}
function renderResearch() {
  const R = researchState(), M = stGet(ST.miles, []), vis = ngVisited();
  const counts = STATUSES.map(st => R.dirs.filter(d => d.status === st).length);
  $L().innerHTML = stHeader('Research notebook', 'Open directions for CA1 resonance and Alzheimer’s modeling, each linked to the pages that teach the skills it needs. Track status, tick off first steps, keep notes and log milestones. Everything exports into your progress report.', `STUDY HUB · ${R.dirs.length} DIRECTIONS`)
    + `<div class="st-pipeline">${STATUSES.map((st, i) => `<div><b>${counts[i]}</b><span>${st}</span></div>`).join('<i>→</i>')}</div>
    <div class="box pink"><h2>How to use a direction card</h2><ol class="ml-how"><li><b>Read the question and why it matters.</b> Rewrite the question in your own words in the notes.</li><li><b>Do the linked pages first.</b> Ticks show which you have opened.</li><li><b>Work through the first steps.</b> Each is small enough for one session.</li><li><b>Move the status forward</b> and log milestones as they happen (first simulation, first figure, first draft).</li></ol></div>
    ${R.dirs.map(d => { const nDone = d.steps.filter((_, i) => R.done[d.id + ':' + i]).length; return `<section class="lesson-section st-dir" id="dir-${d.id}"><p class="eyebrow">Direction · ${d.custom ? 'your own' : 'suggested'}</p><h2>${esc(d.title)}</h2>
      <div class="st-dir-top"><label>Status <select data-status="${d.id}" class="ml-select">${STATUSES.map(st => `<option ${st === d.status ? 'selected' : ''}>${st}</option>`).join('')}</select></label>${bar(d.steps.length ? nDone / d.steps.length : 0, `${nDone}/${d.steps.length} first steps done`)}</div>
      <p><b>Question.</b> ${esc(d.q)}</p>${d.why ? `<p><b>Why it matters.</b> ${esc(d.why)}</p>` : ''}${d.approach ? `<p><b>Modeling approach.</b> ${esc(d.approach)}</p>` : ''}${d.data ? `<p><b>Data you would need.</b> ${esc(d.data)}</p>` : ''}
      ${d.steps.length ? `<div class="box tan"><h3>First steps</h3>${d.steps.map((s, i) => `<label class="compare-label"><input type="checkbox" data-step="${d.id}:${i}" ${R.done[d.id + ':' + i] ? 'checked' : ''}> ${esc(s)}</label>`).join('')}</div>` : ''}
      ${d.pages && d.pages.length ? `<p class="eyebrow">Pages that build the skills</p><div class="button-cloud">${d.pages.map(([h, t]) => `<a class="secondary" href="${h}">${vis.has(h) ? '✓ ' : ''}${esc(t)}</a>`).join('')}</div>` : ''}
      ${d.refs && d.refs.length ? `<p class="muted"><b>Start reading:</b> ${d.refs.map(esc).join(' · ')}</p>` : ''}
      <label for="note-${d.id}">Notes</label><textarea id="note-${d.id}" data-note="${d.id}" rows="3" placeholder="Your version of the question, hypotheses, decisions, links to code…">${esc(R.notes[d.id] || '')}</textarea>
      ${d.custom ? `<button class="secondary" data-delcustom="${d.id}">Remove this direction</button>` : ''}</section>`; }).join('')}
    <section class="lesson-section"><p class="eyebrow">Add your own</p><h2>A new research direction</h2><div class="box tan st-new">
      <label for="stNT">Title</label><input id="stNT" placeholder="e.g. Dendritic plateau potentials and place-field formation">
      <label for="stNQ">Question</label><textarea id="stNQ" rows="2" placeholder="A specific, answerable question"></textarea>
      <label for="stNS">First steps (one per line)</label><textarea id="stNS" rows="3"></textarea>
      <button class="primary" id="stNAdd">Add direction</button></div></section>
    <section class="lesson-section"><p class="eyebrow">Documentation</p><h2>Milestones</h2><div class="st-jrow"><input id="stMT" placeholder="e.g. First impedance fit matches the resonance peak" aria-label="Milestone"><button class="primary" id="stMAdd">Log milestone</button></div>
      <ol class="st-miles">${M.slice().reverse().map((m, i) => `<li><b>${m.d}</b> ${esc(m.t)} <button class="secondary st-mdel" data-m="${M.length - 1 - i}">✕</button></li>`).join('') || '<li class="muted">No milestones yet.</li>'}</ol>
      <p><a class="secondary" href="/study/progress/#journal">Export everything in your progress report →</a></p></section>`;
  const save = f => { const s = stGet(ST.research, { status: {}, done: {}, notes: {}, custom: [] }); f(s); stSet(ST.research, s); };
  document.querySelectorAll('[data-status]').forEach(x => x.onchange = () => { save(s => s.status[x.dataset.status] = x.value); renderResearch(); });
  document.querySelectorAll('[data-step]').forEach(x => x.onchange = () => { save(s => { s.done = s.done || {}; s.done[x.dataset.step] = x.checked; }); renderResearch(); });
  document.querySelectorAll('[data-note]').forEach(x => x.oninput = () => save(s => { s.notes = s.notes || {}; s.notes[x.dataset.note] = x.value; }));
  document.querySelectorAll('[data-delcustom]').forEach(x => x.onclick = () => { save(s => s.custom = (s.custom || []).filter(d => d.id !== x.dataset.delcustom)); renderResearch(); });
  document.getElementById('stNAdd').onclick = () => { const t = document.getElementById('stNT').value.trim(), q = document.getElementById('stNQ').value.trim(); if (!t || !q) return;
    save(s => { s.custom = s.custom || []; s.custom.push({ id: 'c' + Date.now(), custom: true, title: t, q, steps: document.getElementById('stNS').value.split('\n').map(x => x.trim()).filter(Boolean), pages: [], refs: [] }); }); renderResearch(); };
  document.getElementById('stMAdd').onclick = () => { const t = document.getElementById('stMT').value.trim(); if (!t) return; const M = stGet(ST.miles, []); M.push({ d: today(), t }); stSet(ST.miles, M); renderResearch(); };
  document.querySelectorAll('.st-mdel').forEach(b => b.onclick = () => { const M = stGet(ST.miles, []); M.splice(+b.dataset.m, 1); stSet(ST.miles, M); renderResearch(); });
}

window.renderStudy = function (slug) {
  document.title = 'Study hub · Little Neural Guide';
  if (slug === 'progress') renderProgress(); else if (slug === 'flashcards') renderFlashcards(); else if (slug === 'research') renderResearch(); else renderTextbook();
};

/* ======================= 5. MIND MAP ======================= */
const UMB_COL = { root: '#141111', start: '#141111', study: '#a62962', cells: '#ed83b0', morph: '#6f4c27', dyn: '#8a3b5c', circ: '#c2617f', bio: '#b25a3c', lab: '#4f2a3a', exp: '#3f6f6a', ml: '#5b6b8c', fit: '#c98b5e', hands: '#7a9a6a', judg: '#9a7fb0', comm: '#d4a017' };
function mindGraph() {
  const tree = ngTree(), nodes = [], idx = new Map(), edges = [], ekey = new Set();
  const add = (id, label, umb, kind) => { if (idx.has(id)) return idx.get(id); const n = { id, label, umb, kind, x: 0, y: 0, vx: 0, vy: 0, deg: 0 }; idx.set(id, nodes.length); nodes.push(n); return nodes.length - 1; };
  const link = (a, b, kind) => { if (a === b) return; const k = Math.min(a, b) + '-' + Math.max(a, b); if (ekey.has(k)) return; ekey.add(k); edges.push({ a, b, kind }); nodes[a].deg++; nodes[b].deg++; };
  const root = add('root', 'Little Neural Guide', 'root', 'root');
  tree.forEach(u => {
    const hub = add('umb:' + u.id, u.title, u.id, 'hub'); link(root, hub, 'tree');
    u.pages.forEach(p => {
      const pi = add(p.href, p.label, u.id, 'page'); link(hub, pi, 'tree');
      (p.kids || []).forEach(k => { const ki = add(k[0], k[1], u.id, 'page'); link(pi, ki, 'tree'); });
    });
  });
  const L = window.NG_LINKS || {}, inc = {};
  Object.values(L).forEach(tos => new Set(tos).forEach(t => inc[t] = (inc[t] || 0) + 1));   // pages linked from almost everywhere are navigation, not ideas
  Object.entries(L).forEach(([from, tos]) => { if (!idx.has(from) || new Set(tos).size > 40) return; /* index pages (map, textbook) list everything */ tos.forEach(to => { if (to !== '/' && (inc[to] || 0) <= 25 && idx.has(to)) link(idx.get(from), idx.get(to), 'link'); }); });
  return { nodes, edges, idx, root };
}
function renderMindmap() {
  document.title = 'Mind map · Little Neural Guide';
  const G = mindGraph(), vis = ngVisited(), tree = ngTree(), cur = stGet('ng-mm-hidden', []);
  const nLinks = G.edges.filter(e => e.kind === 'link').length;
  $L().innerHTML = `<div class="breadcrumbs"><a href="/">Home</a><span>›</span><a href="/connections/">How everything connects</a><span>›</span><span>Mind map</span></div>
    <div class="hero"><span class="pill">MIND MAP · ${G.nodes.length} PAGES · ${nLinks} CROSS-LINKS</span><h1>Everything,<br>connected.</h1><p class="lead">Every page in the guide is a node. Grey edges are the contents hierarchy; coloured threads are the links pages make to each other. Click a node to see its connections, then trace how it connects back to the start, like blame flowing backward in backpropagation.</p></div>
    <div class="st-viewswitch" role="tablist" aria-label="View"><a class="st-tab" href="/connections/">Diagram view</a><a class="st-tab" aria-selected="true" href="/connections/mindmap/">Mind map view</a></div>
    <div class="mm-wrap"><div class="mm-bar"><input id="mmQ" type="search" placeholder="Search pages…" aria-label="Search pages"><button class="secondary" id="mmFit">Fit to screen</button><button class="secondary" id="mmLabels" aria-pressed="false">All labels</button><button class="secondary" id="mmShake">Re-layout</button></div>
      <div class="mm-stage"><canvas id="mmC" aria-label="Mind map of all pages"></canvas>
      <div class="mm-panel" id="mmP"><p class="eyebrow">Select a node</p><p>Click any node. Drag nodes to rearrange, drag the background to pan, scroll or pinch to zoom.</p><p class="muted">Filled nodes are pages you have opened.</p></div></div>
      <div class="mm-legend">${tree.map(u => `<button class="mm-leg ${cur.includes(u.id) ? 'off' : ''}" data-umb="${u.id}"><i style="background:${UMB_COL[u.id] || '#888'}"></i>${esc(u.title)}</button>`).join('')}</div></div>
    <section class="lesson-section"><p class="eyebrow">Reading the map</p><h2>What the shapes mean</h2><ol class="ml-how"><li><b>Hubs</b> (large labelled nodes) are the areas of the guide. The centre is the guide itself.</li><li><b>Clusters</b> form where pages link to each other a lot: these are tightly related ideas.</li><li><b>Bridges</b> are pages with links into several areas, like the mean-field bridge or the CA1 circuit. They are good places to consolidate.</li><li><b>Trace back</b> finds the shortest route from a page to the start and animates it, like gradients flowing back through a network. <b>What it unlocks</b> lights up pages one and two steps ahead.</li></ol></section>`;
  // ---- layout ----
  const cv = document.getElementById('mmC'), N = G.nodes.length, hidden = new Set(cur);
  const nbr = G.nodes.map(() => []); G.edges.forEach((e, k) => { nbr[e.a].push([e.b, k]); nbr[e.b].push([e.a, k]); });
  const hubs = G.nodes.map((n, i) => n.kind === 'hub' ? i : -1).filter(i => i >= 0);
  const seedLayout = () => { hubs.forEach((h, k) => { const a = 2 * Math.PI * k / hubs.length; G.nodes[h].x = 420 * Math.cos(a); G.nodes[h].y = 420 * Math.sin(a); });
    G.nodes.forEach((n, i) => { if (n.kind === 'page') { const h = hubs.find(hh => G.nodes[hh].umb === n.umb), H = G.nodes[h]; n.x = H.x * 1.25 + (Math.random() - .5) * 220; n.y = H.y * 1.25 + (Math.random() - .5) * 220; } n.vx = n.vy = 0; }); G.nodes[G.root].x = G.nodes[G.root].y = 0; };
  const radius = n => n.kind === 'root' ? 18 : n.kind === 'hub' ? 12 : 4 + Math.min(6, Math.sqrt(n.deg));
  let alpha = 1;
  const drag = { node: null, pan: false, sx: 0, sy: 0, moved: false };
  const tick = () => {
    const ns = G.nodes, k2 = 2600;
    for (let i = 0; i < N; i++) { const a = ns[i]; if (hidden.has(a.umb)) continue; for (let j = i + 1; j < N; j++) { const b = ns[j]; if (hidden.has(b.umb)) continue; let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01; if (d2 > 250000) continue; const f = k2 / d2 * alpha; dx *= f; dy *= f; a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy; } }
    G.edges.forEach(e => { const a = ns[e.a], b = ns[e.b]; if (hidden.has(a.umb) || hidden.has(b.umb)) return; const L0 = e.kind === 'tree' ? (a.kind === 'root' || b.kind === 'root' ? 260 : a.kind === 'hub' || b.kind === 'hub' ? 90 : 46) : 160, s = e.kind === 'tree' ? 0.06 : 0.008;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - L0) / d * s * alpha; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; });
    ns.forEach(n => { if (n === drag.node) return; n.vx -= n.x * 0.002 * alpha; n.vy -= n.y * 0.002 * alpha; n.vx *= 0.6; n.vy *= 0.6; n.x += n.vx; n.y += n.vy; });
    ns[G.root].x *= 0.9; ns[G.root].y *= 0.9; alpha = Math.max(0.02, alpha * 0.985);
  };
  seedLayout(); for (let i = 0; i < 260; i++) tick();
  // ---- view ----
  const view = { s: 0.6, x: 0, y: 0 }; let sel = -1, hov = -1, showAll = false, pulses = null, lit = null;
  const W2S = (x, y, w, h) => [w / 2 + (x - view.x) * view.s, h / 2 + (y - view.y) * view.s];
  const S2W = (sx, sy, w, h) => [(sx - w / 2) / view.s + view.x, (sy - h / 2) / view.s + view.y];
  const fit = () => { const vs = G.nodes.filter(n => !hidden.has(n.umb)); const xs = vs.map(n => n.x), ys = vs.map(n => n.y), w = cv.clientWidth, h = cv.clientHeight;
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); view.x = (x0 + x1) / 2; view.y = (y0 + y1) / 2; view.s = Math.min(w / (x1 - x0 + 120), h / (y1 - y0 + 120)); };
  const draw = () => {
    const { ctx, w, h } = prep(cv); ctx.fillStyle = '#fffaf4'; ctx.fillRect(0, 0, w, h);
    const focus = hov >= 0 ? hov : sel, near = new Set(); if (focus >= 0) { near.add(focus); nbr[focus].forEach(([j]) => near.add(j)); }
    const dim = i => (focus >= 0 && !near.has(i) && !(lit && lit.has(i))) || hidden.has(G.nodes[i].umb);
    G.edges.forEach((e, k) => {
      const a = G.nodes[e.a], b = G.nodes[e.b]; if (hidden.has(a.umb) || hidden.has(b.umb)) return;
      const on = focus >= 0 && (e.a === focus || e.b === focus), inLit = lit && lit.has(e.a) && lit.has(e.b);
      const [x1, y1] = W2S(a.x, a.y, w, h), [x2, y2] = W2S(b.x, b.y, w, h);
      ctx.strokeStyle = on || inLit ? (e.kind === 'link' ? '#a62962' : '#141111') : e.kind === 'link' ? hexA(UMB_COL[a.umb], focus >= 0 ? 0.06 : 0.22) : `rgba(140,118,100,${focus >= 0 ? 0.08 : 0.35})`;
      ctx.lineWidth = on || inLit ? 2 : e.kind === 'link' ? 0.9 : 1.1; ctx.beginPath();
      if (e.kind === 'link') { const mx = (x1 + x2) / 2 - (y2 - y1) * 0.15, my = (y1 + y2) / 2 + (x2 - x1) * 0.15; ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); } else { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke();
    });
    if (pulses) { const t = (performance.now() - pulses.t0) / 650; ctx.fillStyle = '#ed83b0';
      pulses.path.forEach((seg, k) => { const f = t - k; if (f < 0 || f > 1.6) return; const ff = Math.min(1, f), a = G.nodes[seg[0]], b = G.nodes[seg[1]], [x1, y1] = W2S(a.x, a.y, w, h), [x2, y2] = W2S(b.x, b.y, w, h);
        ctx.strokeStyle = '#ed83b0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * ff, y1 + (y2 - y1) * ff); ctx.stroke();
        ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * ff, y1 + (y2 - y1) * ff, 6, 0, 7); ctx.fill(); });
      if (t > pulses.path.length + 1.6) pulses.t0 = performance.now(); }
    G.nodes.forEach((n, i) => {
      if (hidden.has(n.umb)) return; const [x, y] = W2S(n.x, n.y, w, h), r = radius(n) * Math.max(0.7, Math.min(1.6, view.s * 1.4)), col = UMB_COL[n.umb] || '#888';
      ctx.globalAlpha = dim(i) ? 0.18 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
      ctx.fillStyle = n.kind !== 'page' || vis.has(n.id) ? col : '#fffaf4'; ctx.fill(); ctx.lineWidth = i === sel ? 3.5 : 1.6; ctx.strokeStyle = i === sel ? '#ed83b0' : col; ctx.stroke();
      const showL = n.kind !== 'page' || showAll || near.has(i) || (lit && lit.has(i)) || view.s > 1.3;
      if (showL && !dim(i)) { ctx.font = `${n.kind === 'page' ? 400 : 700} ${n.kind === 'root' ? 14 : n.kind === 'hub' ? 12.5 : 11}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const t = n.label.length > 34 ? n.label.slice(0, 32) + '…' : n.label, tw = ctx.measureText(t).width; ctx.fillStyle = 'rgba(255,250,244,.85)'; ctx.fillRect(x - tw / 2 - 3, y + r + 2, tw + 6, 15); ctx.fillStyle = '#141111'; ctx.fillText(t, x, y + r + 3); }
      ctx.globalAlpha = 1;
    });
  };
  const hexA = (hex, a) => { const v = parseInt((hex || '#888888').slice(1), 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; };
  const panel = () => {
    const P = document.getElementById('mmP'); if (sel < 0) return; const n = G.nodes[sel], u = tree.find(t => t.id === n.umb);
    const outs = nbr[sel].filter(([, k]) => G.edges[k].kind === 'link').map(([j]) => j), tr = nbr[sel].filter(([, k]) => G.edges[k].kind === 'tree').map(([j]) => j);
    const item = j => `<button class="mm-item" data-sel="${j}"><i style="background:${UMB_COL[G.nodes[j].umb] || '#888'}"></i>${esc(G.nodes[j].label)}</button>`;
    P.innerHTML = `<p class="eyebrow">${n.kind === 'page' ? esc(u ? u.title : '') : n.kind === 'hub' ? 'Area' : 'Start'}</p><h3>${esc(n.label)}</h3>
      ${n.kind === 'page' ? `<p>${vis.has(n.id) ? '✓ You have opened this page.' : 'Not opened yet.'}</p><a class="primary" href="${n.id}">Open page →</a>` : ''}
      <div class="lab-actions"><button class="secondary" id="mmBack">Trace back to start</button><button class="secondary" id="mmFwd">What it unlocks</button></div>
      ${outs.length ? `<p class="eyebrow">Linked pages (${outs.length})</p><div class="mm-list">${outs.map(item).join('')}</div>` : ''}
      ${tr.length ? `<p class="eyebrow">In the contents</p><div class="mm-list">${tr.map(item).join('')}</div>` : ''}<p class="muted" id="mmMsg"></p>`;
    P.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => select(+b.dataset.sel, true));
    document.getElementById('mmBack').onclick = traceBack; document.getElementById('mmFwd').onclick = forward;
  };
  const select = (i, center) => { sel = i; lit = null; pulses = null; if (center) { view.x = G.nodes[i].x; view.y = G.nodes[i].y; view.s = Math.max(view.s, 0.9); } panel(); kick(); };
  const traceBack = () => { // BFS from root over all edges, then walk the selected node back toward the root
    const prev = new Array(N).fill(-1), seen = new Array(N).fill(false), q = [G.root]; seen[G.root] = true;
    while (q.length) { const u = q.shift(); nbr[u].forEach(([v]) => { if (!seen[v] && !hidden.has(G.nodes[v].umb)) { seen[v] = true; prev[v] = u; q.push(v); } }); }
    const path = []; let c = sel; lit = new Set([c]); while (prev[c] >= 0) { path.push([c, prev[c]]); c = prev[c]; lit.add(c); }
    pulses = { path, t0: performance.now() }; document.getElementById('mmMsg').innerHTML = `Route back to the start: ${[...lit].reverse().map(j => esc(G.nodes[j].label)).join(' → ')}. Like backprop, the signal travels from where you are back toward the source, one edge at a time.`; kick(); };
  const forward = () => { const d1 = nbr[sel].map(([j]) => j), d2 = new Set(); d1.forEach(j => nbr[j].forEach(([k]) => d2.add(k))); lit = new Set([sel, ...d1, ...d2]); pulses = null;
    const un = [...lit].filter(j => G.nodes[j].kind === 'page' && !vis.has(G.nodes[j].id));
    document.getElementById('mmMsg').innerHTML = `${lit.size - 1} pages within two steps. ${un.length ? `Not yet opened: ${un.slice(0, 6).map(j => `<a href="${G.nodes[j].id}">${esc(G.nodes[j].label)}</a>`).join(', ')}${un.length > 6 ? '…' : ''}` : 'You have opened all of them.'}`; kick(); };
  // ---- interaction ----
  const pick = (sx, sy) => { const w = cv.clientWidth, h = cv.clientHeight; let best = -1, bd = 1e9; G.nodes.forEach((n, i) => { if (hidden.has(n.umb)) return; const [x, y] = W2S(n.x, n.y, w, h), d = Math.hypot(x - sx, y - sy); if (d < Math.max(10, radius(n) * view.s + 4) && d < bd) { bd = d; best = i; } }); return best; };
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { const [x, y] = pos(e), i = pick(x, y); drag.sx = x; drag.sy = y; drag.moved = false; cv.setPointerCapture(e.pointerId); if (i >= 0) drag.node = G.nodes[i]; else drag.pan = true; });
  cv.addEventListener('pointermove', e => { const [x, y] = pos(e), w = cv.clientWidth, h = cv.clientHeight;
    if (drag.node) { const [wx, wy] = S2W(x, y, w, h); drag.node.x = wx; drag.node.y = wy; drag.node.vx = drag.node.vy = 0; drag.moved = true; alpha = Math.max(alpha, 0.25); kick(); }
    else if (drag.pan) { view.x -= (x - drag.sx) / view.s; view.y -= (y - drag.sy) / view.s; drag.sx = x; drag.sy = y; drag.moved = true; kick(); }
    else { const i = pick(x, y); if (i !== hov) { hov = i; cv.style.cursor = i >= 0 ? 'pointer' : 'grab'; kick(); } } });
  cv.addEventListener('pointerup', e => { const [x, y] = pos(e); if (!drag.moved) { const i = pick(x, y); if (i >= 0) select(i, false); } drag.node = null; drag.pan = false; });
  cv.addEventListener('pointerleave', () => { hov = -1; kick(); });
  cv.addEventListener('dblclick', e => { const [x, y] = pos(e), i = pick(x, y); if (i >= 0 && G.nodes[i].kind === 'page') ngGo(G.nodes[i].id); });
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e), w = cv.clientWidth, h = cv.clientHeight, [wx, wy] = S2W(x, y, w, h); view.s = Math.max(0.15, Math.min(4, view.s * Math.exp(-e.deltaY * 0.0015))); const [nx, ny] = S2W(x, y, w, h); view.x += wx - nx; view.y += wy - ny; kick(); }, { passive: false });
  document.getElementById('mmFit').onclick = () => { fit(); kick(); };
  document.getElementById('mmLabels').onclick = e => { showAll = !showAll; e.currentTarget.setAttribute('aria-pressed', showAll); kick(); };
  document.getElementById('mmShake').onclick = () => { seedLayout(); alpha = 1; for (let i = 0; i < 200; i++) tick(); fit(); kick(); };
  document.getElementById('mmQ').oninput = e => { const q = e.target.value.trim().toLowerCase(); if (q.length < 2) { lit = null; kick(); return; } const hits = G.nodes.map((n, i) => n.label.toLowerCase().includes(q) ? i : -1).filter(i => i >= 0); lit = new Set(hits); if (hits.length) select(hits[0], true); lit = new Set(hits); kick(); };
  document.querySelectorAll('.mm-leg').forEach(b => b.onclick = () => { const u = b.dataset.umb; hidden.has(u) ? hidden.delete(u) : hidden.add(u); b.classList.toggle('off', hidden.has(u)); stSet('ng-mm-hidden', [...hidden]); alpha = 0.5; kick(); });
  // ---- loop: runs while the layout is settling, something is animating, or the view changed ----
  let dirty = true, raf = 0;
  const kick = () => { dirty = true; if (!raf) raf = requestAnimationFrame(loop); };
  const loop = () => { raf = 0; if (!document.body.contains(cv)) return; if (alpha > 0.03 || drag.node) tick(); draw(); if (alpha > 0.03 || pulses || drag.node) raf = requestAnimationFrame(loop); };
  window.addEventListener('resize', () => { if (document.body.contains(cv)) kick(); });
  requestAnimationFrame(() => { fit(); alpha = 0.3; kick(); });
}
