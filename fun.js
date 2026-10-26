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
        c.style.transform = "perspective(800px) rotateX(" + (-py * 5) + "deg) rotateY(" + (px * 6) + "deg) translateY(-6px)";
      });
      c.addEventListener("pointerleave", function () { c.style.transform = ""; });
    });
  })();

  // ---------- little balls that pop up when you click empty court ----------
  // `ground` is where the ball lands; it starts `drop` px above it and bounces down to rest.
  function spawnMini(host, x, ground, drop, delay) {
    if (reduce || !host.animate) return;
    var b = document.createElement("span");
    b.className = "mini";
    b.style.left = x + "px"; b.style.top = ground + "px";
    host.appendChild(b);

    var peaks = drop ? [drop, 46, 18, 7] : [0, 96, 44, 16];
    var drift = (Math.random() - 0.5) * 220;
    var DOWN = "cubic-bezier(.6,0,.8,.4)", UP = "cubic-bezier(.2,.7,.4,1)";
    var frames = [], t = 0, weights = [], total = 0, i;
    // time per segment ~ sqrt(height), as real falls are
    var segs = [];
    for (i = 0; i < peaks.length; i++) {
      var h = Math.max(peaks[i], 8);
      var w = Math.sqrt(h);
      if (i === 0 && !drop) { segs.push({ y0: 0, y1: -peaks[1], w: Math.sqrt(peaks[1]), e: UP }); continue; }
      if (i === 0) { segs.push({ y0: -drop, y1: 0, w: w, e: DOWN }); continue; }
      if (i === 1 && !drop) { segs.push({ y0: -peaks[1], y1: 0, w: Math.sqrt(peaks[1]), e: DOWN }); continue; }
      segs.push({ y0: 0, y1: -h, w: w, e: UP });
      segs.push({ y0: -h, y1: 0, w: w, e: DOWN });
    }
    segs.forEach(function (s) { total += s.w; });
    var x0 = drop ? 0 : 0;
    frames.push({ transform: "translate(0px," + segs[0].y0 + "px) rotate(0deg)", offset: 0, easing: segs[0].e, opacity: 1 });
    segs.forEach(function (s, k) {
      t += s.w / total;
      var last = k === segs.length - 1;
      frames.push({
        transform: "translate(" + (drift * t) + "px," + s.y1 + "px) rotate(" + (drift * t * 1.5) + "deg)",
        offset: last ? 0.82 : t * 0.82,
        easing: k + 1 < segs.length ? segs[k + 1].e : "linear",
        opacity: 1
      });
    });
    frames.push({ transform: frames[frames.length - 1].transform, offset: 1, opacity: 0 });
    var a = b.animate(frames, { duration: 1700 + (drop ? 600 : 0), delay: delay || 0, fill: "both" });
    a.onfinish = function () { b.remove(); };
  }
  window.NRTJC_spawnMini = spawnMini;

  document.querySelectorAll(".hero, .page-hero").forEach(function (host) {
    host.style.position = "relative";
    host.addEventListener("click", function (e) {
      if (e.target.closest("a, button, input, .ball, .rally")) return;
      var r = host.getBoundingClientRect();
      spawnMini(host, e.clientX - r.left, e.clientY - r.top, 0, 0);
    });
  });

  // ---------- the ball that hops over the net ----------
  document.querySelectorAll(".net").forEach(function (net) {
    if (reduce || !("IntersectionObserver" in window)) { net.classList.add("go"); return; }
    // plays each time the net scrolls back into view
    new IntersectionObserver(function (en) {
      var r = en[0].intersectionRatio;
      if (r >= 0.8) net.classList.add("go");
      else if (r === 0) net.classList.remove("go");
    }, { threshold: [0, 0.8] }).observe(net);
  });

  // ---------- a polite nudge when you leave the tab ----------
  (function titleNudge() {
    var original = document.title;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { original = document.title; document.title = "Your serve… come back soon"; }
      else document.title = original;
    });
  })();

  // ---------- hero ball: tap it, or flick it ----------
  document.querySelectorAll(".hero, .page-hero").forEach(initBall);

  function initBall(hero) {
    if (reduce) return;
    var small = hero.classList.contains("page-hero");
    var ball = hero.querySelector(".ball");
    var shadow = hero.querySelector(".ball-shadow");
    if (!ball || !shadow) {
      // inner pages get their own, smaller ball
      shadow = document.createElement("span"); shadow.className = "ball-shadow";
      ball = document.createElement("span"); ball.className = "ball";
      hero.appendChild(shadow); hero.appendChild(ball);
    }

    // lift the ball out of the decorative court so it sits above the text and can take clicks
    hero.appendChild(shadow);
    hero.appendChild(ball);
    ball.classList.add("live");
    shadow.classList.add("live");
    ball.setAttribute("role", "button");
    ball.setAttribute("tabindex", "0");
    ball.setAttribute("aria-label", "Tennis ball. Press to hit it.");

    var hud = document.createElement("div");
    hud.className = "rally";
    hud.setAttribute("aria-hidden", "true");
    var hudText = document.createElement("span");
    hudText.textContent = "Tap or flick the ball";
    hud.appendChild(hudText);
    hero.appendChild(hud);

    var GRAVITY = 2300, REST = 0.8, WALL = 0.82;
    var R = ball.offsetWidth / 2 || 37;
    var W = 0, H = 0, floor = 0, ceil = 0;
    var x = 0, y = 0, vx = 0, vy = 0, rot = 0, squash = 0, restT = 0;
    var dragging = false, samples = [], grab = { dx: 0, dy: 0 }, moved = 0, downAt = 0;
    var rally = 0, lastHit = 0, running = true, last = performance.now();

    function bounds() {
      R = ball.offsetWidth / 2 || R;
      W = hero.clientWidth;
      H = hero.clientHeight;
      floor = H - (small ? 28 : 110) - R;
      ceil = (small ? 78 : 84) + R;
      if (floor < ceil + (small ? 90 : 120)) floor = ceil + (small ? 90 : 120);
    }
    bounds();
    x = W - Math.max(70, W * 0.16) - R;
    y = ceil;
    window.addEventListener("resize", function () { bounds(); x = clamp(x, R, W - R); y = clamp(y, ceil, floor); });

    function shower(n) {
      for (var k = 0; k < n; k++) {
        spawnMini(hero, 30 + Math.random() * (W - 60), floor + R, floor + R - 90, k * 90);
      }
    }
    function say(text) { hudText.textContent = text; hud.classList.add("on"); }
    function registerHit() {
      rally++;
      lastHit = performance.now();
      if (rally === 10) { say("Rally of ten. Impressive."); shower(14); }
      else if (rally === 25) { say("Championship form."); shower(28); }
      else if (rally === 5) say("Rally · 5 · Nicely struck.");
      else say("Rally · " + rally);
    }
    // launch speed that fits the space available (capped for the tall home hero)
    function pop() { return Math.min(1250, Math.sqrt(2 * GRAVITY * Math.max(floor - ceil, 1) * 0.8)); }
    function hit() {
      vy = -(pop() + Math.random() * pop() * 0.2);
      vx = (Math.random() - 0.5) * 600;
      squash = 0.12;
      registerHit();
    }

    function pointerPos(e) {
      var r = hero.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    ball.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      ball.setPointerCapture(e.pointerId);
      var p = pointerPos(e);
      dragging = true; moved = 0; downAt = performance.now();
      grab.dx = x - p.x; grab.dy = y - p.y;
      vx = vy = 0;
      samples = [{ t: downAt, x: x, y: y }];
      ball.classList.add("held");
    });
    ball.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var p = pointerPos(e);
      var nx = clamp(p.x + grab.dx, R, W - R), ny = clamp(p.y + grab.dy, ceil - 40, floor);
      moved += Math.abs(nx - x) + Math.abs(ny - y);
      x = nx; y = ny;
      var now = performance.now();
      samples.push({ t: now, x: x, y: y });
      while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      ball.classList.remove("held");
      var now = performance.now();
      if (moved < 8 && now - downAt < 350) { hit(); return; }
      var a = samples[0], b = samples[samples.length - 1];
      var dt = Math.max((b.t - a.t) / 1000, 0.016);
      vx = clamp((b.x - a.x) / dt, -2200, 2200);
      vy = clamp((b.y - a.y) / dt, -2400, 2400);
      if (Math.abs(vx) + Math.abs(vy) > 300) registerHit();
    }
    ball.addEventListener("pointerup", release);
    ball.addEventListener("pointercancel", release);
    ball.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(); }
    });

    function reset() {
      x = W - Math.max(70, W * 0.16) - R; y = ceil;
      vx = vy = 0; squash = 0; restT = 0; rally = 0;
      hud.classList.remove("on"); hudText.textContent = "Tap or flick the ball";
    }
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

      if (!dragging) {
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
      }
      squash *= Math.max(0, 1 - dt * 11);

      var sy = 1 - squash, sx = 1 + squash * 0.5;
      ball.style.transform = "translate(" + (x - R) + "px," + (y - R + squash * R) + "px) rotate(" + rot + "deg) scale(" + sx + "," + sy + ")";

      var t = clamp(1 - (floor - y) / Math.max(floor - ceil, 1), 0, 1);
      shadow.style.transform = "translate(" + (x - shadow.offsetWidth / 2) + "px," + (floor + R - 10) + "px) scale(" + (0.4 + 0.6 * t) + ")";
      shadow.style.opacity = String(0.12 + 0.43 * t);

      if (rally > 0 && performance.now() - lastHit > 6000) {
        rally = 0;
        hud.classList.remove("on");
        hudText.textContent = "Tap or flick the ball";
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
