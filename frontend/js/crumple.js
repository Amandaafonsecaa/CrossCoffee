/* Abertura 3D: o jornal começa como uma bola de papel amassada e vai se abrindo
   até virar a página que cobre a tela inteira. Three.js (vendor/three.min.js, build UMD).

   Como funciona:
   - a folha é uma malha plana do tamanho exato da tela (no fim, ela coincide com o DOM);
   - "abrir" = embrulhar a folha numa esfera cuja curvatura vai de "bola fechada" até zero
     (o comprimento ao longo dos raios se conserva, por isso parece papel de verdade);
   - os vincos são ondas triangulares em direções aleatórias sobre a folha plana
     (vincos de papel são retos), aplicados na direção da normal e sumindo ao abrir;
   - flatShading faz cada triângulo pegar luz de um jeito: as facetas do amassado. */
(function () {
  "use strict";

  function supported() {
    if (!window.THREE) return false;
    try {
      var c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) { return false; }
  }

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // gerador pseudoaleatório com semente (o amassado sai sempre igual)
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* opts: { container, texture (canvas), rect (px, onde a folha termina), duration (ms), hold, onProgress(p), onDone() } */
  function play(opts) {
    var THREE = window.THREE;
    var W = window.innerWidth, H = window.innerHeight;
    var stopped = false, raf = 0;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    var canvasEl = renderer.domElement;
    canvasEl.className = "crumple-canvas";
    opts.container.appendChild(canvasEl);

    var scene = new THREE.Scene();
    var FOV = 32, D = 10;
    var camera = new THREE.PerspectiveCamera(FOV, W / H, .1, 100);
    camera.position.set(0, 0, D);

    // a folha ocupa exatamente o que a câmera vê no plano z = 0
    var visH = 2 * D * Math.tan(FOV * Math.PI / 360), visW = visH * W / H;
    // ...ou o retângulo do jornal (opts.rect, em px), se ele não ocupar a tela toda
    var rect = opts.rect || { left: 0, top: 0, width: W, height: H };
    var offX = ((rect.left + rect.width / 2) / W - .5) * visW, offY = -((rect.top + rect.height / 2) / H - .5) * visH;
    visW *= rect.width / W; visH *= rect.height / H;
    var hw = visW / 2, hh = visH / 2, dmax = Math.hypot(hw, hh);

    var cells = W > H ? 72 : 44;
    var nx = W >= H ? cells : Math.max(18, Math.round(cells * W / H * 1.6));
    var ny = Math.max(18, Math.round(nx * (visH / visW)));
    var geo = new THREE.PlaneGeometry(visW, visH, nx, ny);
    var pos = geo.attributes.position, uv = geo.attributes.uv;
    var N = pos.count;

    // vértices internos levemente tortos: triângulos irregulares, como papel
    var rand = rng(20261105);
    var cx = visW / nx, cy = visH / ny;
    var flat = new Float32Array(N * 2);
    for (var i = 0; i < N; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      var edgeX = Math.abs(Math.abs(x) - hw) < 1e-6, edgeY = Math.abs(Math.abs(y) - hh) < 1e-6;
      if (!edgeX) x += (rand() - .5) * cx * .7;
      if (!edgeY) y += (rand() - .5) * cy * .7;
      flat[i * 2] = x; flat[i * 2 + 1] = y;
      uv.setXY(i, x / visW + .5, y / visH + .5);
    }

    // campo de vincos: soma de ondas triangulares em direções aleatórias
    var folds = [];
    for (var f = 0; f < 11; f++) {
      var a = rand() * Math.PI;
      folds.push({ nx: Math.cos(a), ny: Math.sin(a), fr: (1.6 + rand() * 6.5) / dmax, off: rand(), amp: .35 + rand() * .65 });
    }
    var crease = new Float32Array(N), lump = new Float32Array(N), lag = new Float32Array(N);
    var cmin = 1e9, cmax = -1e9;
    for (i = 0; i < N; i++) {
      x = flat[i * 2]; y = flat[i * 2 + 1];
      var c = 0;
      for (f = 0; f < folds.length; f++) {
        var t = (x * folds[f].nx + y * folds[f].ny) * folds[f].fr + folds[f].off;
        c += folds[f].amp * (Math.abs(t - Math.floor(t) - .5) * 2 - .5);
      }
      crease[i] = c;
      if (c < cmin) cmin = c; if (c > cmax) cmax = c;
      // deformação grande e suave (a bola não é redonda)
      lump[i] = Math.sin(x / dmax * 3.1 + 1.3) * Math.cos(y / dmax * 2.7 - .4) + .5 * Math.sin((x + y) / dmax * 5.3);
      lag[i] = Math.hypot(x, y) / dmax;
    }
    for (i = 0; i < N; i++) crease[i] = (crease[i] - cmin) / (cmax - cmin) * 2 - 1;   // −1..1

    // sombreamento nas dobras (cor por vértice, multiplica a textura)
    var colors = new Float32Array(N * 3);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    var tex = new THREE.CanvasTexture(opts.texture);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;

    var mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0,
      roughness: .93, metalness: 0, flatShading: true, vertexColors: true, side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(geo, mat);
    var group = new THREE.Group();
    group.add(mesh);
    scene.add(group);

    var hemi = new THREE.HemisphereLight(0xfff3dc, 0x2a1d10, 1.1);
    var key = new THREE.DirectionalLight(0xfff0d6, 2.6);
    key.position.set(-4, 6, 9);
    var rim = new THREE.DirectionalLight(0xffcf8a, .9);
    rim.position.set(6, -2, 3);
    scene.add(hemi, key, rim);

    /* s: 0 = bola, 1 = folha aberta */
    function shape(s, time) {
      var open = 1 - s;
      var k = (Math.PI * .96 / dmax) * Math.pow(open, 1.35);       // curvatura
      var R = dmax / Math.PI;                                         // raio da bola fechada
      for (var i = 0; i < N; i++) {
        var x = flat[i * 2], y = flat[i * 2 + 1];
        // as bordas abrem por último
        var si = clamp(s * 1.35 - lag[i] * .35, 0, 1);
        var o = 1 - si;
        var d = Math.hypot(x, y), px, py, pz, nX, nY, nZ;
        if (k < 1e-5 || d < 1e-6) { px = x; py = y; pz = 0; nX = 0; nY = 0; nZ = 1; }
        else {
          var a = k * d, sa = Math.sin(a), ca = Math.cos(a), ux = x / d, uy = y / d;
          px = ux * sa / k; py = uy * sa / k; pz = -(1 - ca) / k;
          nX = ux * sa; nY = uy * sa; nZ = ca;
        }
        var amp = R * (.36 * Math.pow(o, 1.5) + .006 * o);
        var disp = crease[i] * amp + lump[i] * R * .22 * o * o;
        pos.setXYZ(i, px + nX * disp, py + nY * disp, pz + nZ * disp);
        // dobras côncavas ficam mais escuras
        var shade = 1 - .42 * o * smooth(-.2, -1, crease[i]) - .12 * o;
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
      }
      pos.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.computeBoundingSphere();

      // a bola gira um pouco e vem da distância
      group.rotation.set(
        .55 * open * Math.sin(time * .0011 + .6),
        -.9 * open + .25 * open * Math.sin(time * .0008),
        -.6 * open
      );
      // o pivô fica no centro da bola (senão ela gira em volta da borda e sai do centro)
      mesh.position.z = R * open * open;
      var settle = smooth(.5, 1, s);
      group.position.set(offX * settle, offY * settle, -8 * Math.pow(open, 2.2) - R * open * open);

      // no final, a luz vira "impressão": a textura aparece com a cor exata do DOM
      var flatMix = smooth(.82, 1, s);
      mat.emissiveIntensity = flatMix;
      hemi.intensity = 1.1 * (1 - flatMix);
      key.intensity = 2.6 * (1 - flatMix);
      rim.intensity = .9 * (1 - flatMix);
    }

    // abre aos "estalos", como papel de verdade
    function progress(p) {
      var e = Math.pow(easeInOut(p), 1.25);   // começa devagar: a bola "afrouxa" antes de abrir
      var steps = 4, q = p * steps, st = (Math.floor(q) + smooth(.15, .85, q - Math.floor(q))) / steps;
      return clamp(e * .6 + Math.pow(st, 1.25) * .4, 0, 1);
    }

    var dur = Math.max(400, opts.duration || 3000);
    var t0 = 0, HOLD = opts.hold == null ? 600 : opts.hold;   // instante de bola parada antes de abrir
    function frame(now) {
      if (stopped) return;
      if (!t0) t0 = now;
      var p = clamp((now - t0 - HOLD) / dur, 0, 1);
      shape(progress(p), now);
      renderer.render(scene, camera);
      if (opts.onProgress) opts.onProgress(p);
      if (p < 1) raf = requestAnimationFrame(frame);
      else if (opts.onDone) opts.onDone();
    }
    shape(0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);

    function dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      geo.dispose(); mat.dispose(); tex.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    }
    return { stop: function () { stopped = true; cancelAnimationFrame(raf); }, dispose: dispose, canvas: canvasEl };
  }

  window.GazetaCrumple = { supported: supported, play: play };
})();
