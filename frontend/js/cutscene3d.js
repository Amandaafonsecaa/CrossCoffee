/* Cena da varanda em 3D low-poly — Three.js (vendor/three.min.js, build UMD).

   Mesma história e mesma linha do tempo da cena SVG (js/cutscene.js continua dono do fluxo,
   do botão Pular e da transição final; a versão SVG fica como plano B sem WebGL):
     0–1 s  abre do preto · o bonde da linha 4 passa ao fundo
     1,2–4,9 s  o jornaleiro atravessa a rua de bicicleta · 3,45 s arremesso
     ~4,95 s  o jornal cai aos pés do leitor · 5–6 s a câmera olha para baixo
     5,55–7 s  as mãos (as mesmas do jornal, js/reader3d.js) pegam o rolo
     6,9–7,6 s  o jornal se desenrola · o mundo vira tom de jornal a partir dele
     7,6–8,5 s  o jornal sobe até cobrir a tela · 9,5 s fim (cutscene.js)

   Estilo: facetas (flatShading), cor por vértice com leve variação por triângulo, luz de manhã
   baixa com sombras longas. Tudo que não se mexe vira UMA malha (poucas chamadas de desenho).
   Depuração: window.__csTimeScale = 0.25 (câmera lenta) · window.__csSeek = 6.5 (congela em 6,5 s). */
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
  function lin(a, b, x) { return clamp((x - a) / (b - a), 0, 1); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var V3, Q, M4;
  function T(x, y, z, rx, ry, rz, sx, sy, sz) {
    sx = sx == null ? 1 : sx; sy = sy == null ? sx : sy; sz = sz == null ? sx : sz;
    var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
    return new THREE.Matrix4().compose(V3(x, y, z), q, V3(sx, sy, sz));
  }
  // matriz que leva um cilindro unitário (eixo y, de -.5 a .5) para o segmento a→b
  var UP = null;
  function rodM(a, b, r) {
    var d = V3().subVectors(b, a), L = d.length();
    var q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
    return new THREE.Matrix4().compose(V3().addVectors(a, b).multiplyScalar(.5), q, V3(r, L, r));
  }
  function setRod(mesh, a, b, r) {
    var d = V3().subVectors(b, a), L = Math.max(1e-4, d.length());
    mesh.position.addVectors(a, b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / L));
    mesh.scale.set(r, L, r);
  }

  /* ---------- Kit: junta peças low-poly numa malha só, com cor por triângulo ---------- */
  function Kit(seed) { this.parts = []; this.rand = rng(seed || 7); }
  Kit.prototype.add = function (geo, color, m, vary) {
    var g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (m) g.applyMatrix4(m);
    this.parts.push({ g: g, c: color, v: vary == null ? .05 : vary });
    return this;
  };
  Kit.prototype.raw = function (positions, colors) { this.parts.push({ p: positions, cols: colors }); return this; };
  Kit.prototype.geometry = function () {
    var total = 0, rand = this.rand;
    this.parts.forEach(function (p) { total += p.g ? p.g.attributes.position.count : p.p.length / 3; });
    var pos = new Float32Array(total * 3), col = new Float32Array(total * 3), o = 0, c = new THREE.Color();
    this.parts.forEach(function (p) {
      if (!p.g) {
        pos.set(p.p, o * 3); col.set(p.cols, o * 3); o += p.p.length / 3; return;
      }
      var a = p.g.attributes.position, n = a.count;
      c.setHex(p.c);
      for (var i = 0; i < n; i += 3) {
        var f = 1 + (rand() - .5) * 2 * p.v;
        for (var k = 0; k < 3; k++) {
          var j = o + i + k;
          pos[j * 3] = a.getX(i + k); pos[j * 3 + 1] = a.getY(i + k); pos[j * 3 + 2] = a.getZ(i + k);
          col[j * 3] = c.r * f; col[j * 3 + 1] = c.g * f; col[j * 3 + 2] = c.b * f;
        }
      }
      o += n;
      p.g.dispose();
    });
    this.parts = [];
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  };
  Kit.prototype.mesh = function (mat, cast, receive) {
    var m = new THREE.Mesh(this.geometry(), mat);
    m.castShadow = cast !== false; m.receiveShadow = receive !== false;
    return m;
  };
  // cor linear (a mesma conversão do THREE.Color.setHex) para malhas montadas à mão
  function lc(hex, f) { var c = new THREE.Color().setHex(hex); f = f || 1; return [c.r * f, c.g * f, c.b * f]; }

  /* geometrias de base */
  function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
  function cyl(rt, rb, h, s) { return new THREE.CylinderGeometry(rt, rb, h, s || 8, 1); }
  function ico(r, det) { return new THREE.IcosahedronGeometry(r, det || 0); }
  function cone(r, h, s) { return new THREE.ConeGeometry(r, h, s || 6, 1); }
  function unitRod(s) { return new THREE.CylinderGeometry(1, 1, 1, s || 6, 1); }

  /* ---------- tom de jornal (sépia) que se espalha pela tela a partir do papel ---------- */
  var SEPIA_GLSL = [
    "if (uSep > 0.0) {",
    "  vec3 c0 = gl_FragColor.rgb;",
    "  float l = dot(c0, vec3(.299, .587, .114));",
    "  vec3 ink = vec3(.165, .122, .082), pap = vec3(.93, .86, .69);",
    "  vec3 tone = mix(ink, pap, smoothstep(.03, .9, l));",
    "  float d = length((gl_FragCoord.xy - uCen) / uRes.y);",
    "  float w = 1.0 - smoothstep(uRad - .28, uRad, d);",
    "  gl_FragColor.rgb = mix(c0, tone, w * uSep);",
    "}"
  ].join("\n");

  /* =========================================================
     CENA
     ========================================================= */
  function create(opts) {
    if (!supported()) return null;
    V3 = function (x, y, z) { return new THREE.Vector3(x || 0, y || 0, z || 0); };
    UP = V3(0, 1, 0);
    var W = window.innerWidth, H = window.innerHeight;
    var small = Math.min(W, H) < 600;

    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    // resolução: no máximo 1,5× e ~2,4 milhões de pixels (Retina não precisa de mais numa cena em movimento);
    // se a máquina não der conta, o laço abaixo baixa sozinho (resolução dinâmica)
    var PIX_BUDGET = 2.4e6;
    var pr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(PIX_BUDGET / (W * H)));
    pr = Math.max(.75, pr);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;    // a versão "soft" custa bem mais por pixel
    var canvas = renderer.domElement;
    canvas.className = "cs-canvas";
    opts.container.appendChild(canvas);

    var scene = new THREE.Scene();
    var HORIZON = 0xf3dfbd;
    scene.fog = new THREE.Fog(HORIZON, 45, 320);

    var U = { uSep: { value: 0 }, uRad: { value: 0 }, uCen: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) } };
    function patch(m) {
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uSep = U.uSep; sh.uniforms.uRad = U.uRad; sh.uniforms.uCen = U.uCen; sh.uniforms.uRes = U.uRes;
        sh.fragmentShader = "uniform float uSep;\nuniform float uRad;\nuniform vec2 uCen;\nuniform vec2 uRes;\n" +
          sh.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\n" + SEPIA_GLSL);
      };
      m.customProgramCacheKey = function () { return "gz-sepia"; };
      return m;
    }
    var MAT = patch(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .88, metalness: 0 }));
    var METAL = patch(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .42, metalness: .55 }));
    var CLOUD = patch(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, fog: false, emissive: 0x6a6a72 }));
    var SKY = patch(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));

    var disposables = [];
    function own(x) { disposables.push(x); return x; }

    /* ---------- luz de manhã: sol baixo, da esquerda, um pouco à frente ---------- */
    var SUN_DIR = V3(-.78, .52, -.34).normalize();
    var hemi = new THREE.HemisphereLight(0xcfe4ff, 0xb59c74, 1.15);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff0d2, 3.1);
    sun.castShadow = true;
    var SH = small ? 1024 : 2048;
    sun.shadow.mapSize.set(SH, SH);
    var sc = sun.shadow.camera;
    sc.left = -15; sc.right = 15; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    sun.target.position.set(0, 0, -5);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 40);
    scene.add(sun, sun.target);
    // luz de preenchimento quente vindo da rua (rebatida no calçamento)
    var bounce = new THREE.DirectionalLight(0xffd9a8, .35);
    bounce.position.set(2, -1, -6);
    scene.add(bounce);

    var R = rng(19501105);
    var S = new Kit(11);      // tudo o que não se mexe (e projeta sombra)
    var GND = new Kit(13);    // chão: ladrilho, calçadas, paralelepípedo — recebe sombra, não projeta (metade dos triângulos fora do passe de sombra)
    var SM = new Kit(12);     // partes metálicas paradas

    /* =========================================================
       CÉU, NUVENS, MORROS, IGREJA
       ========================================================= */
    (function sky() {
      var g = new THREE.SphereGeometry(400, 32, 16);
      var p = g.attributes.position, cols = new Float32Array(p.count * 3);
      var zen = new THREE.Color(0x5fa6dc), mid = new THREE.Color(0xa9d4ef), hor = new THREE.Color(HORIZON), glow = new THREE.Color(0xffe3a6);
      var c = new THREE.Color(), d = V3();
      for (var i = 0; i < p.count; i++) {
        d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
        var h = d.y;
        if (h < .05) c.copy(hor); else if (h < .35) c.copy(hor).lerp(mid, smooth(.05, .35, h)); else c.copy(mid).lerp(zen, smooth(.35, 1, h));
        var s = Math.max(0, d.dot(SUN_DIR));
        c.lerp(glow, .55 * Math.pow(s, 6));
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      var m = new THREE.Mesh(g, SKY); m.renderOrder = -10; m.frustumCulled = false;
      scene.add(m); own(g);
    })();

    var clouds = new THREE.Group();
    (function () {
      var K = new Kit(31);
      for (var n = 0; n < 9; n++) {
        var cx = -160 + n * 42 + R() * 20, cy = 52 + R() * 30, cz = -170 - R() * 70;
        var puffs = 4 + Math.floor(R() * 4);
        for (var k = 0; k < puffs; k++) {
          var r = 6 + R() * 7;
          K.add(ico(r, 1), 0xffffff, T(cx + (k - puffs / 2) * r * 1.05, cy + R() * 3, cz + R() * 6, 0, R() * 3, 0, 1, .55 + R() * .2, .8), .04);
        }
        K.add(ico(9, 1), 0xf6f1ea, T(cx, cy - 2.5, cz, 0, 0, 0, puffs * .9, .28, 1), .03);
      }
      var mesh = K.mesh(CLOUD, false, false);
      clouds.add(mesh); scene.add(clouds);
    })();

    (function hills() {
      var K = new Kit(41);
      var specs = [[-120, -150, 34, 0x7ea383], [-55, -170, 42, 0x86ab8b], [20, -160, 30, 0x7a9f80], [85, -175, 46, 0x8bb090], [150, -150, 32, 0x80a585], [-10, -115, 18, 0x6f9673], [60, -110, 16, 0x749a77]];
      specs.forEach(function (s) {
        var g = ico(1, 2), p = g.attributes.position;
        for (var i = 0; i < p.count; i++) {
          var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          var j = 1 + .12 * Math.sin(x * 4.1 + z * 3.3) + .08 * Math.sin(z * 7.7);
          p.setXYZ(i, x * j, Math.max(y, -.15) * j, z * j);
        }
        K.add(g, s[3], T(s[0], -2, s[1], 0, R() * 3, 0, s[2] * 1.7, s[2], s[2] * 1.2), .06);
        // casinhas e árvores salpicadas no morro
        for (var k = 0; k < 7; k++) {
          var a = R() * Math.PI * 2, rr = s[2] * (.4 + R() * .9);
          var hx = s[0] + Math.cos(a) * rr * 1.5, hz = s[1] + Math.abs(Math.sin(a)) * rr * .9 + 4;
          var hy = Math.max(0, s[2] * .9 * (1 - Math.pow(rr / (s[2] * 1.6), 2))) - 1;
          K.add(ico(2.2 + R() * 1.6, 0), 0x5e8a62, T(hx, hy + 1.4, hz), .1);
        }
      });
      scene.add(K.mesh(MAT, false, false));
    })();

    // torre da Igreja Matriz, ao fundo (a Praça da Matriz da Gazeta)
    (function church() {
      var x = -9.5, z = -36, W0 = 0xf1ebdc, TR = 0xd9c9a8;
      S.add(box(5.5, 9, 7), W0, T(x + 3.8, 4.5, z + 1));
      S.add(box(5.9, .5, 7.4), TR, T(x + 3.8, 9.1, z + 1));
      S.add(cone(4.3, 2.6, 4), 0xb8603e, T(x + 3.8, 10.6, z + 1, 0, Math.PI / 4, 0, 1, 1, 1.1));
      S.add(box(3.2, 17, 3.2), W0, T(x, 8.5, z));
      [5.5, 11, 16.6].forEach(function (y) { S.add(box(3.5, .35, 3.5), TR, T(x, y, z)); });
      S.add(box(1, 1.8, .2), 0x3b3128, T(x, 13.6, z + 1.62));                 // janela do sino
      S.add(cyl(.75, .75, .12, 14), 0xfbf7ee, T(x, 9.4, z + 1.62, Math.PI / 2, 0, 0)); // relógio
      S.add(box(.06, .5, .04), 0x2a1f15, T(x, 9.55, z + 1.7));
      S.add(box(.38, .06, .04), 0x2a1f15, T(x + .14, 9.4, z + 1.7));
      S.add(cone(2.3, 4.2, 4), 0x6f8fa8, T(x, 19.2, z, 0, Math.PI / 4, 0));
      S.add(box(.14, 1.3, .14), 0x3b3128, T(x, 21.8, z));
      S.add(box(.7, .14, .14), 0x3b3128, T(x, 22.0, z));
    })();

    /* =========================================================
       ÁRVORES (mangueira, ipê-amarelo, palmeira-imperial)
       ========================================================= */
    function mangueira(K, x, z, s) {
      K.add(cyl(.22 * s, .34 * s, 3.2 * s, 7), 0x6a4b33, T(x, 1.6 * s, z));
      for (var i = 0; i < 9; i++) {
        var a = i / 9 * Math.PI * 2;
        K.add(ico(1.6 * s, 1), i % 2 ? 0x2f6b3c : 0x3a7a44, T(x + Math.cos(a) * 1.5 * s, (3.9 + R() * 1.3) * s, z + Math.sin(a) * 1.2 * s, R(), R(), R(), 1, .82, 1), .1);
      }
      K.add(ico(2.1 * s, 1), 0x356f3f, T(x, 5.4 * s, z), .1);
    }
    function ipe(K, x, z, s) {
      K.add(cyl(.12 * s, .22 * s, 3 * s, 6), 0x5e4630, T(x, 1.5 * s, z, 0, 0, .05));
      var br = [[-1.3, 3.6, .3], [1.2, 3.9, -.2], [.1, 4.6, .4], [-.6, 4.2, -.6], [.9, 3.3, .7]];
      br.forEach(function (b) {
        K.add(unitRod(5), 0x5e4630, rodM(V3(x, 2.6 * s, z), V3(x + b[0] * s, b[1] * s, z + b[2] * s), .07 * s));
        for (var k = 0; k < 6; k++) {
          K.add(ico((.45 + R() * .3) * s, 1), [0xf2c12e, 0xf6cf45, 0xe8b323, 0xd9a21f][k % 4], T(x + (b[0] + (R() - .5) * 1.3) * s, (b[1] + .2 + R() * .7) * s, z + (b[2] + (R() - .5) * 1.3) * s, R(), R(), R(), 1, .8, 1), .14);
        }
      });
    }
    function palmeira(K, x, z, h) {
      K.add(cyl(.2, .3, h, 8), 0x9a958a, T(x, h / 2, z));
      K.add(cyl(.26, .2, 1.4, 8), 0x6f8a4a, T(x, h + .5, z));
      for (var i = 0; i < 11; i++) {
        var a = i / 11 * Math.PI * 2 + R() * .3, droop = .5 + R() * .5;
        var g = cone(.38, 3.4, 4);
        K.add(g, i % 2 ? 0x4c7f3e : 0x5c9145, T(x + Math.cos(a) * 1.4, h + 1.1 - droop * .8, z + Math.sin(a) * 1.4, Math.sin(a) * (1.25 + droop), 0, -Math.cos(a) * (1.25 + droop), 1, 1, .18), .08);
      }
    }

    /* =========================================================
       CASARIO DO OUTRO LADO DA RUA (fachada em z = -12.2)
       ========================================================= */
    var FZ = -12.2, WALK = .15;
    var TRIM = 0xf3ece0;

    function windowAt(K, cx, y0, w, h, o) {
      var z = FZ;
      K.add(box(w, h, .1), 0x2a2420, T(cx, y0 + h / 2, z - .04), .02);                         // vão escuro
      K.add(box(w + .22, .12, .1), o.trim, T(cx, y0 + h + .06, z + .05));                      // verga
      K.add(box(w + .3, .08, .2), o.trim, T(cx, y0 - .04, z + .1));                              // peitoril
      K.add(box(.11, h, .08), o.trim, T(cx - w / 2 - .055, y0 + h / 2, z + .04));
      K.add(box(.11, h, .08), o.trim, T(cx + w / 2 + .055, y0 + h / 2, z + .04));
      // bandeira em arco com vidro
      var arch = new THREE.CylinderGeometry(w / 2, w / 2, .06, 10, 1, false, -Math.PI / 2, Math.PI);
      K.add(arch, 0x9db7bb, T(cx, y0 + h + .12, z + .06, Math.PI / 2, 0, 0), .05);
      K.add(new THREE.TorusGeometry(w / 2 + .03, .05, 3, 10, Math.PI), o.trim, T(cx, y0 + h + .12, z + .07));
      // venezianas: abertas (encostadas na parede) ou fechadas, com ripas
      var leaf = w / 2;
      for (var side = -1; side <= 1; side += 2) {
        var open = o.open && (side === 1 || o.open === 2);
        var lx = open ? cx + side * (w / 2 + leaf / 2 + .1) : cx + side * leaf / 2;
        var lz = open ? z + .1 : z + .07;
        K.add(box(leaf - .02, h - .04, .05), o.shutter, T(lx, y0 + h / 2, lz), .04);
        for (var k = 0; k < 9; k++) K.add(box(leaf - .1, .035, .03), o.shutter, T(lx, y0 + .2 + k * (h - .4) / 8, lz + .03), .12);
      }
      if (o.open) {
        // cortina clara lá dentro + vaso de flores no peitoril
        K.add(box(w * .45, h * .8, .02), 0xf1e6d0, T(cx - w * .22, y0 + h * .5, z - .05), .05);
        if (o.flowers) {
          K.add(box(w * .9, .16, .2), 0x9a5a36, T(cx, y0 + .1, z + .2));
          for (var f = 0; f < 9; f++) {
            K.add(ico(.07, 0), f % 3 ? 0xd2322d : 0xe85a4f, T(cx - w * .4 + f * w * .1, y0 + .24 + R() * .06, z + .2 + (R() - .5) * .1), .1);
            K.add(ico(.06, 0), 0x3f7a35, T(cx - w * .4 + f * w * .1 + .04, y0 + .19, z + .25), .1);
          }
        }
      }
    }
    function doorAt(K, cx, w, h, o) {
      var z = FZ, y0 = WALK;
      K.add(box(w, h, .3), o.door, T(cx, y0 + h / 2, z), .05);
      for (var r = 0; r < 2; r++) for (var c = 0; c < 2; c++) K.add(box(w * .36, h * .36, .04), o.door, T(cx + (c - .5) * w * .46, y0 + h * (.27 + r * .44), z + .17), .08);
      K.add(box(w + .24, .14, .1), o.trim, T(cx, y0 + h + .07, z + .05));
      K.add(box(.12, h, .08), o.trim, T(cx - w / 2 - .06, y0 + h / 2, z + .04));
      K.add(box(.12, h, .08), o.trim, T(cx + w / 2 + .06, y0 + h / 2, z + .04));
      var arch = new THREE.CylinderGeometry(w / 2, w / 2, .06, 10, 1, false, -Math.PI / 2, Math.PI);
      K.add(arch, 0x9db7bb, T(cx, y0 + h + .14, z + .06, Math.PI / 2, 0, 0), .05);
      K.add(new THREE.TorusGeometry(w / 2 + .03, .05, 3, 10, Math.PI), o.trim, T(cx, y0 + h + .14, z + .07));
      K.add(box(w + .5, .12, .5), 0xb9b1a3, T(cx, y0 + .06, z + .3));                       // soleira
      K.add(box(.12, .12, .02), 0x3f6aa8, T(cx + w / 2 + .28, y0 + 2, z + .16));            // número em azulejo
      K.add(box(.08, .08, .02), 0xf3ece0, T(cx + w / 2 + .28, y0 + 2, z + .175));
    }
    function telhado(K, x0, x1, yb, depth, rise) {
      // beiral de telha colonial: fileiras de telhas-canal descendo até a borda
      var n = Math.round((x1 - x0) / .22);
      var ang = Math.atan2(rise, depth);
      var len = Math.hypot(rise, depth);
      K.add(box(x1 - x0 + .5, .1, depth + .2), 0x8d5a3a, T((x0 + x1) / 2, yb + rise / 2 - .06, FZ - depth / 2 + .5, ang, 0, 0), .05);
      for (var i = 0; i <= n; i++) {
        var x = x0 - .1 + i * (x1 - x0 + .2) / n;
        var g = new THREE.CylinderGeometry(.11, .11, len + .1, 5, 1, true, -Math.PI / 2, Math.PI);
        K.add(g, i % 2 ? 0xb5603b : 0xa9522f, T(x, yb + rise / 2, FZ - depth / 2 + .5, ang - Math.PI / 2, 0, 0, 1, 1, .7), .14);
      }
      // cachorros (mãos-francesas de madeira) sob o beiral
      for (var k = 0; k <= 6; k++) K.add(box(.1, .14, .7), 0x6b4128, T(x0 + .2 + k * (x1 - x0 - .4) / 6, yb - .1, FZ + .25), .05);
    }

    function house(x0, x1, o) {
      var K = S, w = x1 - x0, cx = (x0 + x1) / 2, h = o.h;
      var wall = o.wall, trim = o.trim || TRIM;
      o.trim = trim;
      var depth = o.beiral ? 3.4 : 8;
      K.add(box(w, h, depth), wall, T(cx, WALK + h / 2, FZ - depth / 2), .03);
      K.add(box(w + .02, .75, .06), o.barrado || new THREE.Color(wall).multiplyScalar(.72).getHex(), T(cx, WALK + .375, FZ + .03), .04);
      K.add(box(.24, h, .1), trim, T(x0 + .12, WALK + h / 2, FZ + .05));                    // cunhais
      K.add(box(.24, h, .1), trim, T(x1 - .12, WALK + h / 2, FZ + .05));
      var floors = o.floors || 1, fh = (h - (o.beiral ? .4 : 1.1)) / floors;
      // portas e janelas
      for (var f = 0; f < floors; f++) {
        var y0 = WALK + f * fh + (f ? .5 : .95);
        var slots = o.slots[f];
        slots.forEach(function (s, i) {
          var sx = x0 + w * (i + .5) / slots.length;
          if (s === "D") doorAt(K, sx, 1.1, Math.min(2.7, fh - .45), o);
          else windowAt(K, sx, y0, .95, Math.min(1.7, fh - 1.2), { trim: trim, shutter: o.shutter, open: s === "O" || s === "F" ? (s === "F" ? 2 : 1) : 0, flowers: s === "F" });
        });
        if (f > 0) {
          K.add(box(w, .16, .14), trim, T(cx, WALK + f * fh + .05, FZ + .07));               // friso entre andares
          if (o.sacada) {
            K.add(box(w * .6, .1, .7), 0xd6cfc0, T(cx, WALK + f * fh + .2, FZ + .35));
            SM.add(box(w * .6, .04, .04), 0x1f3b32, T(cx, WALK + f * fh + 1.1, FZ + .68));
            for (var b = 0; b <= 18; b++) SM.add(box(.025, .9, .025), 0x1f3b32, T(cx - w * .3 + b * w * .6 / 18, WALK + f * fh + .7, FZ + .68));
          }
        }
      }
      if (o.beiral) telhado(K, x0 - .2, x1 + .2, WALK + h, 3.4, 1.6);
      else {
        // cornija + platibanda
        K.add(box(w + .16, .16, .32), trim, T(cx, WALK + h - 1.0, FZ + .12));
        K.add(box(w + .08, .1, .22), trim, T(cx, WALK + h - .86, FZ + .08));
        K.add(box(w, .12, .26), trim, T(cx, WALK + h + .06, FZ + .08));
        if (o.balaustre) {
          for (var k = 0; k < Math.floor(w / .26); k++) {
            var bx = x0 + .3 + k * .26;
            if (bx > x1 - .3) break;
            K.add(cyl(.05, .07, .5, 6), trim, T(bx, WALK + h - .5, FZ + .06));
          }
        } else K.add(box(w * .4, .32, .06), trim, T(cx, WALK + h - .45, FZ + .05));     // painel em relevo
        if (o.frontao) {
          K.add(new THREE.CylinderGeometry(1.1, 1.1, .2, 12, 1, false, -Math.PI / 2, Math.PI), wall, T(cx, WALK + h + .1, FZ + .02, Math.PI / 2, 0, 0, 1, 1, .7));
          K.add(new THREE.TorusGeometry(1.12, .07, 3, 12, Math.PI), trim, T(cx, WALK + h + .1, FZ + .1, 0, 0, 0, 1, .7, 1));
        }
        // pinhas nos cantos
        [x0 + .14, x1 - .14].forEach(function (px) {
          K.add(cyl(.12, .16, .2, 6), trim, T(px, WALK + h + .2, FZ + .08));
          K.add(ico(.15, 0), trim, T(px, WALK + h + .42, FZ + .08));
          K.add(cone(.07, .2, 5), trim, T(px, WALK + h + .62, FZ + .08));
        });
        // telhado aparecendo atrás da platibanda
        K.add(box(w, .1, 8.4), 0xa9522f, T(cx, WALK + h + .3, FZ - 4.2, .22, 0, 0), .08);
      }
      if (o.awning) {
        // toldo listrado sobre a porta (a padaria)
        var ax = o.awning, aw = 2.2;
        for (var st = 0; st < 8; st++) K.add(box(aw / 8, .04, 1.1), st % 2 ? 0xf3ece0 : 0xb8442f, T(ax - aw / 2 + (st + .5) * aw / 8, WALK + 3.2, FZ + .52, .35, 0, 0), .05);
        for (st = 0; st < 8; st++) K.add(cone(aw / 16, .18, 3), st % 2 ? 0xf3ece0 : 0xb8442f, T(ax - aw / 2 + (st + .5) * aw / 8, WALK + 2.92, FZ + 1.06, Math.PI, 0, 0, 1, 1, .2));
      }
    }

    // placa pintada à mão (canvas → textura)
    function sign(text, w, h, x, y, z, bg, fg, font) {
      var c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w);
      var g = c.getContext("2d");
      g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, c.width - 20, c.height - 20);
      g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = font || ("700 " + Math.round(c.height * .52) + "px 'Playfair Display', Georgia, serif");
      g.fillText(text, c.width / 2, c.height / 2 + 4);
      var tex = own(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      var m = own(patch(new THREE.MeshStandardMaterial({ map: tex, roughness: .9 })));
      var mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), m);
      mesh.position.set(x, y, z); mesh.receiveShadow = true;
      return mesh;
    }

    house(-17, -11.2, { h: 7.4, floors: 2, wall: 0xdba646, shutter: 0x2f6b4f, door: 0x6b3f24, slots: [["W", "D", "W"], ["W", "O", "W"]], beiral: true });
    house(-11.2, -6.6, { h: 4.7, wall: 0x6d97c6, shutter: 0xf0e2b6, door: 0x7a4a2a, slots: [["W", "D", "W"]], balaustre: true, barrado: 0x3f6aa8 });
    // muro com portão e um gol desenhado a giz
    (function muro() {
      var x0 = -6.6, x1 = -3.4, cx = (x0 + x1) / 2;
      S.add(box(x1 - x0, 2.3, .3), 0xe9e2d2, T(cx, WALK + 1.15, FZ - .1), .05);
      S.add(box(x1 - x0 + .1, .12, .4), TRIM, T(cx, WALK + 2.36, FZ - .1));
      S.add(box(x1 - x0, .5, .32), 0xcfc4ad, T(cx, WALK + .25, FZ - .09), .05);
      // gol de giz: traves + rede
      var gx = cx - .2, gy = WALK + .55, gw = 1.7, gh = 1.05, zz = FZ + .065;
      S.add(box(.04, gh, .01), 0xffffff, T(gx - gw / 2, gy + gh / 2, zz), .15);
      S.add(box(.04, gh, .01), 0xffffff, T(gx + gw / 2, gy + gh / 2, zz), .15);
      S.add(box(gw + .04, .04, .01), 0xffffff, T(gx, gy + gh, zz), .15);
      for (var i = 1; i < 7; i++) S.add(box(.012, gh - .05, .01), 0xf4f1ea, T(gx - gw / 2 + i * gw / 7, gy + gh / 2, zz), .2);
      for (i = 1; i < 5; i++) S.add(box(gw - .05, .012, .01), 0xf4f1ea, T(gx, gy + i * gh / 5, zz), .2);
      // portãozinho de ferro
      for (i = 0; i < 9; i++) SM.add(box(.03, 1.6, .03), 0x1f3b32, T(x1 - .95 + i * .1, WALK + .8, FZ + .1));
      SM.add(box(.95, .05, .04), 0x1f3b32, T(x1 - .55, WALK + 1.58, FZ + .1));
      SM.add(box(.95, .05, .04), 0x1f3b32, T(x1 - .55, WALK + .2, FZ + .1));
    })();
    house(-3.4, 1.2, { h: 4.6, wall: 0xe8a597, shutter: 0x3f6aa8, door: 0x6b3f24, slots: [["W", "D", "W"]], frontao: true });
    house(1.2, 5.6, { h: 4.8, wall: 0x93cdb9, trim: 0xf6efdc, shutter: 0x7a4a2a, door: 0x7a4a2a, slots: [["F", "D", "W"]], balaustre: true });
    house(5.6, 10.8, { h: 7.6, floors: 2, wall: 0xf1cf63, shutter: 0x2f6b4f, door: 0x5a3420, slots: [["W", "D", "W"], ["W", "O", "W"]], beiral: true, sacada: true });
    house(10.8, 16.5, { h: 4.9, wall: 0xf3eee4, barrado: 0x3f6aa8, shutter: 0x3f6aa8, door: 0x7a4a2a, slots: [["W", "D", "W"]], awning: 13.65 });
    scene.add(sign("PADARIA", 2.1, .55, 13.65, WALK + 3.95, FZ + .07, "#f3ece0", "#8a2f1d"));

    // pombos na platibanda da casa rosa
    [[-2.6, 0], [-2.1, 1]].forEach(function (p) {
      var x = p[0], y = WALK + 4.6 + .32;
      S.add(ico(.12, 0), 0x8f929c, T(x, y, FZ + .08, 0, p[1] * 2, 0, 1.3, .9, .9), .1);
      S.add(ico(.07, 0), 0x6f7380, T(x + (p[1] ? -.13 : .13), y + .1, FZ + .08), .1);
      S.add(cone(.025, .06, 4), 0xd0a24a, T(x + (p[1] ? -.21 : .21), y + .1, FZ + .08, 0, 0, p[1] ? Math.PI / 2 : -Math.PI / 2));
    });

    // árvores atrás do casario
    mangueira(S, -5.2, -16.5, 1.25);
    ipe(S, 2.6, -15.5, 1.3);
    palmeira(S, -8.6, -19.5, 12.5);
    palmeira(S, -13.5, -21, 11.5);
    mangueira(S, 15, -18, 1.1);

    /* =========================================================
       RUA: calçada de ondas, meio-fio, paralelepípedo, trilhos, postes e fios
       ========================================================= */
    var NZ0 = -1.95, NZ1 = -4.15, RZ0 = -4.3, RZ1 = -10.2, FZ0 = -10.35;

    function gridPattern(x0, x1, z0, z1, cell, y, colorFn, jitter) {
      var nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell);
      var P = new Float32Array(nx * nz * 18), C = new Float32Array(nx * nz * 18), o = 0;
      for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
        var ax = x0 + i * cell, bx = ax + cell, az = z0 + j * cell, bz = az + cell;
        var col = colorFn(ax + cell / 2, az + cell / 2);
        var e = jitter ? (R() - .5) * jitter : 0;
        var quad = [ax, y, az, ax, y + e, bz, bx, y, az, bx, y, az, ax, y + e, bz, bx, y, bz];
        P.set(quad, o);
        for (var k = 0; k < 6; k++) C.set(col, o + k * 3);
        o += 18;
      }
      GND.raw(P, C);
    }
    var WH = lc(0xe9e4d8), BK = lc(0x2e2c2a);
    // calçada de pedra portuguesa em ondas (do nosso lado)
    gridPattern(-12, 12, NZ1, NZ0, .09, WALK, function (x, z) {
      var w = (z + .32 * Math.sin(x * 1.75)) / .78;
      var base = (w - Math.floor(w)) < .5 ? BK : WH;
      var f = .92 + R() * .16;
      return [base[0] * f, base[1] * f, base[2] * f];
    });
    S.add(box(24, WALK, NZ0 - NZ1), 0xcfc8b8, T(0, WALK / 2 - .002, (NZ0 + NZ1) / 2));
    // calçada do outro lado (pedra clara, irregular)
    gridPattern(-18, 18, FZ, FZ0, .3, WALK, function () { var f = .85 + R() * .2; var b = lc(0xe2d9c6); return [b[0] * f, b[1] * f, b[2] * f]; });
    S.add(box(36, WALK, FZ0 - FZ), 0xcfc8b8, T(0, WALK / 2 - .002, (FZ + FZ0) / 2));
    // meios-fios de granito
    S.add(box(24, WALK + .02, .16), 0xa9a49a, T(0, (WALK + .02) / 2, NZ1 - .08), .08);
    S.add(box(36, WALK + .02, .16), 0xa9a49a, T(0, (WALK + .02) / 2, FZ0 + .08), .08);

    // paralelepípedos: pedras com topo levemente torto e rejunte escuro entre elas
    (function cobbles() {
      var x0 = -18, x1 = 18, sw = .23, sd = .15, gap = .028;
      S.add(box(x1 - x0, .02, RZ0 - RZ1 + .3), 0x4a443c, T(0, -.012, (RZ0 + RZ1) / 2));
      var rows = Math.round((RZ0 - RZ1) / sd), list = [], cols = [];
      for (var r = 0; r < rows; r++) {
        var z = RZ1 + r * sd, off = (r % 2) * sw / 2;
        for (var x = x0 - off; x < x1; x += sw) {
          var ax = x + gap / 2, bx = x + sw - gap / 2, az = z + gap / 2, bz = z + sd - gap / 2;
          var y = .004 + R() * .014, t1 = (R() - .5) * .016, t2 = (R() - .5) * .016;
          list.push(ax, y + t1, az, ax, y - t2, bz, bx, y + t2, az, bx, y + t2, az, ax, y - t2, bz, bx, y - t1, bz);
          var tone = R(), base = tone < .15 ? 0x7d6f60 : tone < .3 ? 0x97928a : 0x878279, cc = lc(base, .82 + R() * .3);
          for (var k = 0; k < 6; k++) cols.push(cc[0], cc[1], cc[2]);
        }
      }
      GND.raw(new Float32Array(list), new Float32Array(cols));
    })();
    // trilhos do bonde (faixa de lá)
    [-8.05, -9.05].forEach(function (z) { SM.add(box(36, .03, .06), 0xa7adb3, T(0, .02, z), .05); SM.add(box(36, .012, .14), 0x6c6a66, T(0, .006, z), .05); });

    // poste colonial de ferro, na nossa calçada
    (function poste() {
      var x = -2.75, z = -3.85, G = 0x1f3b32;
      SM.add(cyl(.16, .2, .35, 8), G, T(x, WALK + .17, z));
      SM.add(cyl(.06, .08, 3.4, 8), G, T(x, WALK + 2, z));
      [1, 2.4].forEach(function (y) { SM.add(new THREE.TorusGeometry(.085, .025, 4, 10), G, T(x, WALK + y, z, Math.PI / 2, 0, 0)); });
      SM.add(new THREE.TorusGeometry(.32, .025, 4, 12, Math.PI * .75), G, T(x + .02, WALK + 3.4, z, 0, 0, Math.PI * .4));
      SM.add(box(.5, .05, .05), G, T(x + .25, WALK + 3.75, z));
      // lanterna
      var lx = x + .48, ly = WALK + 3.42;
      SM.add(cone(.24, .22, 6), G, T(lx, ly + .3, z));
      S.add(cyl(.17, .12, .34, 6), 0xf7efcf, T(lx, ly + .02, z), .04);
      SM.add(cyl(.13, .13, .05, 6), G, T(lx, ly - .17, z));
    })();

    // postes de luz e fios (com a linha aérea do bonde)
    var poles = [-14, -6.4, 10.2];
    poles.forEach(function (x) {
      S.add(cyl(.11, .15, 8.4, 7), 0x9a958b, T(x, 4.2, FZ0 + .35), .05);
      S.add(box(1.6, .1, .1), 0x7c6a52, T(x, 7.9, FZ0 + .35));
      [-.6, 0, .6].forEach(function (o) { S.add(cyl(.04, .05, .14, 5), 0xe9e4d8, T(x + o, 8.02, FZ0 + .35)); });
      // braço que segura o fio do bonde
      SM.add(unitRod(4), 0x55524c, rodM(V3(x, 6.3, FZ0 + .35), V3(x, 6.05, -8.55), .02));
    });
    function wire(a, b, sag, r) {
      var pts = [];
      for (var i = 0; i <= 10; i++) { var t = i / 10; pts.push(V3(lerp(a.x, b.x, t), lerp(a.y, b.y, t) - sag * 4 * t * (1 - t), lerp(a.z, b.z, t))); }
      SM.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r || .012, 3, false), 0x2b2724, null, 0);
    }
    for (var pi = 0; pi < poles.length - 1; pi++) {
      [-.6, 0, .6].forEach(function (o) { wire(V3(poles[pi] + o, 8.06, FZ0 + .35), V3(poles[pi + 1] + o, 8.06, FZ0 + .35), .45); });
    }
    wire(V3(-30, 6.05, -8.55), V3(30, 6.05, -8.55), .15, .014);
    wire(V3(-2.75, WALK + 3.7, -3.85), V3(-1, 7.9, FZ0 + .35), .5, .01);

    // bola de capotão largada no meio-fio de lá
    (function () {
      var g = ico(.11, 1);
      S.add(g, 0x8a4f2a, T(-1.9, WALK + .11, FZ0 - .35, .3, .7, .2), .22);
      S.add(new THREE.TorusGeometry(.112, .006, 3, 14), 0xf1e6cf, T(-1.9, WALK + .11, FZ0 - .35, .3, .7, .2), 0);
    })();
    // flores de ipê caídas na calçada de lá
    for (var fi = 0; fi < 26; fi++) S.add(ico(.04, 0), 0xf2c12e, T(6.5 + R() * 4.5, WALK + .01, FZ0 - .3 - R() * 1.6, 0, 0, 0, 1, .3, 1), .15);

    /* =========================================================
       VARANDA (nível .45): ladrilho hidráulico, gradil, colunas, lambrequim, plantas
       ========================================================= */
    var VY = .45, VZ = -1.9;
    S.add(box(4.6, VY, 4.4), 0xd8d0c2, T(0, VY / 2, .3), .02);
    (function ladrilho() {
      var x0 = -2.2, z0 = VZ, tile = .155, nx = 29, nz = 23, y = VY + .002;
      var red = lc(0xa8402e), cream = lc(0xeadcc0), dark = lc(0x2f3d35), ochre = lc(0xc78b3c);
      var P = [], C = [];
      for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
        var wear = .9 + R() * .14;
        for (var a = 0; a < 4; a++) for (var b = 0; b < 4; b++) {
          var u0 = a / 4, v0 = b / 4, u1 = u0 + .25, v1 = v0 + .25;
          var X = function (u) { return x0 + (i + u) * tile; }, Z = function (v) { return z0 + (j + v) * tile; };
          var cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, s = (cu - .5) * (cv - .5);
          var tris = s > 0
            ? [[u0, v1, u1, v0, u0, v0], [u0, v1, u1, v1, u1, v0]]
            : [[u0, v0, u1, v1, u1, v0], [u0, v0, u0, v1, u1, v1]];
          tris.forEach(function (t) {
            var gu = (t[0] + t[2] + t[4]) / 3, gv = (t[1] + t[3] + t[5]) / 3;
            var d = Math.abs(gu - .5) + Math.abs(gv - .5);
            var c = d < .25 ? red : d < .5 ? cream : d < .75 ? dark : ochre;
            P.push(X(t[0]), y, Z(t[1]), X(t[2]), y, Z(t[3]), X(t[4]), y, Z(t[5]));
            for (var k = 0; k < 3; k++) C.push(c[0] * wear, c[1] * wear, c[2] * wear);
          });
        }
      }
      GND.raw(new Float32Array(P), new Float32Array(C));
    })();
    [-1, 1].forEach(function (sd) { S.add(box(1.72, .1, .16), 0xf1ebe0, T(sd * 1.44, VY + .05, VZ - .02)); });   // mureta
    S.add(box(4.6, VY, .1), 0xbdb3a2, T(0, VY / 2, VZ - .05), .03);                // frente da laje

    // gradil de ferro trabalhado
    (function gradil() {
      var G = 0x1f3b32, y0 = VY + .1, top = VY + .85, x0 = -2.3, x1 = 2.3, z = VZ - .02;
      [-1, 1].forEach(function (sd) {
        var cxr = sd * (x1 + .58) / 2, wr = x1 - .58;
        SM.add(box(wr, .05, .07), G, T(cxr, top, z));
        SM.add(box(wr, .035, .05), G, T(cxr, y0 + .06, z));
        SM.add(box(wr, .03, .04), G, T(cxr, top - .2, z));
      });
      // escadinha de dois degraus até a calçada, no vão do gradil
      S.add(box(1.1, .3, .32), 0xd8cfbf, T(0, WALK + .15 - .0, VZ - .2), .03);
      S.add(box(1.1, .15, .3), 0xd8cfbf, T(0, WALK + .075, VZ - .5), .03);
      S.add(box(1.12, .02, .33), 0xe9e2d3, T(0, WALK + .3, VZ - .2), .02);
      S.add(box(1.12, .02, .31), 0xe9e2d3, T(0, WALK + .15, VZ - .5), .02);
      for (var x = x0 + .06; x < x1; x += .13) if (Math.abs(x) > .6) SM.add(box(.016, top - .2 - y0, .016), G, T(x, (top - .2 + y0) / 2, z));
      for (x = x0 + .12; x < x1 - .05; x += .26) if (Math.abs(x) > .62) SM.add(new THREE.TorusGeometry(.08, .01, 3, 10), G, T(x, top - .1, z));
      [-1.75, -.58, .58, 1.75].forEach(function (px) {
        SM.add(box(.06, top - VY + .02, .06), G, T(px, (top + VY) / 2, z));
        SM.add(ico(.045, 0), G, T(px, top + .06, z));
      });
    })();

    // colunas, viga e forro
    [-1.98, 1.98].forEach(function (x) {
      S.add(box(.34, .22, .34), TRIM, T(x, VY + .11, VZ + .1));
      S.add(box(.24, 2.1, .24), 0xf6f1e7, T(x, VY + 1.2, VZ + .1), .02);
      S.add(box(.34, .12, .34), TRIM, T(x, VY + 2.27, VZ + .1));
    });
    S.add(box(4.8, .18, .22), 0xf6f1e7, T(0, VY + 2.42, VZ + .05), .02);
    S.add(box(4.8, .06, 4.4), 0xd3e2e6, T(0, VY + 2.54, .3), .05);
    for (var fx = -2.3; fx <= 2.3; fx += .2) S.add(box(.012, .012, 4.4), 0xb7c9cf, T(fx, VY + 2.505, .3), 0);
    // lambrequim: renda de madeira pendurada na beira do telhado
    for (var lx = -2.35; lx <= 2.36; lx += .1) {
      S.add(cone(.048, .2, 4), 0xf7f2e8, T(lx, VY + 2.24, VZ - .08, Math.PI, Math.PI / 4, 0, 1, 1, .25), .03);
      S.add(ico(.02, 0), 0xf7f2e8, T(lx + .05, VY + 2.28, VZ - .08), .03);
    }
    S.add(box(4.8, .05, .03), 0xf7f2e8, T(0, VY + 2.33, VZ - .08));

    // espada-de-são-jorge num vaso de barro
    (function () {
      var x = -1.5, z = VZ + .38;
      S.add(cyl(.17, .13, .32, 9), 0xb5653a, T(x, VY + .16, z), .06);
      S.add(new THREE.TorusGeometry(.17, .025, 4, 12), 0xa45a33, T(x, VY + .32, z, Math.PI / 2, 0, 0));
      S.add(cyl(.15, .15, .02, 9), 0x4a3426, T(x, VY + .3, z));
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * Math.PI * 2 + R(), tilt = .08 + R() * .2, h = .55 + R() * .35;
        S.add(cone(.04, h, 4), i % 2 ? 0x2f6b3a : 0x3d7d43, T(x + Math.cos(a) * .06, VY + .3 + h / 2, z + Math.sin(a) * .06, Math.sin(a) * tilt, a, -Math.cos(a) * tilt, 1, 1, .28), .12);
      }
    })();
    // samambaia pendurada na viga
    (function () {
      var x = 1.45, y = VY + 1.82, z = VZ + .3;
      [0, 2.1, 4.2].forEach(function (a) { SM.add(unitRod(3), 0x2a2622, rodM(V3(x + Math.cos(a) * .15, y + .16, z + Math.sin(a) * .15), V3(x, VY + 2.36, z), .004)); });
      S.add(cyl(.17, .1, .2, 9), 0xb5653a, T(x, y + .06, z), .06);
      S.add(new THREE.TorusGeometry(.17, .022, 4, 12), 0xa45a33, T(x, y + .16, z, Math.PI / 2, 0, 0));
      for (var i = 0; i < 30; i++) {
        var a = i / 30 * Math.PI * 2 + R() * .2, len = .5 + R() * .35;
        var dir = V3(Math.cos(a), 0, Math.sin(a));
        for (var s = 0; s < 14; s++) {
          var t = s / 13;
          var p = V3(x, y + .16, z).addScaledVector(dir, .08 + len * .55 * t).add(V3(0, .1 * t - 1.05 * t * t * len, 0));
          var side = s % 2 ? 1 : -1, sideV = V3(-dir.z, 0, dir.x).multiplyScalar(side * .03 * (1 - t * .6));
          var leaf = new THREE.OctahedronGeometry(.05 * (1 - t * .55), 0);
          S.add(leaf, s % 3 ? 0x4f8a3c : 0x3c7432, T(p.x + sideV.x, p.y, p.z + sideV.z, R() * .5, a + side * .8, -.6 * t, 1, .22, .5), .1);
        }
      }
    })();
    // mesinha com o cafezinho
    (function () {
      var x = .72, z = .05, top = VY + .58;
      S.add(cyl(.23, .23, .03, 12), 0x6e4327, T(x, top, z), .05);
      S.add(cyl(.03, .04, .55, 6), 0x5c3820, T(x, VY + .28, z));
      S.add(cyl(.16, .2, .03, 8), 0x5c3820, T(x, VY + .015, z));
      S.add(cyl(.075, .065, .01, 14), 0xf8f5ee, T(x - .05, top + .02, z + .02), .02);
      S.add(cyl(.042, .032, .055, 12), 0xfbf8f1, T(x - .05, top + .052, z + .02), .02);
      S.add(cyl(.036, .036, .004, 12), 0x3a2316, T(x - .05, top + .078, z + .02), 0);
      S.add(new THREE.TorusGeometry(.017, .005, 4, 8), 0xfbf8f1, T(x + .0, top + .055, z + .02), .02);
      // bule esmaltado
      S.add(cyl(.06, .08, .14, 10), 0xe9e3d6, T(x + .1, top + .085, z - .07), .03);
      S.add(cone(.06, .05, 10), 0x3f6aa8, T(x + .1, top + .18, z - .07));
      S.add(unitRod(4), 0xe9e3d6, rodM(V3(x + .16, top + .07, z - .07), V3(x + .23, top + .15, z - .07), .012));
    })();

    // pernas do leitor (sentado na cadeira de balanço) — aparecem quando ele olha para baixo
    (function () {
      var TROU = 0x7d6e58, SHOE = 0x4a2c1c;
      [-1, 1].forEach(function (s) {
        var hip = V3(s * .12, VY + .55, .78), knee = V3(s * .15, VY + .5, .3), ankle = V3(s * .16, VY + .09, .2);
        S.add(unitRod(7), TROU, rodM(hip, knee, .062), .05);
        S.add(ico(.062, 1), TROU, T(knee.x, knee.y, knee.z), .05);
        S.add(unitRod(7), TROU, rodM(knee, ankle, .05), .05);
        S.add(box(.11, .08, .27), SHOE, T(ankle.x, VY + .045, ankle.z - .07), .06);
        S.add(ico(.06, 0), SHOE, T(ankle.x, VY + .05, ankle.z - .2, 0, 0, 0, .95, .65, 1), .06);
      });
    })();

    /* ---------- monta o cenário parado ---------- */
    var staticMesh = S.mesh(MAT, true, true);
    scene.add(GND.mesh(MAT, false, true));
    var staticMetal = SM.mesh(METAL, true, true);
    scene.add(staticMesh, staticMetal);

    /* =========================================================
       CÂMERA (primeira pessoa, na cadeira de balanço)
       ========================================================= */
    var rig = new THREE.Group();             // balança junto com a cadeira
    rig.position.set(0, VY, .7);
    scene.add(rig);
    var camera = new THREE.PerspectiveCamera(45, W / H, .03, 600);
    camera.rotation.order = "YXZ";
    var CAM0 = V3(0, 1.12, -.08);
    camera.position.copy(CAM0);
    rig.add(camera);
    // braços da cadeira de balanço (palhinha e madeira escura)
    (function () {
      var K = new Kit(51), WOOD = 0x5a3620;
      [-1, 1].forEach(function (s) {
        K.add(box(.05, .035, .6), WOOD, T(s * .4, .62, -.06, .06, 0, 0), .05);
        K.add(cyl(.018, .022, .62, 6), WOOD, T(s * .4, .32, -.34), .05);
        K.add(ico(.03, 0), WOOD, T(s * .4, .64, -.36), .05);
      });
      rig.add(K.mesh(MAT, true, true));
    })();

    function fitCamera() {
      var a = W / H, vfov;
      if (a >= 1) vfov = clamp(2 * Math.atan(Math.tan(40 * Math.PI / 180) / a) * 180 / Math.PI, 40, 56);
      else vfov = Math.min(86, 2 * Math.atan(Math.tan(24 * Math.PI / 180) / a) * 180 / Math.PI);
      camera.fov = vfov; camera.aspect = a; camera.updateProjectionMatrix();
    }
    fitCamera();

    /* =========================================================
       BONDE DA LINHA 4
       ========================================================= */
    var tram = new THREE.Group();
    (function () {
      var K = new Kit(61), KM = new Kit(62);
      var L = 8.6, Wd = 2.15, GREEN = 0x2f6b4f, CREAM = 0xeadcb0, WOOD = 0x8a5a32;
      K.add(box(L, .3, Wd), 0x2e2b28, T(0, .55, 0), .04);
      K.add(box(L, .32, Wd + .04), GREEN, T(0, .86, 0), .04);
      K.add(box(L + .02, .07, Wd + .06), CREAM, T(0, 1.04, 0));
      // bancos de madeira com encosto
      for (var b = 0; b < 8; b++) {
        var bx = -L / 2 + .75 + b * (L - 1.5) / 7;
        K.add(box(.42, .07, Wd - .2), WOOD, T(bx, 1.4, 0), .08);
        K.add(box(.06, .5, Wd - .2), WOOD, T(bx - .2, 1.68, 0, 0, 0, -.12), .08);
      }
      // balaústres, teto com lanternim
      for (var s = -1; s <= 1; s += 2) for (var k = 0; k <= 8; k++) KM.add(cyl(.028, .028, 1.75, 6), 0xb79a52, T(-L / 2 + .2 + k * (L - .4) / 8, 1.95, s * (Wd / 2 - .02)));
      K.add(box(L + .3, .1, Wd + .3), GREEN, T(0, 2.86, 0), .04);
      K.add(box(L + .32, .08, Wd + .32), CREAM, T(0, 2.79, 0));
      K.add(box(L - 1.4, .28, .9), GREEN, T(0, 3.05, 0), .04);
      // frente e traseira (painéis com farol)
      [-1, 1].forEach(function (s) {
        K.add(box(.12, 1.1, Wd), GREEN, T(s * L / 2, 1.6, 0), .04);
        K.add(ico(.13, 1), 0xfff7d6, T(s * (L / 2 + .07), 1.25, 0), 0);
        K.add(box(.2, .5, .4), 0x2e2b28, T(s * (L / 2 + .02), .45, 0));
      });
      // passageiros (de chapéu, lendo, conversando)
      [[-2.6, .45, 0x6f3527, 0x3b3128], [-1.4, -.5, 0x3f6aa8, 0xe8d9a8], [.4, .5, 0xe7d7ac, 0x3b3128], [1.6, -.4, 0x8a2f1d, 0x2b2b2b], [2.8, .3, 0x2f6b4f, 0xe8d9a8]].forEach(function (p) {
        K.add(box(.34, .55, .26), p[2], T(p[0], 1.72, p[1]), .06);
        K.add(ico(.13, 1), 0xb98057, T(p[0], 2.13, p[1]), .04);
        K.add(cyl(.17, .17, .03, 10), p[3], T(p[0], 2.24, p[1]), .04);
        K.add(cyl(.1, .11, .12, 10), p[3], T(p[0], 2.31, p[1]), .04);
      });
      // rodas
      [-1, 1].forEach(function (s) { [-1, 1].forEach(function (z) { KM.add(cyl(.32, .32, .1, 12), 0x3a3a3a, T(s * 2.4, .32, z * .5, Math.PI / 2, 0, 0)); }); });
      // alavanca do trole até o fio
      KM.add(unitRod(4), 0x2b2724, rodM(V3(1.2, 3.1, 0), V3(-1.4, 6.05 - .08, -.0), .03));
      tram.add(K.mesh(MAT, true, true), KM.mesh(METAL, true, true));
      var plate = sign("4 · MATRIZ", 1.2, .3, 0, 0, 0, "#f3ece0", "#2a1f15");
      plate.position.set(-L / 2 - .08, 2.55, 0); plate.rotation.y = -Math.PI / 2; tram.add(plate);
      var plate2 = sign("4 · MATRIZ", 1.2, .3, 0, 0, 0, "#f3ece0", "#2a1f15");
      plate2.position.set(0, 2.55, Wd / 2 + .17); tram.add(plate2);
    })();
    tram.position.set(2, 0, -8.55);
    scene.add(tram);

    /* =========================================================
       JORNALEIRO DE BICICLETA (olha para +x; o lado direito dele é +z, virado para nós)
       ========================================================= */
    var bike = new THREE.Group(), BIKE_Z = -5.35;
    var parts = {};
    (function () {
      var K = new Kit(71), KM = new Kit(72), RED = 0x8f2a24, CREAM = 0xeadcc0;
      var bb = V3(0, .3, 0), seatTop = V3(-.21, .94, 0), head = V3(.42, .88, 0), rearC = V3(-.53, .34, 0), frontC = V3(.53, .34, 0);
      [[bb, seatTop], [seatTop.clone().add(V3(.01, -.06, 0)), head], [bb, head.clone().add(V3(0, -.08, 0))], [bb, rearC], [seatTop.clone().add(V3(0, -.06, 0)), rearC], [head, frontC]].forEach(function (p) {
        KM.add(unitRod(6), RED, rodM(p[0], p[1], .022), .04);
      });
      [-1, 1].forEach(function (z) { KM.add(unitRod(5), RED, rodM(V3(-.53, .34, z * .05), V3(0, .3, z * .03), .014)); });
      KM.add(unitRod(6), 0x2b2b2b, rodM(head, V3(.4, 1.06, 0), .02));
      KM.add(box(.06, .03, .62), 0xbfc3c8, T(.38, 1.07, 0));
      [-1, 1].forEach(function (z) { K.add(cyl(.024, .024, .12, 6), 0x3b2a1e, T(.38, 1.07, z * .28, Math.PI / 2, 0, 0)); });
      K.add(box(.26, .06, .14), 0x3b2a1e, T(-.22, .97, 0), .05);           // selim de couro
      KM.add(new THREE.TorusGeometry(.1, .012, 3, 14), 0x8c8f94, T(0, .3, .05));   // coroa
      // para-lamas
      [rearC, frontC].forEach(function (c, i) { K.add(new THREE.TorusGeometry(.38, .028, 3, 12, Math.PI * .62), CREAM, T(c.x, c.y, 0, 0, 0, i ? Math.PI * .1 : Math.PI * .28), .04); });
      // cesta de vime na frente, cheia de jornais
      K.add(box(.36, .26, .4), 0xb08850, T(.66, .96, 0), .12);
      for (var k = 0; k < 7; k++) K.add(box(.37, .015, .41), 0x8d6a3c, T(.66, .85 + k * .035, 0), .05);
      for (k = 0; k < 4; k++) K.add(cyl(.035, .035, .34, 8), 0xefe6cf, T(.62 + (k % 2) * .08, 1.1, -.1 + k * .07, Math.PI / 2, 0, (k - 1.5) * .1), .04);
      // bagageiro com um maço amarrado
      KM.add(box(.4, .02, .18), 0x55524c, T(-.5, .72, 0));
      K.add(box(.34, .14, .24), 0xe9e0c8, T(-.5, .8, 0), .05);
      K.add(box(.35, .02, .03), 0x8a2f1d, T(-.5, .87, 0));
      bike.add(K.mesh(MAT, true, true), KM.mesh(METAL, true, true));

      function wheel(c) {
        var g = new THREE.Group(), WK = new Kit(73);
        WK.add(new THREE.TorusGeometry(.335, .028, 5, 22), 0x1f1d1b, null, .04);
        WK.add(new THREE.TorusGeometry(.305, .012, 3, 22), 0xc9ccd1, null, 0);
        for (var s = 0; s < 14; s++) {
          var a = s / 14 * Math.PI * 2;
          WK.add(unitRod(3), 0xc9ccd1, rodM(V3(0, 0, (s % 2 ? .02 : -.02)), V3(Math.cos(a) * .3, Math.sin(a) * .3, 0), .0035), 0);
        }
        WK.add(cyl(.03, .03, .08, 8), 0xa6aab0, T(0, 0, 0, Math.PI / 2, 0, 0));
        g.add(WK.mesh(METAL, true, true));
        g.position.copy(c);
        bike.add(g);
        return g;
      }
      parts.rearW = wheel(rearC); parts.frontW = wheel(frontC);
      // pedivela
      var crank = new THREE.Group(); crank.position.copy(bb); bike.add(crank);
      var CK = new Kit(74);
      CK.add(box(.03, .17, .02), 0x8c8f94, T(0, -.085, .07)); CK.add(box(.03, .17, .02), 0x8c8f94, T(0, .085, -.07));
      CK.add(box(.1, .025, .06), 0x2b2b2b, T(0, -.17, .1)); CK.add(box(.1, .025, .06), 0x2b2b2b, T(0, .17, -.1));
      crank.add(CK.mesh(METAL, true, false));
      parts.crank = crank;

      /* jornaleiro: boina, bigode, camisa clara com suspensório, calça marrom */
      var SKIN = 0xb57c52, SHIRT = 0xefe8d8, TROU = 0x5a4130, CAP = 0x5d5246, SUSP = 0x6f3527;
      var torso = new THREE.Group(); torso.position.set(-.2, 1.0, 0); torso.rotation.z = -.32; bike.add(torso);
      var TK = new Kit(75);
      TK.add(box(.25, .3, .3), TROU, T(0, .04, 0), .05);
      TK.add(box(.26, .5, .36), SHIRT, T(.01, .38, 0), .05);
      TK.add(ico(.17, 1), SHIRT, T(.02, .55, 0, 0, 0, 0, .85, .55, 1.08), .04);
      [-1, 1].forEach(function (z) { TK.add(box(.27, .5, .035), SUSP, T(.0, .36, z * .1), 0); TK.add(box(.04, .5, .035), SUSP, T(.13, .36, z * .1), 0); });
      TK.add(cyl(.05, .055, .1, 6), SKIN, T(.04, .7, 0), .04);
      torso.add(TK.mesh(MAT, true, true));
      var headG = new THREE.Group(); headG.position.set(.04, .76, 0); torso.add(headG);
      var HK = new Kit(76);
      HK.add(ico(.115, 1), SKIN, T(.02, .09, 0, 0, 0, 0, 1, 1.08, .95), .04);
      HK.add(box(.04, .05, .04), SKIN, T(.135, .08, 0), .04);                 // nariz
      HK.add(box(.025, .02, .09), 0x2b1d14, T(.12, .04, 0), .04);             // bigode
      HK.add(box(.015, .02, .02), 0x1a120c, T(.115, .12, .045)); HK.add(box(.015, .02, .02), 0x1a120c, T(.115, .12, -.045));
      HK.add(ico(.03, 0), SKIN, T(0, .09, .11), .04); HK.add(ico(.03, 0), SKIN, T(0, .09, -.11), .04);
      HK.add(ico(.11, 1), 0x2b1d14, T(-.03, .1, 0, 0, 0, 0, 1, .95, 1.02), .05);   // cabelo
      HK.add(cyl(.13, .125, .06, 12), CAP, T(.0, .19, 0), .07);                   // boina
      HK.add(ico(.13, 1), CAP, T(.02, .21, 0, 0, 0, 0, 1.05, .35, 1), .07);
      HK.add(box(.1, .015, .2), CAP, T(.13, .17, 0, 0, 0, -.12), .05);           // pala
      headG.add(HK.mesh(MAT, true, true));
      parts.torso = torso; parts.head = headG;

      // membros: cilindros unitários reposicionados a cada quadro (IK simples)
      function limb(color, r) {
        var m = new THREE.Mesh(own(unitRod(6)), MAT); m.castShadow = true;
        var g = m.geometry; var cols = new Float32Array(g.attributes.position.count * 3), c = new THREE.Color().setHex(color);
        for (var i = 0; i < cols.length; i += 3) { cols[i] = c.r; cols[i + 1] = c.g; cols[i + 2] = c.b; }
        g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        m.userData.r = r; bike.add(m); return m;
      }
      function blob(color, r, sx, sy, sz) {
        var K2 = new Kit(77); K2.add(ico(r, 0), color, T(0, 0, 0, 0, 0, 0, sx || 1, sy || 1, sz || 1), .05);
        var m = K2.mesh(MAT, true, false); bike.add(m); return m;
      }
      parts.legs = [-1, 1].map(function (s) {
        return { s: s, thigh: limb(TROU, .07), shin: limb(TROU, .055), knee: blob(TROU, .07), shoe: blob(0x2a1d14, .07, 1.6, .55, .8) };
      });
      parts.arms = [-1, 1].map(function (s) {
        return { s: s, up: limb(SHIRT, .05), fore: limb(SKIN, .038), elbow: blob(SHIRT, .05), hand: blob(SKIN, .045, 1.2, .9, .8) };
      });
    })();
    bike.position.set(-9, 0, BIKE_Z);
    scene.add(bike);

    // IK de dois ossos com vetor de dobra (pole)
    function ik2(A, B, L1, L2, pole) {
      var d = V3().subVectors(B, A), dist = clamp(d.length(), .02, L1 + L2 - .002);
      d.normalize();
      var a = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
      var ang = Math.acos(clamp(a, -1, 1));
      var side = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
      return A.clone().addScaledVector(d, Math.cos(ang) * L1).addScaledVector(side, Math.sin(ang) * L1);
    }

    /* =========================================================
       VIRA-LATA CARAMELO (deitado na nossa calçada, de olho em tudo)
       ========================================================= */
    var dog = new THREE.Group(), dogParts = {};
    (function () {
      var CAR = 0xc8873f, CREAM = 0xf0d4a2, DARK = 0x8e5a2b, NOSE = 0x1e1612;
      var K = new Kit(81);
      K.add(ico(.2, 1), CAR, T(0, .2, 0, 0, 0, 0, 1.9, .95, 1), .07);          // corpo
      K.add(ico(.17, 1), CREAM, T(.24, .17, 0, 0, 0, 0, 1, .9, .9), .05);       // peito
      K.add(ico(.17, 1), CAR, T(-.26, .19, .02, 0, 0, 0, 1.1, 1, 1.15), .07);   // ancas
      // patas da frente esticadas, traseiras dobradas
      [-1, 1].forEach(function (s) {
        K.add(unitRod(6), CAR, rodM(V3(.26, .1, s * .09), V3(.56, .04, s * .1), .045), .06);
        K.add(ico(.05, 0), CREAM, T(.59, .035, s * .1, 0, 0, 0, 1.4, .7, 1), .05);
        K.add(ico(.12, 1), CAR, T(-.3, .12, s * .15, 0, 0, 0, 1.3, .8, .6), .07);
        K.add(ico(.05, 0), CREAM, T(-.12, .035, s * .2, 0, 0, 0, 1.6, .7, 1), .05);
      });
      dog.add(K.mesh(MAT, true, true));
      dogParts.body = dog.children[0];
      var head = new THREE.Group(); head.position.set(.36, .34, 0); dog.add(head);
      var HK = new Kit(82);
      HK.add(ico(.13, 1), CAR, T(.03, .04, 0, 0, 0, 0, 1.1, .95, 1.05), .06);
      HK.add(box(.2, .1, .12), CAR, T(.17, -.0, 0), .06);                     // focinho comprido
      HK.add(box(.16, .06, .115), CREAM, T(.2, -.04, 0), .05);
      HK.add(box(.045, .04, .06), NOSE, T(.285, .02, 0), .02);
      HK.add(box(.03, .012, .1), 0x3a2416, T(.2, -.075, 0), .02);              // boca
      HK.add(box(.022, .03, .028), 0x140e0a, T(.115, .085, .065)); HK.add(box(.022, .03, .028), 0x140e0a, T(.115, .085, -.065));
      HK.add(box(.012, .012, .012), 0xffffff, T(.127, .094, .07)); HK.add(box(.012, .012, .012), 0xffffff, T(.127, .094, -.06));
      HK.add(box(.05, .02, .12), 0xb87a38, T(.1, .135, 0), .05);              // sobrancelhas
      head.add(HK.mesh(MAT, true, true));
      // orelhas meio caídas
      dogParts.ears = [-1, 1].map(function (s) {
        var e = new THREE.Group(); e.position.set(-.01, .11, s * .1); head.add(e);
        var EK = new Kit(83); EK.add(cone(.065, .16, 4), DARK, T(0, .075, 0, 0, Math.PI / 4, 0, 1, 1, .4), .06);
        e.add(EK.mesh(MAT, true, false)); e.rotation.x = s * 2.1; return e;
      });
      var tongue = new THREE.Mesh(own(box(.05, .01, .04)), MAT);
      (function () { var g = tongue.geometry, n = g.attributes.position.count, c = new Float32Array(n * 3), cc = new THREE.Color().setHex(0xd9727a); for (var i = 0; i < n; i++) { c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); })();
      tongue.position.set(.21, -.085, .0); tongue.visible = false; head.add(tongue);
      dogParts.head = head; dogParts.tongue = tongue;
      // rabo em 4 gomos
      var prev = dog, tail = [];
      for (var i = 0; i < 4; i++) {
        var seg = new THREE.Group(); seg.position.set(i ? -.09 : -.46, i ? 0 : .22, 0); prev.add(seg);
        var SK = new Kit(84 + i); SK.add(unitRod(5), i === 3 ? CREAM : CAR, rodM(V3(0, 0, 0), V3(-.1, 0, 0), .028 - i * .004), .05);
        seg.add(SK.mesh(MAT, true, false));
        tail.push(seg); prev = seg;
      }
      dogParts.tail = tail;
    })();
    dog.position.set(2.15, WALK, -3.75);
    dog.rotation.y = Math.PI + .5;           // de frente para a esquerda, um pouco virado para nós
    scene.add(dog);

    /* =========================================================
       O JORNAL: uma folha que vira rolo (e desenrola) — frente com a capa de verdade
       ========================================================= */
    var PAGE_H = .52, PAGE_W = .38;
    var paperCanvas = placeholderPaper();
    var frontTex = own(new THREE.CanvasTexture(paperCanvas)); frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var backTex = own(new THREE.CanvasTexture(window.GazetaPrint ? window.GazetaPrint.backside(paperCanvas) : paperCanvas)); backTex.colorSpace = THREE.SRGBColorSpace;
    var frontMat = own(patch(new THREE.MeshStandardMaterial({ map: frontTex, roughness: .95, side: THREE.FrontSide })));
    var backMat = own(patch(new THREE.MeshStandardMaterial({ map: backTex, roughness: .95, side: THREE.BackSide, color: 0xf2ead8 })));
    var SEG_X = 6, SEG_Y = 64;
    var sheetGeo = own(new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y));
    var paper = new THREE.Group(), sheet = new THREE.Group();
    var front = new THREE.Mesh(sheetGeo, frontMat), back = new THREE.Mesh(sheetGeo, backMat);
    front.castShadow = true; front.receiveShadow = true; back.receiveShadow = true;
    sheet.add(front, back); paper.add(sheet);
    var R_IN = .02, LAYER = .0035, R_OUT = .033;
    var band = new THREE.Mesh(own(new THREE.TorusGeometry(R_OUT + .002, .0035, 4, 20)), own(patch(new THREE.MeshStandardMaterial({ color: 0xb8442f, roughness: .6 }))));
    band.rotation.y = Math.PI / 2; paper.add(band);
    paper.visible = false;
    scene.add(paper);

    function placeholderPaper() {
      var c = document.createElement("canvas"); c.width = 380; c.height = 520;
      var g = c.getContext("2d");
      g.fillStyle = "#e7d7ac"; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#2a1f15"; g.textAlign = "center";
      g.font = "64px 'UnifrakturCook', 'Old English Text MT', Georgia, serif";
      g.fillText("A Gazeta do Dia", c.width / 2, 78);
      g.fillRect(20, 96, c.width - 40, 3); g.fillRect(20, 104, c.width - 40, 1);
      g.font = "700 30px 'Playfair Display', Georgia, serif";
      g.fillText("Palavras cruzadas voltam", c.width / 2, 146); g.fillText("à moda", c.width / 2, 180);
      g.fillStyle = "#8f7f62";
      for (var col = 0; col < 3; col++) for (var l = 0; l < 26; l++) g.fillRect(24 + col * 116, 210 + l * 11, 104 - (l % 7 === 6 ? 40 : 0), 4);
      return c;
    }
    function setPaper(canvasEl) {
      if (!canvasEl || !canvasEl.width) return;
      paperCanvas = canvasEl;
      // a capa nova tem outro tamanho: libera a textura antiga para a placa de vídeo alocar a nova do tamanho certo
      frontTex.dispose(); frontTex.image = canvasEl; frontTex.needsUpdate = true;
      if (window.GazetaPrint) { backTex.dispose(); backTex.image = window.GazetaPrint.backside(canvasEl); backTex.needsUpdate = true; }
      // sobe a textura para a placa de vídeo agora (e não no meio do voo do jornal)
      try { renderer.initTexture(frontTex); renderer.initTexture(backTex); } catch (e) {}
      PAGE_W = PAGE_H * canvasEl.width / canvasEl.height;
      shapeSheet(lastUnroll, true);
    }

    /* forma da folha: presa pela borda de cima (y=0, z=+R_OUT na referência do rolo);
       até "L" ela pende reta para baixo; dali em diante enrola para trás (raio cada vez menor). */
    var lastUnroll = -1;
    function shapeSheet(L, force) {
      if (!force && Math.abs(L - lastUnroll) < 1e-5) return;
      lastUnroll = L;
      var p = sheetGeo.attributes.position, uv = sheetGeo.attributes.uv;
      var ys = [], zs = [];
      var y = 0, z = R_OUT, ang = 0, ds = PAGE_H / SEG_Y;
      for (var j = 0; j <= SEG_Y; j++) {
        var s = j * ds;
        ys.push(y); zs.push(z);
        var r = Math.max(R_IN, R_IN + LAYER * (PAGE_H - s) / (2 * Math.PI * (R_IN + R_OUT) / 2));
        var k = s >= L ? 1 / r : 0;
        var a0 = ang; ang += k * ds;
        var am = (a0 + ang) / 2;
        y -= Math.cos(am) * ds; z -= Math.sin(am) * ds;
      }
      for (var row = 0; row <= SEG_Y; row++) for (var col = 0; col <= SEG_X; col++) {
        var i = row * (SEG_X + 1) + col;
        p.setXYZ(i, (col / SEG_X - .5) * PAGE_W, ys[row], zs[row]);
        uv.setXY(i, col / SEG_X, 1 - row / SEG_Y);
      }
      p.needsUpdate = true; uv.needsUpdate = true;
      sheetGeo.computeVertexNormals();
      sheetGeo.computeBoundingSphere();
    }
    shapeSheet(0, true);
    // a borda presa fica em (x, 0, R_OUT): com o rolo fechado, o eixo dele cai na origem do grupo

    if (opts.getPaper) {
      try {
        Promise.resolve(opts.getPaper()).then(function (c) { if (!disposed) setPaper(c); }, function () {});
      } catch (e) {}
    }

    /* =========================================================
       MÃOS DO LEITOR (as mesmas low-poly do jornal: js/reader3d.js)
       ========================================================= */
    var Reader = window.GazetaReader, hands = null, POSES = Reader && Reader.POSES;
    if (Reader && Reader._Hand) {
      var handMat = own(patch(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .78, metalness: 0, side: THREE.DoubleSide })));
      hands = { right: new Reader._Hand(scene, handMat, false), left: new Reader._Hand(scene, handMat, true) };
      [hands.right, hands.left].forEach(function (h) {
        h.scale = .095; h.group.visible = false;
        var sk = new Kit(91); sk.add(new THREE.CylinderGeometry(.47, .5, 9, 9, 1), 0x6f3527, T(0, -8.4, 0, 0, 0, 0, 1, 1, .86), .04);
        var sleeve = sk.mesh(handMat, true, true); h.group.add(sleeve);
        h.group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      });
    }
    function poseLerp(a, b, k) {
      var o = { c: [0, 0, 0, 0], s: lerp(a.s, b.s, k), ta: lerp(a.ta, b.ta, k), tf: lerp(a.tf, b.tf, k), to: lerp(a.to, b.to, k) };
      for (var i = 0; i < 4; i++) o.c[i] = lerp(a.c[i], b.c[i], k);
      return o;
    }
    function basis(fingers, palm) {
      var Z = palm.clone().normalize(), f = fingers.clone();
      f.addScaledVector(Z, -f.dot(Z)).normalize();
      var X = V3().crossVectors(f, Z);
      return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, f, Z));
    }

    /* =========================================================
       LINHA DO TEMPO
       ========================================================= */
    var BIKE_X0 = -9, BIKE_X1 = 7, T_BIKE0 = 1.2, T_BIKE1 = 4.9, T_REL = 3.45, T_LAND = 4.95;
    var LAND = V3(.06, VY + R_OUT + .002, -.5);
    var releasePos = null, releaseQuat = null;
    var crankAngle = 0, lastT = 0, wheelAngle = 0;
    var _v = V3(), _w = V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
    var camWorld = V3(), camQuat = new THREE.Quaternion(), camFwd = V3(), camUp = V3();
    var dogLook = { yaw: 0, pitch: 0 };

    function bikeX(t) { return lerp(BIKE_X0, BIKE_X1, lin(T_BIKE0, T_BIKE1, t)); }

    function updateBike(t, dt) {
      var x = bikeX(t);
      bike.position.x = x;
      bike.visible = t > T_BIKE0 - .1 && t < T_BIKE1 + .2;
      var speed = (BIKE_X1 - BIKE_X0) / (T_BIKE1 - T_BIKE0);
      wheelAngle -= speed * dt / .335 * (t > T_BIKE0 ? 1 : 0);
      parts.rearW.rotation.z = wheelAngle; parts.frontW.rotation.z = wheelAngle;
      var pedaling = 1 - smooth(2.95, 3.15, t) + smooth(3.9, 4.2, t);
      crankAngle -= speed * dt / .335 / 2.4 * pedaling;
      parts.crank.rotation.z = crankAngle;
      bike.position.y = .005 * Math.sin(t * 23);

      // pernas: quadril → pedal
      var hip = V3(-.2, 1.0, 0);
      parts.legs.forEach(function (L) {
        var a = crankAngle + (L.s > 0 ? 0 : Math.PI);
        var ped = V3(Math.sin(a) * .17, .3 - Math.cos(a) * .17, L.s * .11);
        var H0 = hip.clone().setZ(L.s * .1);
        var K = ik2(H0, ped, .46, .47, V3(1, .35, 0));
        setRod(L.thigh, H0, K, L.thigh.userData.r); setRod(L.shin, K, ped, L.shin.userData.r);
        L.knee.position.copy(K); L.shoe.position.copy(ped).add(V3(.04, .02, 0));
      });

      // braços: esquerdo no guidão; direito pega o jornal na cesta, arremessa e cumprimenta com a boina
      parts.torso.updateMatrix(); parts.torso.updateMatrixWorld(true);
      var grip = function (s) { return V3(.38, 1.07, s * .28); };
      var keys = [
        [0, grip(1)], [2.55, grip(1)], [2.85, V3(.62, 1.13, .1)], [3.05, V3(.5, 1.25, .25)],
        [3.27, V3(-.22, 1.55, .5)], [3.45, V3(.45, 1.5, .75)], [3.62, V3(.55, 1.35, .55)],
        [3.85, V3(.22, 1.86, .1)], [4.25, V3(.22, 1.86, .1)], [4.6, grip(1)]
      ];
      parts.arms.forEach(function (Ar) {
        var sh = V3(.0, .52, Ar.s * .2).applyMatrix4(parts.torso.matrix);
        var target;
        if (Ar.s < 0) target = grip(-1);
        else {
          target = keys[keys.length - 1][1];
          for (var i = 0; i < keys.length - 1; i++) {
            if (t >= keys[i][0] && t < keys[i + 1][0]) {
              var k = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
              target = keys[i][1].clone().lerp(keys[i + 1][1], i === 4 ? easeIn(k) : easeInOut(k));
              break;
            }
          }
        }
        var el = ik2(sh, target, .3, .32, V3(-.4, -.6, Ar.s * .6));
        setRod(Ar.up, sh, el, Ar.up.userData.r); setRod(Ar.fore, el, target, Ar.fore.userData.r);
        Ar.elbow.position.copy(el); Ar.hand.position.copy(target);
        if (Ar.s > 0) parts.handR = target;
      });
      // cabeça: olha a rua; ao arremessar, vira para o leitor
      var look = smooth(2.95, 3.35, t) * (1 - smooth(4.3, 4.7, t));
      parts.head.rotation.y = -1.05 * look;
      parts.head.rotation.z = .25 - .1 * look;
      parts.head.rotation.x = .1 * look;
    }

    function rollQuatAt(spin, yaw) { return _q.setFromEuler(_e.set(spin, yaw, 0, "YXZ")).clone(); }

    function updatePaper(t, dt) {
      var showFromHand = t >= 2.88 && t < T_REL;
      paper.visible = t >= 2.88;
      if (!paper.visible) return;
      band.visible = t < 6.92;
      if (t < 6.92) band.scale.set(1, 1, 1);
      var L = PAGE_H * easeOut(lin(6.95, 7.6, t));
      shapeSheet(L);
      if (showFromHand) {
        bike.updateMatrixWorld(true);
        var hp = parts.handR.clone().applyMatrix4(bike.matrixWorld);
        paper.position.copy(hp).add(V3(0, .02, 0));
        paper.quaternion.copy(rollQuatAt(.4, Math.PI / 2 + .3));
        releasePos = paper.position.clone();
        return;
      }
      if (t < T_LAND + .45) {
        var P0 = releasePos || V3(bikeX(T_REL) + .45, 1.5, BIKE_Z + .75);
        var u = lin(T_REL, T_LAND, t);
        var P1 = V3((P0.x + LAND.x) / 2 - .2, 3.4, -2.9);
        if (t <= T_LAND) {
          var a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
          paper.position.set(a * P0.x + b * P1.x + c * LAND.x, a * P0.y + b * P1.y + c * LAND.y, a * P0.z + b * P1.z + c * LAND.z);
          paper.quaternion.copy(rollQuatAt(.4 + u * 10.32, lerp(Math.PI / 2 + .3, .04, easeOut(u)))).multiply(_q.setFromAxisAngle(V3(0, 0, 1), .5 * Math.sin(u * 9)));
        } else {
          var v = lin(T_LAND, T_LAND + .45, t);
          var hop = .045 * Math.sin(Math.PI * lin(0, .55, v)) * (1 - v);
          paper.position.set(LAND.x, LAND.y + hop, LAND.z - .06 * easeOut(v));
          paper.quaternion.copy(rollQuatAt(.4 + 10.32 + 1.6 * easeOut(v), .04));
        }
        return;
      }
      // no chão, depois nas mãos
      var restQ = rollQuatAt(.4 + 10.32 + 1.6, .04);
      var restP = V3(LAND.x, LAND.y, LAND.z - .06);
      // jornal levantado na frente do peito, com a frente virada para os olhos
      var holdP = V3(0, VY + 1.05, -.05), holdQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.25, 0, 0));
      var lift = easeInOut(lin(6.25, 7.0, t));
      var arc = Math.sin(Math.PI * lift) * .08;
      var Pp = restP.clone().lerp(holdP, lift); Pp.y += arc;
      var Qp = restQ.clone().slerp(holdQ, lift);
      // jornal sobe e cobre a tela (o centro da folha vai para o eixo da câmera)
      var fill = easeInOut(lin(7.6, 8.5, t));
      if (fill > 0) {
        camera.getWorldPosition(camWorld); camera.getWorldQuaternion(camQuat);
        camFwd.set(0, 0, -1).applyQuaternion(camQuat);
        var vh = 2 * Math.tan(camera.fov * Math.PI / 360);
        var d = Math.min(PAGE_H / vh, PAGE_W / (vh * camera.aspect)) * .97;   // a folha cobre a tela
        var fq = camQuat.clone();
        var half = d * vh / 2;                                                      // meia altura visível nessa distância
        var center = V3(0, -Math.max(PAGE_H * .11, half + .004), R_OUT);             // centro no cabeçalho, sem mostrar além da borda de cima
        var fp = camWorld.clone().addScaledVector(camFwd, d).sub(center.clone().applyQuaternion(fq));
        Pp.lerp(fp, fill); Qp.slerp(fq, fill);
      }
      paper.position.copy(Pp); paper.quaternion.copy(Qp);
      // elástico estoura e voa
      if (t >= 6.92 && t < 7.12) {
        band.visible = true;
        var bu = lin(6.92, 7.12, t);
        band.scale.setScalar(Math.max(.01, 1 - bu));
        band.position.set(PAGE_W * .6 * bu, .06 * bu, .08 * bu);
        if (bu >= 1) band.visible = false;
      }
    }

    function updateHands(t) {
      if (!hands) return;
      var on = t >= 5.5;
      hands.right.group.visible = hands.left.group.visible = on;
      if (!on) return;
      paper.updateMatrixWorld(true);
      camera.getWorldPosition(camWorld); camera.getWorldQuaternion(camQuat);
      var pq = paper.getWorldQuaternion(new THREE.Quaternion());
      var unrolled = lin(6.95, 7.6, t);
      ["right", "left"].forEach(function (side) {
        var h = hands[side], s = side === "right" ? 1 : -1;
        var pose, q, pos;
        // 1) fora da tela → acima das pontas do rolo
        var end = V3(s * (PAGE_W / 2 - .025), .006, 0).applyMatrix4(paper.matrixWorld);
        var qPick = basis(V3(0, -.55, -1), V3(-s * .55, -.85, -.1));
        var hover = end.clone().add(V3(s * .03, .1, .02));
        var start = camWorld.clone().add(V3(s * .3, -.85, .05));
        var qStart = basis(V3(0, .4, -1), V3(-s * .3, -.2, -1));
        // 2) segurando o rolo pelas pontas (palmas uma para a outra)
        var px = V3(1, 0, 0).applyQuaternion(pq), py = V3(0, 1, 0).applyQuaternion(pq), pz = V3(0, 0, 1).applyQuaternion(pq);
        var qRoll = basis(pz.clone().multiplyScalar(-1).add(py.clone().multiplyScalar(.4)), px.clone().multiplyScalar(-s));
        // 3) segurando a folha aberta pelos cantos de cima (como no jornal)
        var corner = V3(s * (PAGE_W / 2 - .03), -.025, R_OUT + .001).applyMatrix4(paper.matrixWorld);
        var qSheet = Reader._orient(pz.clone(), px.clone().multiplyScalar(-s), .95, .35, s < 0);

        if (t < 6.05) {
          var k = easeOut(lin(5.5, 6.05, t));
          pose = poseLerp(POSES.rest, POSES.open, k);
          q = qStart.clone().slerp(qPick, k);
          pos = h.solve(q, pose, "pinch", start.clone().lerp(hover, k));
        } else if (t < 6.27) {
          var k2 = easeInOut(lin(6.05, 6.27, t));
          pose = poseLerp(POSES.open, POSES.pinch, k2);
          q = qPick;
          pos = h.solve(q, pose, "pinch", hover.clone().lerp(end, k2));
        } else if (t < 6.95) {
          var k3 = easeInOut(lin(6.27, 6.8, t));
          pose = POSES.pinch;
          q = qPick.clone().slerp(qRoll, k3);
          pos = h.solve(q, pose, "pinch", end);
        } else {
          var k4 = easeInOut(lin(6.95, 7.45, t));
          pose = poseLerp(POSES.pinch, poseLerp(POSES.rest, POSES.pinch, .35), k4);
          q = qRoll.clone().slerp(qSheet, k4);
          var a1 = h.solve(q, pose, "pinch", end), a2 = h.solve(q, pose, "index", corner);
          pos = a1.lerp(a2, k4);
        }
        h.apply({ pos: pos, quat: q, pose: pose });
        // um tremor mínimo de mão viva
        h.group.position.y += .0015 * Math.sin(t * 5.1 + s);
      });
    }

    function updateDog(t, dt) {
      dog.updateMatrixWorld(true);
      var target;
      if (t < 1.9) target = tram.position.clone().add(V3(0, 1.6, 0));
      else if (t < T_REL) target = V3(bikeX(t), 1.2, BIKE_Z);
      else if (t < T_LAND + .3) target = paper.position.clone();
      else target = camWorld.clone().add(V3(0, -.4, 0));
      var local = dog.worldToLocal(target.clone()).sub(dogParts.head.position);
      var yaw = clamp(Math.atan2(-local.z, local.x), -1.1, 1.1);
      var pitch = clamp(Math.atan2(local.y, Math.hypot(local.x, local.z)), -.3, .5);
      var f = 1 - Math.exp(-dt * 6);
      dogLook.yaw += (yaw - dogLook.yaw) * f; dogLook.pitch += (pitch - dogLook.pitch) * f;
      dogParts.head.rotation.set(0, dogLook.yaw, dogLook.pitch * .8 - .05);
      // orelhas em pé quando a bicicleta chega perto
      var alert = smooth(2.2, 2.7, t) * (1 - smooth(5.6, 6.4, t) * .6);
      dogParts.ears.forEach(function (e, i) { e.rotation.x = (i ? 1 : -1) * lerp(2.15, 1.55, alert); e.rotation.z = -.35 * alert; });
      // respiração e rabo
      dogParts.body.scale.y = 1 + .025 * Math.sin(t * (t > 5 ? 9 : 3.4));
      var wag = t > 3.55 ? 1 : .25;
      dogParts.tail.forEach(function (seg, i) {
        seg.rotation.z = (i ? .25 : .7);
        seg.rotation.y = Math.sin(t * (t > 3.55 ? 15 : 3) - i * .7) * (.35 + i * .12) * wag;
      });
      dogParts.tongue.visible = t > 5.3;
    }

    function updateCamera(t) {
      // balanço da cadeira
      rig.rotation.x = .013 * Math.sin(t * Math.PI * 2 / 3.4) * (1 - .6 * smooth(5, 6, t));
      rig.rotation.z = .006 * Math.sin(t * Math.PI * 2 / 3.4 + 1.2);
      var a = W / H;
      var follow = Math.max(.14, clamp((1.25 - a) / .8, 0, 1));
      var bx = bikeX(t);
      var yawBike = -Math.atan2(bx, 5.9) * .55 * follow * smooth(1.4, 2.2, t) * (1 - smooth(4.6, 5.4, t));
      var yawPaper = 0;
      if (t > T_REL && t < 5.6) yawPaper = -Math.atan2(paper.position.x, Math.max(.4, -paper.position.z + .7)) * .3 * follow;
      camera.rotation.y = yawBike + yawPaper * smooth(T_REL, 4.2, t) * (1 - smooth(5, 5.6, t));
      var pitch = .015 - (a < 1 ? (1 - a) * .24 : 0);
      pitch = lerp(pitch, -.9, easeInOut(lin(5.0, 6.0, t)));
      pitch = lerp(pitch, -.45, easeInOut(lin(6.25, 7.15, t)));
      pitch = lerp(pitch, -.42, easeInOut(lin(7.6, 8.5, t)));
      camera.rotation.x = pitch;
      camera.position.set(CAM0.x, CAM0.y - .06 * smooth(5, 6, t), CAM0.z - .12 * smooth(5, 6, t) * (1 - smooth(6.3, 7.2, t) * .5));
      rig.updateMatrixWorld(true);
      camera.getWorldPosition(camWorld);
    }

    function updateWorld(t) {
      clouds.position.x = t * .9;
      tram.position.x = lerp(3.5, -21, lin(0, 3.1, t));
      tram.visible = t < 3.2;
      // tom de jornal: nasce no papel e se espalha pela tela
      var sep = smooth(6.95, 7.25, t);
      U.uSep.value = sep;
      U.uRad.value = lerp(0, 2.2, easeInOut(lin(7.0, 8.4, t)));
      paper.updateMatrixWorld(true);
      var c = V3(0, -PAGE_H * .5 * lin(6.95, 7.6, t), R_OUT).applyMatrix4(paper.matrixWorld).project(camera);
      var bw = renderer.domElement.width, bh = renderer.domElement.height;
      U.uRes.value.set(bw, bh);
      U.uCen.value.set((c.x * .5 + .5) * bw, (c.y * .5 + .5) * bh);
    }

    /* ---------- laço ---------- */
    var raf = 0, t0 = 0, disposed = false, running = false, tPrev = 0;
    var lastNow = 0, ema = 16, nextAdapt = 0;
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!t0) { t0 = now; nextAdapt = now + 900; }
      // resolução dinâmica: se os quadros passarem de ~26 ms, desenha menos pixels
      if (lastNow) ema += (Math.min(100, now - lastNow) - ema) * .1;
      lastNow = now;
      if (now > nextAdapt) {
        nextAdapt = now + 700;
        if (ema > 26 && pr > .6) { pr = Math.max(.6, pr * .8); renderer.setPixelRatio(pr); }
        else if (ema > 26 && sun.shadow.mapSize.x > 1024) {
          sun.shadow.mapSize.set(1024, 1024);
          if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
        }
      }
      var ts = window.__csTimeScale || 1;
      var t = typeof window.__csSeek === "number" ? window.__csSeek : (now - t0) / 1000 * ts;
      render(t);
    }
    function render(t) {
      var dt = clamp(t - tPrev, 0, .1); tPrev = t;
      updateCamera(t);
      updateBike(t, dt);
      updatePaper(t, dt);
      updateHands(t);
      updateWorld(t);
      updateDog(t, dt);
      renderer.render(scene, camera);
    }
    function onResize() {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H);
      fitCamera();
    }
    window.addEventListener("resize", onResize);

    /* aquecimento: compila todos os shaders e sobe as texturas ANTES de começar, com tudo visível por um
       quadro (escondido atrás do preto inicial). Sem isso, o jornal (2,9 s) e as mãos (5,5 s) travam ao surgir. */
    function warmup() {
      var hidden = [];
      scene.traverse(function (o) { if (!o.visible) { hidden.push(o); o.visible = true; } });
      try {
        renderer.compile(scene, camera);
        disposables.forEach(function (d) { if (d && d.isTexture) renderer.initTexture(d); });
        renderer.render(scene, camera);
      } catch (e) {}
      hidden.forEach(function (o) { o.visible = false; });
    }
    function start() { if (running) return; running = true; t0 = 0; tPrev = 0; lastNow = 0; warmup(); render(0); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function dispose() {
      if (disposed) return;
      disposed = true; stop();
      window.removeEventListener("resize", onResize);
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
      });
      disposables.forEach(function (d) { try { d.dispose(); } catch (e) {} });
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    function info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }

    return { start: start, stop: stop, dispose: dispose, render: render, info: info, canvas: canvas };
  }


  window.GazetaCutscene3D = { supported: supported, create: create };
})();
