(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  var root = document.documentElement;
  var fx = document.querySelector(".fx");

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- page transitions: a ball-yellow circle wipes between pages ----------
  (function wipes() {
    function clean() {
      root.classList.remove("wiping");
      document.querySelectorAll(".wipe").forEach(function (w) { w.remove(); });
    }
    window.addEventListener("pageshow", function (e) { if (e.persisted) clean(); });

    if (root.classList.contains("wiping")) {
      try { sessionStorage.removeItem("nrtjc-wipe"); } catch (e) {}
      if (reduce || !document.body.animate) { clean(); }
      else {
        var cover = make("div", "wipe");
        cover.style.clipPath = "circle(150% at 50% 45%)";
        document.body.appendChild(cover);
        root.classList.remove("wiping");
        var a = cover.animate([{ clipPath: "circle(150% at 50% 45%)" }, { clipPath: "circle(0% at 50% 45%)" }],
          { duration: 750, delay: 60, easing: "cubic-bezier(.7,0,.2,1)", fill: "both" });
        a.onfinish = function () { cover.remove(); };
      }
    }

    if (reduce) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin || u.pathname === location.pathname || !/(\.html|\/)$/.test(u.pathname)) return;
      if (!document.body.animate) return;
      e.preventDefault();
      try { sessionStorage.setItem("nrtjc-wipe", "1"); } catch (err) {}
      var x = e.clientX || window.innerWidth / 2, y = e.clientY || window.innerHeight / 2;
      var cover = make("div", "wipe");
      cover.style.clipPath = "circle(0 at " + x + "px " + y + "px)";
      document.body.appendChild(cover);
      var go = function () { location.href = a.href; };
      var anim = cover.animate([
        { clipPath: "circle(0px at " + x + "px " + y + "px)" },
        { clipPath: "circle(150vmax at " + x + "px " + y + "px)" }
      ], { duration: 520, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" });
      anim.onfinish = go;
      setTimeout(go, 900);
    });
  })();

  // ---------- word ticker whose speed (and direction) follow your scrolling ----------
  (function tickers() {
    var items = [];
    document.querySelectorAll(".marquee").forEach(function (m) {
      var words = (m.getAttribute("data-words") || "").split(",").filter(Boolean);
      var track = m.querySelector(".mq-track");
      if (!words.length || !track) return;
      var half = document.createDocumentFragment();
      for (var rep = 0; rep < 3; rep++) {
        words.forEach(function (w) {
          half.appendChild(make("span", "mq-w", w.trim()));
          half.appendChild(make("span", "mq-ball"));
        });
      }
      track.appendChild(half.cloneNode(true));
      track.appendChild(half);
      if (reduce || !track.animate) return;
      var width = track.scrollWidth / 2;
      var anim = track.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }],
        { duration: Math.max(width / 48, 8) * 1000, iterations: Infinity });
      items.push(anim);
    });
    if (!items.length) return;
    var lastY = window.scrollY, boost = 0, dir = 1;
    (function loop() {
      var y = window.scrollY, dy = y - lastY; lastY = y;
      if (dy) dir = dy > 0 ? 1 : -1;
      boost = Math.max(boost * 0.93, Math.min(Math.abs(dy) * 0.5, 12));
      var rate = dir * (1 + boost);
      items.forEach(function (a) { a.updatePlaybackRate(rate); });
      requestAnimationFrame(loop);
    })();
  })();

  // ---------- floating balls drift at different speeds as you scroll ----------
  (function floaters() {
    if (reduce) return;
    var list = [];
    document.querySelectorAll(".scoreboard, .cta, .section.dark").forEach(function (sec) {
      [[8, 22, 44, 0.16], [86, 62, 70, 0.1], [62, 10, 28, 0.2]].forEach(function (c, i) {
        var b = make("span", "float-ball");
        b.style.left = c[0] + "%"; b.style.top = c[1] + "%";
        b.style.width = b.style.height = c[2] + "px"; b.style.opacity = c[3];
        sec.appendChild(b);
        list.push({ sec: sec, el: b, speed: 0.12 + i * 0.1 });
      });
    });
    function update() {
      var vh = window.innerHeight;
      list.forEach(function (o) {
        var r = o.sec.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        o.el.style.transform = "translateY(" + ((r.top + r.height / 2 - vh / 2) * -o.speed) + "px)";
      });
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  })();

  // ---------- a visible spot for secret codes (footer) ----------
  (function codeBox() {
    var host = document.querySelector(".footer-in > div:last-child");
    if (!host) return;
    var form = make("form", "codebox");
    form.setAttribute("autocomplete", "off");
    var input = make("input");
    input.type = "text"; input.name = "code"; input.maxLength = 12;
    input.placeholder = "Got a code?";
    input.setAttribute("aria-label", "Secret code");
    input.setAttribute("autocapitalize", "off"); input.spellcheck = false;
    var go = make("button", "", "Play");
    go.type = "submit";
    var msg = make("small", "codemsg", "Try: ace, rain or serve");
    msg.setAttribute("aria-live", "polite");
    form.appendChild(input); form.appendChild(go);
    host.appendChild(form); host.appendChild(msg);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = input.value.trim().toLowerCase();
      input.value = "";
      if (!code) return;
      var codes = window.NRTJC_codes || {};
      if (reduce) { msg.textContent = "Motion is switched off on your device, so the codes are resting."; return; }
      if (codes[code]) {
        msg.textContent = "Nice. Enjoy.";
        codes[code]();
      } else {
        msg.textContent = "Out! Not a code. Try ace, rain or serve.";
      }
    });
  })();

  if (reduce) { // keep the quiet, non-moving parts only
    wireSignoff();
    return;
  }

  // ---------- ball-shaped halo that trails the cursor ----------
  if (canHover) {
    var halo = make("div", "halo");
    halo.setAttribute("aria-hidden", "true");
    document.body.appendChild(halo);
    var hx = -100, hy = -100, tx = -100, ty = -100, big = false, shown = false;
    document.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; hx = tx; hy = ty; halo.classList.add("show"); }
      big = !!(e.target.closest && e.target.closest("a, button, [role=button], input, .member"));
      halo.classList.toggle("big", big);
    });
    root.addEventListener("pointerleave", function () { halo.classList.remove("show"); shown = false; });
    (function follow() {
      hx += (tx - hx) * 0.18; hy += (ty - hy) * 0.18;
      halo.style.transform = "translate(" + (hx - 17) + "px," + (hy - 17) + "px)";
      requestAnimationFrame(follow);
    })();

    // buttons lean toward the cursor
    document.querySelectorAll(".btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", clamp((e.clientX - (r.left + r.width / 2)) * 0.18, -7, 7) + "px");
        b.style.setProperty("--my", clamp((e.clientY - (r.top + r.height / 2)) * 0.3, -5, 5) + "px");
      });
      b.addEventListener("pointerleave", function () { b.style.removeProperty("--mx"); b.style.removeProperty("--my"); });
    });
  }

  // ---------- a puff of chalk wherever you click ----------
  document.addEventListener("pointerdown", function (e) {
    if (!fx || !fx.animate || e.target.closest(".sg-ball")) return;
    var p = make("span", "chalk");
    p.style.left = e.clientX + "px"; p.style.top = e.clientY + "px";
    fx.appendChild(p);
    var a = p.animate([
      { transform: "translate(-50%,-50%) scale(.3)", opacity: 0.8 },
      { transform: "translate(-50%,-50%) scale(2.6)", opacity: 0 }
    ], { duration: 520, easing: "ease-out" });
    a.onfinish = function () { p.remove(); };
  }, { passive: true });

  // ---------- "Serve": a twenty-second game. Click the balls as they fly by. ----------
  var playing = false;
  function serveGame() {
    if (playing || !fx) return;
    playing = true;
    var score = 0, left = 20, alive = true, spawner, clock;
    var hud = make("div", "sg-hud");
    fx.appendChild(hud);
    function draw() { hud.textContent = "Serve  ·  " + score + "  ·  " + left + "s"; }
    draw();

    function launch() {
      if (!alive) return;
      var W = window.innerWidth, H = window.innerHeight;
      var fromLeft = Math.random() < 0.5;
      var x0 = fromLeft ? -60 : W + 16, x1 = fromLeft ? W + 16 : -60;
      var arc = -(60 + Math.random() * 140);
      var b = make("button", "sg-ball");
      b.type = "button"; b.tabIndex = -1; b.setAttribute("aria-label", "Ball");
      b.style.top = (H * (0.22 + Math.random() * 0.5)) + "px";
      fx.appendChild(b);
      var a = b.animate([
        { transform: "translate(" + x0 + "px,0)", easing: "ease-out" },
        { transform: "translate(" + ((x0 + x1) / 2) + "px," + arc + "px)", offset: 0.5, easing: "ease-in" },
        { transform: "translate(" + x1 + "px,0)" }
      ], { duration: 1400 + Math.random() * 1000, easing: "linear" });
      a.onfinish = function () { b.remove(); };
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (b._hit) return;
        b._hit = true;
        var r = b.getBoundingClientRect();
        a.cancel();
        b.style.left = r.left + "px"; b.style.top = r.top + "px";
        score++; draw();
        var pop = b.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(2)", opacity: 0 }], { duration: 220, easing: "ease-out" });
        pop.onfinish = function () { b.remove(); };
      });
      spawner = setTimeout(launch, 380 + Math.random() * 420);
    }
    function finish() {
      if (!alive) return;
      alive = false; clearInterval(clock); clearTimeout(spawner);
      hud.classList.add("done");
      hud.textContent = score ? "Game, set, match. " + score + " returned." : "Love-all. Fancy another go?";
      setTimeout(function () { hud.remove(); playing = false; }, 3600);
    }
    clock = setInterval(function () { left--; draw(); if (left <= 0) finish(); }, 1000);
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { finish(); document.removeEventListener("keydown", esc); }
    });
    launch();
  }

  function wireSignoff() {
    var s = document.querySelector(".signoff");
    if (!s || reduce) return;
    s.setAttribute("role", "button"); s.tabIndex = 0; s.title = "Fancy a rally?";
    s.classList.add("playable");
    s.addEventListener("click", serveGame);
    s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); serveGame(); } });
  }
  wireSignoff();
  window.NRTJC_codes = window.NRTJC_codes || {};
  window.NRTJC_codes.serve = serveGame;

  var buf = "";
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest && e.target.closest("input, textarea")) return;
    buf = (buf + e.key.toLowerCase()).slice(-5);
    if (buf === "serve") { buf = ""; serveGame(); }
  });
})();
