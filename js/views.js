/* ============================================
   VIEWS — js/views.js
   Bottom-nav view switching for index.html (mobile).
   Views: home (calendar) / year / todo / dashboard /
   birthdays.
   The active view is stored on <body data-view="...">
   so pure CSS decides what is visible — no layout
   thrash, and desktop (side panels) ignores it.
   Uses location.hash so the browser back button
   works and views are linkable (#todo, #dashboard…).
   ============================================ */

var Views = (function () {
  "use strict";

  var VIEWS = ["home", "year", "todo", "dashboard", "birthdays"];

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

  /* Single source of truth: set the body attribute, sync the nav,
     and refresh views with live data. Every entry point converges
     here exactly once per navigation. */
  function apply(name) {
    document.body.setAttribute("data-view", name);
    updateNav();
    /* Views with live data refresh every time they open */
    if (name === "dashboard" && window.Dashboard && Dashboard.show) {
      Dashboard.show();
    }
    if (name === "birthdays" && window.Birthdays && Birthdays.render) {
      Birthdays.render();
    }
  }

  /* Public: switch to a view (creates a history entry) */
  function show(name) {
    if (VIEWS.indexOf(name) === -1) name = "home";
    if (location.hash !== "#" + name) {
      location.hash = name; // hashchange -> apply() exactly once
    } else {
      apply(name); // hash already current: nothing else will fire
    }
    window.scrollTo(0, 0);
  }

  function hashName() {
    var h = location.hash.replace(/^#\/?/, "");
    return VIEWS.indexOf(h) !== -1 ? h : "home";
  }

  window.addEventListener("hashchange", function () {
    apply(hashName());
    window.scrollTo(0, 0); // browser back/forward behaves like show()
  });

  document.addEventListener("DOMContentLoaded", function () {
    apply(hashName());

    /* Wire the bottom-nav buttons (all five items are
       view switchers now) */
    var btns = document.querySelectorAll(".bottom-nav .nav-item[data-view]");
    Array.prototype.forEach.call(btns, function (el) {
      el.addEventListener("click", function () {
        show(el.getAttribute("data-view"));
      });
    });
  });

  return { show: show };
})();