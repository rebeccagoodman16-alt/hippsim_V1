/* ===================== NAVIGATION, LEARNING MAP, PROMPT DECK =====================
   1. Umbrella sidebar: categories → pages → (for the current page) its sections.
   2. Visited tracking + a Learning map page (/map/) with progress per umbrella.
   3. Prompt deck (/practice/prompt-deck/): timed speaking and writing cards with a self-rating rubric. */

/* ---------- visited pages ---------- */
const NG_VISITED = 'ng-visited-v1', NG_OPEN = 'ng-umb-open-v2';
function ngVisited() { try { return new Set(JSON.parse(localStorage.getItem(NG_VISITED) || '[]')); } catch (e) { return new Set(); } }
function ngMarkVisited(p) { try { const s = ngVisited(); s.add(p); localStorage.setItem(NG_VISITED, JSON.stringify([...s])); } catch (e) {} }

/* ---------- the site map: one source of truth for sidebar and learning map ---------- */
/* A topic group (one of the guide's original lesson sets) as a sidebar entry with its lessons. */
const pw = i => ({ href: overviewURL(i), label: lessons[i].tab, kids: [[overviewURL(i), 'Overview'], ...subtopics[i].map((s, j) => [topicURL(i, j), s[0], finished.includes(topicKey(i, j))])] });
/** Which section a topic group lives in (for breadcrumbs). */
window.ngSectionOf = i => { const u = ngTree().find(t => t.pages.some(p => p.href === overviewURL(i))); return u ? u.title : 'Concepts'; };
function ngTree() {
  const practice = g => practiceModules.filter(m => m[3] === g).map(m => {
    const hasLesson = typeof skillLessons !== 'undefined' && skillLessons[m[0]], room = hasLesson && skillHasActivity(m[0]);
    return room ? { href: '/practice/' + m[0] + '/', label: m[1], kids: [['/practice/' + m[0] + '/', 'Learn the skill'], ['/practice/' + m[0] + '/room/', 'Practice room']] } : { href: '/practice/' + m[0] + '/', label: m[1] };
  });
  const L = (list, hrefs, group) => hrefs.map(h => { const f = list.find(x => x[0] === h); return f ? { href: h, label: f[1], group } : null; }).filter(Boolean);
  const bio = bioNavPages(), lab = labNavPages(), ml = mlNavPages(), fit = fittingNavPages(), xp = experimentNavPages(), wb = [['/workbench/', 'All workbenches'], ['/workbench/neuron/', 'Neuron workbench'], ['/workbench/morphology/', 'Morphology workbench'], ['/workbench/phase-plane/', 'Phase-plane workbench'], ['/workbench/synapse/', 'Synapse & plasticity workbench']];
  const g = (o, group) => Object.assign(o, { group });
  return [
    { id: 'start', title: 'Start here', pages: [g({ href: '/', label: 'Home' }, 'Find your way'), g({ href: '/map/', label: 'Learning map & progress' }, 'Find your way'), g({ href: '/connections/', label: 'How everything connects' }, 'Find your way'), g({ href: '/connections/mindmap/', label: 'Mind map of every page' }, 'Find your way'),
      ...studyNavPages().map(([h, l]) => ({ href: h, label: l, group: 'Study tools' }))] },
    { id: 'cells', title: 'Neurons, channels & resonance', pages: [g(pw(0), 'Lessons'), g(pw(7), 'Lessons'), ...L(bio, ['/biology/action-potential/'], 'Interactive deep dive')] },
    { id: 'morph', title: 'Neurons & morphology', pages: [{ href: '/biology/cell-atlas/', label: 'Neuron studio', group: 'Neuron studio: one tool, every real cell', kids: [['/biology/cell-atlas/', 'Browse & compare (3D atlas)'], ['/workbench/morphology/', 'Measure & signals'], ['/biology/neuron-lab/', 'Channels & simulation'], ['/biology/circuit-builder/', 'Circuits'], ['/biology/whole-brain/', 'Whole-brain axons'], ['/biology/active-dendrites/', 'Verified in NEURON: active dendrites'], ['/biology/axo-axonic/', 'Verified in NEURON: axo-axonic synapses'], ['/biology/dendritic-resonance/', 'Verified in NEURON: dendritic resonance'], ['/biology/neuron-viewer/', 'Full screen & rotation videos']] },
      g(pw(6), 'Learn: dendrites & cables'), ...morphChapters.map(c => ({ href: '/morphology/' + c[0] + '/', label: c[1], group: 'Learn: dendrites & cables' }))] },
    { id: 'dyn', title: 'Dynamical systems', pages: [g(pw(1), 'Lessons'), g(pw(8), 'Lessons'), g({ href: '/biology/ca1-bursting/', label: 'CA1 bursting: I_NaP & I_M (Golomb 2006)' }, 'Models from papers')] },
    { id: 'circ', title: 'Synapses, circuits & networks', pages: [g(pw(2), 'Lessons'), g(pw(3), 'Lessons'), g(pw(4), 'Lessons'),
      ...L(bio, ['/biology/real-circuit/', '/biology/network/'], 'Real hippocampal circuits'), ...L(xp, ['/experiments/ca1-circuit/'], 'Real hippocampal circuits')] },
    { id: 'body', title: 'Brain, body & behaviour', pages: [...L(bio, ['/biology/mechanisms/', '/biology/reflex/', '/biology/giant-fiber/'], 'Movement & reflexes'),
      ...spatialNavPages().map(([h, l]) => ({ href: h, label: l, group: 'Spatial navigation & memory' })), ...L(xp, ['/experiments/place-cells/'], 'Spatial navigation & memory'),
      ...L(bio, ['/biology/alzheimers/'], 'Disease'), ...L(bio, ['/biology/histology/', '/biology/', '/biology/techniques/'], 'Seeing real tissue & data')] },
    { id: 'ml', title: 'Learning & machine learning', pages: [g(pw(5), 'Lessons'), g({ href: '/ml/', label: 'ML overview & glossary' }, 'ML for neuroscience'), ...ml.map(([h, l]) => ({ href: h, label: l, group: 'ML for neuroscience' }))] },
    { id: 'fit', title: 'Data, fitting & validation', pages: [g(pw(9), 'Lessons'), g({ href: '/experiments/', label: 'Experiment → model overview' }, 'From experiment to model'), ...L(xp, ['/experiments/ephys/'], 'From experiment to model'),
      g({ href: '/fitting/', label: 'Fitting studio overview' }, 'Fitting studio'), ...fit.map(([h, l]) => ({ href: h, label: l, group: 'Fitting studio' }))] },
    { id: 'sim', title: 'Simulators & tools', pages: [...wb.filter(([h]) => h !== '/workbench/morphology/').map(([h, l]) => ({ href: h, label: l, group: 'Workbenches: one model, every option' })),
      g({ href: '/lab/', label: 'Model lab overview' }, 'Model lab: five classic models'), ...lab.map(([h, l]) => ({ href: h, label: l, group: 'Model lab: five classic models' }))] },
    { id: 'research', title: 'My research', pages: [g({ href: '/biology/research/', label: 'Research overview' }, 'Overview'),
      g({ href: '/biology/research-ca1-cell/', label: 'The CA1 pyramidal neuron' }, 'Biology'), g({ href: '/biology/research-circuit/', label: 'CA1 circuit: theta & gamma' }, 'Biology'),
      g({ href: '/biology/research-lowet-2023/', label: 'Lowet et al. 2023: two output modes' }, 'Data'),
      g({ href: '/biology/interleaved-resonance/', label: 'Model ladder (simulator)' }, 'Models'), g({ href: '/biology/research-morphology/', label: 'Research model on a real CA1 cell' }, 'Models'), g({ href: '/biology/research-place-fields/', label: 'Place field formation (BTSP)' }, 'Models'), g({ href: '/biology/ca1-bursting/', label: 'Golomb 2006 bursting model' }, 'Models'),
      g({ href: '/biology/research-resonance/', label: 'Resonance experiment (Z(f), fR, Q)' }, 'Methods & code'), g({ href: '/biology/research-spiking/', label: 'Spiking analysis (f–I, bursts, phase locking)' }, 'Methods & code'), g({ href: '/biology/research-reproduction/', label: 'Reproduction vs Ceballos et al. 2025' }, 'Methods & code'), g({ href: '/biology/research-reduction/', label: 'Reduction (derivative conductances)' }, 'Methods & code'),
      g({ href: '/biology/research-code/', label: 'Python code (ir_ladder)' }, 'Methods & code')] },
    { id: 'practice', title: 'Practice', pages: [g({ href: '/practice/', label: 'All practice rooms' }, 'Hands-on models'), ...practice('Hands-on models').map(o => g(o, 'Hands-on models')),
      ...practice('Scientific judgment').map(o => g(o, 'Scientific judgment')), ...practice('Scientific communication').map(o => g(o, 'Communication'))] },
  ];
}
const ngAllPages = () => ngTree().flatMap(u => u.pages.flatMap(p => p.kids ? p.kids.map(k => ({ href: k[0], label: k[1], umb: u.id })) : [{ href: p.href, label: p.label, umb: u.id }]));

