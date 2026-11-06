
(function () {
  "use strict";

  // ---------- data ----------
  var COMP = [
    { k: "axon", label: "Axon", n: 800, c: "var(--accent)" },
    { k: "dendrite", label: "Dendrite", n: 749, c: "var(--nt-unk)" }
  ];

  var CLS = {
    AN:  { label: "AN — ascending",    c: "var(--c-an)" },
    IN:  { label: "IN — intrinsic",    c: "var(--c-in)" },
    DN:  { label: "DN — descending",   c: "var(--c-dn)" },
    other: { label: "other (named)",   c: "var(--c-oth)" },
    unidentified: { label: "unidentified", c: "var(--c-un)" }
  };
  var CLS_ORDER = ["AN", "IN", "DN", "other", "unidentified"];

  var CLS_SYN  = { AN: 357, IN: 265, unidentified: 95, DN: 61, other: 22 };
  var CLS_PART = { IN: 56, unidentified: 40, AN: 25, DN: 13, other: 11 };

  var NT = {
    acetylcholine: { label: "acetylcholine", c: "var(--nt-ach)" },
    gaba:          { label: "GABA",          c: "var(--nt-gaba)" },
    glutamate:     { label: "glutamate",     c: "var(--nt-glut)" },
    unknown:       { label: "unknown",       c: "var(--nt-unk)" }
  };
  var NT_ORDER = ["acetylcholine", "gaba", "glutamate", "unknown"];

  var NT_BY_CLASS = {
    AN:  { acetylcholine: 266, gaba: 88,  glutamate: 3,  unknown: 0 },
    IN:  { acetylcholine: 29,  gaba: 171, glutamate: 65, unknown: 0 },
    DN:  { acetylcholine: 44,  gaba: 17,  glutamate: 0,  unknown: 0 },
    other: { acetylcholine: 20, gaba: 0,  glutamate: 2,  unknown: 0 },
    unidentified: { acetylcholine: 23, gaba: 33, glutamate: 35, unknown: 4 }
  };
  var NT_UNID = { glutamate: 19, gaba: 11, acetylcholine: 7, unknown: 3 };

  // full partner list: [bodyId, type, class, nt, count]
  var PARTNERS = [
    [10758,"AN05B006","AN","gaba",41],[21041,"AN08B098","AN","acetylcholine",37],
    [21589,"AN08B098","AN","acetylcholine",35],[10603,"AN05B006","AN","gaba",35],
    [22275,"AN08B098","AN","acetylcholine",33],[22805,"IN00A062","IN","glutamate",31],
    [16900,"AN08B098","AN","acetylcholine",31],[23949,"AN08B098","AN","acetylcholine",29],
    [10002,"DNp01","DN","acetylcholine",25],[24038,"AN08B098","AN","acetylcholine",23],
    [26076,"IN00A039","IN","gaba",22],[20238,"IN00A047","IN","gaba",18],
    [22856,"IN00A064","IN","gaba",18],[152261,"AN08B098","AN","acetylcholine",17],
    [19312,"IN00A039","IN","gaba",17],[20444,"AN08B098","AN","acetylcholine",16],
    [22265,"AN08B102","AN","acetylcholine",15],[12787,"IN12B015","IN","gaba",14],
    [25503,"AN08B099","AN","acetylcholine",14],[18793,"IN00A047","IN","gaba",13],
    [12698,"DNp59","DN","gaba",13],[24246,"AN08B099","AN","acetylcholine",10],
    [18321,"IN07B054","IN","acetylcholine",10],[13773,"IN05B032","IN","gaba",9],
    [77360,null,"unidentified","acetylcholine",8],[23253,"IN00A062","IN","glutamate",8],
    [18306,"IN21A034","IN","glutamate",7],[11521,"IN06B059","IN","gaba",7],
    [10241,"AN05B006","AN","gaba",6],[19065,"IN00A047","IN","gaba",6],
    [16522,"DNp70","DN","acetylcholine",6],[40850,null,"unidentified","gaba",6],
    [30966,null,"unidentified","gaba",6],[40421782420,null,"unidentified","gaba",5],
    [27642,"IN11A001","IN","gaba",5],[141535,null,"unidentified","glutamate",5],
    [85190,null,"unidentified","acetylcholine",5],[42164,"GFC4","other","acetylcholine",5],
    [17889,"IN06B056","IN","gaba",4],[12855,"DNp103","DN","acetylcholine",4],
    [40421748320,null,"unidentified","gaba",4],[13446,"IN17A029","IN","acetylcholine",4],
    [17558,"IN21A032","IN","glutamate",4],[100018,null,"unidentified","glutamate",4],
    [23019,null,"unidentified","gaba",4],[152817,null,"unidentified","glutamate",4],
    [10221,"AN05B006","AN","gaba",4],[10802,"IN07B007","IN","glutamate",4],
    [24821,null,"unidentified","glutamate",4],[15308,"IN06B056","IN","gaba",3],
    [15505,"GFC2","other","acetylcholine",3],[12773,"IN12B015","IN","gaba",3],
    [153296,"IN00A050","IN","gaba",3],[166096,null,"unidentified","acetylcholine",3],
    [10751,"DNa01","DN","acetylcholine",3],[35900813194,null,"unidentified","acetylcholine",3],
    [17817,"IN11A021","IN","acetylcholine",3],[22034,"IN00A047","IN","gaba",3],
    [10423,"IN07B007","IN","glutamate",3],[10882,"AN23B001","AN","acetylcholine",2],
    [19605,"IN00A043","IN","gaba",2],[11512,"IN06B016","IN","gaba",2],
    [11873,"INXXX084","IN","acetylcholine",2],[10950,"IN06B008","IN","gaba",2],
    [16816,"IN11A032","IN","acetylcholine",2],[12983,"IN05B032","IN","gaba",2],
    [18516,"IN07B055","IN","acetylcholine",2],[11492,"IN06B059","IN","gaba",2],
    [19651,"IN21A045","IN","glutamate",2],[10634,"DNp06","DN","acetylcholine",2],
    [10085,"IN11A001","IN","gaba",2],[14882,"IN18B034","IN","acetylcholine",2],
    [19225,"IN21A030","IN","glutamate",2],[26767,"DNxn134","DN","acetylcholine",2],
    [46187934218,null,"unidentified","gaba",2],[100012,null,"unidentified","glutamate",2],
    [25629,"GFC3","other","acetylcholine",2],[27502,"GFC4","other","acetylcholine",2],
    [42200,null,"unidentified","gaba",2],[42526,null,"unidentified","glutamate",2],
    [24436,"GFC3","other","acetylcholine",2],[166304,"pIP9","other","glutamate",2],
    [100021,null,"unidentified","unknown",2],[101549,"GFC4","other","acetylcholine",2],
    [25798,"IN00A043","IN","gaba",2],[166265,"IN00A062","IN","gaba",2],
    [100025,null,"unidentified","glutamate",2],[37128330873,null,"unidentified","acetylcholine",2],
    [24198,"GFC3","other","acetylcholine",1],[16427,"IN21A029","IN","glutamate",1],
    [16448,"IN00A022","IN","gaba",1],[25286,null,"unidentified","glutamate",1],
    [16568,"IN06B056","IN","gaba",1],[17883,"DNp30","DN","gaba",1],
    [19834,"IN18B031","IN","acetylcholine",1],[19367,"DNxn156","DN","gaba",1],
    [19872,"IN00A047","IN","gaba",1],[20329,"IN00A059","IN","gaba",1],
    [22240,"DNxn172","DN","gaba",1],[13846,"GFC2","other","acetylcholine",1],
    [25905,null,"unidentified","glutamate",1],[30181,null,"unidentified","glutamate",1],
    [15572,"AN27X018","AN","glutamate",1],[26376,"GFC4","other","acetylcholine",1],
    [26756,null,"unidentified","gaba",1],[14850,"IN07B055","IN","acetylcholine",1],
    [13946,"ANXXX116","AN","acetylcholine",1],[21792,"IN07B080","IN","acetylcholine",1],
    [13859,"IN00A043","IN","gaba",1],[32092,"IN11A044","IN","acetylcholine",1],
    [33946,null,"unidentified","glutamate",1],[34018,null,"unidentified","gaba",1],
    [37477,null,"unidentified","glutamate",1],[38210,null,"unidentified","glutamate",1],
    [40029,"GFC3","other","acetylcholine",1],[20568,"IN21A034","IN","glutamate",1],
    [10456,"IN07B007","IN","glutamate",1],[16082,"DNxn140","DN","acetylcholine",1],
    [13361,"IN06B008","IN","gaba",1],[72474,null,"unidentified","acetylcholine",1],
    [12914,"AN18B019","AN","acetylcholine",1],[53197,null,"unidentified","glutamate",1],
    [48294,null,"unidentified","glutamate",1],[11997,"AN04B003","AN","acetylcholine",1],
    [46268,null,"unidentified","unknown",1],[100014,null,"unidentified","glutamate",1],
    [100015,null,"unidentified","gaba",1],[43958,null,"unidentified","gaba",1],
    [21033,null,"unidentified","glutamate",1],[100023,null,"unidentified","glutamate",1],
    [11335,"AN00A006","AN","gaba",1],[11205,"AN00A006","AN","glutamate",1],
    [11111,"IN13B008","IN","gaba",1],[13299,"DNxn152","DN","gaba",1],
    [10989,"IN27X005","IN","gaba",1],[164229,"IN00A064","IN","gaba",1],
    [10807,"IN06B008","IN","gaba",1],[10650,"AN00A002","AN","gaba",1],
    [10613,"AN07B004","AN","glutamate",1],[39183604983,null,"unidentified","acetylcholine",1],
    [10306,"IN07B007","IN","glutamate",1],[40835672689,null,"unidentified","glutamate",1],
    [11084,"AN08B009","AN","acetylcholine",1],[39757,null,"unidentified","unknown",1],
    [20799,"DNxn130","DN","acetylcholine",1]
  ];

  var OCTET = [
    [21041,37],[21589,35],[22275,33],[16900,31],[23949,29],[24038,23],[152261,17],[20444,16]
  ];

  var BY_TYPE = [
    ["AN08B098","AN",221],["(unidentified)","unidentified",95],["AN05B006","AN",86],
    ["IN00A062","IN",41],["IN00A047","IN",41],["IN00A039","IN",39],["DNp01","DN",25],
    ["AN08B099","AN",24],["IN00A064","IN",19],["IN12B015","IN",17],["AN08B102","AN",15],
    ["DNp59","DN",13],["IN05B032","IN",11],["GFC4","other",10],["IN07B054","IN",10],
    ["IN06B059","IN",9]
  ];

  // ---------- helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  var cvar = function (v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v.replace(/var\(|\)/g, "").trim()).trim();
  };
  var resolve = function (c) { return c.indexOf("var(") === 0 ? cvar(c) : c; };

  var tip = $("tip");
  function showTip(html, e) {
    tip.innerHTML = html;
    tip.style.opacity = "1";
    moveTip(e);
  }
  function moveTip(e) {
    var pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    var x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.style.opacity = "0"; }
  document.addEventListener("mousemove", function (e) {
    if (tip.style.opacity === "1") moveTip(e);
  });

  function bindTip(el, html) {
    el.addEventListener("mouseenter", function (e) { showTip(html, e); });
    el.addEventListener("mouseleave", hideTip);
    el.tabIndex = 0;
    el.addEventListener("focus", function () {
      var r = el.getBoundingClientRect();
      showTip(html, { clientX: r.left + r.width / 2, clientY: r.top });
    });
    el.addEventListener("blur", hideTip);
  }

  // simple single-series horizontal bar list
  function renderBars(mount, items, max) {
    var m = max || Math.max.apply(null, items.map(function (d) { return d.n; }));
    mount.innerHTML = "";
    items.forEach(function (d) {
      var row = document.createElement("div");
      row.className = "row";

      var lab = document.createElement("div");
      lab.className = "rl";
      lab.innerHTML = d.labelHtml || d.label;
      row.appendChild(lab);

      var track = document.createElement("div");
      track.className = "track";
      var bar = document.createElement("div");
      bar.className = "bar-single";
      bar.style.width = (100 * d.n / m) + "%";
      bar.style.background = d.c;
      var val = document.createElement("span");
      val.className = "rv";
      val.innerHTML = d.valueHtml != null ? d.valueHtml : d.n;
      track.appendChild(bar);
      track.appendChild(val);
      row.appendChild(track);

      if (d.tip) bindTip(row, d.tip);
      mount.appendChild(row);
    });
  }

  // stacked horizontal bar list
  function renderStacked(mount, rows, order, meta, max) {
    var m = max || Math.max.apply(null, rows.map(function (r) {
      return order.reduce(function (s, k) { return s + (r.parts[k] || 0); }, 0);
    }));
    mount.innerHTML = "";
    rows.forEach(function (r) {
      var total = order.reduce(function (s, k) { return s + (r.parts[k] || 0); }, 0);
      var row = document.createElement("div");
      row.className = "row";

      var lab = document.createElement("div");
      lab.className = "rl";
      lab.innerHTML = r.labelHtml || r.label;
      row.appendChild(lab);

      var track = document.createElement("div");
      track.className = "track";
      order.forEach(function (k) {
        var v = r.parts[k] || 0;
        if (!v) return;
        var seg = document.createElement("div");
        seg.className = "seg";
        seg.style.width = (100 * v / m) + "%";
        seg.style.background = meta[k].c;
        bindTip(seg, "<b>" + r.label + "</b><br>" + meta[k].label + ": " + v +
          " (" + Math.round(100 * v / total) + "%)");
        track.appendChild(seg);
      });
      var val = document.createElement("span");
      val.className = "rv";
      val.textContent = total;
      track.appendChild(val);
      row.appendChild(track);
      mount.appendChild(row);
    });
  }

  function legend(mount, order, meta) {
    mount.innerHTML = "";
    order.forEach(function (k) {
      var s = document.createElement("span");
      s.innerHTML = '<i style="background:' + meta[k].c + '"></i>' + meta[k].label;
      mount.appendChild(s);
    });
  }

  // ---------- compartment ----------
  (function () {
    var total = COMP.reduce(function (s, d) { return s + d.n; }, 0);
    var bar = $("compbar");
    COMP.forEach(function (d) {
      var seg = document.createElement("div");
      seg.style.flex = d.n;
      seg.style.background = d.c;
      seg.textContent = d.label + "  " + d.n;
      bindTip(seg, "<b>" + d.label + "</b><br>" + d.n + " synapses (" +
        Math.round(100 * d.n / total) + "% of " + total + ")");
      bar.appendChild(seg);
    });
    $("compnote").innerHTML = "<b style='color:var(--ink)'>" +
      Math.round(100 * 800 / total) + "%</b> of the " + total +
      " input synapses onto the GF land on the axon compartment (800); the rest (749) are dendritic.";
  })();

  // ---------- class charts ----------
  legend($("clsLegend"), CLS_ORDER, CLS);
  legend($("clsLegend2"), CLS_ORDER, CLS);
  legend($("clsLegend3"), CLS_ORDER, CLS);

  renderBars($("clsSyn"), CLS_ORDER.map(function (k) {
    return {
      label: CLS[k].label, n: CLS_SYN[k], c: CLS[k].c,
      valueHtml: CLS_SYN[k] + ' <span class="pct">' + Math.round(100 * CLS_SYN[k] / 800) + '%</span>',
      tip: "<b>" + k + "</b><br>" + CLS_SYN[k] + " axonic synapses"
    };
  }), 357);

  renderBars($("clsPart"), CLS_ORDER.map(function (k) {
    return {
      label: CLS[k].label, n: CLS_PART[k], c: CLS[k].c,
      valueHtml: CLS_PART[k] + ' <span class="pct">' + Math.round(100 * CLS_PART[k] / 145) + '%</span>',
      tip: "<b>" + k + "</b><br>" + CLS_PART[k] + " distinct partners"
    };
  }), 56);

  // ---------- top partners ----------
  var top = PARTNERS.slice().sort(function (a, b) { return b[4] - a[4]; }).slice(0, 25);
  renderBars($("topPartners"), top.map(function (p) {
    var ty = p[1] || "untyped";
    return {
      labelHtml: '<span class="rid">' + p[0] + '</span> &nbsp;' + ty,
      n: p[4], c: CLS[p[2]].c,
      tip: "<b>" + p[0] + "</b> &middot; " + ty + "<br>class " + p[2] +
        " &middot; " + NT[p[3]].label + "<br>" + p[4] + " synapses onto GF axon"
    };
  }), top[0][4]);

  // ---------- by type ----------
  renderBars($("byType"), BY_TYPE.map(function (t) {
    return {
      label: '<span class="rid">' + t[0] + '</span>',
      labelHtml: '<span class="rid">' + t[0] + '</span>',
      n: t[2], c: CLS[t[1]].c,
      tip: "<b>" + t[0] + "</b><br>class " + t[1] + "<br>" + t[2] + " axonic synapses"
    };
  }), 221);

  // ---------- NT ----------
  legend($("ntLegend"), NT_ORDER, NT);
  renderStacked($("ntByClass"),
    CLS_ORDER.map(function (k) { return { label: k, parts: NT_BY_CLASS[k] }; }),
    NT_ORDER, NT, 357);

  renderBars($("ntUnid"), NT_ORDER.filter(function (k) { return NT_UNID[k]; }).map(function (k) {
    return {
      label: NT[k].label, n: NT_UNID[k], c: NT[k].c,
      tip: "<b>" + NT[k].label + "</b><br>" + NT_UNID[k] + " unidentified fragments"
    };
  }), 19);

  // ---------- octet ----------
  renderBars($("octet"), OCTET.map(function (o) {
    return {
      label: '<span class="rid">' + o[0] + '</span>',
      labelHtml: '<span class="rid">' + o[0] + '</span>',
      n: o[1], c: CLS.AN.c,
      tip: "<b>" + o[0] + "</b> &middot; AN08B098<br>" + o[1] + " synapses onto GF axon"
    };
  }), 37);

  // ---------- table ----------
  var tb = $("tbody");
  PARTNERS.slice().sort(function (a, b) { return b[4] - a[4]; }).forEach(function (p) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td class="mono">' + p[0] + '</td>' +
      '<td>' + (p[1] || '<span style="color:var(--ink-3)">untyped</span>') + '</td>' +
      '<td><span class="cls-pill" style="background:' + CLS[p[2]].c + '">' + p[2] + '</span></td>' +
      '<td>' + NT[p[3]].label + '</td>' +
      '<td style="text-align:right" class="mono">' + p[4] + '</td>';
    tb.appendChild(tr);
  });

  // ---------- theme toggle ----------
  var btn = $("themeBtn");
  function apply(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  var saved = null;
  try { saved = localStorage.getItem("gf-theme"); } catch (e) {}
  if (saved) apply(saved);
  btn.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme");
    var sys = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var next = (cur || sys) === "dark" ? "light" : "dark";
    apply(next);
    try { localStorage.setItem("gf-theme", next); } catch (e) {}
  });
})();
