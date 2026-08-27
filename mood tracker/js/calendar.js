/* ============================================
   CALENDAR RENDERING
   Renders one Jalali month into the days grid.
   ============================================ */

var Calendar = (function () {
  "use strict";

  /* Editable window: today + this many days back */
  var MAX_PAST_DAYS = 5;

  var state = { jy: 0, jm: 0 };
  var onDayClick = null;

  function today() {
    return Jalali.today();
  }

  /* Days between a date and today.
     0 = today, 1 = yesterday, negative = future. */
  function dayDistance(jy, jm, jd) {
    var t = today();
    return Jalali.jdn(t.jy, t.jm, t.jd) - Jalali.jdn(jy, jm, jd);
  }

  function isEditable(jy, jm, jd) {
    var dist = dayDistance(jy, jm, jd);
    return dist >= 0 && dist <= MAX_PAST_DAYS;
  }

  function render() {
    var grid = document.getElementById("daysGrid");
    var weekdayRow = document.getElementById("weekdayRow");
    var monthTitle = document.getElementById("monthTitle");
    grid.innerHTML = "";

    /* Weekday headers (Saturday first) */
    weekdayRow.innerHTML = I18N.t("weekdays")
      .map(function (w) { return '<div class="weekday-cell">' + w + "</div>"; })
      .join("");

    /* Title: "Mordad 1404" or "مرداد ۱۴۰۴" */
    var monthName = I18N.t("months")[state.jm - 1];
    if (I18N.lang === "fa") {
      monthTitle.textContent = monthName + " " + I18N.formatNumber(state.jy);
    } else {
      monthTitle.textContent = monthName + " " + state.jy;
    }

    /* Leading blanks: weekday of the 1st of month */
    var firstGreg = Jalali.toGregorian(state.jy, state.jm, 1);
    var firstJsDate = new Date(firstGreg.gy, firstGreg.gm - 1, firstGreg.gd);
    var leading = (firstJsDate.getDay() + 1) % 7; // Saturday-first index

    for (var b = 0; b < leading; b += 1) {
      var blank = document.createElement("div");
      blank.className = "day-cell is-empty";
      grid.appendChild(blank);
    }

    var t = today();
    var length = Jalali.monthLength(state.jy, state.jm);
    var selectedDay = App.selectedDate;

    for (var d = 1; d <= length; d += 1) {
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";

      /* Staggered entrance delay (GPU-friendly transform/opacity only) */
      cell.style.animationDelay = Math.min((leading + d) * 8, 400) + "ms";

      if (t.jy === state.jy && t.jm === state.jm && t.jd === d) {
        cell.classList.add("is-today");
      }
      /* Friday = weekend column (Saturday-first index 6) */
      if ((leading + d - 1) % 7 === 6) {
        cell.classList.add("is-weekend");
      }
      if (selectedDay && selectedDay.jy === state.jy &&
        selectedDay.jm === state.jm && selectedDay.jd === d) {
        cell.classList.add("is-selected");
      }

      /* Lock future days and days older than the editable window */
      if (!isEditable(state.jy, state.jm, d)) {
        cell.classList.add("is-disabled");
        cell.disabled = true;
      }

      var entry = Storage.getEntry(state.jy, state.jm, d);
      var moodHtml = "";
      if (entry) {
        cell.classList.add("mood-bg-" + entry.mood);
        moodHtml = '<span class="day-mood">' + Moods.emojiOf(entry.mood) + "</span>";
      }

      cell.innerHTML =
        '<span class="day-number">' + I18N.formatNumber(d) + "</span>" + moodHtml;

      if (!cell.disabled) {
        (function (day) {
          cell.addEventListener("click", function () {
            if (onDayClick) onDayClick({ jy: state.jy, jm: state.jm, jd: day });
          });
        })(d);
      }

      grid.appendChild(cell);
    }
  }

  return {
    init: function (clickHandler) {
      onDayClick = clickHandler;
      this.goToday();
    },

    render: render,
    isEditable: isEditable,

    goToday: function () {
      var t = today();
      state.jy = t.jy;
      state.jm = t.jm;
      render();
    },

    next: function () {
      state.jm += 1;
      if (state.jm > 12) { state.jm = 1; state.jy += 1; }
      render();
    },

    prev: function () {
      state.jm -= 1;
      if (state.jm < 1) { state.jm = 12; state.jy -= 1; }
      render();
    },

    current: function () { return state; },
    todayValue: today
  };
})();