/* ---------- sidebar ---------- */
window.ngNavHTML = function () {
  const p = ngPath(), vis = ngVisited(); let openSet; try { openSet = new Set(JSON.parse(localStorage.getItem(NG_OPEN) || '[]')); } catch (e) { openSet = new Set(); }
  const tick = (href, done) => done ? '<span class="ng-tick">✓</span>' : vis.has(href) ? '<span class="ng-seen" title="Visited">•</span>' : '';
  const link = (href, label, cls = '', done = false) => `<a class="ng-link ${cls}" href="${href}" ${p === href ? 'aria-current="page"' : ''}>${tick(href, done)}<span>${label}</span></a>${p === href ? '<details class="ng-onpage" id="ng-onpage" hidden><summary>On this page</summary><div class="ng-secs" id="ng-secs"></div></details>' : ''}`;
  return ngTree().map(u => {
    const contains = u.pages.some(pg => pg.href === p || (pg.kids || []).some(k => k[0] === p));
    const open = contains || openSet.has(u.id);
    let lastG = null; const head = pg => { if (!pg.group || pg.group === lastG) return ''; lastG = pg.group; return `<div class="ng-group">${pg.group}</div>`; };
    return `<details class="ng-umb ${contains ? 'ng-here' : ''}" data-umb="${u.id}" ${open ? 'open' : ''}><summary>${u.title}<small>${u.pages.reduce((n, pg) => n + (pg.kids ? pg.kids.length : 1), 0)}</small></summary><div class="ng-body"><a class="ng-link ng-sec-link" href="/section/${u.id}/" ${p === '/section/' + u.id + '/' ? 'aria-current="page"' : ''}><span>Section overview</span></a>${u.pages.map(pg => {
      const hd = head(pg); if (!pg.kids) return hd + link(pg.href, pg.label);
      const inside = pg.kids.some(k => k[0] === p);
      return hd + `<details class="ng-page" ${inside ? 'open' : ''}><summary>${pg.label}</summary>${pg.kids.map(k => link(k[0], k[1], 'ng-kid', k[2])).join('')}</details>`;
    }).join('')}</div></details>`;
  }).join('');
};
document.addEventListener('click', e => { const sm = e.target.closest && e.target.closest('.ng-umb > summary'); if (sm) sm.parentElement._user = true; }, true);
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.classList || !d.classList.contains('ng-umb') || !d._user) return; d._user = false;
  try { const s = new Set(JSON.parse(localStorage.getItem(NG_OPEN) || '[]')); d.open ? s.add(d.dataset.umb) : s.delete(d.dataset.umb); localStorage.setItem(NG_OPEN, JSON.stringify([...s])); } catch (err) {}
}, true);
/** List the current page's sections under its sidebar entry. */
function ngFillSections() {
  const box = document.getElementById('ng-secs'), L = document.getElementById('lesson'); if (!box || !L) return;
  const secs = [...L.querySelectorAll('section[id], .lesson-section[id]')].map(s => [s.id, (s.querySelector('h2')?.textContent || '').trim()]).filter(([, t]) => t);
  const seen = new Set(), list = secs.filter(([id]) => !seen.has(id) && seen.add(id)).slice(0, 14);
  box.innerHTML = list.length ? list.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('') : '';
  const d = document.getElementById('ng-onpage'); if (d) d.hidden = list.length < 2;
}
let ngFillT; new MutationObserver(() => { clearTimeout(ngFillT); ngFillT = setTimeout(ngFillSections, 120); }).observe(document.getElementById('lesson'), { childList: true, subtree: false });

