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
      confirmDelete: "این روز حذف شود؟",
      selectMoodMsg: "اول یکی از حال‌ها را انتخاب کن",
      dateLockedMsg: "این روز قابل ثبت نیست",
      greetMorning: "صبح بخیر",
      greetAfternoon: "بعدازظهر بخیر",
      greetEvening: "شب بخیر",
      welcomeTitle: "خوش اومدی! اسمت چیه؟",
      editNameTitle: "اسمت رو تغییر بده",
      namePlaceholder: "مثلاً سارا",
      nameRequiredMsg: "لطفاً نامت را وارد کن",
      startBtn: "شروع کنیم",
      cancel: "انصراف",
      themeLight: "روشن",
      themeDark: "تیره",
      themeAuto: "خودکار",
      themeToggleTitle: "تغییر پوسته",
      todoList: "لیست کارها",
      githubLabel: "گیت‌هاب — سورس پروژه",

      /* ----- Year counter panel ----- */
      yearCounter: "شمارنده سال",
      daysPassed: "{0} روز گذشته",
      daysLeft: "{0} روز باقی مانده",

      /* ----- To-do panel (side panel / mobile view) ----- */
      todoAddPlaceholder: "یک کار جدید بنویس...",
      todoAddBtn: "＋ افزودن",
      todoLeft: "{0} کار باقی مانده از {1}",
      todoFavDivider: "⭐ مهم",
      todoDoneDivider: "انجام‌شده",
      todoEmptyText: "هنوز کاری اضافه نشده.",
      todoWriteFirst: "اول متن کار را بنویس",
      todoAdded: "اضافه شد ✓",
      todoDeleted: "حذف شد",
      todoConfirmDelete: "این کار حذف شود؟",
      todoEdited: "ویرایش شد ✓",
      todoTextRequired: "متن کار خالی است",

      /* ----- Bottom navigation (mobile) ----- */
      birthdays: "تولدها",
      navHome: "خانه",
      navYear: "شمارنده",
      navTodo: "کارها",

      /* ----- Dashboard ----- */
      dashboard: "داشبورد",
      back: "بازگشت",
      streakLabel: "روز پیوسته",
      streakTitle: "روزهای پیوسته بازدید",
      moodToday: "حال امروز",
      moodTodayEmpty: "برای امروز هنوز حالی ثبت نکردی",
      notesCount: "یادداشت‌ها",
      tasksTitle: "کارها",
      tasksDone: "{0}٪ از کارهات انجام شده",
      tasksEmpty: "هنوز کاری ثبت نکردی",
      avgMood: "میانگین حال ۳۰ روز اخیر",
      outOf10: "از ۱۰",
      weeklyReport: "گزارش هفتگی",
      weeklyAvg: "میانگین هفته: {0} از ۱۰",
      weeklyDays: "{0} روز از ۷ روز هفته ثبت شده",
      weeklyEmpty: "این هفته هنوز حالی ثبت نشده",
      noData: "هنوز داده‌ای ثبت نشده",
      profileTitle: "پروفایل من",
      nameLabel: "نام",
      ageLabel: "سن",
      interestsLabel: "علاقه‌مندی‌ها",
      agePlaceholder: "مثلاً ۲۵",
      interestsPlaceholder: "مثلاً موسیقی، ورزش، کتاب خواندن",
      saveProfile: "ذخیره پروفایل",
      profileSaved: "پروفایل ذخیره شد ✓",
      ageInvalidMsg: "سن باید عددی بین ۱ تا ۱۲۰ باشد",
      backupTitle: "پشتیبان‌گیری و بازیابی",
      backupDesc: "از اطلاعات‌ات نسخه پشتیبان بگیر یا فایل پشتیبان قبلی را بازیابی کن.",
      updateInstalled: "به‌روزرسانی جدید نصب شد ✨"
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
      confirmDelete: "Delete this day?",
      selectMoodMsg: "Pick a mood first",
      dateLockedMsg: "This day can't be edited",
      greetMorning: "Good morning",
      greetAfternoon: "Good afternoon",
      greetEvening: "Good evening",
      welcomeTitle: "Welcome! What's your name?",
      editNameTitle: "Change your name",
      namePlaceholder: "e.g. Sara",
      nameRequiredMsg: "Please enter your name",
      startBtn: "Let's start",
      cancel: "Cancel",
      themeLight: "Light",
      themeDark: "Dark",
      themeAuto: "Auto",
      themeToggleTitle: "Change theme",
      todoList: "To-Do List",
      githubLabel: "GitHub — project source",

      /* ----- Year counter panel ----- */
      yearCounter: "Year Counter",
      daysPassed: "{0} days passed",
      daysLeft: "{0} days left",

      /* ----- To-do panel (side panel / mobile view) ----- */
      todoAddPlaceholder: "Write a new task...",
      todoAddBtn: "＋ Add",
      todoLeft: "{0} tasks left out of {1}",
      todoFavDivider: "⭐ Important",
      todoDoneDivider: "Done",
      todoEmptyText: "Nothing added yet.",
      todoWriteFirst: "Write the task text first",
      todoAdded: "Added ✓",
      todoDeleted: "Deleted",
      todoConfirmDelete: "Delete this task?",
      todoEdited: "Saved ✓",
      todoTextRequired: "Task text is empty",

      /* ----- Bottom navigation (mobile) ----- */
      birthdays: "Birthdays",
      navHome: "Home",
      navYear: "Counter",
      navTodo: "Tasks",

      /* ----- Dashboard ----- */
      dashboard: "Dashboard",
      back: "Back",
      streakLabel: "day streak",
      streakTitle: "Daily visit streak",
      moodToday: "Your mood today",
      moodTodayEmpty: "No mood recorded for today",
      notesCount: "Notes",
      tasksTitle: "Tasks",
      tasksDone: "{0}% of your tasks are done",
      tasksEmpty: "No tasks yet",
      avgMood: "Average mood (last 30 days)",
      outOf10: "out of 10",
      weeklyReport: "Weekly Report",
      weeklyAvg: "Week average: {0} out of 10",
      weeklyDays: "{0} of 7 days recorded",
      weeklyEmpty: "No moods recorded this week yet",
      noData: "No data recorded yet",
      profileTitle: "My Profile",
      nameLabel: "Name",
      ageLabel: "Age",
      interestsLabel: "Interests",
      agePlaceholder: "e.g. 25",
      interestsPlaceholder: "e.g. music, sports, reading",
      saveProfile: "Save profile",
      profileSaved: "Profile saved ✓",
      ageInvalidMsg: "Age must be a whole number between 1 and 120",
      backupTitle: "Backup & Restore",
      backupDesc: "Download a backup of your data or restore a previous backup file.",
      updateInstalled: "New version installed ✨"
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

    /* t() with {0}, {1}, ... placeholders */
    f: function (key) {
      var s = LANGS[currentLang][key];
      if (typeof s !== "string") return "";
      for (var i = 1; i < arguments.length; i += 1) {
        s = s.split("{" + (i - 1) + "}").join(String(arguments[i]));
      }
      return s;
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