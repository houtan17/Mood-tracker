/* ============================================
   DATE CONVERTER — js/dateconverter.js
   Jalali <-> Gregorian conversion tool.
   Lives as a second card inside the Birthdays view.
   - Segmented tabs choose the direction (j2g / g2j)
   - Dropdown rows convert live on every change
   - The swap button flips the direction and pre-fills
     the input with the last converted result
   - Invalid dates (Esfand 30 in a non-leap year,
     Feb 30, ...) show a role="alert" error
   - Fully FA/EN aware (names, digits, RTL/LTR)
   ============================================ */

var DateConverter = (function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  var mode = "j2g";       /* "j2g" (Jalali -> Gregorian) | "g2j" */
  var lastResult = null;  /* { jy, jm, jd, gy, gm, gd } of last valid conversion */

  /* Year ranges (Jalali bounds are derived from the Gregorian ones) */
  var G_MIN = 1900;
  var G_MAX = 2100;
  var J_MIN = 1278;
  var J_MAX = 1479;

  /* ---------- Dropdowns ---------- */

  function fillJalali() {
    var daySel = $("dcJDay");
    daySel.innerHTML = "";
    for (var d = 1; d <= 31; d += 1) {
      var od = document.createElement("option");
      od.value = d;
      od.textContent = I18N.formatNumber(d);
      daySel.appendChild(od);
    }

    var months = I18N.t("months");
    var mSel = $("dcJMonth");
    mSel.innerHTML = "";
    months.forEach(function (name, i) {
      var om = document.createElement("option");
      om.value = i + 1;
      om.textContent = name;
      mSel.appendChild(om);
    });

    var ySel = $("dcJYear");
    ySel.innerHTML = "";
    for (var y = J_MIN; y <= J_MAX; y += 1) {
      var oy = document.createElement("option");
      oy.value = y;
      oy.textContent = I18N.formatNumber(y);
      ySel.appendChild(oy);
    }
  }

  function fillGreg() {
    var daySel = $("dcGDay");
    daySel.innerHTML = "";
    var max = gDaysInMonth(+$("dcGYear").value || G_MIN, +$("dcGMonth").value || 1);
    for (var d = 1; d <= max; d += 1) {
      var od = document.createElement("option");
      od.value = d;
      od.textContent = I18N.formatNumber(d);
      daySel.appendChild(od);
    }

    var months = I18N.t("gMonths");
    var mSel = $("dcGMonth");
    mSel.innerHTML = "";
    months.forEach(function (name, i) {
      var om = document.createElement("option");
      om.value = i + 1;
      om.textContent = name;
      mSel.appendChild(om);
    });

    var ySel = $("dcGYear");
    ySel.innerHTML = "";
    for (var y = G_MIN; y <= G_MAX; y += 1) {
      var oy = document.createElement("option");
      oy.value = y;
      oy.textContent = I18N.formatNumber(y);
      ySel.appendChild(oy);
    }
  }

  function setJalali(j) {
    $("dcJDay").value = j.jd;
    $("dcJMonth").value = j.jm;
    $("dcJYear").value = j.jy;
  }

  function setGreg(g) {
    $("dcGMonth").value = g.gm;
    $("dcGYear").value = g.gy;
    refillGregDays();
    $("dcGDay").value = g.gd;
  }

  function readJalali() {
    return {
      jy: +$("dcJYear").value,
      jm: +$("dcJMonth").value,
      jd: +$("dcJDay").value
    };
  }

  function readGreg() {
    return {
      gy: +$("dcGYear").value,
      gm: +$("dcGMonth").value,
      gd: +$("dcGDay").value
    };
  }

  function selectionSnapshot() {
    return {
      jd: $("dcJDay").value, jm: $("dcJMonth").value, jy: $("dcJYear").value,
      gd: $("dcGDay").value, gm: $("dcGMonth").value, gy: $("dcGYear").value
    };
  }

  function restoreSelection(s) {
    if (s.jd) $("dcJDay").value = s.jd;
    if (s.jm) $("dcJMonth").value = s.jm;
    if (s.jy) $("dcJYear").value = s.jy;
    if (s.gd) $("dcGDay").value = s.gd;
    if (s.gm) $("dcGMonth").value = s.gm;
    if (s.gy) $("dcGYear").value = s.gy;
  }

  /* ---------- Helpers ---------- */

  function gDaysInMonth(gy, gm) {
    return new Date(gy, gm, 0).getDate();
  }

  function todayG() {
    var n = new Date();
    return { gy: n.getFullYear(), gm: n.getMonth() + 1, gd: n.getDate() };
  }

  /* Gregorian day options follow the selected month length */
  function refillGregDays() {
    var daySel = $("dcGDay");
    var keep = +daySel.value || todayG().gd;
    var max = gDaysInMonth(+$("dcGYear").value, +$("dcGMonth").value);
    daySel.innerHTML = "";
    for (var d = 1; d <= max; d += 1) {
      var od = document.createElement("option");
      od.value = d;
      od.textContent = I18N.formatNumber(d);
      daySel.appendChild(od);
    }
    daySel.value = Math.min(keep, max);
  }

  /* Jalali day options stay 1..31 but the value is clamped
     to the real month length (like the birthday form) */
  function clampJalaliDay() {
    var j = readJalali();
    var mx = Jalali.monthLength(j.jy, j.jm);
    if (j.jd > mx) $("dcJDay").value = mx;
  }

  /* ---------- Output ---------- */

  function formatGregorian(gy, gm, gd) {
    var name = (I18N.t("gMonths") || [])[gm - 1] || "";
    if (I18N.lang === "fa") {
      return I18N.formatNumber(gd) + " " + name + " " + I18N.formatNumber(gy);
    }
    return name + " " + gd + ", " + gy;
  }

  function showError(key) {
    lastResult = null;
    $("dcResult").classList.add("hidden");
    var err = $("dcError");
    err.textContent = I18N.t(key);
    err.classList.remove("hidden");
  }

  function showEmpty() {
    lastResult = null;
    $("dcResult").classList.add("hidden");
    var err = $("dcError");
    err.textContent = I18N.t("dcEmpty");
    err.classList.remove("hidden");
  }

  function showResult(j, g) {
    lastResult = {
      jy: j.jy, jm: j.jm, jd: j.jd,
      gy: g.gy, gm: g.gm, gd: g.gd
    };

    var label = mode === "j2g" ? I18N.t("dcResultGreg") : I18N.t("dcResultJalali");
    var value = mode === "j2g" ? formatGregorian(g.gy, g.gm, g.gd)
                               : I18N.formatFullDate(j.jy, j.jm, j.jd);

    /* Weekday of the converted date (week starts on Saturday) */
    var native = new Date(g.gy, g.gm - 1, g.gd);
    var weekday = (I18N.t("weekdaysLong") || [])[(native.getDay() + 1) % 7] || "";

    $("dcResultLabel").textContent = label;
    $("dcResultValue").textContent = value + (weekday ? " · " + weekday : "");
    $("dcError").classList.add("hidden");
    $("dcResult").classList.remove("hidden");
  }

  /* Live conversion for the active mode */
  function convert() {
    var j, g;

    if (mode === "j2g") {
      var hasJ = $("dcJDay").value && $("dcJMonth").value && $("dcJYear").value;
      if (!hasJ) { showEmpty(); return; }
      j = readJalali();
      if (j.jd > Jalali.monthLength(j.jy, j.jm)) {
        showError("dcInvalidJalali");
        return;
      }
      g = Jalali.toGregorian(j.jy, j.jm, j.jd);
      showResult(j, g);
    } else {
      var hasG = $("dcGDay").value && $("dcGMonth").value && $("dcGYear").value;
      if (!hasG) { showEmpty(); return; }
      g = readGreg();
      /* Round-trip check catches Feb 30, Apr 31, ... */
      var native = new Date(g.gy, g.gm - 1, g.gd);
      if (native.getFullYear() !== g.gy ||
          native.getMonth() + 1 !== g.gm ||
          native.getDate() !== g.gd) {
        showError("dcInvalidGreg");
        return;
      }
      j = Jalali.toJalali(g.gy, g.gm, g.gd);
      showResult(j, g);
    }
  }

  /* ---------- Mode / tabs ---------- */

  function updateTabs() {
    var isJ2g = mode === "j2g";
    $("dcTabJ2g").classList.toggle("is-active", isJ2g);
    $("dcTabG2j").classList.toggle("is-active", !isJ2g);
    $("dcTabJ2g").setAttribute("aria-selected", String(isJ2g));
    $("dcTabG2j").setAttribute("aria-selected", String(!isJ2g));
    $("dcJalaliRow").classList.toggle("hidden", !isJ2g);
    $("dcGregRow").classList.toggle("hidden", isJ2g);
  }

  function setMode(newMode) {
    if (newMode !== mode) {
      /* Carry the last valid result over so the user can
         round-trip with one click */
      if (lastResult) {
        if (newMode === "g2j") {
          setGreg({ gy: lastResult.gy, gm: lastResult.gm, gd: lastResult.gd });
        } else {
          setJalali({ jy: lastResult.jy, jm: lastResult.jm, jd: lastResult.jd });
        }
      }
      mode = newMode;
      refillGregDays();
      updateTabs();
    }
    convert();
  }

  /* ---------- Static texts (called on init & language switch) ---------- */

  function applyTexts(firstRun) {
    $("dcTitle").textContent = I18N.t("dcTitle");
    $("dcTabJ2gLabel").textContent = I18N.t("dcTabJ2g");
    $("dcTabG2jLabel").textContent = I18N.t("dcTabG2j");
    $("dcSwapBtn").setAttribute("aria-label", I18N.t("dcSwapAria"));

    /* Selects share the birthday form's day/month/year labels */
    $("dcJDay").setAttribute("aria-label", I18N.t("bdayDayLabel"));
    $("dcJMonth").setAttribute("aria-label", I18N.t("bdayMonthLabel"));
    $("dcJYear").setAttribute("aria-label", I18N.t("bdayYearLabel"));
    $("dcGDay").setAttribute("aria-label", I18N.t("bdayDayLabel"));
    $("dcGMonth").setAttribute("aria-label", I18N.t("bdayMonthLabel"));
    $("dcGYear").setAttribute("aria-label", I18N.t("bdayYearLabel"));

    /* Re-fill options (names/digits follow the language) while
       keeping whatever the user had selected */
    var snapshot = firstRun ? null : selectionSnapshot();
    fillJalali();
    fillGreg();
    if (firstRun) {
      setJalali(Jalali.today());
      setGreg(todayG());
    } else {
      restoreSelection(snapshot);
    }
    refillGregDays();

    updateTabs();
    convert();
  }

  /* ---------- Events ---------- */

  function wireEvents() {
    $("dcTabJ2g").addEventListener("click", function () { setMode("j2g"); });
    $("dcTabG2j").addEventListener("click", function () { setMode("g2j"); });

    $("dcSwapBtn").addEventListener("click", function () {
      setMode(mode === "j2g" ? "g2j" : "j2g");
    });

    ["dcJDay", "dcJMonth", "dcJYear"].forEach(function (id) {
      $(id).addEventListener("change", function () {
        clampJalaliDay();
        convert();
      });
    });

    ["dcGDay", "dcGMonth", "dcGYear"].forEach(function (id) {
      $(id).addEventListener("change", function () {
        if (id !== "dcGDay") refillGregDays();
        convert();
      });
    });
  }

  function init() {
    if (!$("dcCard")) return; /* not on this page */
    J_MIN = Jalali.toJalali(G_MIN, 1, 1).jy;
    J_MAX = Jalali.toJalali(G_MAX, 1, 1).jy + 1;
    wireEvents();
    applyTexts(true);
  }

  document.addEventListener("DOMContentLoaded", init);

  return { refresh: function () { applyTexts(false); } };
})();
