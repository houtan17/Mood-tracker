/* ============================================
   THEME PRE-PAINT — js/theme-init.js
   The ONLY copy of the pre-paint theme logic.
   Loaded synchronously in <head> BEFORE any CSS
   (a blocking <script src> in <head> always runs
   before first paint), so the saved theme applies
   with no flash of the wrong theme.

   NOTE: it deliberately does NOT use Storage.js —
   it runs before any app module is loaded, so it
   reads localStorage directly. Keep in sync with
   the storage key below if it ever changes.
   ============================================ */

(function () {
  var theme = "light";
  try {
    var data = JSON.parse(localStorage.getItem("moodTracker.v1") || "{}");
    var mode = data && data.settings && data.settings.theme;
    if (mode === "light" || mode === "dark") {
      theme = mode;
    } else {
      var h = new Date().getHours();
      theme = h >= 6 && h < 18 ? "light" : "dark"; // sunset estimate
    }
  } catch (e) {
    /* keep light */
  }
  document.documentElement.setAttribute("data-theme", theme);
})();