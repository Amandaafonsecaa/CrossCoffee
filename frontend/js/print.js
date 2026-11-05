/* Impressão: foto em retícula (halftone) e "fotografia" das páginas do jornal num <canvas>.
   O canvas vira a textura da abertura 3D (js/crumple.js). Como ele é desenhado a partir
   do próprio DOM (posição de cada palavra, borda e fundo), a textura fica igual à página
   que aparece em seguida e a troca 3D → página não "pula". */
(function () {
  "use strict";

  /* =========================================================
     FOTO EM RETÍCULA
     Cena em tons de cinza desenhada à mão e convertida em pontos de tinta.
     ========================================================= */
  function sceneGray(w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var g = c.getContext("2d");

    // céu de manhã
    var sky = g.createLinearGradient(0, 0, 0, h * .62);
    sky.addColorStop(0, "#d9d9d9"); sky.addColorStop(1, "#f7f7f7");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // sol baixo, com halo
    var sun = g.createRadialGradient(w * .78, h * .2, 0, w * .78, h * .2, w * .22);
    sun.addColorStop(0, "#ffffff"); sun.addColorStop(.25, "#fbfbfb"); sun.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sun; g.fillRect(0, 0, w, h);

    // casario ao fundo
    g.fillStyle = "#a9a9a9";
    var x = 0, i = 0;
    while (x < w) {
      var bw = w * (.09 + ((i * 37) % 5) * .018), bh = h * (.2 + ((i * 53) % 7) * .03);
      g.fillRect(x, h * .58 - bh, bw - 2, bh);
      g.fillStyle = "#8f8f8f";
      for (var wy = h * .58 - bh + 8; wy < h * .55; wy += 14)
        for (var wx = x + 6; wx < x + bw - 10; wx += 12) g.fillRect(wx, wy, 5, 7);
      g.fillStyle = (i % 2) ? "#a9a9a9" : "#b8b8b8";
      x += bw; i++;
    }
    // torre da igreja
    g.fillStyle = "#9a9a9a";
    g.fillRect(w * .16, h * .14, w * .07, h * .44);
    g.beginPath(); g.moveTo(w * .155, h * .14); g.lineTo(w * .195, h * .04); g.lineTo(w * .235, h * .14); g.fill();

    // chão da praça
    var ground = g.createLinearGradient(0, h * .58, 0, h);
    ground.addColorStop(0, "#bdbdbd"); ground.addColorStop(1, "#7a7a7a");
    g.fillStyle = ground; g.fillRect(0, h * .58, w, h * .42);
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 2;
    for (var k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(w / 2 + k * 20, h * .58); g.lineTo(w / 2 + k * 140, h); g.stroke(); }

    // árvores
    function tree(tx, ty, r) {
      g.fillStyle = "#3d3d3d"; g.fillRect(tx - r * .08, ty, r * .16, r * 1.3);
      g.fillStyle = "#4a4a4a";
      [[0, 0, 1], [-.6, .25, .7], [.6, .2, .75], [-.25, -.45, .7], [.3, -.4, .65]].forEach(function (b) {
        g.beginPath(); g.arc(tx + b[0] * r, ty + b[1] * r, r * b[2], 0, 7); g.fill();
      });
    }
    tree(w * .06, h * .3, w * .1);
    tree(w * .95, h * .32, w * .09);

    // poste de luz
    g.fillStyle = "#2e2e2e";
    g.fillRect(w * .66, h * .2, 5, h * .55);
    g.beginPath(); g.arc(w * .66 + 2.5, h * .19, 11, 0, 7); g.fill();

    // banco da praça
    g.fillStyle = "#353535";
    g.fillRect(w * .2, h * .66, w * .56, h * .035);
    g.fillRect(w * .2, h * .59, w * .56, h * .03);
    g.fillRect(w * .23, h * .69, 6, h * .12); g.fillRect(w * .72, h * .69, 6, h * .12);

    // leitores sentados, cada um com o seu jornal
    function reader(px, scale, hat) {
      var s = scale * h;
      g.fillStyle = "#262626";
      g.beginPath(); g.arc(px, h * .5 - s * .05, s * .07, 0, 7); g.fill();                       // cabeça
      if (hat) { g.fillRect(px - s * .1, h * .5 - s * .11, s * .2, s * .025); g.fillRect(px - s * .065, h * .5 - s * .17, s * .13, s * .07); }
      g.beginPath(); g.ellipse(px, h * .62, s * .13, s * .16, 0, 0, 7); g.fill();                 // tronco
      g.fillRect(px - s * .12, h * .66, s * .24, s * .07);                                         // colo
      g.fillRect(px - s * .1, h * .7, s * .06, s * .2); g.fillRect(px + s * .04, h * .7, s * .06, s * .2); // pernas
      // jornal aberto (claro) na frente do corpo
      g.fillStyle = "#ececec";
      g.save(); g.translate(px, h * .6); g.rotate(-.06);
      g.fillRect(-s * .2, -s * .1, s * .4, s * .22);
      g.fillStyle = "#b0b0b0";
      for (var ly = -s * .07; ly < s * .1; ly += s * .03) { g.fillRect(-s * .17, ly, s * .14, s * .012); g.fillRect(s * .03, ly, s * .14, s * .012); }
      g.fillStyle = "#d0d0d0"; g.fillRect(-s * .005, -s * .1, s * .01, s * .22);
      g.restore();
    }
    reader(w * .32, .55, true);
    reader(w * .5, .5, false);
    reader(w * .66, .56, true);

    // pombo no chão (detalhe)
    g.fillStyle = "#3a3a3a";
    g.beginPath(); g.ellipse(w * .86, h * .9, 14, 8, -.2, 0, 7); g.fill();
    g.beginPath(); g.arc(w * .88 + 8, h * .9 - 8, 5, 0, 7); g.fill();

    // vinheta, como lente antiga
    var vig = g.createRadialGradient(w / 2, h / 2, h * .25, w / 2, h / 2, w * .7);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,.35)");
    g.fillStyle = vig; g.fillRect(0, 0, w, h);
    return c;
  }

  function halftone(canvas) {
    var W = 720, H = 480;
    canvas.width = W; canvas.height = H;
    var src = sceneGray(W, H);
    var sg = src.getContext("2d");
    var data = sg.getImageData(0, 0, W, H).data;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#2a1f15";

    var step = 7, ang = Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang);
    var R = Math.ceil(Math.hypot(W, H) / step);
    for (var gy = -R; gy <= R; gy++) {
      for (var gx = -R; gx <= R; gx++) {
        var x = W / 2 + (gx * ca - gy * sa) * step, y = H / 2 + (gx * sa + gy * ca) * step;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        var p = ((y | 0) * W + (x | 0)) * 4;
        var lum = (data[p] * .3 + data[p + 1] * .59 + data[p + 2] * .11) / 255;
        var dark = 1 - lum;
        var r = Math.sqrt(dark) * step * .62;
        if (r < .35) continue;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
    }
  }

  /* =========================================================
     PAPEL (fundo da textura)
     ========================================================= */
  var noiseTile = null;
  function paperNoise() {
    if (noiseTile) return noiseTile;
    var n = document.createElement("canvas");
    n.width = n.height = 256;
    var g = n.getContext("2d");
    var img = g.createImageData(256, 256);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.random();
      img.data[i] = 92; img.data[i + 1] = 64; img.data[i + 2] = 26;
      img.data[i + 3] = v * v * 70;
    }
    g.putImageData(img, 0, 0);
    noiseTile = n;
    return n;
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function paintPaper(ctx, r) {
    ctx.fillStyle = cssVar("--paper", "#e7d7ac");
    ctx.fillRect(r.left, r.top, r.width, r.height);
    ctx.fillStyle = ctx.createPattern(paperNoise(), "repeat");
    ctx.fillRect(r.left, r.top, r.width, r.height);
    var hi = ctx.createRadialGradient(r.left + r.width * .18, r.top + r.height * .08, 0, r.left + r.width * .18, r.top + r.height * .08, r.width * .9);
    hi.addColorStop(0, "rgba(255,255,255,.28)"); hi.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hi; ctx.fillRect(r.left, r.top, r.width, r.height);
    var lo = ctx.createRadialGradient(r.left + r.width * .95, r.top + r.height, 0, r.left + r.width * .95, r.top + r.height, r.width);
    lo.addColorStop(0, "rgba(120,80,30,.28)"); lo.addColorStop(1, "rgba(120,80,30,0)");
    ctx.fillStyle = lo; ctx.fillRect(r.left, r.top, r.width, r.height);
  }

  // sombras da lombada e dobra horizontal (iguais ao .page::after do CSS)
  function paintFold(ctx, r, side) {
    var e = Math.min(70, r.width * .12);
    function band(x0, y0, x1, y1, stops) {
      var gr = ctx.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      ctx.fillStyle = gr; ctx.fillRect(r.left, r.top, r.width, r.height);
    }
    // bordas escurecidas (papel envelhecido)
    var edge = ctx.createRadialGradient(r.left + r.width / 2, r.top + r.height / 2, Math.min(r.width, r.height) * .45, r.left + r.width / 2, r.top + r.height / 2, Math.hypot(r.width, r.height) * .62);
    edge.addColorStop(0, "rgba(110,70,25,0)"); edge.addColorStop(1, "rgba(110,70,25,.32)");
    ctx.fillStyle = edge; ctx.fillRect(r.left, r.top, r.width, r.height);
    // dobra horizontal
    var y = r.top + r.height / 2;
    band(0, y - 14, 0, y + 14, [[0, "rgba(80,50,20,0)"], [.47, "rgba(80,50,20,.10)"], [.5, "rgba(60,35,12,.22)"], [.53, "rgba(255,248,225,.25)"], [1, "rgba(255,248,225,0)"]]);
    // lombada
    if (side === "left") band(r.right - e, 0, r.right, 0, [[0, "rgba(60,35,10,0)"], [1, "rgba(60,35,10,.38)"]]);
    if (side === "right") band(r.left, 0, r.left + e, 0, [[0, "rgba(60,35,10,.38)"], [1, "rgba(60,35,10,0)"]]);
  }

  /* =========================================================
     RASTERIZAR O DOM
     ========================================================= */
  function transparent(c) { return !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c); }

  function drawBorders(ctx, r, cs) {
    [["Top", r.left, r.top, r.right, r.top],
     ["Bottom", r.left, r.bottom, r.right, r.bottom],
     ["Left", r.left, r.top, r.left, r.bottom],
     ["Right", r.right, r.top, r.right, r.bottom]].forEach(function (b) {
      var w = parseFloat(cs["border" + b[0] + "Width"]), st = cs["border" + b[0] + "Style"];
      if (!w || st === "none" || st === "hidden") return;
      var col = cs["border" + b[0] + "Color"];
      ctx.strokeStyle = col;
      ctx.setLineDash(st === "dotted" ? [w, w * 1.6] : st === "dashed" ? [w * 3, w * 2] : []);
      var horiz = b[0] === "Top" || b[0] === "Bottom";
      var dir = (b[0] === "Top" || b[0] === "Left") ? 1 : -1;
      function line(off, lw) {
        ctx.lineWidth = lw;
        ctx.beginPath();
        if (horiz) { ctx.moveTo(b[1], b[2] + dir * off); ctx.lineTo(b[3], b[4] + dir * off); }
        else { ctx.moveTo(b[1] + dir * off, b[2]); ctx.lineTo(b[3] + dir * off, b[4]); }
        ctx.stroke();
      }
      if (st === "double" && w >= 3) { line(w / 6, w / 3); line(w - w / 6, w / 3); }
      else line(w / 2, w);
    });
    ctx.setLineDash([]);
  }

  var range = document.createRange();

  function fontOf(cs) {
    return cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  }
  function setFont(ctx, cs) {
    ctx.font = fontOf(cs);
    ctx.fillStyle = cs.color;
    if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    var m = ctx.measureText("Hg");
    return { asc: m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * .8, desc: m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * .2 };
  }
  function put(ctx, str, rect, fm) {
    var y = rect.top + (rect.height - (fm.asc + fm.desc)) / 2 + fm.asc;
    ctx.fillText(str, rect.left, y);
  }
  function caseOf(cs, s) {
    if (cs.textTransform === "uppercase") return s.toUpperCase();
    if (cs.textTransform === "capitalize") return s.replace(/(^|\s)(\S)/g, function (a, b, c) { return b + c.toUpperCase(); });
    return s;
  }

  function drawText(ctx, node, cs, el) {
    var text = node.nodeValue;
    if (!/\S/.test(text)) return;
    var fm = setFont(ctx, cs);
    var firstLetter = el.classList.contains("dropcap") && node === firstTextNode(el);
    var re = /\S+/g, m;
    while ((m = re.exec(text))) {
      var start = m.index, word = m[0];
      if (firstLetter && start === m.index && start === text.search(/\S/)) {
        // capitular (::first-letter)
        var pcs = getComputedStyle(el, "::first-letter");
        range.setStart(node, start); range.setEnd(node, start + 1);
        var fr = range.getClientRects()[0];
        if (fr) { var pfm = setFont(ctx, pcs); put(ctx, caseOf(pcs, word[0]), fr, pfm); fm = setFont(ctx, cs); }
        start += 1; word = word.slice(1);
        if (!word) continue;
      }
      range.setStart(node, start); range.setEnd(node, start + word.length);
      var rects = range.getClientRects();
      if (rects.length <= 1) {
        if (rects[0] && rects[0].width) put(ctx, caseOf(cs, word), rects[0], fm);
        continue;
      }
      // palavra quebrada com hífen entre linhas: letra por letra
      var prev = null;
      for (var k = 0; k < word.length; k++) {
        range.setStart(node, start + k); range.setEnd(node, start + k + 1);
        var cr = range.getClientRects()[0];
        if (!cr || !cr.width) continue;
        if (prev && cr.top > prev.top + 2) ctx.fillText("-", prev.right, prev.top + (prev.height - (fm.asc + fm.desc)) / 2 + fm.asc);
        put(ctx, caseOf(cs, word[k]), cr, fm);
        prev = cr;
      }
    }
  }
  function firstTextNode(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return /\S/.test(n.nodeValue) ? 1 : 3; } });
    return w.nextNode();
  }

  function walk(ctx, el, alpha) {
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    var a = alpha * parseFloat(cs.opacity);
    if (a < .02) return;
    if (el.tagName === "INPUT" || el.getAttribute("aria-hidden") === "true" && el.classList.contains("stamp")) return;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    ctx.globalAlpha = a;
    if (!transparent(cs.backgroundColor)) { ctx.fillStyle = cs.backgroundColor; ctx.fillRect(r.left, r.top, r.width, r.height); }
    drawBorders(ctx, r, cs);
    if (el.tagName === "CANVAS") { try { ctx.drawImage(el, r.left, r.top, r.width, r.height); } catch (e) {} }
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { ctx.globalAlpha = a; drawText(ctx, c, cs, el); }
      else if (c.nodeType === 1) walk(ctx, c, a);
    }
    ctx.globalAlpha = alpha;
  }

  /* pages: [{el, side}] — side: "single" | "left" | "right". rect: área total (viewport). */
  function rasterize(pages, rect, maxSide) {
    var scale = Math.min(Math.min(window.devicePixelRatio || 1, 2), (maxSide || 4096) / Math.max(rect.width, rect.height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    var ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.translate(-rect.left, -rect.top);
    ctx.textBaseline = "alphabetic";
    pages.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      ctx.save();
      ctx.beginPath(); ctx.rect(r.left, r.top, r.width, r.height); ctx.clip();
      paintPaper(ctx, r);
      var inner = p.el.querySelector(".page-inner") || p.el;
      try { walk(ctx, inner, 1); } catch (e) { if (window.console) console.warn("print:", e); }
      ctx.globalAlpha = 1;
      paintFold(ctx, r, p.side);
      ctx.restore();
    });
    return canvas;
  }

  /* verso de uma página: papel com a impressão da frente aparecendo de leve, por transparência */
  function backside(front) {
    var c = document.createElement("canvas");
    c.width = front.width; c.height = front.height;
    var ctx = c.getContext("2d");
    var r = { left: 0, top: 0, width: c.width, height: c.height, right: c.width, bottom: c.height };
    paintPaper(ctx, r);
    ctx.globalAlpha = .09;
    ctx.drawImage(front, 0, 0);
    ctx.globalAlpha = 1;
    paintFold(ctx, r, "single");
    return c;
  }

  window.GazetaPrint = { halftone: halftone, rasterize: rasterize, backside: backside };
})();
