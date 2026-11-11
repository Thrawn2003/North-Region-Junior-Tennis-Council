(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- scroll indicator: a ball rolling along a thin line ----------
  (function scrollBall() {
    var wrap = document.createElement("div");
    wrap.className = "progress";
    wrap.setAttribute("aria-hidden", "true");
    var bar = document.createElement("i");
    var ball = document.createElement("b");
    wrap.appendChild(bar);
    wrap.appendChild(ball);
    document.body.appendChild(wrap);

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max < 40) { wrap.style.display = "none"; return; }
      wrap.style.display = "";
      var p = clamp(window.scrollY / max, 0, 1);
      bar.style.width = (p * 100) + "%";
      ball.style.left = "calc(" + (p * 100) + "% - " + (p * 14) + "px)";
      if (!reduce) ball.style.transform = "rotate(" + (window.scrollY / 4) + "deg)";
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  // ---------- gentle 3D tilt on cards ----------
  (function tilt() {
    if (reduce || !canHover) return;
    document.querySelectorAll(".card, .value").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = "perspective(900px) rotateX(" + (-py * 3) + "deg) rotateY(" + (px * 4) + "deg) translateY(-6px)";
      });
      c.addEventListener("pointerleave", function () { c.style.transform = ""; });
    });
  })();

  // ---------- the ball that clears the net ----------
  document.querySelectorAll(".net").forEach(function (net) {
    if (reduce || !("IntersectionObserver" in window)) { net.classList.add("go"); return; }
    new IntersectionObserver(function (en) {
      var r = en[0].intersectionRatio;
      if (r >= 0.8) net.classList.add("go");
      else if (r === 0) net.classList.remove("go");
    }, { threshold: [0, 0.8] }).observe(net);
  });

  // ---------- home hero ball: bounces on its own, relaunching each time it settles ----------
  var hero = document.querySelector(".hero");
  if (hero) initBall(hero);

  function initBall(hero) {
    var ball = hero.querySelector(".ball");
    var shadow = hero.querySelector(".ball-shadow");
    if (reduce || !ball || !shadow) return;

    // move the ball out of the tilted court so it bounces in screen space
    hero.appendChild(shadow);
    hero.appendChild(ball);
    ball.classList.add("live");
    shadow.classList.add("live");

    var GRAVITY = 2300, REST = 0.8, WALL = 0.82;
    var R = ball.offsetWidth / 2 || 37;
    var W = 0, H = 0, floor = 0, ceil = 0;
    var x = 0, y = 0, vx = 0, vy = 0, rot = 0, squash = 0, restT = 0;
    var running = true, last = performance.now();

    function bounds() {
      R = ball.offsetWidth / 2 || R;
      W = hero.clientWidth;
      H = hero.clientHeight;
      floor = H - 110 - R;
      ceil = 84 + R;
      if (floor < ceil + 120) floor = ceil + 120;
    }
    function reset() {
      x = W - Math.max(70, W * 0.16) - R; y = ceil;
      vx = vy = 0; squash = 0; restT = 0;
    }
    bounds();
    reset();
    window.addEventListener("resize", function () { bounds(); x = clamp(x, R, W - R); y = clamp(y, ceil, floor); });

    // launch speed that fits the space available
    function pop() { return Math.min(1250, Math.sqrt(2 * GRAVITY * Math.max(floor - ceil, 1) * 0.8)); }

    // leaving the hero and coming back drops the ball in fresh and redraws the court
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      hero.classList.toggle("out", !vis);
      if (vis && !running) { reset(); last = performance.now(); running = true; requestAnimationFrame(frame); }
      running = vis;
    }).observe(hero);

    var lastRipple = 0;
    function ripple(cx, cy) {
      var now = performance.now();
      if (!hero.animate || now - lastRipple < 160) return;
      lastRipple = now;
      var r = document.createElement("span");
      r.className = "ripple";
      r.style.left = cx + "px"; r.style.top = cy + "px";
      hero.appendChild(r);
      var a = r.animate([{ transform: "scale(.2)", opacity: .7 }, { transform: "scale(1.7)", opacity: 0 }], { duration: 750, easing: "ease-out" });
      a.onfinish = function () { r.remove(); };
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 0.032);
      last = now;

      vy += GRAVITY * dt;
      x += vx * dt; y += vy * dt;
      if (x < R) { x = R; vx = Math.abs(vx) * WALL; }
      if (x > W - R) { x = W - R; vx = -Math.abs(vx) * WALL; }
      if (y < ceil) { y = ceil; vy = Math.abs(vy) * 0.5; }
      if (y > floor) {
        var impact = vy;
        y = floor; vy = -vy * REST; vx *= 0.92;
        if (impact > 250) squash = Math.min(impact / 1700, 0.34);
        if (impact > 420) ripple(x, floor + R - 4);
        if (Math.abs(vy) < 230) {
          vy = 0; restT += dt;
          if (restT > 0.8) { vy = -(pop() * 0.88 + Math.random() * pop() * 0.18); vx = (Math.random() - 0.5) * 120; restT = 0; }
        } else { restT = 0; }
      }
      rot += (vx * dt / R) * 57.3;
      squash *= Math.max(0, 1 - dt * 11);

      var sy = 1 - squash, sx = 1 + squash * 0.5;
      ball.style.transform = "translate(" + (x - R) + "px," + (y - R + squash * R) + "px) rotate(" + rot + "deg) scale(" + sx + "," + sy + ")";

      var t = clamp(1 - (floor - y) / Math.max(floor - ceil, 1), 0, 1);
      shadow.style.transform = "translate(" + (x - shadow.offsetWidth / 2) + "px," + (floor + R - 10) + "px) scale(" + (0.4 + 0.6 * t) + ")";
      shadow.style.opacity = String(0.12 + 0.43 * t);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
