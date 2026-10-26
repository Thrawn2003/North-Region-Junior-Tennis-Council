(function () {
  "use strict";

  var cfg = window.NRTJC_CONFIG || {};
  var page = document.body.getAttribute("data-page");
  var PAGES = [
    ["index.html", "Home", "home"],
    ["about.html", "About", "about"],
    ["events.html", "Events", "events"],
    ["members.html", "Members", "members"]
  ];

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
  function safeUrl(u) { return /^https:\/\//i.test(u || "") ? u : ""; }

  // ---------- header ----------
  var links = el("nav", { id: "navLinks" }, PAGES.map(function (p) {
    var a = el("a", { href: p[0], text: p[1] });
    if (p[2] === page) a.setAttribute("aria-current", "page");
    return a;
  }));
  links.appendChild(el("a", { href: "get-involved.html", class: "btn btn-small", text: "Get involved" }));

  var toggle = el("button", { class: "nav-toggle", id: "navToggle", "aria-label": "Menu", "aria-expanded": "false" },
    [el("span"), el("span")]);

  var brand = el("a", { class: "brand", href: "index.html", "aria-label": "Northern Region Tennis Junior Council – home" }, [
    el("span", { class: "brand-mark", "aria-hidden": "true" }),
    el("span", { class: "brand-text" }, [
      el("strong", { text: "NRTJC" }),
      el("small", { text: "Northern Region Tennis Junior Council" })
    ])
  ]);

  var header = el("header", { class: "nav", id: "nav" }, [brand, toggle, links]);
  document.body.insertBefore(header, document.body.firstChild);

  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  // ---------- footer ----------
  var footLinks = el("div", { class: "footer-links" }, PAGES.map(function (p) { return el("a", { href: p[0], text: p[1] }); }));
  footLinks.appendChild(el("a", { href: "get-involved.html", text: "Get involved" }));

  var left = el("div", {}, [
    el("strong", { text: "Northern Region Tennis Junior Council" }),
    el("br"),
    el("small", { text: "A charity supporting the tennis community." }),
    footLinks
  ]);
  var right = el("div", {}, [
    cfg.charityNumber ? el("small", { text: cfg.charityNumber }) : null,
    cfg.charityNumber ? el("br") : null,
    el("small", { text: "© " + new Date().getFullYear() + " NRTJC. All rights reserved." }),
    el("br"),
    el("em", { class: "signoff", text: "Love all." })
  ]);
  right.style.textAlign = "right";
  document.body.appendChild(el("footer", { class: "footer" }, [el("div", { class: "wrap footer-in" }, [left, right])]));

  // ---------- config-driven buttons ----------
  // <a data-config="contact"> and <a data-config="donate"> only show when the detail is set.
  document.querySelectorAll("[data-config]").forEach(function (a) {
    var kind = a.getAttribute("data-config");
    if (kind === "contact" && cfg.contactEmail) {
      a.href = "mailto:" + cfg.contactEmail;
      if (a.hasAttribute("data-show-email")) a.textContent = cfg.contactEmail;
      a.hidden = false;
    } else if (kind === "donate" && safeUrl(cfg.donateUrl)) {
      a.href = cfg.donateUrl; a.target = "_blank"; a.rel = "noopener"; a.hidden = false;
    } else {
      a.hidden = true;
    }
  });

  // ---------- scroll reveal ----------
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
        setTimeout(function () { en.target.classList.remove("reveal", "in"); }, 900);
      });
    }, { threshold: 0.12 });
    items.forEach(function (n) { io.observe(n); });
  } else {
    items.forEach(function (n) { n.classList.add("in"); });
  }
})();
