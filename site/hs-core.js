/* hippsim core: replaces the Guide's lesson router (guide.js) for the extracted simulator pages.
   Each page declares HS_PAGE = {routes: [[route, label], ...]}; this file dispatches a route to the
   Guide's own render function and nothing else. Loaded where guide.js used to load, so the
   workbench and studio scripts can wrap renderGuide exactly as they do in the Guide. */
const $ = id => document.getElementById(id);
function sidebar() {}
function smallPrint() { return ''; }          // Guide footer line; not shown in the simulator
window.practiceCleanup = null;              // practice.js declares its own when it is loaded
// mathBox: copied verbatim from the Guide's guide.js (MathML block used by several tools)
function mathBox(body,label='Equation'){return `<div class="math-scroll"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${label}"><mrow>${body}</mrow></math></div>`}                       // the lesson sidebar does not exist here
let current = 0, topicIndex = null;         // globals some Guide pages read

function hsDispatch(path) {
  const parts = path.split('/').filter(Boolean), a = parts[0], b = parts[1] || '';
  if (a === 'lab') return renderModelLab(b);
  if (a === 'experiments') return renderExperiments(b);
  if (a === 'fitting') return renderFitting(b);
  if (a === 'ml') return renderML(b);
  if (a === 'morphology') return renderMorphology(b || 'branching-lab');
  if (a === 'practice') return renderPractice(b);
  if (a === 'biology') return renderBiology(b);
  throw new Error('No renderer for ' + path);
}

function renderGuide() {
  const routes = (window.HS_PAGE && HS_PAGE.routes) || [];
  let p = ngPath();
  if (!routes.some(r => r[0] === p)) {           // unknown route on this page → its first tool
    history.replaceState(null, '', ngHash(routes[0][0]));
    return window.renderGuide();                 // re-enter through the workbench/studio wrappers
  }
  hsDispatch(p);
}
window.ngAfterRender = window.ngAfterRender || function () {};
