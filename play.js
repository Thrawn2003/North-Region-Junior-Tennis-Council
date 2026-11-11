(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // Calls enter() when el comes into view and leave() once it is fully out.
  function onView(el, enter, leave, thr) {
    if (!("IntersectionObserver" in window)) { enter(); return; }
    var inside = false;
    new IntersectionObserver(function (en) {
      var r = en[0].intersectionRatio;
      if (!inside && r >= thr) { inside = true; enter(); }
      else if (inside && r === 0) { inside = false; if (leave) leave(); }
    }, { threshold: [0, thr] }).observe(el);
  }

  // ---------- word ticker: fill the track twice so the loop is seamless ----------
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
  });

  if (reduce) return;

  // ---------- headings: words rise into place ----------
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

  // ---------- home hero: the court shifts slightly with the pointer ----------
  var hero = document.querySelector(".hero");
  if (hero && canHover) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  }
})();
