/* ============================================
   CALENDAR RENDERING
   Renders one Jalali month into the days grid.
   ============================================ */

var Calendar = (function () {
  "use strict";

  var state = { jy: 0, jm: 0 };
  var onDayClick = null;

  function today() {
    return Jalali.today();
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

      if (t.jy === state.jy && t.jm === state.jm && t.jd === d) {
        cell.classList.add("is-today");
      }
      if (selectedDay && selectedDay.jy === state.jy &&
        selectedDay.jm === state.jm && selectedDay.jd === d) {
        cell.classList.add("is-selected");
      }

      var entry = Storage.getEntry(state.jy, state.jm, d);
      var moodHtml = "";
      if (entry) {
        cell.classList.add("mood-bg-" + entry.mood);
        moodHtml = '<span class="day-mood">' + Moods.emojiOf(entry.mood) + "</span>";
      }

      cell.innerHTML =
        '<span class="day-number">' + I18N.formatNumber(d) + "</span>" + moodHtml;

      (function (day) {
        cell.addEventListener("click", function () {
          if (onDayClick) onDayClick({ jy: state.jy, jm: state.jm, jd: day });
        });
      })(d);

      grid.appendChild(cell);
    }
  }

  return {
    init: function (clickHandler) {
      onDayClick = clickHandler;
      this.goToday();
    },

    render: render,

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
