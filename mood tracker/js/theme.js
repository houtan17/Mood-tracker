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

  function $(id) { return document.getElementById(id); }

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

    updateButton();
  }

  function updateButton() {
    var btn = $("themeToggle");
    if (!btn) return;
    var mode = getMode();
    btn.textContent = iconOf(mode);
    var title = I18N.t("themeToggleTitle") + ": " + labelOf(mode);
    btn.title = title;
    btn.setAttribute("aria-label", title);
  }

  function cycle() {
    var idx = MODES.indexOf(getMode());
    Storage.setSetting("theme", MODES[(idx + 1) % MODES.length]);
    apply();
  }

  /* Re-evaluate auto mode every minute */
  function tick() {
    if (getMode() === "auto") apply();
  }

  return {
    init: function () {
      apply();
      var btn = $("themeToggle");
      if (btn) {
        btn.addEventListener("click", cycle);
      }
      if (timerId === null) {
        timerId = setInterval(tick, 60000);
      }
    },

    refresh: apply,
    cycle: cycle,
    getMode: getMode,
    resolvedLabel: function () { return labelOf(resolved()); }
  };
})();