/* ---------- drawer sidebar: hidden until you open it; pin to keep it docked ---------- */
const NG_PIN = 'ng-pin-v1';
function ngSetupDrawer() {
  const header = document.querySelector('body > header'), aside = document.querySelector('main > aside'); if (!header || !aside || document.getElementById('ng-menu')) return;
  header.insertAdjacentHTML('afterbegin', '<button class="ng-menu" id="ng-menu" aria-controls="ng-aside" aria-expanded="false"><span aria-hidden="true">☰</span> Contents</button>');
  aside.id = 'ng-aside';
  aside.insertAdjacentHTML('afterbegin', '<div class="ng-drawer-head"><b>Contents</b><span><button class="ng-pin" id="ng-pin" aria-pressed="false" title="Keep the contents panel open beside the page">Pin</button><button class="ng-x" id="ng-x" aria-label="Close contents">✕</button></span></div>');
  document.body.insertAdjacentHTML('beforeend', '<div class="ng-scrim" id="ng-scrim" hidden></div>');
  let pinned = false; try { pinned = localStorage.getItem(NG_PIN) === '1'; } catch (e) {}
  const apply = () => { document.body.classList.toggle('ng-pinned', pinned); document.getElementById('ng-pin').setAttribute('aria-pressed', pinned); document.getElementById('ng-pin').textContent = pinned ? 'Unpin' : 'Pin'; };
  window.ngDrawer = open => { if (pinned && matchMedia('(min-width: 1000px)').matches) return; document.body.classList.toggle('ng-drawer-open', open); document.getElementById('ng-scrim').hidden = !open; document.getElementById('ng-menu').setAttribute('aria-expanded', open); if (open) { const cur = aside.querySelector('[aria-current]'); (cur || aside).scrollIntoView({ block: 'center' }); } };
  document.getElementById('ng-menu').onclick = () => { if (pinned && matchMedia('(min-width: 1000px)').matches) { pinned = false; try { localStorage.setItem(NG_PIN, '0'); } catch (e) {} apply(); return; } ngDrawer(!document.body.classList.contains('ng-drawer-open')); };
  document.getElementById('ng-x').onclick = () => { if (pinned) { pinned = false; try { localStorage.setItem(NG_PIN, '0'); } catch (e) {} apply(); } ngDrawer(false); };
  document.getElementById('ng-scrim').onclick = () => ngDrawer(false);
  document.getElementById('ng-pin').onclick = () => { pinned = !pinned; try { localStorage.setItem(NG_PIN, pinned ? '1' : '0'); } catch (e) {} ngDrawer(false); apply(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('ng-drawer-open')) ngDrawer(false); });
  apply();
}
ngSetupDrawer();

/* ---------- after every render: figures, visit tracking, drawer close ---------- */
window.ngAfterRender = function () {
  const p = ngPath(); ngMarkVisited(p); if (p !== '/') { try { localStorage.setItem('ng-last-v1', p); } catch (e) {} }
  if (window.ngInjectFigures) ngInjectFigures();
  if (p === '/biology/techniques/' && window.drawCalciumDemo) requestAnimationFrame(drawCalciumDemo);
  if (window.ngDrawer) ngDrawer(false);
};

