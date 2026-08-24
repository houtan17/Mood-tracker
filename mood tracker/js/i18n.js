/* ============================================
   INTERNATIONALIZATION (FA / EN)
   All user-facing text lives here.
   To add a new language: copy a block, translate,
   and register it in LANGS below.
   ============================================ */

var I18N = (function () {
  "use strict";

  var LANGS = {
    fa: {
      dir: "rtl",
      title: "ثبت حال روزانه",
      today: "امروز",
      langSwitchLabel: "EN",
      months: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
      weekdays: ["ش", "ی", "د", "س", "چ", "پ", "ج"],
      weekdaysLong: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
      moods: ["عالی", "خوب", "معمولی", "بد", "خیلی بد"],
      notePlaceholder: "یادداشت امروز... (اختیاری)",
      save: "ذخیره",
      remove: "حذف روز",
      exportBtn: "پشتیبان‌گیری",
      importBtn: "بازیابی",
      savedMsg: "ذخیره شد ✓",
      deletedMsg: "حذف شد",
      importedMsg: "اطلاعات بازیابی شد",
      importErrorMsg: "فایل پشتیبان نامعتبر است",
      confirmDelete: "این روز حذف شود؟"
    },

    en: {
      dir: "ltr",
      title: "Daily Mood Tracker",
      today: "Today",
      langSwitchLabel: "فا",
      months: ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
        "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"],
      weekdays: ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"],
      weekdaysLong: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      moods: ["Great", "Good", "Okay", "Bad", "Awful"],
      notePlaceholder: "Today's note... (optional)",
      save: "Save",
      remove: "Delete day",
      exportBtn: "Export",
      importBtn: "Import",
      savedMsg: "Saved ✓",
      deletedMsg: "Deleted",
      importedMsg: "Backup restored",
      importErrorMsg: "Invalid backup file",
      confirmDelete: "Delete this day?"
    }
  };

  var currentLang = "fa";

  /* Convert latin digits to Persian digits when lang is fa */
  function formatNumber(n) {
    var s = String(n);
    if (currentLang !== "fa") return s;
    var faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return s.replace(/[0-9]/g, function (d) { return faDigits[+d]; });
  }

  return {
    get lang() { return currentLang; },

    t: function (key) {
      return LANGS[currentLang][key];
    },

    formatNumber: formatNumber,

    setLang: function (lang) {
      if (!LANGS[lang]) return;
      currentLang = lang;

      document.documentElement.lang = lang;
      document.documentElement.dir = this.t("dir");
      document.title = this.t("title");
    },

    toggle: function () {
      this.setLang(currentLang === "fa" ? "en" : "fa");
      return currentLang;
    },

    /* Jalali weekday index where week starts on Saturday */
    weekdayName: function (gregorianDay) {
      var idx = (gregorianDay + 1) % 7; // JS: 0=Sun ... 6=Sat -> Sat-first index
      return this.t("weekdays")[idx];
    },

    formatFullDate: function (jy, jm, jd) {
      var month = this.t("months")[jm - 1];
      if (currentLang === "fa") {
        return formatNumber(jd) + " " + month + " " + formatNumber(jy);
      }
      return month + " " + jd + ", " + jy;
    }
  };
})();
