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

  function iconOf(mode) {
    return mode === "light" ? "\u2600\uFE0F" :      // ☀️
           mode === "dark"  ? "\uD83C\uDF19" :      // 🌙
                              "\uD83C\uDF13";       // 🌓
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

  /* Themes section buttons (dashboard view): label + active state */
  function updateButtons() {
    var mode = getMode();
    var btns = document.querySelectorAll(".theme-opt[data-theme-mode]");
    Array.prototype.forEach.call(btns, function (btn) {
      var m = btn.getAttribute("data-theme-mode");
      if (MODES.indexOf(m) === -1) return;
      var active = m === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.textContent = iconOf(m) + " " + labelOf(m);
    });
  }

  function setMode(mode) {
    if (MODES.indexOf(mode) === -1 || mode === getMode()) return;
    Storage.setSetting("theme", mode);
    apply();
  }

  /* Re-evaluate auto mode every minute */
  function tick() {
    if (getMode() === "auto") apply();
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
      if (timerId === null) {
        timerId = setInterval(tick, 60000);
      }
    },

    refresh: apply,
    setMode: setMode,
    getMode: getMode,
    resolvedLabel: function () { return labelOf(resolved()); }
  };
})();
