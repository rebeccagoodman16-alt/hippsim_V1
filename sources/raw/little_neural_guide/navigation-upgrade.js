/* Accessible reading and navigation utilities, layered over the existing guide. */
(() => {
  const lesson = document.getElementById('lesson');
  const header = document.querySelector('body > header');
  if (!lesson || !header) return;
  document.body.insertAdjacentHTML('afterbegin','<a class="ng-skip" href="#lesson">Skip to lesson</a><div class="ng-reading-progress" aria-hidden="true"><span id="ng-read-bar"></span></div>');
  const toolbar = document.createElement('div');
  toolbar.className = 'ng-reading-tools';
  toolbar.innerHTML = '<div class="ng-tool-left"><button type="button" id="ng-back" aria-label="Go to previous page">← Back</button><a href="/" class="ng-home-shortcut">Home</a><span id="ng-reading-label" aria-live="polite"></span></div><div class="ng-tool-right"><button type="button" id="ng-outline-toggle" aria-expanded="false" aria-controls="ng-outline">On this page ▾</button><button type="button" id="ng-top-button" aria-label="Scroll to top">↑ Top</button></div>';
  lesson.parentNode.insertBefore(toolbar,lesson);
  const outline = document.createElement('nav'); outline.id='ng-outline'; outline.className='ng-outline'; outline.setAttribute('aria-label','Sections on this page'); outline.hidden=true;
  toolbar.after(outline);
  document.getElementById('ng-back').onclick = () => { if (history.length>1) history.back(); else ngGo('/'); };
  document.getElementById('ng-top-button').onclick = () => window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  document.getElementById('ng-outline-toggle').onclick = () => { outline.hidden=!outline.hidden; document.getElementById('ng-outline-toggle').setAttribute('aria-expanded',String(!outline.hidden)); };
  let previousRoute=location.hash, previousY=0, routePositions=new Map(), restore=false;
  window.addEventListener('popstate',()=>{restore=true;});
  window.addEventListener('hashchange',()=>{
    routePositions.set(previousRoute,previousY);
    const destination=location.hash;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(restore && routePositions.has(destination)) window.scrollTo({top:routePositions.get(destination),behavior:'instant'});
      restore=false; previousRoute=destination; previousY=window.scrollY;
    }));
  });
  const nativeAfter=window.ngAfterRender;
  window.ngAfterRender=function(...args){
    if(typeof nativeAfter==='function')nativeAfter.apply(this,args);
    const headings=[...lesson.querySelectorAll('h2,h3')].filter(h=>h.getBoundingClientRect().width>0).slice(0,35);
    const used=new Set();
    headings.forEach((h,i)=>{if(!h.id){let id='section-'+h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55);if(!id)id='section-'+i;let candidate=id,k=2;while(document.getElementById(candidate)||used.has(candidate))candidate=id+'-'+k++;h.id=candidate;}used.add(h.id);});
    outline.innerHTML=headings.length?headings.map(h=>'<a class="'+(h.tagName==='H3'?'ng-subheading':'')+'" href="#'+h.id+'">'+h.textContent.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</a>').join(''):'<p>No section headings on this page.</p>';
    outline.hidden=true;document.getElementById('ng-outline-toggle').setAttribute('aria-expanded','false');
    document.getElementById('ng-reading-label').textContent=(lesson.querySelector('h1')?.textContent||'Learning guide').trim().slice(0,70);
    lesson.setAttribute('tabindex','-1');
    lesson.querySelectorAll('img:not([alt])').forEach(img=>img.setAttribute('alt',''));
    lesson.querySelectorAll('iframe:not([title])').forEach(frame=>frame.setAttribute('title','Embedded learning resource'));
  };
  function updateProgress(){
    previousY=window.scrollY;
    const start=lesson.getBoundingClientRect().top+scrollY;
    const end=start+lesson.offsetHeight-innerHeight;
    const ratio=end<=start?1:Math.min(1,Math.max(0,(scrollY-start)/(end-start)));
    document.getElementById('ng-read-bar').style.width=(ratio*100).toFixed(1)+'%';
    document.getElementById('ng-top-button').classList.toggle('ng-visible',scrollY>400);
  }
  window.addEventListener('scroll',updateProgress,{passive:true});window.addEventListener('resize',updateProgress,{passive:true});
  document.addEventListener('click',e=>{const link=e.target.closest('#ng-outline a');if(!link)return;const id=link.getAttribute('href').slice(1);const target=document.getElementById(id);if(target){e.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});outline.hidden=true;document.getElementById('ng-outline-toggle').setAttribute('aria-expanded','false');}});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!outline.hidden){outline.hidden=true;document.getElementById('ng-outline-toggle').setAttribute('aria-expanded','false');document.getElementById('ng-outline-toggle').focus();}});
  setTimeout(()=>{window.ngAfterRender();updateProgress();},0);
})();
