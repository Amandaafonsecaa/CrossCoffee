/* Cena de abertura: varanda, jornaleiro de bicicleta, jornal nos pés, mundo virando sépia.
   Com WebGL: cena 3D low-poly (js/cutscene3d.js), em tela cheia, qualquer proporção.
   Sem WebGL: a versão SVG em camadas abaixo (plano B, quadro em pé).
   Este arquivo é dono do fluxo: fade do preto, botão Pular, título final e encerramento.
   Todas as animações DOM passam pela função A() — para migrar para GSAP, troque só ela. */
(function () {
  "use strict";

  var root = document.getElementById("cutscene");
  if (!root) return;
  var host = document.getElementById("cs-scene");
  var paperEl = document.getElementById("cs-paper");
  var blackEl = document.getElementById("cs-black");
  var vignetteEl = document.getElementById("cs-vignette");
  var skipBtn = document.getElementById("cs-skip");
  var frameEl = root.querySelector(".cs-frame");
  var scene3d = null;

  var anims = [];
  var timers = [];
  var running = false, finished = false, opts = {};

  /* ---------- helper de animação (ponto único para trocar por GSAP) ---------- */
  // t = início (s), d = duração (s)
  function A(el, frames, t, d, extra) {
    if (!el) return null;
    var o = { delay: t * 1000, duration: d * 1000, fill: "both", easing: "ease-in-out" };
    if (extra) for (var k in extra) o[k] = extra[k];
    var a = el.animate(frames, o);
    anims.push(a);
    return a;
  }
  function at(t, fn) { timers.push(setTimeout(fn, t * 1000)); }
  function $(sel) { return host.querySelector(sel); }

  /* ---------- arte (SVG) ---------- */
  function house(x, base, w, h, wall, roof, door) {
    var rx = x - 6, rw = w + 12, peak = base - h - 28;
    return '<g>' +
      '<rect x="' + (x + w * .68) + '" y="' + (peak + 6) + '" width="12" height="30" fill="#a8604a"/>' +
      '<rect x="' + x + '" y="' + (base - h) + '" width="' + w + '" height="' + h + '" fill="' + wall + '"/>' +
      '<polygon points="' + rx + ',' + (base - h) + ' ' + (x + w / 2) + ',' + peak + ' ' + (rx + rw) + ',' + (base - h) + '" fill="' + roof + '"/>' +
      '<rect x="' + (x + w * .12) + '" y="' + (base - h + 14) + '" width="' + (w * .22) + '" height="22" fill="#fff" stroke="#3f6aa8" stroke-width="2"/>' +
      '<rect x="' + (x + w * .66) + '" y="' + (base - h + 14) + '" width="' + (w * .22) + '" height="22" fill="#fff" stroke="#3f6aa8" stroke-width="2"/>' +
      '<rect x="' + (x + w * .42) + '" y="' + (base - 34) + '" width="' + (w * .16) + '" height="34" fill="' + door + '"/>' +
      '</g>';
  }
  function tree(x, base, r, tone) {
    return '<g><rect x="' + (x - 4) + '" y="' + (base - r) + '" width="8" height="' + r + '" fill="#6b4a2f"/>' +
      '<circle cx="' + x + '" cy="' + (base - r - r * .3) + '" r="' + r + '" fill="' + tone + '"/>' +
      '<circle cx="' + (x - r * .6) + '" cy="' + (base - r * .9) + '" r="' + (r * .7) + '" fill="' + tone + '"/>' +
      '<circle cx="' + (x + r * .6) + '" cy="' + (base - r * .9) + '" r="' + (r * .7) + '" fill="' + tone + '"/></g>';
  }
  function rollShapes() {
    return '<rect x="-22" y="-7" width="44" height="14" rx="6" fill="#f1e9d2" stroke="#8a7a5a" stroke-width="1.2"/>' +
      '<rect x="-17" y="-3.5" width="14" height="1.6" fill="#9b9078"/><rect x="-17" y="0" width="10" height="1.6" fill="#9b9078"/>' +
      '<rect x="4" y="-3.5" width="13" height="1.6" fill="#9b9078"/><rect x="6" y="0" width="11" height="1.6" fill="#9b9078"/>' +
      '<rect x="-3" y="-7.5" width="6" height="15" fill="#b8442f"/>';
  }
  function hand(side) {          // side: -1 esquerda, 1 direita
    var s = side;
    return '<rect x="-17" y="10" width="34" height="140" rx="10" fill="#c7503c"/>' +
      '<rect x="-17" y="26" width="34" height="8" fill="#9f3a2a"/><rect x="-17" y="52" width="34" height="8" fill="#9f3a2a"/>' +
      '<rect x="-18" y="6" width="36" height="12" rx="4" fill="#f3e6d0"/>' +
      '<ellipse cx="0" cy="-8" rx="15" ry="20" fill="#efc08b"/>' +
      '<ellipse cx="' + (-13 * s) + '" cy="-2" rx="6" ry="12" fill="#efc08b" transform="rotate(' + (-18 * s) + ' ' + (-13 * s) + ' -2)"/>' +
      '<path d="M-8 -24v8M0 -26v9M8 -24v8" stroke="#c9976a" stroke-width="1.4" stroke-linecap="round"/>';
  }

  function sceneSVG() {
    var fenceBalusters = "", planks = "", scallops = "", flowers = "";
    for (var x = 40; x <= 360; x += 24) fenceBalusters += '<rect x="' + (x - 4) + '" y="614" width="8" height="30" fill="#fff" stroke="#3f6aa8" stroke-width="1.5"/>';
    [668, 690, 716, 748, 786, 830, 880, 940].forEach(function (y) { planks += '<line x1="0" x2="400" y1="' + y + '" y2="' + y + '" stroke="#a9bfdc" stroke-width="1.6"/>'; });
    for (var s = 10; s < 400; s += 20) scallops += '<path d="M' + (s - 10) + ' 40 q10 18 20 0" fill="#fff" stroke="#3f6aa8" stroke-width="1.5"/>';
    for (var f = 0; f < 22; f++) {
      var fx = (f * 53 + 17) % 380 + 10, fy = 625 + ((f * 37) % 30);
      flowers += '<circle cx="' + fx + '" cy="' + (fy > 640 ? 622 : fy) + '" r="2.4" fill="' + (f % 3 ? "#f7d046" : "#f78fb3") + '"/>';
    }

    return '' +
    '<svg id="cs-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cena: manhã numa varanda, o jornaleiro passa de bicicleta e joga o jornal">' +
    '<defs>' +
      '<linearGradient id="csSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb9ec"/><stop offset=".6" stop-color="#bfe3f5"/><stop offset="1" stop-color="#f7ecd0"/></linearGradient>' +
      '<radialGradient id="csSun"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="csLawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ccb62"/><stop offset="1" stop-color="#5b9f45"/></linearGradient>' +
      '<linearGradient id="csShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a08" stop-opacity=".35"/><stop offset="1" stop-color="#2a1a08" stop-opacity="0"/></linearGradient>' +
    '</defs>' +

    '<g id="cs-sway"><g id="cs-tilt"><g id="cs-world">' +
      /* céu */
      '<rect width="400" height="440" fill="url(#csSky)"/>' +
      '<circle cx="312" cy="118" r="95" fill="url(#csSun)"/>' +
      '<g class="cloud" id="cloud1"><ellipse cx="90" cy="120" rx="52" ry="15" fill="#fff" opacity=".9"/><ellipse cx="120" cy="108" rx="34" ry="14" fill="#fff" opacity=".9"/></g>' +
      '<g class="cloud" id="cloud2"><ellipse cx="260" cy="190" rx="44" ry="12" fill="#fff" opacity=".85"/><ellipse cx="282" cy="180" rx="26" ry="11" fill="#fff" opacity=".85"/></g>' +
      /* gramado ao fundo + casas */
      '<rect y="345" width="400" height="300" fill="url(#csLawn)"/>' +
      tree(30, 395, 26, "#5f9a4a") + tree(396, 392, 28, "#4f8a43") +
      house(-10, 410, 108, 72, "#f3d9cc", "#8d4b3b", "#3f6aa8") +
      house(112, 410, 94, 66, "#dce9f5", "#4f6f94", "#b8442f") +
      house(216, 410, 104, 76, "#f6efc8", "#a35c3a", "#3f6aa8") +
      house(326, 410, 90, 64, "#e3f0d8", "#5d7a4c", "#b8442f") +
      tree(108, 418, 20, "#4f8a43") + tree(212, 420, 22, "#5f9a4a") + tree(322, 418, 19, "#4f8a43") +
      '<rect y="410" width="400" height="60" fill="#86c45e"/>' +
      /* calçada, rua, calçada */
      '<rect y="470" width="400" height="22" fill="#dcd8ce"/><rect y="490" width="400" height="3" fill="#b9b5ab"/>' +
      '<rect y="493" width="400" height="104" fill="#6d7078"/>' +
      '<rect y="544" width="400" height="3" fill="none"/>' +
      '<g fill="#f0d36b">' + [10, 70, 130, 190, 250, 310, 370].map(function (x) { return '<rect x="' + x + '" y="543" width="34" height="4" rx="2"/>'; }).join("") + '</g>' +
      '<rect y="597" width="400" height="3" fill="#b9b5ab"/><rect y="600" width="400" height="20" fill="#dcd8ce"/>' +
      '<rect y="620" width="400" height="200" fill="url(#csLawn)"/>' + flowers +

      /* bicicleta + jornaleiro (origem local = chão entre as rodas) */
      '<g id="bike">' +
        '<ellipse cx="0" cy="2" rx="46" ry="5" fill="#000" opacity=".18"/>' +
        '<g transform="translate(-30 -22)"><g class="spin"><circle r="22" fill="none" stroke="#1f2430" stroke-width="3.2"/><line x1="-22" x2="22" stroke="#555" stroke-width="1"/><line y1="-22" y2="22" stroke="#555" stroke-width="1"/><line x1="-15" y1="-15" x2="15" y2="15" stroke="#555" stroke-width="1"/><line x1="15" y1="-15" x2="-15" y2="15" stroke="#555" stroke-width="1"/></g></g>' +
        '<g transform="translate(30 -22)"><g class="spin"><circle r="22" fill="none" stroke="#1f2430" stroke-width="3.2"/><line x1="-22" x2="22" stroke="#555" stroke-width="1"/><line y1="-22" y2="22" stroke="#555" stroke-width="1"/><line x1="-15" y1="-15" x2="15" y2="15" stroke="#555" stroke-width="1"/><line x1="15" y1="-15" x2="-15" y2="15" stroke="#555" stroke-width="1"/></g></g>' +
        '<polyline points="-30,-22 -8,-52 20,-56 30,-22" fill="none" stroke="#3f6aa8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<polyline points="-8,-52 0,-22 20,-56" fill="none" stroke="#3f6aa8" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<line x1="20" y1="-56" x2="26" y2="-66" stroke="#222" stroke-width="3.4" stroke-linecap="round"/>' +
        '<rect x="-16" y="-58" width="16" height="4" rx="2" fill="#222"/>' +
        '<g id="rider">' +
          '<g class="legs"><g class="leg legA"><line x1="-8" y1="-54" x2="-2" y2="-26" stroke="#2f3b52" stroke-width="7" stroke-linecap="round"/><ellipse cx="0" cy="-22" rx="7" ry="3.5" fill="#222"/></g>' +
          '<g class="leg legB"><line x1="-8" y1="-54" x2="8" y2="-30" stroke="#2f3b52" stroke-width="7" stroke-linecap="round"/><ellipse cx="10" cy="-26" rx="7" ry="3.5" fill="#222"/></g></g>' +
          '<line x1="-8" y1="-56" x2="12" y2="-84" stroke="#c0392b" stroke-width="13" stroke-linecap="round"/>' +
          '<rect x="-18" y="-72" width="14" height="18" rx="3" fill="#8a5a2b"/><rect x="-16" y="-80" width="10" height="9" rx="2" fill="#f1e9d2"/>' +
          '<line x1="12" y1="-82" x2="26" y2="-68" stroke="#c0392b" stroke-width="5" stroke-linecap="round"/>' +
          '<g transform="translate(12 -82)"><g id="throwArm"><line x1="0" y1="0" x2="16" y2="14" stroke="#c0392b" stroke-width="5" stroke-linecap="round"/><circle cx="17" cy="15" r="3.4" fill="#f1c27d"/></g></g>' +
          '<circle cx="19" cy="-98" r="9" fill="#f1c27d"/>' +
          '<path d="M10 -100a9 9 0 0 1 18 0z" fill="#2c4a7a"/><rect x="22" y="-102" width="12" height="3.4" rx="1.6" fill="#2c4a7a"/>' +
        '</g>' +
      '</g>' +

      /* varanda */
      '<rect y="650" width="400" height="420" fill="#f6f3ec"/>' + planks +
      '<rect y="646" width="400" height="6" fill="#d7d2c6"/>' +
      '<rect x="0" y="602" width="400" height="12" rx="3" fill="#fff" stroke="#3f6aa8" stroke-width="2"/>' +
      fenceBalusters +
      '<rect x="0" y="642" width="400" height="9" rx="3" fill="#fff" stroke="#3f6aa8" stroke-width="2"/>' +
      '<rect x="0" y="0" width="28" height="652" fill="#fff"/><rect x="26" y="0" width="3" height="652" fill="#c9d3e3"/><rect x="0" y="560" width="30" height="92" fill="#e8eef7" stroke="#3f6aa8" stroke-width="2"/>' +
      '<rect x="372" y="0" width="28" height="652" fill="#fff"/><rect x="371" y="0" width="3" height="652" fill="#c9d3e3"/><rect x="370" y="560" width="30" height="92" fill="#e8eef7" stroke="#3f6aa8" stroke-width="2"/>' +
      '<rect x="0" y="0" width="400" height="40" fill="#fff"/><rect x="0" y="34" width="400" height="6" fill="#3f6aa8"/>' + scallops +
      '<rect x="0" y="40" width="400" height="80" fill="url(#csShade)"/>' +

      /* pés (primeira pessoa) */
      '<g id="feet">' +
        '<path d="M112 800 L116 905 L162 905 L166 800 Z" fill="#3b5b8c"/><path d="M234 800 L238 905 L284 905 L288 800 Z" fill="#3b5b8c"/>' +
        '<path d="M112 792 q0 -52 26 -56 q26 4 26 56 q0 18 -26 18 q-26 0 -26 -18z" fill="#f4f1ea" stroke="#3f6aa8" stroke-width="2.2"/>' +
        '<path d="M120 752 q18 -14 36 0" fill="none" stroke="#3f6aa8" stroke-width="2.6"/><path d="M124 770h28M122 780h32" stroke="#c9d3e3" stroke-width="2"/>' +
        '<path d="M236 792 q0 -52 26 -56 q26 4 26 56 q0 18 -26 18 q-26 0 -26 -18z" fill="#f4f1ea" stroke="#3f6aa8" stroke-width="2.2"/>' +
        '<path d="M244 752 q18 -14 36 0" fill="none" stroke="#3f6aa8" stroke-width="2.6"/><path d="M248 770h28M246 780h32" stroke="#c9d3e3" stroke-width="2"/>' +
      '</g>' +

      /* jornal em voo / no chão */
      '<g id="flyPaper" opacity="0"><g id="flyInner">' + rollShapes() + '</g></g>' +
    '</g></g></g>' +

    /* HUD: mãos e jornal na mão (fora da inclinação da câmera) */
    '<g id="hud">' +
      '<g id="held" opacity="0"><g id="heldRoll">' + rollShapes() + '</g>' +
        '<g id="heldSheet" opacity="0"><rect x="-45" y="-60" width="90" height="120" fill="#efe3bf" stroke="#8a7a5a" stroke-width="1.2"/>' +
        '<rect x="-38" y="-52" width="76" height="12" fill="#2a1f15"/><rect x="-38" y="-34" width="34" height="2" fill="#7b6b52"/><rect x="-38" y="-29" width="34" height="2" fill="#7b6b52"/><rect x="-38" y="-24" width="30" height="2" fill="#7b6b52"/><rect x="0" y="-34" width="38" height="26" fill="#a99774"/><rect x="-38" y="-6" width="76" height="2" fill="#7b6b52"/><rect x="-38" y="0" width="76" height="2" fill="#7b6b52"/><rect x="-38" y="6" width="76" height="2" fill="#7b6b52"/><rect x="-38" y="12" width="60" height="2" fill="#7b6b52"/><rect x="-38" y="24" width="76" height="2" fill="#7b6b52"/><rect x="-38" y="30" width="70" height="2" fill="#7b6b52"/></g></g>' +
      '<g id="handL" opacity="0">' + hand(-1) + '</g><g id="handR" opacity="0">' + hand(1) + '</g>' +
    '</g></g></svg>';
  }

  /* ---------- montar ---------- */
  function mount() {
    host.innerHTML = sceneSVG();
    var svg = host.querySelector("svg");
    svg.style.filter = "saturate(1) sepia(0) contrast(1) brightness(1)";
  }

  /* ---------- linha do tempo ---------- */
  function timeline() {
    var svg = $("#cs-svg");

    // câmera / balanço da cadeira
    var sway = $("#cs-sway");
    sway.style.transformOrigin = "200px 800px";
    A(sway, [{ transform: "scale(1.05) rotate(-.7deg) translateY(2px)" }, { transform: "scale(1.05) rotate(.7deg) translateY(-2px)" }], 0, 1.7, { iterations: Infinity, direction: "alternate" });

    // fade-in
    A(blackEl, [{ opacity: 1 }, { opacity: 0 }], 0, 1.0, { easing: "ease-out" });

    // nuvens
    A($("#cloud1"), [{ transform: "translateX(-20px)" }, { transform: "translateX(40px)" }], 0, 14, { iterations: Infinity, direction: "alternate", easing: "linear" });
    A($("#cloud2"), [{ transform: "translateX(24px)" }, { transform: "translateX(-34px)" }], 0, 18, { iterations: Infinity, direction: "alternate", easing: "linear" });

    // bicicleta atravessa a rua (linear: o arremesso acontece com a bike em x≈250)
    var bike = $("#bike");
    A(bike, [{ transform: "translate(-90px,565px)" }, { transform: "translate(470px,565px)" }], 1.2, 3.7, { easing: "linear" });
    Array.prototype.forEach.call(host.querySelectorAll(".spin"), function (w) {
      A(w, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], 0, .55, { iterations: Infinity, easing: "linear" });
    });
    A($(".legA"), [{ transform: "rotate(-16deg)" }, { transform: "rotate(16deg)" }], 0, .3, { iterations: Infinity, direction: "alternate" });
    A($(".legB"), [{ transform: "rotate(16deg)" }, { transform: "rotate(-16deg)" }], 0, .3, { iterations: Infinity, direction: "alternate" });
    $(".legA").style.transformOrigin = "-8px -54px";
    $(".legB").style.transformOrigin = "-8px -54px";
    A($("#rider"), [{ transform: "translateY(0px)" }, { transform: "translateY(-1.6px)" }], 0, .3, { iterations: Infinity, direction: "alternate" });

    // braço que arremessa
    var arm = $("#throwArm");
    A(arm, [
      { transform: "rotate(0deg)", offset: 0 },
      { transform: "rotate(-110deg)", offset: .3, easing: "ease-out" },
      { transform: "rotate(-110deg)", offset: .55 },
      { transform: "rotate(0deg)", offset: 1 }
    ], 3.28, 1.0);

    // jornal voando até os pés (coordenadas de tela; tamanho cresce ao se aproximar)
    var fly = $("#flyPaper");
    A(fly, [{ opacity: 0 }, { opacity: 1 }], 3.45, .01);
    A($("#flyPaper"), [
      { transform: "translate(270px,465px) scale(.28) rotate(-20deg)", easing: "cubic-bezier(.2,.7,.4,1)", offset: 0 },
      { transform: "translate(285px,360px) scale(.45) rotate(160deg)", easing: "cubic-bezier(.5,0,.85,.5)", offset: .3 },
      { transform: "translate(240px,520px) scale(.8) rotate(430deg)", easing: "ease-in", offset: .65 },
      { transform: "translate(200px,735px) scale(1.3) rotate(700deg)", easing: "ease-out", offset: .88 },
      { transform: "translate(200px,714px) scale(1.26) rotate(704deg)", easing: "ease-in", offset: .94 },
      { transform: "translate(200px,736px) scale(1.3) rotate(710deg)", offset: 1 }
    ], 3.45, 1.5, { easing: "linear" });

    // câmera olha para baixo
    var tilt = $("#cs-tilt");
    tilt.style.transformOrigin = "200px 700px";
    A(tilt, [{ transform: "translateY(0px) scale(1)" }, { transform: "translateY(-70px) scale(1.12)" }], 5.0, 1.0);

    // troca: o jornal do chão vira o jornal na mão
    at(6.2, function () {
      fly.style.opacity = "0"; fly.style.display = "none";
    });
    var held = $("#held");
    A(held, [{ opacity: 0 }, { opacity: 1 }], 6.2, .01);
    A(held, [
      { transform: "translate(200px,669px) scale(1.456) rotate(-10deg)" },
      { transform: "translate(200px,669px) scale(1.456) rotate(-10deg)", offset: .01 },
      { transform: "translate(200px,440px) scale(2.2) rotate(0deg)", offset: 1 }
    ], 6.2, 1.1);
    A($("#heldRoll"), [{ opacity: 1 }, { opacity: 0 }], 6.9, .35);
    A($("#heldSheet"), [{ opacity: 0, transform: "scale(.28)" }, { opacity: 1, transform: "scale(.5)", offset: .3 }, { opacity: 1, transform: "scale(1.6)" }], 6.9, 1.5, { easing: "ease-in" });

    // mãos
    var hl = $("#handL"), hr = $("#handR");
    A(hl, [{ opacity: 1, transform: "translate(120px,930px)" }, { opacity: 1, transform: "translate(158px,696px)" }], 5.55, .7, { easing: "ease-out" });
    A(hr, [{ opacity: 1, transform: "translate(280px,930px)" }, { opacity: 1, transform: "translate(242px,696px)" }], 5.55, .7, { easing: "ease-out" });
    A(hl, [{ transform: "translate(158px,696px)" }, { transform: "translate(150px,470px)" }], 6.25, 1.05, { fill: "forwards" });
    A(hr, [{ transform: "translate(242px,696px)" }, { transform: "translate(250px,470px)" }], 6.25, 1.05, { fill: "forwards" });
    A(hl, [{ transform: "translate(150px,470px)" }, { transform: "translate(40px,640px)" }], 7.4, .9, { easing: "ease-in", fill: "forwards" });
    A(hr, [{ transform: "translate(250px,470px)" }, { transform: "translate(360px,640px)" }], 7.4, .9, { easing: "ease-in", fill: "forwards" });

    // o mundo perde a cor e escurece nas bordas
    A(svg, [
      { filter: "saturate(1) sepia(0) contrast(1) brightness(1)" },
      { filter: "saturate(.35) sepia(1) contrast(1.06) brightness(.94)" }
    ], 6.3, 1.9);
    A(vignetteEl, [{ opacity: 0 }, { opacity: 1 }], 6.3, 1.9);

    // o jornal cresce e vira a primeira página
    A(paperEl, [{ opacity: 0 }, { opacity: 1 }], 7.25, .12, { easing: "linear" });
    A(paperEl, [{ clipPath: "inset(47% 37% 37% 37% round 3px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)" }], 7.3, 1.3, { easing: "cubic-bezier(.5,0,.3,1)" });
    A(paperEl.querySelector(".cs-mast"), [{ opacity: 0, transform: "translateY(10px) scale(.96)" }, { opacity: 1, transform: "none" }], 8.2, .7, { easing: "ease-out" });

    // fim
    at(9.5, finish);
  }

  /* ---------- versão 3D: a cena anda sozinha; aqui ficam só as camadas DOM ---------- */
  function mount3d() {
    if (!window.GazetaCutscene3D || !window.GazetaCutscene3D.supported()) return false;
    try {
      host.innerHTML = "";
      scene3d = window.GazetaCutscene3D.create({ container: host, getPaper: opts.getPaper });
    } catch (e) {
      if (window.console) console.warn("cena 3D:", e);
      scene3d = null;
    }
    if (!scene3d) { host.innerHTML = ""; return false; }
    frameEl.classList.add("is-3d");
    return true;
  }

  function timeline3d() {
    scene3d.start();
    A(blackEl, [{ opacity: 1 }, { opacity: 0 }], 0, 1.0, { easing: "ease-out" });
    // o tom de jornal nasce no papel (dentro da cena); a vinheta acompanha
    A(vignetteEl, [{ opacity: 0 }, { opacity: 1 }], 7.0, 1.4);
    // o jornal já cobre a tela: entra o título, como na versão SVG
    paperEl.style.clipPath = "none";
    A(paperEl, [{ opacity: 0 }, { opacity: 1 }], 8.45, .3, { easing: "linear" });
    A(paperEl.querySelector(".cs-mast"), [{ opacity: 0, transform: "translateY(10px) scale(.96)" }, { opacity: 1, transform: "none" }], 8.7, .6, { easing: "ease-out" });
    at(9.5, finish);
  }

  // para e descarta o que estiver tocando (cena 3D, animações), sem encerrar a cena
  function stopMedia() {
    anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    anims = [];
    timers.forEach(clearTimeout); timers = [];
    if (scene3d) { scene3d.dispose(); scene3d = null; }
    frameEl.classList.remove("is-3d");
    paperEl.style.clipPath = "";
    host.innerHTML = "";
  }

  /* ---------- controle ---------- */
  function cleanup() {
    stopMedia();
  }
  function finish() {
    if (finished) return;
    finished = true;
    if (opts.onReveal) opts.onReveal();
    root.classList.add("out");
    setTimeout(function () {
      cleanup();
      root.classList.remove("on");
      running = false;
      if (opts.onDone) opts.onDone();
    }, 850);
  }

  function play(o) {
    if (running) return;
    opts = o || {};
    running = true; finished = false;
    root.classList.remove("out");
    root.classList.add("on");
    if (mount3d()) timeline3d();
    else { mount(); timeline(); }
  }

  function skip() { if (running && !finished) finish(); }

  skipBtn.addEventListener("click", skip);

  window.GazetaCutscene = { play: play, skip: skip, isRunning: function () { return running; } };
})();
