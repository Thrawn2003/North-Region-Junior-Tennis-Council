(function () {
  "use strict";
  var list = document.getElementById("eventList");
  var emptyBox = document.getElementById("eventsEmpty");
  var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") n.className = attrs[k]; else if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var events = (window.NRTJC_EVENTS || []).map(function (e) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date || "");
    return m ? Object.assign({}, e, { d: new Date(+m[1], +m[2] - 1, +m[3]) }) : null;
  }).filter(function (e) { return e && e.d >= today; })
    .sort(function (a, b) { return a.d - b.d; });

  events.forEach(function (e) {
    list.appendChild(el("li", { class: "reveal" }, [
      el("time", { datetime: e.date }, [el("b", { text: MONTHS[e.d.getMonth()] }), el("span", { text: String(e.d.getDate()).padStart(2, "0") })]),
      el("div", {}, [el("h3", { text: e.title || "" }), el("p", { text: e.details || "" })]),
      el("span", { class: "chip", text: e.status || "" })
    ]));
  });
  emptyBox.hidden = events.length > 0;
  list.hidden = events.length === 0;
})();
