/* Palavra cruzada jogável — JS puro, sem dependências */
(function () {
  "use strict";

  var DATA = window.GAZETA_CROSSWORD;
  var gridEl = document.getElementById("cw-grid");
  var inputEl = document.getElementById("cw-input");
  var barEl = document.getElementById("cw-clue-bar");
  var stampEl = document.getElementById("cw-stamp");
  var acrossEl = document.getElementById("cw-across");
  var downEl = document.getElementById("cw-down");
  if (!DATA || !gridEl) return;

  var N = DATA.grid.length;
  var SOL = DATA.grid.map(function (r) { return r.split(""); });
  var STORE = "gazeta:" + DATA.id;

  var letters = SOL.map(function (r) { return r.map(function () { return ""; }); });
  var hinted = {};
  var sel = { r: 0, c: 0, dir: "across" };
  var cells = [];
  var numbers = {};          // "r,c" -> n
  var words = { across: [], down: [] };  // {n, cells:[[r,c]...], clue}
  var solved = false;

  function isBlack(r, c) { return r < 0 || c < 0 || r >= N || c >= N || SOL[r][c] === "#"; }
  function key(r, c) { return r + "," + c; }

  /* ---------- numeração e palavras ---------- */
  (function build() {
    var n = 0;
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (isBlack(r, c)) continue;
        var startA = isBlack(r, c - 1) && !isBlack(r, c + 1);
        var startD = isBlack(r - 1, c) && !isBlack(r + 1, c);
        if (!startA && !startD) continue;
        n++;
        numbers[key(r, c)] = n;
        if (startA) {
          var a = [];
          for (var cc = c; !isBlack(r, cc); cc++) a.push([r, cc]);
          words.across.push({ n: n, cells: a, clue: DATA.clues.across[n] || "" });
        }
        if (startD) {
          var d = [];
          for (var rr = r; !isBlack(rr, c); rr++) d.push([rr, c]);
          words.down.push({ n: n, cells: d, clue: DATA.clues.down[n] || "" });
        }
      }
    }
  })();

  function wordAt(r, c, dir) {
    var list = words[dir];
    for (var i = 0; i < list.length; i++) {
      for (var j = 0; j < list[i].cells.length; j++) {
        if (list[i].cells[j][0] === r && list[i].cells[j][1] === c) return list[i];
      }
    }
    return null;
  }

  /* ---------- montagem do DOM ---------- */
  function render() {
    gridEl.innerHTML = "";
    cells = [];
    for (var r = 0; r < N; r++) {
      cells[r] = [];
      for (var c = 0; c < N; c++) {
        var el = document.createElement("div");
        el.setAttribute("role", "gridcell");
        el.dataset.r = r; el.dataset.c = c;
        if (isBlack(r, c)) {
          el.className = "cw-cell black";
          el.setAttribute("aria-hidden", "true");
        } else {
          el.className = "cw-cell";
          var num = numbers[key(r, c)];
          if (num) { var s = document.createElement("span"); s.className = "cw-num"; s.textContent = num; el.appendChild(s); }
          var ch = document.createElement("span"); ch.className = "cw-ch"; el.appendChild(ch);
        }
        gridEl.appendChild(el);
        cells[r][c] = el;
      }
    }
    function clueList(dir, ol) {
      ol.innerHTML = "";
      words[dir].forEach(function (w) {
        var li = document.createElement("li");
        li.dataset.dir = dir; li.dataset.n = w.n;
        li.innerHTML = "<b>" + w.n + ".</b>" + escapeHtml(w.clue) + " <small>(" + w.cells.length + ")</small>";
        ol.appendChild(li);
      });
    }
    clueList("across", acrossEl);
    clueList("down", downEl);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; });
  }

  /* ---------- atualização visual ---------- */
  function paint() {
    var w = wordAt(sel.r, sel.c, sel.dir);
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (isBlack(r, c)) continue;
        var el = cells[r][c];
        el.classList.remove("active", "in-word");
        el.querySelector(".cw-ch").textContent = letters[r][c];
        el.classList.toggle("hinted", !!hinted[key(r, c)]);
      }
    }
    if (w) w.cells.forEach(function (p) { cells[p[0]][p[1]].classList.add("in-word"); });
    cells[sel.r][sel.c].classList.add("active");

    // lista de dicas
    [acrossEl, downEl].forEach(function (ol) {
      Array.prototype.forEach.call(ol.children, function (li) {
        var dir = li.dataset.dir, n = +li.dataset.n;
        var ww = words[dir].filter(function (x) { return x.n === n; })[0];
        li.classList.toggle("active", !!w && dir === sel.dir && w.n === n);
        li.classList.toggle("done", ww.cells.every(function (p) { return letters[p[0]][p[1]] === SOL[p[0]][p[1]]; }));
      });
    });

    // barra de dica
    if (w) {
      barEl.innerHTML = "<span><b>" + w.n + " " + (sel.dir === "across" ? "Horizontal" : "Vertical") + "</b>" + escapeHtml(w.clue) + " (" + w.cells.length + ")</span>";
    }
  }

  /* ---------- seleção e movimento ---------- */
  function select(r, c, dir) {
    if (isBlack(r, c)) return;
    if (dir) {
      sel.dir = dir;
    } else if (sel.r === r && sel.c === c) {
      var other = sel.dir === "across" ? "down" : "across";
      if (wordAt(r, c, other)) sel.dir = other;
    } else if (!wordAt(r, c, sel.dir)) {
      sel.dir = sel.dir === "across" ? "down" : "across";
    }
    sel.r = r; sel.c = c;
    paint();
  }

  function step(r, c, dr, dc) {
    r += dr; c += dc;
    while (r >= 0 && c >= 0 && r < N && c < N && isBlack(r, c)) { r += dr; c += dc; }
    return (r >= 0 && c >= 0 && r < N && c < N) ? [r, c] : null;
  }

  function nextInWord(dir) {
    var w = wordAt(sel.r, sel.c, dir || sel.dir);
    if (!w) return null;
    for (var i = 0; i < w.cells.length; i++) {
      if (w.cells[i][0] === sel.r && w.cells[i][1] === sel.c) return w.cells[i + 1] || null;
    }
    return null;
  }
  function prevInWord() {
    var w = wordAt(sel.r, sel.c, sel.dir);
    if (!w) return null;
    for (var i = 0; i < w.cells.length; i++) {
      if (w.cells[i][0] === sel.r && w.cells[i][1] === sel.c) return w.cells[i - 1] || null;
    }
    return null;
  }

  function jumpClue(delta) {
    var all = words.across.map(function (w) { return { dir: "across", w: w }; })
      .concat(words.down.map(function (w) { return { dir: "down", w: w }; }));
    var cur = wordAt(sel.r, sel.c, sel.dir);
    var idx = 0;
    all.forEach(function (x, i) { if (x.dir === sel.dir && cur && x.w.n === cur.n) idx = i; });
    var nx = all[(idx + delta + all.length) % all.length];
    select(nx.w.cells[0][0], nx.w.cells[0][1], nx.dir);
  }

  /* ---------- entrada de letras ---------- */
  function normLetter(ch) {
    var s = ch.normalize ? ch.normalize("NFD").replace(/[̀-ͯ]/g, "") : ch;
    s = s.toUpperCase();
    return /^[A-Z]$/.test(s) ? s : "";
  }

  function typeLetter(ch) {
    if (solved) return;
    var L = normLetter(ch);
    if (!L) return;
    letters[sel.r][sel.c] = L;
    delete hinted[key(sel.r, sel.c)];
    cells[sel.r][sel.c].classList.remove("wrong");
    var nx = nextInWord();
    if (nx) { sel.r = nx[0]; sel.c = nx[1]; }
    paint(); save(); checkSolved();
  }

  function backspace() {
    if (solved) return;
    if (letters[sel.r][sel.c]) {
      letters[sel.r][sel.c] = "";
      delete hinted[key(sel.r, sel.c)];
    } else {
      var pv = prevInWord();
      if (pv) { sel.r = pv[0]; sel.c = pv[1]; letters[sel.r][sel.c] = ""; delete hinted[key(sel.r, sel.c)]; }
    }
    paint(); save();
  }

  function move(dr, dc) {
    var to = step(sel.r, sel.c, dr, dc);
    if (!to) return;
    var dir = dr !== 0 ? "down" : "across";
    // se mudar de direção, apenas troca a direção antes de andar (como em jornais digitais)
    if (dir !== sel.dir && wordAt(sel.r, sel.c, dir)) { sel.dir = dir; paint(); return; }
    select(to[0], to[1], wordAt(to[0], to[1], sel.dir) ? sel.dir : dir);
  }

  /* ---------- verificação / vitória ---------- */
  function checkSolved() {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (!isBlack(r, c) && letters[r][c] !== SOL[r][c]) return false;
    }
    if (!solved) {
      solved = true;
      gridEl.classList.add("solved");
      stampEl.classList.remove("show"); void stampEl.offsetWidth; stampEl.classList.add("show");
      barEl.innerHTML = "<span><b>Parabéns!</b>Palavra cruzada resolvida.</span>";
      save();
      try { inputEl.blur(); } catch (e) {}
    }
    return true;
  }

  function verify() {
    var wrong = 0, empty = 0;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (isBlack(r, c)) continue;
      var el = cells[r][c];
      if (!letters[r][c]) { empty++; continue; }
      if (letters[r][c] !== SOL[r][c]) { wrong++; el.classList.add("wrong"); }
    }
    setTimeout(function () {
      Array.prototype.forEach.call(gridEl.querySelectorAll(".wrong"), function (e) { e.classList.remove("wrong"); });
    }, 1800);
    if (!wrong && empty) barEl.innerHTML = "<span><b>Até aqui, tudo certo.</b>Ainda faltam " + empty + " casas.</span>";
    else if (wrong) barEl.innerHTML = "<span><b>" + wrong + " letra" + (wrong > 1 ? "s" : "") + " errada" + (wrong > 1 ? "s" : "") + ".</b>Marcada" + (wrong > 1 ? "s" : "") + " em vermelho.</span>";
    else checkSolved();
  }

  function hint() {
    if (solved || isBlack(sel.r, sel.c)) return;
    letters[sel.r][sel.c] = SOL[sel.r][sel.c];
    hinted[key(sel.r, sel.c)] = true;
    var nx = nextInWord(); if (nx) { sel.r = nx[0]; sel.c = nx[1]; }
    paint(); save(); checkSolved();
  }

  function clearAll() {
    letters = SOL.map(function (r) { return r.map(function () { return ""; }); });
    hinted = {}; solved = false;
    gridEl.classList.remove("solved");
    stampEl.classList.remove("show");
    paint(); save();
  }

  /* ---------- salvar progresso ---------- */
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ letters: letters, hinted: hinted, solved: solved })); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.letters && s.letters.length === N) { letters = s.letters; hinted = s.hinted || {}; }
    } catch (e) {}
  }

  /* ---------- eventos ---------- */
  function focusInput() {
    try { inputEl.value = "_"; inputEl.focus({ preventScroll: true }); inputEl.setSelectionRange(1, 1); } catch (e) {}
  }

  gridEl.addEventListener("click", function (e) {
    var el = e.target.closest(".cw-cell");
    if (!el || el.classList.contains("black")) return;
    select(+el.dataset.r, +el.dataset.c);
    if (!solved) focusInput();
  });

  [acrossEl, downEl].forEach(function (ol) {
    ol.addEventListener("click", function (e) {
      var li = e.target.closest("li");
      if (!li) return;
      var w = words[li.dataset.dir].filter(function (x) { return x.n === +li.dataset.n; })[0];
      select(w.cells[0][0], w.cells[0][1], li.dataset.dir);
      if (!solved) focusInput();
    });
  });

  // Teclado físico
  inputEl.addEventListener("keydown", function (e) {
    var k = e.key, handled = true;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === "ArrowRight") move(0, 1);
    else if (k === "ArrowLeft") move(0, -1);
    else if (k === "ArrowDown") move(1, 0);
    else if (k === "ArrowUp") move(-1, 0);
    else if (k === "Backspace") backspace();
    else if (k === "Tab") jumpClue(e.shiftKey ? -1 : 1);
    else if (k === "Enter") jumpClue(1);
    else if (k === " ") select(sel.r, sel.c);   // espaço alterna a direção
    else if (k && k.length === 1 && normLetter(k)) typeLetter(k);
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  });

  // Teclado de celular (as teclas chegam como "input", não como keydown confiável)
  inputEl.addEventListener("input", function () {
    var v = inputEl.value;
    if (v === "") backspace();
    else v.replace(/_/g, "").split("").forEach(typeLetter);
    inputEl.value = "_";
    try { inputEl.setSelectionRange(1, 1); } catch (e) {}
  });

  document.getElementById("cw-check").addEventListener("click", verify);
  document.getElementById("cw-hint").addEventListener("click", hint);
  document.getElementById("cw-clear").addEventListener("click", clearAll);

  /* ---------- início ---------- */
  render();
  load();
  checkSolved();
  var first = words.across[0];
  sel.r = first.cells[0][0]; sel.c = first.cells[0][1]; sel.dir = "across";
  paint();
  if (solved) { gridEl.classList.add("solved"); stampEl.classList.add("show"); }

  window.GazetaCrossword = { blur: function () { try { inputEl.blur(); } catch (e) {} } };
})();
