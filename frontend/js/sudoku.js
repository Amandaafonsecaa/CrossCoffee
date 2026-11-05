/* Sudoku jogável — JS puro, sem dependências */
(function () {
  "use strict";

  var gridEl = document.getElementById("sudoku");
  if (!gridEl) return;

  var msgEl = document.getElementById("sd-msg");
  var padEl = document.getElementById("sd-pad");
  var stampEl = document.getElementById("sd-stamp");
  var notesBtn = document.getElementById("sd-notes");
  var section = gridEl.closest(".page");

  /* Puzzle nº 1 (0 = vazio). Para trocar, edite estas duas linhas. */
  var ID = "sd-001";
  var PUZZLE   = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
  var SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

  var STORE = "gazeta:" + ID;
  var given = [], vals = [], notes = [], hinted = [];
  var sel = -1, notesMode = false, solved = false;
  var cells = [];

  function reset() {
    given = []; vals = []; notes = []; hinted = [];
    for (var i = 0; i < 81; i++) {
      var d = +PUZZLE[i];
      given[i] = d !== 0; vals[i] = d; notes[i] = 0; hinted[i] = false;
    }
    solved = false;
  }

  function row(i) { return Math.floor(i / 9); }
  function col(i) { return i % 9; }
  function box(i) { return Math.floor(row(i) / 3) * 3 + Math.floor(col(i) / 3); }
  function peers(a, b) { return a !== b && (row(a) === row(b) || col(a) === col(b) || box(a) === box(b)); }

  /* ---------- montagem ---------- */
  function build() {
    gridEl.innerHTML = "";
    cells = [];
    for (var i = 0; i < 81; i++) {
      var el = document.createElement("div");
      el.className = "sd-cell";
      el.setAttribute("role", "gridcell");
      el.dataset.i = i;
      gridEl.appendChild(el);
      cells.push(el);
    }
    padEl.innerHTML = "";
    for (var n = 1; n <= 9; n++) {
      var b = document.createElement("button");
      b.type = "button"; b.dataset.n = n; b.textContent = n;
      b.setAttribute("aria-label", "Número " + n);
      padEl.appendChild(b);
    }
    var er = document.createElement("button");
    er.type = "button"; er.dataset.n = "0"; er.textContent = "⌫"; er.setAttribute("aria-label", "Apagar");
    padEl.appendChild(er);
  }

  /* ---------- pintura ---------- */
  function paint() {
    var selVal = sel >= 0 ? vals[sel] : 0;
    var counts = {};
    for (var i = 0; i < 81; i++) { if (vals[i]) counts[vals[i]] = (counts[vals[i]] || 0) + 1; }

    for (i = 0; i < 81; i++) {
      var el = cells[i];
      el.classList.toggle("given", given[i]);
      el.classList.toggle("mine", !given[i] && vals[i] !== 0);
      el.classList.toggle("hinted", !!hinted[i]);
      el.classList.toggle("active", i === sel);
      el.classList.toggle("peer", sel >= 0 && i !== sel && peers(sel, i));
      el.classList.toggle("same", selVal !== 0 && i !== sel && vals[i] === selVal);
      if (vals[i]) {
        el.textContent = vals[i];
      } else if (notes[i]) {
        var h = '<span class="sd-notes">';
        for (var n = 1; n <= 9; n++) h += "<i>" + ((notes[i] >> n) & 1 ? n : "") + "</i>";
        el.innerHTML = h + "</span>";
      } else {
        el.textContent = "";
      }
    }
    Array.prototype.forEach.call(padEl.children, function (b) {
      var n = +b.dataset.n;
      b.classList.toggle("done", n > 0 && counts[n] === 9);
    });
    notesBtn.textContent = "Lápis: " + (notesMode ? "on" : "off");
    notesBtn.setAttribute("aria-pressed", String(notesMode));
  }

  function say(html) { msgEl.innerHTML = "<span>" + html + "</span>"; }

  /* ---------- jogadas ---------- */
  function setValue(n) {
    if (sel < 0 || given[sel] || solved) return;
    if (n === 0) { vals[sel] = 0; notes[sel] = 0; hinted[sel] = false; paint(); save(); return; }
    if (notesMode && vals[sel] === 0) {
      notes[sel] ^= (1 << n);
    } else {
      vals[sel] = n; notes[sel] = 0; hinted[sel] = false;
      for (var i = 0; i < 81; i++) { if (peers(sel, i)) notes[i] &= ~(1 << n); }   // limpa anotações vizinhas
    }
    paint(); save(); checkSolved();
  }

  function checkSolved() {
    for (var i = 0; i < 81; i++) if (vals[i] !== +SOLUTION[i]) return false;
    if (!solved) {
      solved = true;
      stampEl.classList.remove("show"); void stampEl.offsetWidth; stampEl.classList.add("show");
      say("<b>Parabéns!</b> Sudoku resolvido.");
      save();
    }
    return true;
  }

  function verify() {
    var wrong = 0, empty = 0;
    for (var i = 0; i < 81; i++) {
      if (given[i]) continue;
      if (!vals[i]) { empty++; continue; }
      if (vals[i] !== +SOLUTION[i]) { wrong++; cells[i].classList.add("wrong"); }
    }
    setTimeout(function () {
      Array.prototype.forEach.call(gridEl.querySelectorAll(".wrong"), function (e) { e.classList.remove("wrong"); });
    }, 1800);
    if (wrong) say("<b>" + wrong + " número" + (wrong > 1 ? "s" : "") + " errado" + (wrong > 1 ? "s" : "") + ".</b> Marcado" + (wrong > 1 ? "s" : "") + " em vermelho.");
    else if (empty) say("<b>Até aqui, tudo certo.</b> Ainda faltam " + empty + " casas.");
    else checkSolved();
  }

  function hint() {
    if (sel < 0 || given[sel] || solved) { say("Escolha uma casa vazia para pedir a dica."); return; }
    vals[sel] = +SOLUTION[sel]; notes[sel] = 0; hinted[sel] = true;
    paint(); save(); checkSolved();
  }

  function clearAll() {
    reset();
    stampEl.classList.remove("show");
    say("Toque numa casa e escolha um número");
    paint(); save();
  }

  /* ---------- salvar ---------- */
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ vals: vals, notes: notes, hinted: hinted, solved: solved })); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.vals && s.vals.length === 81) {
        for (var i = 0; i < 81; i++) if (!given[i]) { vals[i] = s.vals[i] | 0; notes[i] = s.notes[i] | 0; hinted[i] = !!s.hinted[i]; }
        solved = !!s.solved;
      }
    } catch (e) {}
  }

  /* ---------- eventos ---------- */
  gridEl.addEventListener("click", function (e) {
    var el = e.target.closest(".sd-cell");
    if (!el) return;
    sel = +el.dataset.i;
    paint();
  });
  padEl.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) setValue(+b.dataset.n);
  });
  notesBtn.addEventListener("click", function () { notesMode = !notesMode; paint(); });
  document.getElementById("sd-check").addEventListener("click", verify);
  document.getElementById("sd-hint").addEventListener("click", hint);
  document.getElementById("sd-clear").addEventListener("click", clearAll);

  document.addEventListener("keydown", function (e) {
    if (!section.classList.contains("is-current") || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, handled = true;
    if (k >= "1" && k <= "9") setValue(+k);
    else if (k === "0" || k === "Backspace" || k === "Delete") setValue(0);
    else if (k === "n" || k === "N") { notesMode = !notesMode; paint(); }
    else if (sel >= 0 && (k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown")) {
      var r = row(sel), c = col(sel);
      if (k === "ArrowRight") c = Math.min(8, c + 1);
      if (k === "ArrowLeft") c = Math.max(0, c - 1);
      if (k === "ArrowDown") r = Math.min(8, r + 1);
      if (k === "ArrowUp") r = Math.max(0, r - 1);
      sel = r * 9 + c; paint();
    } else handled = false;
    if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
  });

  /* ---------- início ---------- */
  reset();
  build();
  load();
  paint();
  if (solved) { stampEl.classList.add("show"); say("<b>Parabéns!</b> Sudoku resolvido."); }
})();
