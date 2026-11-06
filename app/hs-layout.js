/* hippsim layout switch: Web view / Phone view, loaded first in <head> on every page.
   - Applies saved Display settings before first paint (text size, theme).
   - "Phone" on a wide screen, or "Web" on a narrow one, shows the page inside a frame of that width
     (phone: 390 px; web: 1280 px scaled to fit), so the page's real layout for that device is used.
     The page inside the frame carries ?hsframe=1 and never frames itself again.
   window.hsLayout = {get, set(mode)}  mode: 'auto' | 'web' | 'phone' */
(function () {
  'use strict';
  var KEY = 'hs-display', d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var r = document.documentElement;
  if (d.size) r.setAttribute('data-hs-size', d.size);
  r.setAttribute('data-hs-theme', d.theme === 'dark' ? 'dark' : 'light');
  if (d.palette && d.palette !== 'rose') r.setAttribute('data-hs-palette', d.palette);

  var inFrame = /[?&]hsframe=1/.test(location.search);
  if (/[?&]embed=1/.test(location.search)) r.classList.add('hs-embed');   // shown inside the Neurons viewer: no site chrome
  var mode = d.layout || 'auto';
  var PHONE_W = 390, WEB_W = 1280;

  function effective() {               // what the person is looking at now
    if (inFrame) return innerWidth <= 700 ? 'phone' : 'web';
    if (mode === 'phone') return 'phone';
    if (mode === 'web') return 'web';
    return innerWidth <= 700 ? 'phone' : 'web';
  }
  function save(m) { d.layout = m; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function clean(href) {               // the page address without the frame marker
    var u = new URL(href, location.href); u.searchParams.delete('hsframe'); return u.pathname.split('/').pop() + u.search + u.hash;
  }
  function set(m) {
    var native = innerWidth <= 700 ? 'phone' : 'web';
    save(m === native ? 'auto' : m);   // choosing what the device already shows is just "auto"
    var f = document.getElementById('hs-devframe'), target = location.href;
    try { if (f && f.contentWindow) target = f.contentWindow.location.href; } catch (e) {}
    if (window.parent !== window && inFrame) {      // switching from inside the frame: tell the outer page
      try { window.parent.postMessage({hsLayout: m, href: clean(location.href)}, '*'); return; } catch (e) {}
    }
    go(clean(target));
  }
  function go(href) {                  // a hash-only change would not reload the page
    var u = new URL(href, location.href);
    if (u.pathname === location.pathname && u.search === location.search) { if (u.hash !== location.hash) history.replaceState(null, '', u.hash); location.reload(); }
    else location.href = href;
  }
  window.hsLayout = {get: effective, set: set, framed: inFrame};

  var native = innerWidth <= 700 ? 'phone' : 'web';
  if (inFrame || mode === 'auto' || mode === native) return;

  /* ---- show this page in a device frame ---- */
  try { window.stop(); } catch (e) {}
  var src = new URL(location.href); src.searchParams.set('hsframe', '1');
  var phone = mode === 'phone';
  var html = '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>' +
    (document.title || 'hippsim') + '</title><style>' +
    'html,body{margin:0;height:100%;background:' + (d.theme === 'dark' ? '#1b1718' : '#efe6df') + ';font:600 14px/1.3 system-ui,sans-serif;color:#171313;overflow:hidden}' +
    '#hs-devbar{height:48px;display:flex;align-items:center;justify-content:center;gap:12px;background:' + ({slate: '#dbe5ef', sage: '#d9e7da', contrast: '#ffffff'}[d.palette] || '#f8cddd') + ';border-bottom:1px solid #171313}' +
    '#hs-devbar b{font-weight:800}#hs-devbar span{color:#5b4c47;font-weight:500}' +
    '.seg{display:inline-flex;border:1px solid rgba(0,0,0,.25);border-radius:999px;overflow:hidden;background:#fff}' +
    '.seg button{font:inherit;border:0;background:none;padding:7px 14px;cursor:pointer;color:#171313}.seg button[aria-pressed="true"]{background:#171313;color:#fff9f2}' +
    '#hs-devwrap{position:absolute;top:48px;left:0;right:0;bottom:0;overflow:' + (phone ? 'auto' : 'hidden') + ';display:flex;justify-content:center;align-items:flex-start}' +
    (phone ? '#hs-devframe{width:' + PHONE_W + 'px;height:min(844px,calc(100% - 32px));margin:16px 0;border:10px solid #171313;border-radius:36px;background:#fff9f2;box-shadow:0 20px 50px rgba(0,0,0,.25)}'
           : '#hs-devframe{width:' + WEB_W + 'px;border:0;transform-origin:0 0;position:absolute;left:0;top:0;background:#fff9f2}') +
    '</style></head><body><div id="hs-devbar"><b>hippsim</b><span>' + (phone ? 'Phone view' : 'Web view') + '</span>' +
    '<span class="seg" role="group" aria-label="Layout"><button type="button" data-m="web" aria-pressed="' + !phone + '">Web</button>' +
    '<button type="button" data-m="phone" aria-pressed="' + phone + '">Phone</button></span></div>' +
    '<div id="hs-devwrap"><iframe id="hs-devframe" title="' + (phone ? 'Phone' : 'Web') + ' view" src="' + src.pathname.split('/').pop() + src.search + src.hash + '"></iframe></div></body>';
  function build() {
    if (document.getElementById('hs-devframe')) return;
    document.documentElement.innerHTML = html;
    var f = document.getElementById('hs-devframe');
    function fit() {
      if (phone) return;
      var s = innerWidth / WEB_W, h = (innerHeight - 48) / s;
      f.style.transform = 'scale(' + s + ')'; f.style.height = h + 'px';
    }
    fit(); addEventListener('resize', fit);
    document.getElementById('hs-devbar').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-m]'); if (b) set(b.getAttribute('data-m'));
    });
    addEventListener('message', function (e) {
      if (e.data && e.data.hsLayout) { var nat = innerWidth <= 700 ? 'phone' : 'web'; save(e.data.hsLayout === nat ? 'auto' : e.data.hsLayout); go(e.data.href); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  setTimeout(function () { if (!document.getElementById('hs-devframe')) build(); }, 0);
})();
