/* ============================================
   YEAR COUNTER — js/yearcounter.js
   One gray circle per day of the current Jalali
   year (starting Nowruz). Days that have passed
   (including today) turn blue. Footer shows the
   days passed / days left.
   Rendered into the left panel on desktop and as
   a full view on mobile (same DOM).
   ============================================ */

var YearCounter = (function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function render() {
    var grid = $("yearGrid");
    if (!grid) return;

    var t = Jalali.today();
    var startJdn = Jalali.jdn(t.jy, 1, 1);
    var todayJdn = Jalali.jdn(t.jy, t.jm, t.jd);
    var passed = todayJdn - startJdn + 1; // today counts as passed

    /* Total days in this Jalali year (365, or 366 in leap years).
       Month lengths are computed once — the old loop re-called
       monthLength() for every single dot (~377 calls per render). */
    var lengths = [];
    var total = 0;
    for (var m = 1; m <= 12; m += 1) {
      var len = Jalali.monthLength(t.jy, m);
      lengths.push(len);
      total += len;
    }

    /* Build the dots; each one is titled with its Jalali date */
    var months = I18N.t("months");
    var html = "";
    var mi = 0, di = 1;
    for (var i = 1; i <= total; i += 1) {
      var cls = "year-dot" + (i <= passed ? " is-passed" : "") +
        (i === passed ? " is-today" : "");
      html += '<span class="' + cls + '" title="' +
        I18N.formatNumber(di) + " " + months[mi] + '"></span>';
      di += 1;
      if (di > lengths[mi]) { mi += 1; di = 1; }
    }
    grid.innerHTML = html;

    /* Header + footer texts */
    $("yearTitle").textContent = I18N.t("yearCounter");
    $("yearValue").textContent = I18N.formatNumber(t.jy);
    $("yearPassed").textContent = I18N.f("daysPassed", I18N.formatNumber(passed));
    $("yearLeft").textContent = I18N.f("daysLeft", I18N.formatNumber(total - passed));

    var pct = Math.round((passed * 100) / total);
    var sign = I18N.lang === "fa" ? "٪" : "%";
    $("yearPct").textContent = I18N.formatNumber(pct) + sign;
  }

  return { render: render };
})();