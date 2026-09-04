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
      savedMsg: "ذخیره شد ✓",
      deletedMsg: "حذف شد",
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
      themesTitle: "پوسته",
      todoList: "لیست کارها",

      /* ----- Auth / حساب کاربری ----- */
      authLoginTitle: "ورود به حساب",
      authSignupTitle: "ساخت حساب",
      authLogin: "ورود",
      authSignup: "ثبت‌نام",
      authLoginBtn: "ورود",
      authSignupBtn: "ساخت حساب",
      authLogout: "خروج از حساب",
      authEmail: "ایمیل",
      authPassword: "رمز عبور",
      authNewPassword: "رمز عبور جدید",
      authEmailPlaceholder: "you@example.com",
      authPassHint: "رمز عبور باید حداقل ۶ کاراکتر باشد",
      authForgot: "فراموشی رمز عبور؟",
      authOr: "یا",
      authGoogle: "ادامه با گوگل",
      authChangePass: "تغییر رمز عبور",
      authChangePassBtn: "ذخیره رمز جدید",
      authShowPass: "نمایش رمز",
      authHidePass: "مخفی کردن رمز",
      authHintLogin: "با ورود، اطلاعات شما بین همه دستگاه‌ها همگام می‌شود.",
      authHintSignup: "حساب بساز تا اطلاعات روی همه دستگاه‌هایت همیشه به‌روز باشد.",
      authBusy: "لطفاً صبر کنید…",
      authLoginOk: "خوش برگشتی 👋",
      authResetSent: "ایمیل بازیابی رمز ارسال شد؛ ایمیلت را بررسی کن.",
      authPassChanged: "رمز عبور عوض شد ✓",
      authLoggedOut: "از حسابت خارج شدی. اطلاعاتت روی همین دستگاه می‌ماند.",
      authErrEmail: "یک ایمیل معتبر وارد کن",
      authErrPassRequired: "رمز عبور را وارد کن",
      authErrWeakPass: "رمز عبور باید حداقل ۶ کاراکتر باشد",
      authErrInvalid: "ایمیل یا رمز عبور درست نیست",
      authErrExists: "این ایمیل قبلاً ثبت شده؛ وارد شو",
      authErrRateLimit: "تلاش‌های زیاد؛ کمی بعد دوباره امتحان کن",
      authErrNetwork: "اتصال برقرار نشد؛ اینترنت را بررسی کن",
      authErrGeneric: "خطایی رخ داد؛ دوباره تلاش کن",
      authCheckEmail: "برای تأیید حساب، ایمیلت را بررسی کن",

      /* ----- Sync status ----- */
      syncNow: "همگام‌سازی الان",
      syncStatusSynced: "همه‌چیز همگام است ✓",
      syncStatusSyncedAt: "همگام شد · {0}",
      syncStatusPending: "{0} مورد منتظر همگام‌سازی",
      syncStatusSyncing: "در حال همگام‌سازی…",
      syncStatusOffline: "آفلاین — بعداً همگام می‌شود",
      syncStatusError: "همگام‌سازی ناموفق بود",
      syncStatusOff: "همگام‌سازی غیرفعال",

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

      /* ----- Birthdays view ----- */
      bdayTitle: "تولدها",
      bdayNamePlaceholder: "اسم شخص...",
      bdayDayLabel: "روز",
      bdayMonthLabel: "ماه",
      bdayYearLabel: "سال",
      bdayToday: "امروز تولدشه! 🎉",
      bdayTomorrow: "فردا! 🎁",
      bdayInDays: "{0} روز مانده",
      bdayCountMsg: "{0} تولد ثبت شده",
      bdayEmptyText: "هنوز تولدی اضافه نشده.<br />اولین تولد رو اضافه کن!",
      bdayNameRequired: "اول اسم را بنویس",
      bdayInvalidDay: "این روز در این ماه معتبر نیست",
      bdayConfirmDelete: "این تولد حذف شود؟",
      bdayAdded: "اضافه شد ✓",
      bdayEdited: "ویرایش شد ✓",
      bdayDeleted: "حذف شد",
      bdayEditAria: "ویرایش",
      bdayDelAria: "حذف",

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
      savedMsg: "Saved ✓",
      deletedMsg: "Deleted",
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
      themesTitle: "Themes",
      todoList: "To-Do List",

      /* ----- Auth / Account ----- */
      authLoginTitle: "Log in",
      authSignupTitle: "Create account",
      authLogin: "Log in",
      authSignup: "Sign up",
      authLoginBtn: "Log in",
      authSignupBtn: "Create account",
      authLogout: "Log out",
      authEmail: "Email",
      authPassword: "Password",
      authNewPassword: "New password",
      authEmailPlaceholder: "you@example.com",
      authPassHint: "Use at least 6 characters",
      authForgot: "Forgot password?",
      authOr: "or",
      authGoogle: "Continue with Google",
      authChangePass: "Change password",
      authChangePassBtn: "Save new password",
      authShowPass: "Show password",
      authHidePass: "Hide password",
      authHintLogin: "Log in to sync your data across all your devices.",
      authHintSignup: "Create an account to keep your data in sync everywhere.",
      authBusy: "Please wait…",
      authLoginOk: "Welcome back 👋",
      authResetSent: "Password reset email sent — check your inbox.",
      authPassChanged: "Password changed ✓",
      authLoggedOut: "Logged out. Your data stays on this device.",
      authErrEmail: "Enter a valid email address",
      authErrPassRequired: "Enter your password",
      authErrWeakPass: "Password must be at least 6 characters",
      authErrInvalid: "Invalid email or password",
      authErrExists: "This email is already registered — try logging in",
      authErrRateLimit: "Too many attempts — try again later",
      authErrNetwork: "Network error — check your connection",
      authErrGeneric: "Something went wrong — try again",
      authCheckEmail: "Check your email to confirm your account",

      /* ----- Sync status ----- */
      syncNow: "Sync now",
      syncStatusSynced: "All synced ✓",
      syncStatusSyncedAt: "Synced · {0}",
      syncStatusPending: "{0} change(s) waiting to sync",
      syncStatusSyncing: "Syncing…",
      syncStatusOffline: "Offline — will sync later",
      syncStatusError: "Sync failed",
      syncStatusOff: "Sync disabled",

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

      /* ----- Birthdays view ----- */
      bdayTitle: "Birthdays",
      bdayNamePlaceholder: "Person's name...",
      bdayDayLabel: "Day",
      bdayMonthLabel: "Month",
      bdayYearLabel: "Year",
      bdayToday: "Birthday is today! 🎉",
      bdayTomorrow: "Tomorrow! 🎁",
      bdayInDays: "{0} days left",
      bdayCountMsg: "{0} birthdays saved",
      bdayEmptyText: "No birthdays yet.<br />Add your first one!",
      bdayNameRequired: "Write a name first",
      bdayInvalidDay: "This day is not valid in this month",
      bdayConfirmDelete: "Delete this birthday?",
      bdayAdded: "Added ✓",
      bdayEdited: "Saved ✓",
      bdayDeleted: "Deleted",
      bdayEditAria: "Edit",
      bdayDelAria: "Delete",

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