/* ============================================
   VIEWS — js/views.js
   Mobile bottom-nav view switching for index.html.
   Views: home (calendar) / year / todo / dashboard.
   The active view is stored on <body data-view="...">
   so pure CSS decides what is visible — no layout
   thrash, and desktop (side panels) ignores it.
   Uses location.hash so the browser back button
   works and views are linkable (#todo, #dashboard…).
   ============================================ */

var Views = (function () {
  "use strict";

  var VIEWS = ["home", "year", "todo", "dashboard"];

  function active() {
    return document.body.getAttribute("data-view") || "home";
  }

  function updateNav() {
    var cur = active();
    var items = document.querySelectorAll(".bottom-nav .nav-item");
    Array.prototype.forEach.call(items, function (el) {
      el.classList.toggle("active", el.getAttribute("data-view") === cur);
    });
  }

  function sync() {
    updateNav();
    /* Dashboard stats refresh every time the view opens */
    if (active() === "dashboard" && window.Dashboard && Dashboard.show) {
      Dashboard.show();
    }
  }

  /* Public: switch to a view (creates a history entry) */
  function show(name) {
    if (VIEWS.indexOf(name) === -1) name = "home";
    document.body.setAttribute("data-view", name);
    if (location.hash !== "#" + name) {
      location.hash = name; // triggers hashchange -> sync()
    }
    sync();
    window.scrollTo(0, 0);
  }

  function hashName() {
    var h = location.hash.replace(/^#\/?/, "");
    return VIEWS.indexOf(h) !== -1 ? h : "home";
  }

  window.addEventListener("hashchange", function () {
    document.body.setAttribute("data-view", hashName());
    sync();
  });

  document.addEventListener("DOMContentLoaded", function () {
    document.body.setAttribute("data-view", hashName());
    updateNav();

    /* Wire the bottom-nav buttons (the Birthdays item is a
       plain link, so it needs no handler) */
    var btns = document.querySelectorAll(".bottom-nav .nav-item[data-view]");
    Array.prototype.forEach.call(btns, function (el) {
      el.addEventListener("click", function () {
        show(el.getAttribute("data-view"));
      });
    });
  });

  return { show: show };
})();