/* Abertura (bola de jornal se abrindo, em 3D) + folhear páginas (mãos 3D viram a folha) — JS puro */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var html = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- datas ---------- */
  var dateStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  Array.prototype.forEach.call(document.querySelectorAll(".js-date"), function (el) { el.textContent = dateStr; });

  /* ---------- foto em retícula da capa ---------- */
  if (window.GazetaPrint) Array.prototype.forEach.call(document.querySelectorAll("canvas.halftone"), window.GazetaPrint.halftone);

  /* =========================================================
     MODO: uma página (celular) ou duas abertas (computador)
     ========================================================= */
  var spreadMQ = window.matchMedia("(min-width: 900px) and (min-aspect-ratio: 1/1)");
  var spread = spreadMQ.matches;
  html.classList.toggle("spread", spread);

  var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
  var book = $("#book"), shade = $("#shade"), stage = $("#stage");
  var prevBtn = $("#prev"), nextBtn = $("#next"), tabsEl = $("#tabs");
  var reader = null;            // mãos 3D + folha que vira (js/reader3d.js)
  var cur = 0, busy = false;     // cur = página da esquerda (no modo duplo, sempre par)
  var FLIP_MS = reduce ? 1 : 720;
  var EASE = "cubic-bezier(.55, .05, .3, 1)";

  function visible(i) { return spread ? (i === cur || i === cur + 1) : i === cur; }
  function step() { return spread ? 2 : 1; }

  function setState() {
    pages.forEach(function (p, i) {
      var here = visible(i);
      p.classList.toggle("is-current", here);
      p.classList.toggle("is-left", spread && i % 2 === 0);
      p.classList.toggle("is-right", spread && i % 2 === 1);
      p.inert = !here;
      p.setAttribute("aria-hidden", String(!here));
      p.style.opacity = "";
      p.style.filter = "";
      if (spread) {
        p.style.zIndex = here ? 20 : 0;
        p.style.visibility = here ? "visible" : "hidden";
        p.style.transform = "none";
      } else {
        p.style.zIndex = here ? 20 : (i > cur ? 10 - Math.min(9, i - cur) : 0);
        p.style.visibility = (here || i === cur + 1) ? "visible" : "hidden";
        p.style.transform = i < cur ? "rotateY(-125deg)" : "none";
      }
    });
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur + step() > pages.length - 1;
    Array.prototype.forEach.call(tabsEl.children, function (b, i) { b.setAttribute("aria-selected", String(visible(i))); });
  }

  spreadMQ.addEventListener("change", function (e) {
    spread = e.matches;
    html.classList.toggle("spread", spread);
    if (spread) cur -= cur % 2;
    busy = false;
    setState();
    layoutReader();
  });

  /* ---------- mãos 3D ---------- */
  if (window.GazetaReader && window.GazetaReader.supported()) {
    try { reader = window.GazetaReader.create({ container: $("#hands3d"), reduce: reduce }); } catch (e) { reader = null; }
  }
  if (reader && location.hash === "#debug") window.__reader = { reader: reader, layout: layoutReader, goTo: function (i) { goTo(i); } };
  function layoutReader() { if (reader) reader.layout(book.getBoundingClientRect(), spread); }
  var resizeT = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(layoutReader, 120); });

  /* =========================================================
     ABERTURA
     ========================================================= */
  var intro = $("#intro"), holder3d = $("#intro-3d");
  var seen = false;
  try { seen = sessionStorage.getItem("gazeta:intro") === "1"; } catch (e) {}

  var DURATION = reduce ? 0 : (seen ? 1600 : 3400);   // ms para a bola se abrir
  var entered = false, crumple = null;

  var fontsReady = Promise.race([
    (document.fonts && document.fonts.ready) || Promise.resolve(),
    new Promise(function (res) { setTimeout(res, 1500); })
  ]);

  function showHands() { if (reader) reader.show(); }

  function enter() {
    if (entered) return;
    entered = true;
    try { sessionStorage.setItem("gazeta:intro", "1"); } catch (e) {}
    stage.classList.add("ready");
    showHands();
    intro.classList.add("leaving");
    setTimeout(function () {
      intro.classList.add("gone");
      if (crumple) { crumple.dispose(); crumple = null; }
    }, reduce ? 20 : 600);
  }

  // "fotografa" as páginas visíveis para virar a textura da bola de papel
  function snapshot() {
    var list = pages.filter(function (p, i) { return visible(i); }).map(function (el) {
      return { el: el, side: spread ? (el.classList.contains("is-left") ? "left" : "right") : "single" };
    });
    var r = book.getBoundingClientRect();
    return window.GazetaPrint.rasterize(list, r, 4096);
  }

  function run() {
    var can3d = !reduce && window.GazetaCrumple && window.GazetaCrumple.supported() && window.GazetaPrint;
    if (!can3d) { fontsReady.then(enter); return; }
    fontsReady.then(function () {
      if (entered) return;
      var tex;
      try { tex = snapshot(); } catch (e) { enter(); return; }
      try {
        crumple = window.GazetaCrumple.play({
          container: holder3d,
          texture: tex,
          rect: book.getBoundingClientRect(),
          duration: DURATION,
          hold: seen ? 250 : 650,
          onProgress: function (p) {
            if (p > .05) intro.classList.add("opening");
            if (p > .78) showHands();
          },
          onDone: function () { setTimeout(enter, seen ? 60 : 220); }
        });
      } catch (e) { enter(); }
    });
  }

  /* ---------- cena da varanda: só na primeira visita (ou ao "reviver a entrega") ---------- */
  var hasCutscene = !!window.GazetaCutscene && !reduce;

  function playCutscene() {
    if (!hasCutscene || window.GazetaCutscene.isRunning()) return;
    window.GazetaCutscene.play({
      // a capa de verdade, "fotografada", vira o jornal que o jornaleiro entrega
      getPaper: function () {
        if (!window.GazetaPrint) return null;
        return fontsReady.then(function () { return snap(0, spread ? "left" : "single").canvas; });
      },
      onReveal: function () { entered = true; stage.classList.add("ready"); setTimeout(showHands, 300); },
      onDone: function () {
        html.classList.remove("first");
        intro.classList.add("gone");
        try { localStorage.setItem("gazeta:cutscene", "1"); } catch (e) {}
      }
    });
  }

  if (html.classList.contains("first") && hasCutscene) {
    intro.classList.add("gone");
    playCutscene();
  } else {
    html.classList.remove("first");
    run();
  }

  $("#skip").addEventListener("click", enter);
  var replayBtn = $("#replay");
  if (replayBtn) replayBtn.addEventListener("click", playCutscene);

  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (window.GazetaCutscene && window.GazetaCutscene.isRunning()) {
      if (k === "Escape" || k === "Enter" || k === " ") { e.preventDefault(); window.GazetaCutscene.skip(); }
      return;
    }
    if (!entered && (k === "Escape" || k === "Enter" || k === " ")) { e.preventDefault(); enter(); }
  });

  /* =========================================================
     FOLHEAR
     ========================================================= */
  var KF_OUT = [
    { transform: "rotateY(0deg)", filter: "brightness(1)", opacity: 1, offset: 0 },
    { transform: "rotateY(-70deg)", filter: "brightness(.82)", opacity: 1, offset: .55 },
    { transform: "rotateY(-125deg)", filter: "brightness(.6)", opacity: 0, offset: 1 }
  ];
  var KF_IN = KF_OUT.slice().reverse().map(function (f, i) { return { transform: f.transform, filter: f.filter, opacity: f.opacity, offset: [0, .45, 1][i] }; });

  pages.forEach(function (p, i) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab");
    b.textContent = p.dataset.title;
    b.addEventListener("click", function () { goTo(i); });
    tabsEl.appendChild(b);
  });

  function shadeAnim() {
    if (reduce) return;
    shade.animate([{ opacity: 0 }, { opacity: .9 }, { opacity: 0 }], { duration: FLIP_MS, easing: "ease-in-out" });
  }

  function show(p, side, z) {
    if (!p) return;
    p.classList.toggle("is-left", side === "left");
    p.classList.toggle("is-right", side === "right");
    p.style.visibility = "visible";
    p.style.zIndex = z;
    p.style.transform = "none";
  }

  // modo duplo: a folha da direita gira sobre a lombada e vira a nova página da esquerda
  function flipSpread(to) {
    var half = FLIP_MS / 2;
    var fwd = to > cur;
    var turning = fwd ? pages[cur + 1] : pages[cur];          // folha que sai
    var landing = fwd ? pages[to] : pages[to + 1];            // verso que pousa do outro lado
    var under = fwd ? pages[to + 1] : pages[to];              // aparece por baixo
    show(under, fwd ? "right" : "left", 5);
    turning.style.zIndex = 30;
    var a = turning.animate([
      { transform: "rotateY(0deg)", filter: "brightness(1)" },
      { transform: "rotateY(" + (fwd ? -90 : 90) + "deg)", filter: "brightness(.62)" }
    ], { duration: half, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    a.onfinish = function () {
      turning.style.visibility = "hidden";
      a.cancel();
      show(landing, fwd ? "left" : "right", 30);
      var b = landing.animate([
        { transform: "rotateY(" + (fwd ? 90 : -90) + "deg)", filter: "brightness(.62)" },
        { transform: "rotateY(0deg)", filter: "brightness(1)" }
      ], { duration: half, easing: "cubic-bezier(.1,.4,.5,1)", fill: "forwards" });
      b.onfinish = function () { b.cancel(); cur = to; setState(); busy = false; };
    };
  }

  /* ---------- virada física: a mão pega a folha e vira (js/reader3d.js) ---------- */
  // "fotografa" uma página na posição em que ela fica, mesmo se estiver escondida
  function snap(i, side) {
    var p = pages[i];
    var keep = { v: p.style.visibility, o: p.style.opacity, t: p.style.transform, l: p.classList.contains("is-left"), r: p.classList.contains("is-right") };
    p.style.transform = "none";   // página "já virada" fica girada no CSS: endireita para medir as palavras
    var hidden = getComputedStyle(p).visibility === "hidden";
    p.classList.toggle("is-left", side === "left");
    p.classList.toggle("is-right", side === "right");
    p.style.visibility = "visible";
    if (hidden) p.style.opacity = "0";
    var r = p.getBoundingClientRect();
    var c = window.GazetaPrint.rasterize([{ el: p, side: side }], r, 2048);
    p.style.visibility = keep.v; p.style.opacity = keep.o; p.style.transform = keep.t;
    p.classList.toggle("is-left", keep.l); p.classList.toggle("is-right", keep.r);
    return { canvas: c, rect: r };
  }

  function physicalTurn(to) {
    if (!reader || !window.GazetaPrint || reader.isTurning()) return false;
    var fwd = to > cur;
    var br = book.getBoundingClientRect();
    var done = function () { cur = to; setState(); busy = false; };
    var cfg, F, B;
    try {
      if (spread) {
        if (fwd) {   // mão direita pega a borda da página da direita e vira para a esquerda
          F = snap(cur + 1, "right"); B = snap(to, "left");
          cfg = { hand: "right", extend: 1, frontFlip: false, backFlip: true, detachAt: .7,
            onCovered: function () { pages[cur + 1].style.visibility = "hidden"; show(pages[to + 1], "right", 5); } };
        } else {     // mão esquerda pega a borda da página da esquerda e vira para a direita
          F = snap(cur, "left"); B = snap(to + 1, "right");
          cfg = { hand: "left", extend: -1, frontFlip: true, backFlip: false, detachAt: .7,
            onCovered: function () { pages[cur].style.visibility = "hidden"; show(pages[to], "left", 5); } };
        }
        cfg.hinge = br.left + br.width / 2;
        cfg.back = B.canvas;
      } else {
        if (fwd) {   // celular: a folha gira pela borda esquerda e sai de cena; a mão solta no meio
          F = snap(cur, "single");
          cfg = { hand: "right", extend: 1, frontFlip: false, backFlip: false, detachAt: .62,
            onCovered: function () { show(pages[to], "single", 10); pages[cur].style.visibility = "hidden"; } };
        } else {     // a página anterior vem de fora, puxada pela mão esquerda
          F = snap(to, "single");
          cfg = { hand: "left", extend: 1, frontFlip: false, backFlip: false, startFlipped: true, reachMs: 560, detachAt: 1,
            onCovered: function () {} };
        }
        cfg.hinge = br.left;
        cfg.back = window.GazetaPrint.backside(F.canvas);
      }
    } catch (e) { return false; }
    cfg.front = F.canvas;
    cfg.rect = F.rect;
    cfg.onLanded = done;
    return reader.turn(cfg);
  }

  // movimento reduzido: troca simples, sem virar
  function fadeTo(to) {
    var out = book.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
    out.onfinish = function () {
      cur = to; setState();
      var inn = book.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      out.cancel();
      inn.onfinish = function () { busy = false; };
    };
  }

  function goTo(to) {
    if (spread) to -= to % 2;
    if (busy || to === cur || to < 0 || to >= pages.length) return;
    if (window.GazetaCrossword) window.GazetaCrossword.blur();
    busy = true;
    if (reader) reader.setAway(false);

    if (reduce) { fadeTo(to); return; }
    if (physicalTurn(to)) return;
    if (spread) { flipSpread(to); return; }

    if (to > cur) {
      var leaving = pages[cur];
      pages[to].style.visibility = "visible";
      pages[to].style.zIndex = 10;
      leaving.style.zIndex = 30;
      shadeAnim();
      var a = leaving.animate(KF_OUT, { duration: FLIP_MS, easing: EASE, fill: "forwards" });
      a.onfinish = function () { a.cancel(); cur = to; setState(); busy = false; };
    } else {
      var entering = pages[to];
      entering.style.visibility = "visible";
      entering.style.zIndex = 30;
      entering.style.transform = "none";
      shadeAnim();
      var b = entering.animate(KF_IN, { duration: FLIP_MS, easing: EASE, fill: "forwards" });
      b.onfinish = function () { b.cancel(); cur = to; setState(); busy = false; };
    }
  }

  prevBtn.addEventListener("click", function () { goTo(cur - step()); });
  nextBtn.addEventListener("click", function () { goTo(cur + step()); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (b) {
    b.addEventListener("click", function () { goTo(+b.dataset.goto); });
  });

  // teclado (setas só viram a página quando o foco não está na palavra cruzada)
  document.addEventListener("keydown", function (e) {
    if (!entered || e.target.id === "cw-input") return;
    if (window.GazetaCutscene && window.GazetaCutscene.isRunning()) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") goTo(cur + step());
    else if (e.key === "ArrowLeft" || e.key === "PageUp") goTo(cur - step());
  });

  // deslizar com o dedo
  var sx = 0, sy = 0, tracking = false;
  book.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; tracking = true; });
  book.addEventListener("pointerup", function (e) {
    if (!tracking) return; tracking = false;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx < 0 ? cur + step() : cur - step());
  });
  book.addEventListener("pointercancel", function () { tracking = false; });

  // mexeu num jogo? as mãos abaixam um pouco (para não cobrir a grade nem os botões)
  book.addEventListener("pointerdown", function (e) {
    if (reader && e.target.closest && e.target.closest(".cw-grid-wrap, .sudoku-wrap, .sd-pad, .cw-clues, .cw-actions")) reader.setAway(true);
  });

  setState();
  layoutReader();
  if (reduce) showHands();
})();
