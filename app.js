(function () {
  "use strict";

  var STORE_KEY = "nrtjc.members.v1";
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // ---------- tiny DOM helper (user text always goes in via textContent) ----------
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // ---------- Canva link -> embeddable URL ----------
  // Accepts a normal share link, an "?embed" link, or a pasted <iframe ... src="..."> snippet.
  function toEmbedUrl(input) {
    if (!input) return null;
    var raw = String(input).trim();
    var m = raw.match(/src\s*=\s*["']([^"']+)["']/i);
    if (m) raw = m[1];
    var u;
    try { u = new URL(raw); } catch (e) { return null; }
    if (u.protocol !== "https:") return null;
    if (u.hostname !== "www.canva.com" && u.hostname !== "canva.com") return null;
    var parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] !== "design" || !/^[\w-]+$/.test(parts[1] || "")) return null;
    var id = parts[1];
    var tail = parts[2];
    var token = tail && !/^(view|edit|watch|embed)$/i.test(tail) && /^[\w-]+$/.test(tail) ? tail : null;
    return "https://www.canva.com/design/" + id + (token ? "/" + token : "") + "/view?embed";
  }

  // ---------- data ----------
  function loadLocal() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }
  function saveLocal(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  var localMembers = loadLocal();

  function allMembers() {
    var base = (window.NRTJC_MEMBERS || []).map(function (m) { return Object.assign({ local: false }, m); });
    var mine = localMembers.map(function (m, i) { return Object.assign({ local: true, localIndex: i }, m); });
    return mine.concat(base);
  }

  function initials(name) {
    var parts = String(name).replace(/^(coach|dr|mr|mrs|ms)\.?\s+/i, "").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  // ---------- member grid ----------
  var grid = $("#memberGrid"), empty = $("#empty"), search = $("#search");

  function render() {
    var q = search.value.trim().toLowerCase();
    grid.textContent = "";
    var shown = 0;
    allMembers().forEach(function (m) {
      var hay = [m.name, m.role, m.club].join(" ").toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      shown++;
      grid.appendChild(card(m));
    });
    empty.hidden = shown > 0;
  }

  function card(m) {
    var slides = (m.slides || []).slice(0, 2);
    var dots = el("span", { class: "slide-dots", "aria-hidden": "true" },
      slides.map(function (_, i) { return el("i", { class: "on" }); }));
    var btn = el("button", { class: "member", type: "button", "aria-label": "View " + m.name + "'s slides" }, [
      el("div", { class: "member-top" }),
      el("div", { class: "avatar", text: initials(m.name) }),
      el("div", { class: "member-body" }, [
        el("h3", { text: m.name }),
        el("p", { class: "meta", text: [m.role, m.club].filter(Boolean).join(" · ") }),
        el("div", { class: "member-foot" }, [
          el("span", { text: slides.length + (slides.length === 1 ? " slide" : " slides") }),
          dots,
          el("span", { class: "arrow", text: "View →" })
        ])
      ])
    ]);
    btn.addEventListener("click", function () { openViewer(m, btn); });

    var wrap = el("div", { style: "position:relative;display:flex" }, [btn]);
    btn.style.width = "100%";
    if (m.local) {
      wrap.appendChild(el("span", { class: "badge-local", text: "Added by you" }));
      var rm = el("button", { class: "remove-btn", type: "button", text: "Remove", "aria-label": "Remove " + m.name });
      rm.addEventListener("click", function () {
        if (!confirm("Remove " + m.name + " from this browser?")) return;
        localMembers.splice(m.localIndex, 1);
        saveLocal(localMembers);
        render();
      });
      wrap.appendChild(rm);
    }
    return wrap;
  }

  search.addEventListener("input", render);

  // ---------- modals ----------
  var lastFocus = null;
  function openModal(m, from) {
    lastFocus = from || document.activeElement;
    m.hidden = false;
    document.body.style.overflow = "hidden";
    var f = m.querySelector("input, .modal-close");
    if (f) f.focus();
  }
  function closeModal(m) {
    m.hidden = true;
    document.body.style.overflow = "";
    if (m.id === "viewer") $("#viewerStage").textContent = ""; // stop the embedded slide
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) closeModal(m);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") document.querySelectorAll(".modal:not([hidden])").forEach(closeModal);
  });

  // ---------- slide viewer ----------
  var viewer = $("#viewer"), stage = $("#viewerStage"), tabs = $("#viewerTabs");

  function openViewer(m, from) {
    $("#viewerName").textContent = m.name;
    $("#viewerMeta").textContent = [m.role, m.club].filter(Boolean).join(" · ");
    $("#viewerAvatar").textContent = initials(m.name);
    var slides = (m.slides || []).slice(0, 2);

    tabs.textContent = "";
    slides.forEach(function (s, i) {
      var t = el("button", { type: "button", role: "tab", "aria-selected": "false", text: s.title || ("Slide " + (i + 1)) });
      t.addEventListener("click", function () { show(i); });
      tabs.appendChild(t);
    });
    tabs.hidden = slides.length < 2;

    function show(i) {
      Array.prototype.forEach.call(tabs.children, function (t, j) { t.setAttribute("aria-selected", String(i === j)); });
      stage.textContent = "";
      stage.className = "viewer-stage";
      var src = slides[i] && toEmbedUrl(slides[i].url);
      if (!src) {
        stage.appendChild(el("div", { class: "stage-msg" }, [
          el("div", { class: "ico", text: "🎾" }),
          el("b", { text: "Slide coming soon" }),
          el("span", { text: m.name + " hasn't linked this Canva slide yet." })
        ]));
        return;
      }
      stage.classList.add("stage-loading");
      var frame = el("iframe", {
        src: src, title: (slides[i].title || "Slide") + " — " + m.name,
        loading: "lazy", allowfullscreen: "true", allow: "fullscreen", referrerpolicy: "strict-origin-when-cross-origin"
      });
      frame.addEventListener("load", function () { stage.classList.remove("stage-loading"); });
      stage.appendChild(frame);
    }

    if (slides.length) show(0);
    else { stage.textContent = ""; show(0); }
    openModal(viewer, from);
  }

  // ---------- add profile ----------
  var addModal = $("#addModal"), form = $("#addForm"), err = $("#formError");
  $("#addBtn").addEventListener("click", function () {
    form.reset(); err.hidden = true;
    openModal(addModal, $("#addBtn"));
  });

  function fail(msg) { err.textContent = msg; err.hidden = false; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, slides = [];
    var name = f.name.value.trim();
    if (!name) return fail("Please enter your name.");

    for (var n = 1; n <= 2; n++) {
      var url = f["u" + n].value.trim();
      if (!url) continue;
      if (!toEmbedUrl(url)) {
        return fail("Slide " + n + ": that doesn't look like a Canva design link. Use the link from Canva → Share → More → Embed (it should start with canva.com/design/).");
      }
      slides.push({ title: f["t" + n].value.trim() || "Slide " + n, url: url });
    }
    if (!slides.length) return fail("Add at least one Canva slide link.");

    localMembers.unshift({ name: name, role: f.role.value.trim(), club: f.club.value.trim(), slides: slides });
    if (!saveLocal(localMembers)) return fail("Couldn't save in this browser (storage is blocked).");
    closeModal(addModal);
    search.value = "";
    render();
    $("#members").scrollIntoView();
  });

  // ---------- nav ----------
  var nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  // ---------- reveal + counters ----------
  function countUp(node) {
    var target = +node.dataset.count, start = performance.now(), dur = 1400;
    (function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        en.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal, .stats").forEach(function (n) { io.observe(n); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });
    document.querySelectorAll("[data-count]").forEach(function (n) { n.textContent = n.dataset.count; });
  }

  $("#year").textContent = new Date().getFullYear();
  render();
})();
