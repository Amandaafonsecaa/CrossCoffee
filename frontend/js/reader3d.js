/* Mãos do leitor (3D low-poly articuladas) + virada de página física — Three.js.

   Camada WebGL transparente, fixa sobre o jornal (pointer-events: none):
   - duas mãos low-poly com esqueleto (punho, 3 falanges por dedo, polegar), em um único
     SkinnedMesh por mão (1 draw call cada; cada peça presa 100% a um osso = articulação rígida);
   - durante a virada, a folha que vira é uma malha que se curva, com a "foto" exata da página
     (GazetaPrint.rasterize) na frente e no verso. Fora da virada, o jornal é só o DOM.
   - o plano do jornal fica em z = 0 e coincide pixel a pixel com o DOM (mesma câmera da abertura).
   - só desenha quando algo se mexe (sem laço contínuo parado).

   Estados de cada mão: idle → release → reach → grab → pull → releasePaper → return (idle).
   Toda fase parte do estado ATUAL da mão, então não há saltos se algo for interrompido. */
(function () {
  "use strict";

  var THREE = window.THREE;
  function supported() {
    if (!THREE) return false;
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  }

  /* ---------- utilidades ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  var V3 = function (x, y, z) { return new THREE.Vector3(x || 0, y || 0, z || 0); };

  /* =========================================================
     POSES (parâmetros, não ângulos soltos: dá para misturar)
     c: dobra de cada dedo (indicador→mínimo), s: abertura entre dedos,
     ta: abdução do polegar, tf: flexão do polegar, to: oposição do polegar
     ========================================================= */
  var POSES = {
    rest:  { c: [.42, .48, .54, .6], s: .1, ta: .2, tf: .35, to: 1 },
    open:  { c: [.1, .14, .18, .24], s: .5,  ta: .8,  tf: .05, to: .2 },
    pinch: { c: [.62, .82, .9, .95], s: 0,   ta: .05, tf: .15, to: .6 }
  };
  function poseCopy(p) { return { c: p.c.slice(), s: p.s, ta: p.ta, tf: p.tf, to: p.to }; }
  function poseLerp(a, b, k, out) {
    out = out || poseCopy(a);
    for (var i = 0; i < 4; i++) out.c[i] = lerp(a.c[i], b.c[i], k);
    out.s = lerp(a.s, b.s, k); out.ta = lerp(a.ta, b.ta, k); out.tf = lerp(a.tf, b.tf, k); out.to = lerp(a.to, b.to, k);
    return out;
  }

  /* =========================================================
     MÃO LOW-POLY (mão direita; a esquerda é espelhada)
     espaço da mão: punho na origem, dedos em +y, palma virada para +z, polegar em +x.
     unidade: comprimento da palma ≈ 1.
     ========================================================= */
  var SKIN = 0xe6ad89, KNUCKLE = 0xdc9f7c, NAIL = 0xf2d6c8, SHIRT = 0x6f3527, CUFF = 0xe6d9c0;
  var FINGERS = [
    { n: "index",  x: .28,  y: .93, r: .1,   L: [.4, .24, .18],  splay: -.07 },
    { n: "middle", x: .095, y: .97, r: .104, L: [.44, .27, .19], splay: -.01 },
    { n: "ring",   x: -.09, y: .94, r: .097, L: [.41, .25, .18], splay: .06 },
    { n: "pinky",  x: -.26, y: .87, r: .085, L: [.32, .2, .16],  splay: .14 }
  ];
  // polegar: A = abertura no plano da palma (a partir de +y, rumo a +x), P = inclinação para a frente da palma, T = torção
  var THUMB = { x: .27, y: .22, z: .1, r: [.14, .12, .108], L: [.36, .27, .21] };

  function palmGeo() {
    var g = new THREE.BoxGeometry(.8, .92, .27, 3, 4, 1);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i) + .5, z = p.getZ(i);
      var t = (y - .04) / .92;
      x *= .76 + .24 * t;
      var e = Math.abs(x) / .42;
      z *= (1 - .42 * e * e) * (.82 + .18 * Math.sin(Math.PI * t));
      if (z > 0) z += .025 * (1 - e);
      if (t > .9) y -= .07 * e * e;
      p.setXYZ(i, x, y, z);
    }
    return g;
  }

  function buildHand() {
    var bones = [], byName = {}, pieces = [];
    function bone(name, parent, x, y, z) {
      var b = new THREE.Bone(); b.name = name; b.position.set(x, y, z);
      b.rotation.order = "ZXY";
      if (parent) parent.add(b);
      b.userData.i = bones.length; bones.push(b); byName[name] = b;
      return b;
    }
    var wrist = bone("wrist", null, 0, 0, 0);
    FINGERS.forEach(function (f) {
      var b1 = bone(f.n + "1", wrist, f.x, f.y, 0);
      var b2 = bone(f.n + "2", b1, 0, f.L[0], 0);
      bone(f.n + "3", b2, 0, f.L[1], 0);
      b1.rotation.z = f.splay;
    });
    var t1 = bone("thumb1", wrist, THUMB.x, THUMB.y, THUMB.z);
    var t2 = bone("thumb2", t1, 0, THUMB.L[0], 0);
    bone("thumb3", t2, 0, THUMB.L[1], 0);
    t1.rotation.set(.4, 0, -.6);
    wrist.updateMatrixWorld(true);

    function add(geo, b, color, m) {
      var g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      var mat = b.matrixWorld.clone();
      if (m) mat.multiply(m);
      g.applyMatrix4(mat);
      pieces.push({ geo: g, bone: b.userData.i, color: color });
    }
    var M = function () { return new THREE.Matrix4(); };
    function seg(r0, r1, L, rad) {
      var g = new THREE.CylinderGeometry(r1, r0, L, rad || 6, 1);
      g.translate(0, L / 2, 0);
      g.scale(1, 1, .86);
      return g;
    }
    function knuckle(r) { var g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, 1, .88); return g; }

    // antebraço, manga e punho da camisa (passam da borda da tela)
    var fa = new THREE.CylinderGeometry(.3, .35, 3.6, 8, 2); fa.translate(0, -1.8, 0); fa.scale(1, 1, .78);
    add(fa, wrist, SKIN);
    add(knuckle(.31), wrist, SKIN, M().makeScale(1.05, .75, .78));
    var sl = new THREE.CylinderGeometry(.37, .46, 3.4, 9, 1); sl.translate(0, -.78 - 1.7, 0); sl.scale(1, 1, .86);
    add(sl, wrist, SHIRT);
    var cf = new THREE.CylinderGeometry(.385, .385, .17, 9, 1); cf.translate(0, -.8, 0); cf.scale(1, 1, .86);
    add(cf, wrist, CUFF);

    // palma + músculos do polegar e do mínimo
    add(palmGeo(), wrist, SKIN);
    var th = new THREE.IcosahedronGeometry(1, 1); th.scale(.17, .27, .12); th.translate(.17, .3, .08);
    add(th, wrist, SKIN);
    var hy = new THREE.IcosahedronGeometry(1, 1); hy.scale(.13, .27, .09); hy.translate(-.21, .37, .06);
    add(hy, wrist, SKIN);

    // dedos
    FINGERS.forEach(function (f) {
      for (var k = 0; k < 3; k++) {
        var b = byName[f.n + (k + 1)];
        var r0 = f.r * (1 - k * .09), r1 = f.r * (1 - (k + 1) * .09);
        add(seg(r0, r1, f.L[k]), b, SKIN);
        add(knuckle(r0 * 1.06), b, k === 0 ? KNUCKLE : SKIN);
        if (k === 2) {
          add(knuckle(r1 * .98), b, SKIN, M().makeTranslation(0, f.L[2], 0));
          var nail = new THREE.BoxGeometry(r1 * 1.3, f.L[2] * .5, r1 * .3);
          add(nail, b, NAIL, M().makeTranslation(0, f.L[2] * .62, -r1 * .78));
        }
      }
    });
    // polegar
    for (var k = 0; k < 3; k++) {
      var b = byName["thumb" + (k + 1)];
      var r0 = THUMB.r[k], r1 = THUMB.r[Math.min(2, k + 1)] * (k === 2 ? .9 : 1);
      add(seg(r0, r1, THUMB.L[k], 7), b, SKIN);
      add(knuckle(r0 * 1.05), b, SKIN);
      if (k === 2) {
        add(knuckle(r1 * 1.02), b, SKIN, M().makeTranslation(0, THUMB.L[2], 0));
        var tn = new THREE.BoxGeometry(r1 * 1.35, THUMB.L[2] * .52, r1 * .3);
        add(tn, b, NAIL, M().makeTranslation(0, THUMB.L[2] * .6, -r1 * .8));
      }
    }

    // junta tudo numa malha só
    var total = 0;
    pieces.forEach(function (p) { total += p.geo.attributes.position.count; });
    var pos = new Float32Array(total * 3), col = new Float32Array(total * 3);
    var si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
    var o = 0, c = new THREE.Color();
    pieces.forEach(function (p) {
      var a = p.geo.attributes.position;
      c.setHex(p.color);
      for (var i = 0; i < a.count; i++) {
        var j = o + i;
        pos[j * 3] = a.getX(i); pos[j * 3 + 1] = a.getY(i); pos[j * 3 + 2] = a.getZ(i);
        col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
        si[j * 4] = p.bone; sw[j * 4] = 1;
      }
      o += a.count;
      p.geo.dispose();
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
    geo.computeVertexNormals();

    return { geo: geo, bones: bones, byName: byName, wrist: wrist, tris: total / 3 };
  }

  /* uma mão viva na cena */
  function Hand(scene, material, mirror) {
    var rig = buildHand();
    var mesh = new THREE.SkinnedMesh(rig.geo, material);
    mesh.add(rig.wrist);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(rig.bones));
    mesh.frustumCulled = false;
    var group = new THREE.Group();
    group.add(mesh);
    scene.add(group);

    this.mirror = mirror;
    this.group = group;
    this.b = rig.byName;
    this.tris = rig.tris;
    this.state = { pos: V3(), quat: new THREE.Quaternion(), pose: poseCopy(POSES.rest) };
    this.owner = null;      // tarefa que controla a mão agora
    this.scale = 1;
  }
  Hand.prototype.applyPose = function (p) {
    var B = this.b;
    FINGERS.forEach(function (f, i) {
      var c = p.c[i];
      B[f.n + "1"].rotation.set(c * 1.25, 0, f.splay + p.s * (f.splay < 0 ? -.12 : f.splay * 1.8 + .02));
      B[f.n + "2"].rotation.x = c * 1.5;
      B[f.n + "3"].rotation.x = c * 1.05;
    });
    var A = .25 + .55 * p.ta, P = .2 + .65 * p.to, T = -.5 * p.to;
    B.thumb1.rotation.set(P, T, -A);
    B.thumb2.rotation.set(p.tf * .5, 0, 0);
    B.thumb3.rotation.set(p.tf * .75, 0, 0);
  };
  Hand.prototype.apply = function (s) {
    this.applyPose(s.pose);
    var sc = this.scale;
    this.group.scale.set(this.mirror ? -sc : sc, sc, sc);
    this.group.quaternion.copy(s.quat);
    this.group.position.copy(s.pos);
    this.group.updateMatrixWorld(true);
  };
  var _a = V3(), _b = V3();
  Hand.prototype.tip = function (name, out) {
    var len = name === "thumb" ? THUMB.L[2] : FINGERS[0].L[2];
    return out.set(0, len * .8, 0).applyMatrix4(this.b[name + "3"].matrixWorld);
  };
  /* posição do punho para que o ponto de apoio (polegar ou pinça) caia em "anchor" */
  Hand.prototype.solve = function (quat, pose, kind, anchor, out) {
    var s = { pos: V3(), quat: quat, pose: pose };
    this.apply(s);
    var p;
    if (kind === "pinch") p = this.tip("thumb", _a).add(this.tip("index", _b)).multiplyScalar(.5);
    else p = this.tip(kind, _a);
    return (out || V3()).copy(anchor).sub(p);
  };

  /* orientação: a palma encosta na frente da folha (dedos por cima, polegar por trás).
     n = normal da frente da folha (rumo à câmera), inward = rumo ao miolo da folha,
     beta = quanto os dedos apontam para o miolo, roll = giro do punho. */
  function orient(n, inward, beta, roll, mirror) {
    var f = V3(0, 1, 0).multiplyScalar(Math.cos(beta)).addScaledVector(inward, Math.sin(beta));
    var Z = n.clone().negate();
    f.addScaledVector(Z, -f.dot(Z)).normalize();
    var X = V3().crossVectors(f, Z);
    var q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, f, Z));
    if (roll) q.premultiply(new THREE.Quaternion().setFromAxisAngle(f, mirror ? -roll : roll));
    return q;
  }

  /* =========================================================
     LEITOR
     ========================================================= */
  function create(opts) {
    if (!supported()) return null;
    var reduce = !!opts.reduce;
    var TS = function () { return window.__readerTimeScale || 1; };

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0, 0);
    var canvas = renderer.domElement;
    canvas.className = "reader-canvas";
    opts.container.appendChild(canvas);

    var scene = new THREE.Scene();
    var FOV = 32, D = 10;
    var camera = new THREE.PerspectiveCamera(FOV, 1, .1, 100);
    camera.position.set(0, 0, D);

    // luz suave e quente, de cima à esquerda (mesma direção das sombras no papel)
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3324, 1.35));
    var key = new THREE.DirectionalLight(0xfff0dc, 1.9); key.position.set(-3, 5, 8); scene.add(key);
    var fill = new THREE.DirectionalLight(0xffd2a0, .45); fill.position.set(5, -2, 4); scene.add(fill);

    var skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .78, metalness: 0, side: THREE.DoubleSide });

    var hands = { right: new Hand(scene, skinMat, false), left: new Hand(scene, skinMat, true) };

    // "papel" invisível: esconde a parte da mão que fica atrás do jornal
    var occluder = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false }));
    occluder.renderOrder = -1;
    scene.add(occluder);

    // sombras de contato (mancha suave no papel)
    function blobTexture() {
      var c = document.createElement("canvas"); c.width = c.height = 128;
      var g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(40,22,8,1)"); gr.addColorStop(.5, "rgba(40,22,8,.45)"); gr.addColorStop(1, "rgba(40,22,8,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    var blobTex = blobTexture();
    function blob() {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 }));
      m.renderOrder = 2; scene.add(m); return m;
    }
    var blobs = { right: blob(), left: blob() };

    /* ---------- folha que vira ---------- */
    var NU = 40, NV = 14;
    var sheetPos = new THREE.BufferAttribute(new Float32Array((NU + 1) * (NV + 1) * 3), 3);
    sheetPos.setUsage(THREE.DynamicDrawUsage);
    function sheetGeo() {
      var g = new THREE.PlaneGeometry(1, 1, NU, NV);
      g.setAttribute("position", sheetPos);
      var col = new THREE.BufferAttribute(new Float32Array((NU + 1) * (NV + 1) * 3).fill(1), 3);
      col.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute("color", col);
      g.deleteAttribute("normal");
      return g;
    }
    var front = new THREE.Mesh(sheetGeo(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.FrontSide }));
    var back = new THREE.Mesh(sheetGeo(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
    front.frustumCulled = back.frustumCulled = false;
    front.visible = back.visible = false;
    scene.add(front, back);

    // sombra que a folha levantada projeta na página de baixo
    function bandTexture() {
      var c = document.createElement("canvas"); c.width = 256; c.height = 4;
      var g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 256, 0);
      gr.addColorStop(0, "rgba(40,22,8,.0)"); gr.addColorStop(.55, "rgba(40,22,8,.55)"); gr.addColorStop(.8, "rgba(40,22,8,.35)"); gr.addColorStop(1, "rgba(40,22,8,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 4);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    var castShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: bandTexture(), transparent: true, depthWrite: false, opacity: 0 }));
    castShadow.renderOrder = 1; castShadow.visible = false;
    scene.add(castShadow);

    var LIGHT = V3(-.35, .45, 1).normalize();

    /* ---------- medidas (px ↔ mundo) ---------- */
    var W = 1, H = 1, k = 1, visH = 1, visW = 1;
    var book = { l: 0, r: 0, t: 0, b: 0, cx: 0 };   // em coordenadas de mundo
    var hs = 1, spread = false;

    function px(x, y, out) { return (out || V3()).set((x - W / 2) * k, -(y - H / 2) * k, 0); }

    /* repouso: a mão segura o canto de baixo, dedos sobre a frente do papel e polegar por trás;
       o punho e o antebraço saem pela borda de baixo da tela. */
    var REST = { beta: .95, roll: .35, ax: .75, ay: .12 };
    function restState(side) {
      var R = window.__rest ? Object.assign({}, REST, window.__rest) : REST;
      var m = side === "left";
      var n = V3(0, 0, 1), inward = V3(m ? 1 : -1, 0, 0);
      var q = orient(n, inward, R.beta, R.roll, m);
      var anchor = V3(m ? book.l + R.ax * hs : book.r - R.ax * hs, book.b + R.ay * hs, .1 * hs);
      var pose = poseCopy(POSES.rest);
      return { pos: hands[side].solve(q, pose, "index", anchor), quat: q, pose: pose };
    }
    function hiddenState(side) {   // fora da tela, para entrar
      var s = restState(side);
      s.pos.y -= 3.2 * hs; s.pos.x += (side === "left" ? -1 : 1) * .6 * hs;
      return s;
    }
    function awayState(side) {     // abaixada (jogando)
      var s = restState(side);
      s.pos.y -= 1.25 * hs; s.pos.x += (side === "left" ? -1 : 1) * .25 * hs;
      s.pose = poseLerp(POSES.rest, POSES.open, .3);
      return s;
    }

    function layout(rect, isSpread) {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H, false);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      camera.aspect = W / H; camera.updateProjectionMatrix();
      visH = 2 * D * Math.tan(FOV * Math.PI / 360); visW = visH * W / H; k = visH / H;
      var tl = px(rect.left, rect.top), br = px(rect.right, rect.bottom);
      book = { l: tl.x, r: br.x, t: tl.y, b: br.y, cx: (tl.x + br.x) / 2 };
      spread = isSpread;
      occluder.scale.set(book.r - book.l, book.t - book.b, 1);
      occluder.position.set(book.cx, (book.t + book.b) / 2, -.004);
      // tamanho da mão: proporcional à tela, com limites
      var palmPx = clamp(Math.min(W, H) * (isSpread ? .16 : .21), 64, 160);
      hs = palmPx * k;
      hands.left.scale = hands.right.scale = hs;
      ["left", "right"].forEach(function (s) {
        var h = hands[s];
        if (!h.owner) { h.state = shown ? (away ? awayState(s) : restState(s)) : hiddenState(s); }
      });
      blobs.left.scale.set(hs * .55, hs * .55, 1); blobs.right.scale.set(hs * .55, hs * .55, 1);
      requestFrame();
    }

    /* ---------- laço de desenho sob demanda ---------- */
    var tasks = [], raf = 0, last = 0;
    function requestFrame() { if (!raf) raf = requestAnimationFrame(loop); }
    function loop(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      dt *= TS();
      for (var i = tasks.length - 1; i >= 0; i--) if (tasks[i].update(dt) === false) tasks.splice(i, 1);
      draw();
      if (tasks.length) raf = requestAnimationFrame(loop); else last = 0;
    }
    function addTask(t) { tasks.push(t); requestFrame(); return t; }

    function updateBlob(side) {
      var h = hands[side], bl = blobs[side];
      var tip = h.tip("index", _a);
      var height = tip.z;
      var inside = tip.x > book.l && tip.x < book.r && tip.y > book.b && tip.y < book.t;
      bl.position.set(tip.x + height * .35, tip.y - height * .45, .002);
      bl.material.opacity = inside && shown ? .5 * (1 - smooth(.05 * hs, .9 * hs, height)) : 0;
    }
    function draw() {
      hands.left.apply(hands.left.state);
      updateBlob("left");
      hands.right.apply(hands.right.state);
      updateBlob("right");
      renderer.render(scene, camera);
    }

    /* tarefa genérica: leva uma mão do estado atual até um alvo (alvo pode ser função) */
    function moveHand(side, target, ms, ease, done) {
      var h = hands[side];
      var task = { t: 0 };
      h.owner = task;
      var from = { pos: h.state.pos.clone(), quat: h.state.quat.clone(), pose: poseCopy(h.state.pose) };
      task.update = function (dt) {
        if (h.owner !== task) return false;
        task.t = Math.min(1, task.t + dt / ms);
        var e = (ease || easeInOut)(task.t);
        var tg = typeof target === "function" ? target() : target;
        h.state = {
          pos: from.pos.clone().lerp(tg.pos, e),
          quat: from.quat.clone().slerp(tg.quat, e),
          pose: poseLerp(from.pose, tg.pose, e)
        };
        if (task.t >= 1) { h.owner = null; if (done) done(); return false; }
      };
      if (reduce) { task.t = 1; task.update(0); requestFrame(); return task; }
      return addTask(task);
    }

    /* ---------- mostrar / abaixar ---------- */
    var shown = false, away = false;
    function show() {
      if (shown) return;
      shown = true;
      ["left", "right"].forEach(function (s, i) {
        if (!reduce) hands[s].state = hiddenState(s);
        setTimeout(function () { moveHand(s, function () { return away ? awayState(s) : restState(s); }, 900, easeOut); }, reduce ? 0 : i * 110);
      });
      scheduleIdle();
    }
    function setAway(v) {
      if (away === v || !shown) return;
      away = v;
      ["left", "right"].forEach(function (s) {
        if (hands[s].owner && hands[s].owner.turning) return;
        moveHand(s, function () { return away ? awayState(s) : restState(s); }, v ? 520 : 700, easeInOut);
      });
    }

    /* ---------- ajustes mínimos parados (sem flutuar) ---------- */
    var idleTimer = 0;
    function scheduleIdle() {
      clearTimeout(idleTimer);
      if (reduce) return;
      idleTimer = setTimeout(function () {
        if (document.hidden || away || !shown) return scheduleIdle();
        var side = Math.random() < .5 ? "left" : "right";
        var h = hands[side];
        if (h.owner) return scheduleIdle();
        var base = restState(side);
        var p = base.pose;
        for (var i = 0; i < 4; i++) p.c[i] += (Math.random() - .5) * .08;
        p.tf += (Math.random() - .5) * .12;
        base.pos.y += (Math.random() - .5) * .025 * hs;
        moveHand(side, base, 1300, easeInOut, scheduleIdle);
      }, 7000 + Math.random() * 7000);
    }

    /* =========================================================
       VIRADA DE PÁGINA
       cfg: { dir: "next"|"prev", hinge (px), rect (px, página que vira),
              front, back (canvas), frontFlip, backFlip, extend: +1/-1, startFlipped,
              hand: "left"|"right", detachAt, onCovered, onLanded }
       ========================================================= */
    var turning = false;
    function setTex(mesh, cnv, flip) {
      if (mesh.material.map) mesh.material.map.dispose();
      var t = new THREE.CanvasTexture(cnv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (flip) { t.repeat.set(-1, 1); t.offset.set(1, 0); }
      mesh.material.map = t; mesh.material.needsUpdate = true;
    }

    function turn(cfg) {
      if (turning) return false;
      turning = true;
      var side = cfg.hand, h = hands[side];
      var ext = cfg.extend;                          // +1: folha vai da lombada para a direita (em repouso)
      var tl = px(cfg.rect.left, cfg.rect.top), br = px(cfg.rect.right, cfg.rect.bottom);
      var SW = br.x - tl.x, SH = tl.y - br.y, hingeX = px(cfg.hinge, 0).x, bottom = br.y;
      var fwd = !cfg.startFlipped;                  // ângulo cresce (0 → π) ou decresce (π → 0)

      setTex(front, cfg.front, cfg.frontFlip);
      setTex(back, cfg.back, cfg.backFlip);
      // face da frente precisa olhar para a câmera em repouso
      var flipWinding = ext < 0;
      front.material.side = flipWinding ? THREE.BackSide : THREE.FrontSide;
      back.material.side = flipWinding ? THREE.FrontSide : THREE.BackSide;

      var q = fwd ? 0 : 1;          // progresso da virada (0 = página na posição inicial)
      var lift = 0, settle = 0;

      function alphaAt(u, v) {      // u: 0 lombada → 1 borda; v: 0 baixo → 1 cima
        var shape = Math.pow(u, 1.7) * (1 + .75 * (1 - v));   // o canto puxado vai na frente
        var theta = Math.PI * easeInOut(q);
        var lead = .9 * Math.sin(Math.PI * q) + lift * .5 * (fwd ? 1 - q : q);
        var a = fwd ? theta + lead * shape : theta - lead * shape;
        // colchão de ar: no fim, a borda chega por último e assenta devagar
        var air = settle * .26 * u * u * (1 + .5 * (1 - v));
        a = fwd ? Math.min(a, Math.PI - air) : Math.max(a, air);
        return clamp(a, 0, Math.PI);
      }
      // integra a curva da folha ao longo de u (comprimento preservado)
      function pointAt(u, v, out, nrm) {
        var steps = Math.max(1, Math.round(u * NU)), du = (u * SW) / steps, x = 0, z = 0, a = 0;
        for (var i = 0; i < steps; i++) { a = alphaAt((i + .5) / steps * u, v); x += Math.cos(a) * du; z += Math.sin(a) * du; }
        out.set(hingeX + ext * x, bottom + v * SH, z);
        if (nrm) nrm.set(-ext * Math.sin(a), 0, Math.cos(a));
        return out;
      }
      var colF = front.geometry.attributes.color, colB = back.geometry.attributes.color;
      function shapeSheet() {
        var zmax = 0, edgeX = 0;
        for (var iy = 0; iy <= NV; iy++) {
          var v = 1 - iy / NV, x = 0, z = 0, a = alphaAt(0, v);
          for (var ix = 0; ix <= NU; ix++) {
            var idx = iy * (NU + 1) + ix;
            if (ix > 0) { a = alphaAt((ix - .5) / NU, v); x += Math.cos(a) * SW / NU; z += Math.sin(a) * SW / NU; }
            sheetPos.setXYZ(idx, hingeX + ext * x, bottom + v * SH, z + .0008);
            // sombreado: normal da frente (-ext·sen a, 0, cos a)
            var nx = -ext * Math.sin(a), nz = Math.cos(a);
            var lf = nx * LIGHT.x + nz * LIGHT.z, lb = -lf;
            var flat = LIGHT.z;
            var sF = clamp(.58 + .42 * lf / flat, .45, 1), sB = clamp(.58 + .42 * lb / flat, .45, 1);
            colF.setXYZ(idx, sF, sF, sF); colB.setXYZ(idx, sB, sB, sB);
            if (z > zmax) zmax = z;
            if (ix === NU && iy === NV / 2) edgeX = hingeX + ext * x;
          }
        }
        sheetPos.needsUpdate = true; colF.needsUpdate = true; colB.needsUpdate = true;
        // sombra projetada na página de baixo
        var lifted = smooth(0, .25 * SW, zmax);
        if (lifted > .01) {
          var x0 = Math.min(hingeX, edgeX + zmax * .5), x1 = Math.max(hingeX, edgeX + zmax * .5);
          castShadow.visible = true;
          castShadow.scale.set(Math.max(.01, x1 - x0) * 1.15, SH, 1);
          castShadow.position.set((x0 + x1) / 2, bottom + SH / 2 - zmax * .05, .0015);
          castShadow.rotation.z = edgeX + zmax * .5 < hingeX ? Math.PI : 0;
          castShadow.material.opacity = .45 * lifted * (1 - Math.abs(Math.cos(Math.PI * q)) * .4);
        } else castShadow.visible = false;
      }

      // ponto da pinça: perto do canto de baixo, na borda livre
      var GU = .965, GV = .16;
      var gP = V3(), gN = V3();
      function grabTarget(pose) {
        pointAt(GU, GV, gP, gN);
        // a borda é segurada entre polegar (frente) e indicador (verso)
        var tangentIn = V3(); pointAt(GU - .05, GV, tangentIn); tangentIn.sub(gP).normalize();
        var qn = orient(gN, tangentIn, .78, .12, h.mirror);
        return { pos: h.solve(qn, pose, "pinch", gP), quat: qn, pose: pose };
      }
      function hoverTarget(pose, off) {
        var t = grabTarget(pose);
        t.pos.addScaledVector(gN, off * hs);
        return t;
      }

      front.visible = back.visible = true;
      shapeSheet();
      requestFrame();
      // a folha 3D já cobre a página: o DOM pode trocar por baixo
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (cfg.onCovered) cfg.onCovered(); }); });

      var detachAt = cfg.detachAt == null ? 1 : cfg.detachAt;
      var phase = "release", pt = 0, attached = false;
      var D_ = { release: 160, reach: cfg.reachMs || 400, grab: 220, pull: 900, settle: 320 };
      var from = null;
      function startPhase(name) { phase = name; pt = 0; from = { pos: h.state.pos.clone(), quat: h.state.quat.clone(), pose: poseCopy(h.state.pose) }; }
      function blendTo(tg, e) {
        h.state = { pos: from.pos.clone().lerp(tg.pos, e), quat: from.quat.clone().slerp(tg.quat, e), pose: poseLerp(from.pose, tg.pose, e) };
      }
      var task = { turning: true };
      h.owner = task;
      startPhase("release");
      var handDone = false, sheetDone = false, landed = false;

      task.update = function (dt) {
        pt += dt;
        var mine = h.owner === task;
        if (phase === "release") {          // solta a pegada de repouso: dedos afrouxam, a mão desencosta
          var e = easeOut(Math.min(1, pt / D_.release));
          if (mine) { var r = restState(side); r.pos.z += .35 * hs; r.pose = poseLerp(POSES.rest, POSES.open, .4); blendTo(r, e); }
          if (pt >= D_.release) startPhase("reach");
        } else if (phase === "reach") {     // vai até a borda da folha, com os dedos abertos
          var e2 = easeInOut(Math.min(1, pt / D_.reach));
          if (mine) blendTo(hoverTarget(POSES.open, .45), e2);
          if (pt >= D_.reach) startPhase("grab");
        } else if (phase === "grab") {      // fecha a pinça e o canto começa a levantar
          var e3 = easeInOut(Math.min(1, pt / D_.grab));
          lift = smooth(.35, 1, pt / D_.grab);
          if (mine) blendTo(grabTarget(poseLerp(POSES.open, POSES.pinch, e3)), e3);
          if (pt >= D_.grab) { startPhase("pull"); attached = true; }
        } else if (phase === "pull") {      // puxa: a mão acompanha o canto da folha
          var p = Math.min(1, pt / D_.pull);
          q = fwd ? p : 1 - p;
          settle = smooth(.55, 1, p);
          if (attached && mine) h.state = grabTarget(POSES.pinch);
          if (attached && p >= detachAt) {   // solta e deixa a folha cair sozinha
            attached = false;
            // solta: abre os dedos e se afasta da folha a partir de onde está (alvo fixo, sem perseguir o canto)
            var off = { pos: h.state.pos.clone().addScaledVector(gN, .45 * hs).add(V3(0, -.25 * hs, 0)), quat: h.state.quat.clone(), pose: poseCopy(POSES.open) };
            moveHand(side, off, 240, easeOut, function () { moveHand(side, function () { return away ? awayState(side) : restState(side); }, 620, easeInOut, function () { handDone = true; }); });
          }
          if (p >= 1) startPhase("settle");
        } else if (phase === "settle") {    // a folha assenta com um colchão de ar
          var p2 = Math.min(1, pt / D_.settle);
          settle = 1 - easeOut(p2);
          if (attached && mine) h.state = grabTarget(poseLerp(POSES.pinch, POSES.open, smooth(.5, 1, p2)));
          if (p2 >= 1) {
            settle = 0;
            if (attached) {
              attached = false;
              moveHand(side, function () { return away ? awayState(side) : restState(side); }, 640, easeInOut, function () { handDone = true; });
            }
            if (!landed) {
              landed = true;
              shapeSheet();
              if (cfg.onLanded) cfg.onLanded();
              // espera o DOM pintar a página nova antes de sumir com a folha 3D
              requestAnimationFrame(function () { requestAnimationFrame(function () {
                front.visible = back.visible = false; castShadow.visible = false; turning = false; requestFrame();
              }); });
            }
            return false;
          }
        }
        shapeSheet();
      };
      addTask(task);
      return true;
    }

    function dispose() {
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    document.addEventListener("visibilitychange", function () { if (!document.hidden) requestFrame(); });

    return {
      layout: layout,
      show: show,
      setAway: setAway,
      turn: turn,
      isTurning: function () { return turning; },
      render: requestFrame,
      dispose: dispose,
      info: function () { return { tris: hands.left.tris + hands.right.tris, calls: renderer.info.render.calls }; }
    };
  }

  // _Hand e _orient ficam expostos só para a bancada de testes das poses
  window.GazetaReader = { supported: supported, create: create, POSES: POSES, _Hand: Hand, _orient: orient };
})();