/* ---------- cleaner home page ---------- */
window.renderHomeNG = function () {
  document.title = 'Little Neural Guide';
  let last = null; try { last = localStorage.getItem('ng-last-v1'); } catch (e) {}
  const all = ngAllPages(), lastPg = last && all.find(x => x.href === last), vis = ngVisited(), next = NG_ROUTE.find(r => !vis.has(r[0]));
  const blurbs = { wb: 'One shared model per scale: any neuron, any reconstruction, any phase plane, with every control in one place.', start: 'Your learning map, progress and how the pieces fit together.', study: 'The guide as a textbook, flashcards, your progress report and a research notebook.', ml: 'Plasticity and computation, then nodes, edges, backprop and RNNs up to mean field.', cells: 'Channels, Hodgkin–Huxley and the currents behind CA1 theta resonance.', morph: 'Electrotonic distance, compartments, cables and real reconstructions.', dyn: 'Phase portraits, nullclines, stability, bifurcations and resonance.', circ: 'Synapses and E/I balance, spiking networks, rate models and mean-field theory.', bio: 'Reflex, muscle and synapse mechanisms, the fly escape circuit, the worm connectome, real recordings and techniques.', lab: 'Five live models from Hodgkin–Huxley to a trainable neural network.', exp: 'Patch-clamp fitting, place cells during navigation and the CA1 circuit.', fit: 'Sensitivity and identifiability, loss landscapes, bootstrap, model comparison and likelihoods.', hands: 'Workspaces, phase studio, predictions and challenges.', judg: 'Evidence, uncertainty, reviewing and reading papers critically.', comm: 'Panels, writing, figures and a timed prompt deck.' };
  $('lesson').innerHTML = `<div class="hero home-hero"><span class="pill">${all.length} PAGES · ${ngTree().length} AREAS</span><h1>A little structure.<br>A lot to discover.</h1><p class="lead">Build your way from ion channels to networks, models to data, and experiments to explanations. CA1 resonance and Alzheimer’s disease are the thread.</p></div>
  <div class="home-continue">${lastPg ? `<a class="home-pick" href="${lastPg.href}"><span class="eyebrow">Continue where you left off</span><b>${lastPg.label}</b></a>` : ''}${next ? `<a class="home-pick" href="${next[0]}"><span class="eyebrow">Recommended next step</span><b>${next[1]}</b><small>${next[2]}</small></a>` : ''}<a class="home-pick" href="/map/"><span class="eyebrow">Your learning map</span><b>See every page and your progress</b></a></div>
  <div class="home-areas">${ngTree().filter(u => u.id !== 'start').map(u => { const first = u.pages[0]; const n = u.pages.reduce((k, pg) => k + (pg.kids ? pg.kids.length : 1), 0); return `<a class="home-area" href="${first.href}"><span class="eyebrow">${n} pages</span><h2>${u.title}</h2><p>${blurbs[u.id] || ''}</p></a>`; }).join('')}</div>${smallPrint()}`;
};


/* ---------- learning map ---------- */
const NG_ROUTE = [
  ['/topics/channels/membrane-circuit/', 'Membrane as a circuit', 'Why voltage changes'],
  ['/topics/channels/hh-gates/', 'HH gates', 'How channels open and close'],
  ['/lab/hh/', 'Model lab: Hodgkin–Huxley', 'Run a full spiking neuron'],
  ['/topics/dynamics/nullclines/', 'Nullclines & fixed points', 'The geometry of dynamics'],
  ['/topics/dynamics/resonance-measurement/', 'Resonance & measurement', 'Impedance and frequency preference'],
  ['/topics/ca1-resonance/ih-and-m-current/', 'I_h and M-current', 'The currents behind CA1 resonance'],
  ['/experiments/ephys/', 'Patch clamp to model', 'Fit a CA1 cell to recordings'],
  ['/fitting/landscape/', 'Loss landscapes', 'Know what your data can pin down'],
  ['/fitting/model-comparison/', 'Compare models', 'Decide whether I_h is needed'],
  ['/experiments/ca1-circuit/', 'The CA1 circuit', 'Where inputs land on the cell'],
  ['/topics/networks/spiking-neurons/', 'Spiking neurons', 'From cells to networks'],
  ['/lab/brunel/', 'Model lab: Brunel network', 'E/I balance and hyperexcitability'],
  ['/lab/wilson-cowan/', 'Model lab: Wilson–Cowan', 'Rhythms from E–I loops'],
  ['/ml/nodes-edges/', 'Nodes, edges & weights', 'The building blocks of networks'],
  ['/ml/backprop/', 'Backprop, step by step', 'How networks learn'],
  ['/ml/mean-field-bridge/', 'Networks → mean field', 'Why Wilson–Cowan is a 2-node RNN'],
  ['/experiments/place-cells/', 'Place cells & behavior', 'Spatial coding and its degradation'],
  ['/fitting/place-field/', 'Fit a place field', 'Likelihoods for spike data'],
  ['/practice/question-lab/', 'Questioning & evidence', 'Make claims your data support'],
  ['/practice/prompt-deck/', 'Prompt deck', 'Practise explaining it out loud'],
];
window.renderMap = function () {
  document.title = 'Learning map · Little Neural Guide';
  const vis = ngVisited(), tree = ngTree();
  const done = h => vis.has(h) || (h.startsWith('/topics/') && finished.length && ngAllPages().some(p => p.href === h) && false);
  const routeDone = NG_ROUTE.filter(r => vis.has(r[0])).length, nextStep = NG_ROUTE.find(r => !vis.has(r[0]));
  $('lesson').innerHTML = `<a class="breadcrumb" href="/">Home</a><div class="hero"><span class="pill">LEARNING MAP · ${ngAllPages().length} PAGES · ${tree.length} AREAS</span><h1>Where you are,<br>where to go next.</h1><p class="lead">Every page in the guide, grouped by area, with what you have visited in this browser. Follow the recommended route for CA1 and Alzheimer’s modeling, or explore any area.</p></div>
  <section class="lesson-section" id="map-route"><p class="eyebrow">Recommended route · ${routeDone} of ${NG_ROUTE.length} visited</p><h2>From channels to a CA1 disease model</h2>
    ${nextStep ? `<div class="box pink ng-next"><div><p class="eyebrow">Your next step</p><h3>${nextStep[1]}</h3><p>${nextStep[2]}</p></div><a class="primary" href="${nextStep[0]}">Go →</a></div>` : '<div class="box pink"><h3>Route complete</h3><p>You have visited every step. Revisit the fitting studio with your own data next.</p></div>'}
    <ol class="ng-route">${NG_ROUTE.map((r, i) => `<li class="${vis.has(r[0]) ? 'ng-done' : ''}"><a href="${r[0]}"><span class="ng-step">${vis.has(r[0]) ? '✓' : i + 1}</span><span><b>${r[1]}</b><small>${r[2]}</small></span></a></li>`).join('')}</ol></section>
  <section class="lesson-section" id="map-areas"><p class="eyebrow">All areas</p><h2>Progress by area</h2><div class="ng-areas">${tree.map(u => {
    const pgs = u.pages.flatMap(p => p.kids ? p.kids.map(k => ({ href: k[0], label: k[1], group: p.label, done: k[2] })) : [{ href: p.href, label: p.label }]);
    const n = pgs.filter(x => vis.has(x.href) || x.done).length, pct = Math.round(100 * n / pgs.length);
    return `<details class="box ng-area" id="area-${u.id}"><summary><span><b>${u.title}</b><small>${n} of ${pgs.length} visited</small></span><span class="ng-bar"><i style="width:${pct}%"></i></span></summary><ul>${pgs.map(x => `<li class="${vis.has(x.href) || x.done ? 'ng-done' : ''}"><a href="${x.href}">${x.group ? `<small>${x.group} ·</small> ` : ''}${x.label}</a></li>`).join('')}</ul></details>`;
  }).join('')}</div><p class="muted">Visits and completion are stored only in this browser.</p><button class="secondary" id="ng-reset-visits">Reset visited pages</button></section>${smallPrint()}`;
  document.getElementById('ng-reset-visits').onclick = () => { try { localStorage.removeItem(NG_VISITED); } catch (e) {} renderMap(); sidebar(true); };
};

