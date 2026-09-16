/* ============================================
   THEME MANAGER
   Modes: "light" | "dark" | "auto" (persisted).
   Auto uses a timezone-based sunset/sunrise
   estimate: daylight ≈ 06:00–18:00 local clock
   time — no geolocation permission needed.
   ============================================ */

var ThemeManager = (function () {
  "use strict";

  var MODES = ["light", "dark", "auto"];
  var timerId = null;

  function getMode() {
    var t = Storage.getSetting("theme");
    return MODES.indexOf(t) !== -1 ? t : "auto";
  }

  /* Timezone-based sunset estimate */
  function isDaylight() {
    var h = new Date().getHours();
    return h >= 6 && h < 18;
  }

  function resolved() {
    var mode = getMode();
    if (mode === "auto") return isDaylight() ? "light" : "dark";
    return mode;
  }

  /* Lucide icon names for each mode */
  function iconOf(mode) {
    return mode === "light" ? "sun" :
           mode === "dark"  ? "moon" : "sun-moon";
  }

  function labelOf(mode) {
    var key = mode === "light" ? "themeLight" :
              mode === "dark"  ? "themeDark" : "themeAuto";
    return I18N.t(key);
  }

  function apply() {
    var r = resolved();
    document.documentElement.setAttribute("data-theme", r);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", r === "dark" ? "#0f1220" : "#5b7cfa");

    updateButtons();
  }

  /* Themes section buttons (dashboard view): label + active state.
     The minute tick in auto mode re-applies constantly; rewriting
     identical innerHTML would force avoidable style/paint work,
     so unchanged buttons keep their DOM. */
  function updateButtons() {
    var mode = getMode();
    var btns = document.querySelectorAll(".theme-opt[data-theme-mode]");
    Array.prototype.forEach.call(btns, function (btn) {
      var m = btn.getAttribute("data-theme-mode");
      if (MODES.indexOf(m) === -1) return;
      var active = m === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      var html = Icons.get(iconOf(m)) + "<span>" + labelOf(m) + "</span>";
      if (btn._sig !== html) {
        btn._sig = html;
        btn.innerHTML = html;
      }
    });
  }

  function setMode(mode) {
    if (MODES.indexOf(mode) === -1 || mode === getMode()) return;
    Storage.setSetting("theme", mode);
    apply();
    syncAutoTimer(); /* start/stop the minute interval for auto mode */
  }

  /* Re-evaluate auto mode every minute. The timer only runs while
     auto is active: a fixed light/dark theme never changes on its
     own, so keeping the interval alive was pure battery drain. */
  function tick() {
    if (getMode() === "auto") apply();
  }

  function syncAutoTimer() {
    var auto = getMode() === "auto";
    if (auto && timerId === null) {
      timerId = setInterval(tick, 60000);
    } else if (!auto && timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  return {
    init: function () {
      apply();
      /* Wire the Themes section buttons (dashboard view) */
      var btns = document.querySelectorAll(".theme-opt[data-theme-mode]");
      Array.prototype.forEach.call(btns, function (btn) {
        btn.addEventListener("click", function () {
          setMode(btn.getAttribute("data-theme-mode"));
        });
      });
      syncAutoTimer();
    },

    refresh: function () {
      apply();
      syncAutoTimer();
    },
    setMode: setMode,
    getMode: getMode,
    resolvedLabel: function () { return labelOf(resolved()); }
  };
})();
