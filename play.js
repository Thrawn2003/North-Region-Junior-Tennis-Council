(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  var HAS_IO = "IntersectionObserver" in window;
  var spawn = window.NRTJC_spawnMini;

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // Calls enter() when el comes into view and leave() once it is fully out, so effects replay.
  function onView(el, enter, leave, thr) {
    if (!HAS_IO) { enter(); return; }
    var inside = false;
    new IntersectionObserver(function (en) {
      var r = en[0].intersectionRatio;
      if (!inside && r >= thr) { inside = true; enter(); }
      else if (inside && r === 0) { inside = false; if (leave) leave(); }
    }, { threshold: [0, thr] }).observe(el);
  }

  // full-viewport layer for effects that are not tied to a section
  var fx = make("div", "fx");
  fx.setAttribute("aria-hidden", "true");
  document.body.appendChild(fx);

  // ---------- headings: words rise into place, every time ----------
  if (!reduce) {
    document.querySelectorAll("h1, h2").forEach(function (h) {
      h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
              var w = make("span", "w"), inner = make("span", "wi", p);
              inner.style.setProperty("--i", i++);
              w.setAttribute("aria-hidden", "true");
              w.appendChild(inner);
              frag.appendChild(w);
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1) { walk(c); }
        });
      })(h);
      onView(h, function () { h.classList.add("words-in"); }, function () { h.classList.remove("words-in"); }, 0.5);
    });
  }

  // ---------- tennis scores tick up: Love, 15, 30, 40 ----------
  (function scoreTicks() {
    var SEQ = { "15": ["Love", "15"], "30": ["Love", "15", "30"], "40": ["Love", "15", "30", "40"] };
    document.querySelectorAll(".value .n, .card-tag").forEach(function (n) {
      var final = n.textContent.trim(), seq = SEQ[final], timers = [];
      if (!seq || reduce) return;
      function clear() { timers.forEach(clearTimeout); timers = []; }
      onView(n.closest(".value, .card") || n, function () {
        clear();
        seq.forEach(function (s, i) {
          timers.push(setTimeout(function () {
            n.textContent = s;
            n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick");
          }, 250 + i * 320));
        });
      }, function () { clear(); n.textContent = final; n.classList.remove("tick"); }, 0.5);
    });
  })();

  // ---------- scoreboard: NRTJC wins, 6-0 6-0 ----------
  document.querySelectorAll(".scoreboard").forEach(function (sb) {
    var rows = sb.querySelectorAll(".sb-row"), timers = [];
    function clear() {
      timers.forEach(clearTimeout); timers = [];
      sb.querySelectorAll(".sb-set").forEach(function (c) { c.textContent = "0"; });
      sb.classList.remove("won");
    }
    function bump(c) { c.classList.remove("tick"); void c.offsetWidth; c.classList.add("tick"); }
    onView(sb, function () {
      clear();
      if (reduce) { sb.querySelectorAll(".sb-set").forEach(function (c) { c.textContent = c.getAttribute("data-to"); }); sb.classList.add("won"); return; }
      var end = 0;
      rows.forEach(function (row) {
        Array.prototype.forEach.call(row.querySelectorAll(".sb-set"), function (c, idx) {
          var to = +c.getAttribute("data-to");
          for (var n = 1; n <= to; n++) {
            (function (n) {
              var t = 600 + idx * 1000 + n * 170;
              end = Math.max(end, t);
              timers.push(setTimeout(function () { c.textContent = n; bump(c); }, t));
            })(n);
          }
        });
      });
      timers.push(setTimeout(function () { sb.classList.add("won"); }, end + 350));
    }, clear, 0.5);
  });

  // ---------- footer: a ball dribbles along the top edge ----------
  var footer = document.querySelector(".footer");
  if (footer) onView(footer, function () { footer.classList.add("go"); }, function () { footer.classList.remove("go"); }, 0.35);

  if (reduce || !spawn) return;

  // ---------- hero & page headers: cursor trail and a little parallax ----------
  if (canHover) {
    document.querySelectorAll(".hero, .page-hero").forEach(function (h) {
      var lastT = 0, live = 0;
      h.addEventListener("pointermove", function (e) {
        var r = h.getBoundingClientRect();
        h.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        h.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
        var now = performance.now();
        if (now - lastT < 48 || live > 22 || !h.animate) return;
        lastT = now; live++;
        var d = make("span", "dot");
        d.style.left = (e.clientX - r.left) + "px"; d.style.top = (e.clientY - r.top) + "px";
        h.appendChild(d);
        var a = d.animate([
          { transform: "translate(-50%,-50%) scale(1)", opacity: 0.75 },
          { transform: "translate(-50%,calc(-50% + 16px)) scale(.1)", opacity: 0 }
        ], { duration: 800, easing: "ease-out" });
        a.onfinish = function () { d.remove(); live--; };
      });
    });
  }

  // ---------- call-to-action buttons toss up a few balls when approached ----------
  document.querySelectorAll(".hero-cta .btn, .cta .btn, .split .btn, .card .btn").forEach(function (b) {
    var last = 0;
    b.addEventListener("pointerenter", function () {
      var now = Date.now();
      if (now - last < 1600) return;
      last = now;
      var r = b.getBoundingClientRect();
      for (var i = 0; i < 4; i++) spawn(fx, r.left + r.width * (0.2 + 0.2 * i), r.top, 0, i * 80);
    });
  });

  // ---------- hidden: type "ace" or "rain" ----------
  function ace() {
    var wrap = make("div", "ace");
    wrap.appendChild(make("span", "ace-streak"));
    wrap.appendChild(make("span", "ace-ball"));
    var txt = make("div", "ace-text", "Ace.");
    fx.appendChild(wrap); fx.appendChild(txt);
    var run = wrap.animate([{ transform: "translateX(-280px)" }, { transform: "translateX(" + (window.innerWidth + 40) + "px)" }],
      { duration: 850, easing: "cubic-bezier(.5,0,.7,.6)" });
    run.onfinish = function () { wrap.remove(); };
    var t = txt.animate([
      { opacity: 0, transform: "translate(-50%,-30%) scale(.9)" },
      { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.25 },
      { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.75 },
      { opacity: 0, transform: "translate(-50%,-70%) scale(1.05)" }
    ], { duration: 1700, delay: 300, fill: "both" });
    t.onfinish = function () { txt.remove(); };
  }
  function rain() {
    var ground = window.innerHeight - 36;
    for (var k = 0; k < 28; k++) spawn(fx, 20 + Math.random() * (window.innerWidth - 40), ground, ground - 10, k * 70);
  }
  var buf = "";
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest && e.target.closest("input, textarea")) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf.slice(-3) === "ace") { buf = ""; ace(); }
    else if (buf === "rain") { buf = ""; rain(); }
  });
})();