/* ---------- prompt deck: timed speaking & writing practice ---------- */
const DECK = [
  { cat: 'Explain it', t: 60, p: 'Explain theta resonance in CA1 to a high-school student.', tips: ['Open with an everyday analogy: a swing goes highest when pushed at its natural rhythm.', 'Give one number: CA1 cells respond best to inputs around 4–7 Hz.', 'End with why it matters: timing helps the hippocampus organize memories.'], model: 'Neurons are not just on–off switches; some respond best to inputs that arrive at a particular rhythm, like a swing that goes highest when you push it in time. In the hippocampus, cells called CA1 pyramidal cells prefer rhythms of about 4 to 7 pushes per second, the same “theta” rhythm the brain produces while an animal explores. Special ion channels make that preference. Matching rhythms may help the hippocampus line up information about where you are and when.' },
  { cat: 'Explain it', t: 60, p: 'Explain what a place cell is to an engineer with no neuroscience background.', tips: ['Define it by input and output: position in, spike rate out.', 'Use a sensor analogy carefully, then state where it breaks.', 'Mention how it is measured.'], model: 'A place cell is a neuron in the hippocampus whose firing rate depends on the animal’s location: it fires mostly when the animal is in one region, its place field. Think of each cell as a location-tuned detector; a population of a few dozen can encode position to within centimetres, which we can verify by decoding position from spikes. Unlike a GPS sensor, fields can remap between environments and drift over days, so it is a learned, flexible code.' },
  { cat: 'Explain it', t: 90, p: 'Explain to a biologist why your model uses a two-compartment neuron instead of a full morphology.', tips: ['Lead with the question the model answers.', 'Name what two compartments capture and what they miss.', 'Say how you will check the simplification.'], model: 'My question is how dendritic and somatic currents interact to produce theta resonance and phase locking. Two compartments are the simplest structure that separates dendrite from soma, so they capture input location and the dendro-somatic delay without hundreds of unconstrained parameters. They cannot represent where along the dendrite inputs land or branch-specific spikes. To check the simplification, I will move the same channel set into a reconstructed morphology and test whether the conclusions change.' },
  { cat: 'Explain it', t: 60, p: 'Explain phase precession to a first-year student.', tips: ['Start from theta as a clock.', 'Describe what changes as the animal crosses the field.', 'Say why it is interesting.'], model: 'While a rat runs, its hippocampus produces a regular electrical rhythm about eight times a second, like a ticking clock. A place cell fires when the rat passes through its spot, and as the rat moves through that spot, the cell fires earlier and earlier in each tick. So the timing of spikes, not just how many, tells you where the rat is within the field, and sequences of places get compressed into each tick.' },
  { cat: 'Elevator pitch', t: 30, p: 'Pitch your research in 30 seconds at a poster session.', tips: ['Problem → approach → why it matters.', 'One concrete detail, no jargon stack.', 'Finish with an invitation to ask.'], model: 'In Alzheimer’s, the hippocampus becomes hyperexcitable early, before memory fails. I build computational models of hippocampal CA1 neurons and circuits to test which cellular changes, like weaker inhibition or altered ion channels, could produce that hyperexcitability and disrupt spatial coding. The goal is to point experiments at the mechanisms most worth targeting. Happy to show you how the model works.' },
  { cat: 'Elevator pitch', t: 60, p: 'Tell a funder why computational models help Alzheimer’s research.', tips: ['Name a gap experiments struggle with.', 'Say what a model can do that experiments cannot.', 'Be honest about what models need from experiments.'], model: 'Alzheimer’s involves changes at many scales at once: channels, synapses, interneurons and whole-network rhythms. Experiments usually change several at a time, so it is hard to know which change causes the circuit to fail. A model lets us change one thing at a time, predict the consequences, and rank which mechanisms matter most, so lab time is spent on the best candidates. Models are only as good as the data they are fitted to, which is why we pair every prediction with an experiment that can test it.' },
  { cat: 'Elevator pitch', t: 45, p: 'Introduce yourself and your path from wet lab to modeling to a new PI.', tips: ['Turn the transition into a strength.', 'Name one concrete skill from each side.', 'Say what you want to learn next.'], model: 'I started in wet-lab research on neuroinflammation and glia, so I know how experiments are designed and where the data come from, including their noise and limitations. I moved into computational modeling to test mechanisms more systematically; I now build CA1 neuron and network models in Python and Brian2. I am especially interested in fitting models to electrophysiology so that predictions stay tied to real measurements.' },
  { cat: 'Panel question', t: 60, p: '“How do you know your model isn’t just fitting noise?”', tips: ['Answer, evidence, limit, next.', 'Distinguish fitted from predicted results.', 'Mention held-out data or cross-validation.'], model: 'Answer: by testing it on data it was not fitted to. Evidence: parameters were fitted to current-step responses, and the model then predicted the impedance peak from chirp recordings within the experimental range. Limit: some dendritic parameters are weakly constrained, so I report results across their plausible range. Next: dendritic recordings would tighten those and give a stronger test.' },
  { cat: 'Panel question', t: 60, p: '“Why should we trust a rodent CA1 model for human Alzheimer’s disease?”', tips: ['Concede the valid concern first.', 'State what transfers and what may not.', 'Offer a bridge (human data, conserved mechanisms).'], model: 'That is a fair concern: human pyramidal cells are larger and differ in some channel properties. What I expect to transfer is the direction of effects, such as weaker inhibition raising excitability, because those mechanisms are conserved. Quantitative predictions should not be transferred without human data, so a next step is to refit key parameters to human slice recordings where available.' },
  { cat: 'Panel question', t: 45, p: '“Your network is only 1,000 neurons. Is that enough?”', tips: ['Clarify what claim depends on size.', 'Mention a scaling check.', 'Keep it short.'], model: 'For absolute numbers like oscillation frequency, no, those shift with size. My claims are about the direction of change as inhibition weakens, and I checked that the direction holds at four times the size. A full-scale model would be needed for quantitative predictions.' },
  { cat: 'Panel question', t: 60, p: '“What result would falsify your hypothesis?”', tips: ['Name a specific measurable outcome.', 'Say what you would conclude instead.', 'Show you welcome the test.'], model: 'If restoring interneuron synaptic strength in the model, or in slices, does not reduce CA1 hyperexcitability, then weakened inhibition is not the main driver. In that case I would look next at intrinsic changes, such as reduced potassium currents, which the model can test the same way.' },
  { cat: 'Critique', t: 60, p: 'Critique this claim: “Our model proves amyloid-β causes hippocampal hyperexcitability.”', tips: ['Separate what was shown from what is claimed.', 'Find the missing link.', 'Rewrite it at the right strength.'], model: 'The model never contained amyloid, so it cannot show amyloid causes anything. At most it shows that a parameter change, for example 30% weaker inhibition, is sufficient to cause hyperexcitability in the model. A defensible version: “In the model, weakening inhibition was sufficient to double CA1 firing, consistent with proposals that amyloid-associated interneuron dysfunction contributes to hyperexcitability.”' },
  { cat: 'Critique', t: 90, p: 'Adding dendritic I_h increased theta power in a model. Give three alternative explanations.', tips: ['A different mechanism, a confound, a method artifact.', 'Attach a test to each.', 'Be specific about the model.'], model: '1) Confound: I_h depolarized rest and changed input resistance; test by holding V_rest constant with a leak adjustment. 2) Metric artifact: theta power rose because overall activity rose; normalize by total power. 3) Statistics: a single seed or short run; repeat across 20 seeds with a surrogate null. 4) Alternative mechanism: changed dendro-somatic coupling; vary coupling with I_h fixed.' },
  { cat: 'Critique', t: 60, p: 'Turn “Does inhibition matter for CA1 rhythms?” into a discriminating question.', tips: ['Name a manipulation.', 'Name the outcome each hypothesis predicts.', 'Make it doable.'], model: 'If PV-mediated perisomatic inhibition paces gamma, then reducing PV synaptic strength by 50% should lower gamma frequency and power while leaving theta largely intact; if OLM-mediated distal inhibition dominates, the same manipulation should change theta–gamma coupling rather than gamma frequency.' },
  { cat: 'Figure talk', t: 45, p: 'Walk an audience through a raster plot with a population-rate trace.', tips: ['Axes first: what is a row, what is a dot.', 'Then the pattern.', 'Then the take-home.'], model: 'Each row is one neuron and each dot one spike, over 400 milliseconds. Notice there are no vertical stripes: cells fire at different times. The trace below is the population rate, which stays flat and noisy. So this network is in the asynchronous irregular state: busy, but not synchronized.' },
  { cat: 'Figure talk', t: 60, p: 'Describe a figure of impedance versus frequency at two holding voltages.', tips: ['Define impedance in one phrase.', 'Point to the peak and how it moves.', 'Say what mechanism it implies.'], model: 'This shows how strongly the cell’s voltage responds to small oscillating currents at each frequency. At −60 mV there is a peak near 5 Hz, which is resonance. At −75 mV the peak shifts and changes size. Because different currents are active at different voltages, this tells us two mechanisms contribute: M-current near rest and h-current when hyperpolarized.' },
  { cat: 'Figure talk', t: 45, p: 'Explain to a colleague whether to show SD or SEM error bars.', tips: ['Say what each means.', 'Tie the choice to the question.', 'Always state n.'], model: 'SD shows how variable individual measurements are; SEM shows how precisely we know the mean, and it shrinks as n grows. If the point is variability between cells, use SD. If it is comparing group means, use a confidence interval rather than SEM. Either way, say which it is and give n, ideally with the individual points plotted.' },
  { cat: 'Writing', t: 120, p: 'Write a three-sentence results paragraph for the STDP lab.', tips: ['Topic sentence = the finding.', 'Numbers with units and n.', 'Implication in the last sentence.'], model: 'Under additive STDP with depression 20% stronger than potentiation, synapses from correlated inputs potentiated while independent inputs depressed. After 300 s of simulated training, mean correlated weights reached 0.98 of the maximum versus 0.22 for independent inputs. Timing-dependent plasticity alone can therefore select inputs that carry a shared signal, without any supervision.' },
  { cat: 'Writing', t: 120, p: 'Write a constructive review weakness about a model whose parameters are taken from the literature without fitting.', tips: ['What, where, why it matters, what would fix it.', 'Tag major or minor.', 'No judgments about the authors.'], model: 'Major (Aim 1). Channel and synaptic parameters are drawn from studies of different species, ages and temperatures, and no fitting or sensitivity analysis is planned. Network predictions may therefore depend on arbitrary combinations. Fitting key parameters to one consistent dataset, and reporting results across plausible ranges, would make the predictions interpretable.' },
  { cat: 'Writing', t: 30, p: 'Write an assertion-style slide title for the Brunel AI result.', tips: ['A full sentence with a verb.', 'The claim, not the topic.', 'Under 12 words.'], model: 'Inhibition-dominated networks fire irregularly and asynchronously.' },
];
const RUBRIC = ['Main point in the first sentence', 'Evidence, number or example', 'Pitched to the audience; no unexplained jargon', 'Limits or uncertainty acknowledged', 'Finished within the time'];
const DECK_KEY = 'ng-deck-v1';
function deckLog() { try { return JSON.parse(localStorage.getItem(DECK_KEY) || '[]'); } catch (e) { return []; } }
window.extraPracticeHandlers = window.extraPracticeHandlers || {};
extraPracticeHandlers['prompt-deck'] = function renderPromptDeck() {
  const cats = [...new Set(DECK.map(c => c.cat))];
  $('lesson').insertAdjacentHTML('beforeend', `
  <section class="lesson-section" id="deck-how"><p class="eyebrow">How it works</p><h2>Draw a card, start the timer, answer out loud</h2>
    <ol class="ml-how"><li><b>Pick a category</b> or shuffle across all of them.</li><li><b>Start the timer</b> and answer out loud (or in writing for Writing cards). Use the notes box to sketch an outline first if you like.</li><li><b>Flip the card</b> to see tips and a model answer. Compare, don’t copy: yours should sound like you.</li><li><b>Rate yourself</b> on the five-point rubric. Your history stays in this browser.</li></ol></section>
  <section class="lesson-section lab" id="deck"><p class="eyebrow">Prompt deck · ${DECK.length} cards</p><h2>Practise</h2>
    <div class="deck-cats" role="group" aria-label="Category"><button class="secondary" data-dcat="all" aria-pressed="true">All</button>${cats.map(c => `<button class="secondary" data-dcat="${c}" aria-pressed="false">${c}</button>`).join('')}</div>
    <div class="deck-stage">
      <div class="deck-card" id="deckCard"><div class="deck-front"><div class="deck-top"><span class="pill" id="deckCat"></span><span class="deck-count" id="deckCount"></span></div><p class="deck-prompt" id="deckPrompt"></p>
        <div class="deck-timer"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="deck-ring-bg"/><circle cx="60" cy="60" r="52" class="deck-ring" id="deckRing"/></svg><div class="deck-time" id="deckTime" role="timer" aria-live="off"></div></div>
        <div class="lab-actions deck-ctl"><button class="primary" id="deckStart">Start</button><button class="secondary" id="deckReset">Reset</button><button class="secondary" id="deckFlip">Flip card</button><button class="secondary" id="deckNext">Next card →</button></div></div>
        <div class="deck-back" hidden><div class="deck-top"><span class="pill">Tips &amp; model answer</span><button class="secondary" id="deckBack">← Back to prompt</button></div><ul class="skill-tips" id="deckTips"></ul><p class="eyebrow">A model answer</p><p class="deck-model" id="deckModel"></p></div>
      </div>
      <div class="deck-side"><label for="deckNotes">Notes or written answer</label><textarea id="deckNotes" rows="6" placeholder="Outline: point → evidence → limit → next"></textarea>
        <div class="box tan deck-rubric"><h3>Rate your answer</h3>${RUBRIC.map((r, i) => `<label class="compare-label"><input type="checkbox" data-rub="${i}"> ${r}</label>`).join('')}<button class="primary" id="deckSave">Save rating</button><p class="muted" id="deckSaved" role="status"></p></div>
        <div class="box deck-stats" id="deckStats"></div></div>
    </div></section>`);
  let cat = 'all', order = [], idx = 0, left = 0, total = 0, timer = null, actx = null;
  const pool = () => DECK.filter(c => cat === 'all' || c.cat === cat);
  const shuffle = () => { order = pool().map((_, i) => i).sort(() => Math.random() - .5); idx = 0; };
  const card = () => pool()[order[idx]];
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
  const ring = () => { const c = 2 * Math.PI * 52, f = total ? left / total : 1; const r = $('deckRing'); r.style.strokeDasharray = c; r.style.strokeDashoffset = c * (1 - f); r.classList.toggle('deck-low', left <= 10 && left > 0); $('deckTime').textContent = left > 0 ? fmtT(left) : 'Time'; };
  const stop = () => { clearInterval(timer); timer = null; $('deckStart').textContent = left > 0 && left < total ? 'Resume' : 'Start'; };
  const beep = () => { try { if (!actx) return; const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 660; g.gain.setValueAtTime(.12, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + .5); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .5); } catch (e) {} };
  const show = () => {
    const c = card(); stop(); total = left = c.t;
    $('deckCat').textContent = `${c.cat} · ${c.t} s`; $('deckCount').textContent = `Card ${idx + 1} of ${order.length}`; $('deckPrompt').textContent = c.p;
    $('deckTips').innerHTML = c.tips.map(t => `<li>${t}</li>`).join(''); $('deckModel').textContent = c.model;
    document.querySelector('.deck-front').hidden = false; document.querySelector('.deck-back').hidden = true; $('deckCard').classList.remove('deck-done');
    document.querySelectorAll('[data-rub]').forEach(x => x.checked = false); $('deckNotes').value = ''; $('deckSaved').textContent = ''; ring();
  };
  const stats = () => {
    const log = deckLog(), byCat = {}; log.forEach(l => { (byCat[l.cat] = byCat[l.cat] || []).push(l.score); });
    $('deckStats').innerHTML = `<h3>Your practice</h3>${log.length ? `<p><b>${log.length}</b> cards rated · average <b>${(log.reduce((s, l) => s + l.score, 0) / log.length).toFixed(1)}</b> / 5</p><ul class="deck-catstats">${Object.entries(byCat).map(([k, v]) => `<li><span>${k}</span><span class="ng-bar"><i style="width:${v.reduce((a, b) => a + b, 0) / v.length / 5 * 100}%"></i></span><small>${v.length}</small></li>`).join('')}</ul>` : '<p class="muted">Rate a card to start tracking your practice.</p>'}`;
  };
  $('deckStart').onclick = () => {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    if (timer) return stop(); if (left <= 0) left = total;
    $('deckStart').textContent = 'Pause';
    timer = setInterval(() => { left--; ring(); if (left <= 0) { stop(); beep(); $('deckCard').classList.add('deck-done'); $('deckStart').textContent = 'Restart'; } }, 1000);
  };
  $('deckReset').onclick = () => { stop(); left = total; ring(); $('deckCard').classList.remove('deck-done'); };
  $('deckFlip').onclick = () => { document.querySelector('.deck-front').hidden = true; document.querySelector('.deck-back').hidden = false; };
  $('deckBack').onclick = () => { document.querySelector('.deck-front').hidden = false; document.querySelector('.deck-back').hidden = true; };
  $('deckNext').onclick = () => { idx = (idx + 1) % order.length; if (idx === 0) shuffle(); show(); };
  $('deckSave').onclick = () => {
    const score = [...document.querySelectorAll('[data-rub]')].filter(x => x.checked).length, c = card();
    try { const log = deckLog(); log.push({ cat: c.cat, p: c.p, score, at: Date.now() }); localStorage.setItem(DECK_KEY, JSON.stringify(log.slice(-300))); } catch (e) {}
    $('deckSaved').textContent = `Saved: ${score} of 5. ${score >= 4 ? 'Strong answer.' : score >= 2 ? 'Pick one unchecked item to focus on next time.' : 'Try the card again after reading the tips.'}`; stats();
  };
  document.querySelectorAll('[data-dcat]').forEach(b => b.onclick = () => { cat = b.dataset.dcat; document.querySelectorAll('[data-dcat]').forEach(x => x.setAttribute('aria-pressed', x === b)); shuffle(); show(); });
  const want = (location.hash.match(/deck-(\w+)/) || [])[1]; if (want) { const c = cats.find(x => x.toLowerCase().startsWith(want)); if (c) cat = c; }
  shuffle(); show(); stats();
  practiceCleanup = () => stop();
};
practiceModules.push(['prompt-deck', 'Prompt deck: timed practice', 'Draw a speaking or writing prompt, answer against the clock, compare with a model answer and rate yourself.', 'Scientific communication']);
