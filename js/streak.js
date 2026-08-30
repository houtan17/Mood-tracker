/* ============================================
   STREAK — js/streak.js
   Counts consecutive days the user opens the app.

   Rules:
   - Opening the app again on the same day: no change.
   - Last visit exactly 1 day ago: streak + 1.
   - Missed a full day (>= 2 days since last visit):
     the streak resets and starts over from 1.

   Stored in moodTracker.v1 settings as:
   lastVisitDate ("YYYY-MM-DD" Gregorian, local) + streakCount.
   ============================================ */

var Streak = (function () {
  "use strict";

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /* Whole days from date string a to b (local midnight to midnight) */
  function diffDays(a, b) {
    function ms(s) {
      var p = s.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
    }
    return Math.round((ms(b) - ms(a)) / 86400000);
  }

  function checkIn() {
    var today = todayStr();
    var last = Storage.getSetting("lastVisitDate");
    var count = Storage.getSetting("streakCount");
    if (typeof count !== "number" || count < 0) count = 0;

    if (last === today) return count; // already checked in today

    if (last && diffDays(last, today) === 1) {
      count += 1; // consecutive day → keep the streak alive
    } else {
      count = 1;  // missed a day (or very first visit) → start over
    }
    Storage.setSetting("lastVisitDate", today);
    Storage.setSetting("streakCount", count);
    return count;
  }

  function render() {
    var el = document.getElementById("streakBadge");
    if (!el) return;
    var count = checkIn();
    el.innerHTML =
      '<span class="streak-flame" aria-hidden="true">🔥</span>' +
      '<span class="streak-count">' + I18N.formatNumber(count) + "</span>" +
      '<span class="streak-label">' + I18N.t("streakLabel") + "</span>";
    var title = I18N.t("streakTitle");
    el.title = title;
    el.setAttribute("aria-label", title + " \u2014 " + count);
  }

  return {
    init: render,
    refresh: render,
    checkIn: checkIn
  };
})();