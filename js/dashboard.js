/* ============================================
   DASHBOARD — js/dashboard.js
   Profile (name / age / interests), stats
   (mood today, notes count, tasks done %,
   30-day average mood out of 10) and the
   weekly report chart. Theme switching lives
   in the Themes section (js/theme.js).
   ============================================ */

var Dashboard = (function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function showToast(msg) {
    var holder = $("toastHolder");
    var box = document.createElement("div");
    box.className = "toast-box";
    box.textContent = msg;
    holder.innerHTML = "";
    holder.appendChild(box);
  }

  /* Mood level (1..5) -> score out of 10 (10..0), linear */
  function scoreOf(level) { return (5 - level) * 2.5; }

  function fmtScore(x) {
    var r = Math.round(x * 10) / 10;
    return I18N.formatNumber(r % 1 === 0 ? Math.round(r) : r);
  }

  /* ----- Stat: mood today ----- */
  function renderMoodToday() {
    var t = Jalali.today();
    var entry = Storage.getEntry(t.jy, t.jm, t.jd);
    var el = $("moodTodayValue");

    if (entry) {
      el.innerHTML =
        '<span class="stat-emoji">' + Moods.emojiOf(entry.mood) + "</span>" +
        '<span class="stat-caption">' + I18N.t("moods")[entry.mood - 1] + "</span>";
    } else {
      el.innerHTML =
        '<span class="stat-emoji stat-emoji-empty">🫥</span>' +
        '<span class="stat-caption">' + I18N.t("moodTodayEmpty") + "</span>";
    }
  }

  /* ----- Stat: notes count ----- */
  function renderNotesCount() {
    var entries = Storage.entries();
    var count = 0;
    Object.keys(entries).forEach(function (k) {
      var e = entries[k];
      if (e && typeof e.note === "string" && e.note.trim()) count += 1;
    });
    $("notesValue").innerHTML =
      '<span class="stat-big">' + I18N.formatNumber(count) + "</span>";
  }

  /* ----- Stat: tasks done % (reads the to-do list storage) ----- */
  function renderTasks() {
    var items = [];
    try {
      var raw = localStorage.getItem("todoTracker.v1");
      var data = raw ? JSON.parse(raw) : null;
      if (data && Array.isArray(data.items)) items = data.items;
    } catch (e) {
      items = [];
    }

    var el = $("tasksValue");
    var total = items.length;

    if (total === 0) {
      el.innerHTML = '<span class="stat-caption">' + I18N.t("tasksEmpty") + "</span>";
      return;
    }

    var done = items.filter(function (it) { return it && it.done; }).length;
    var pct = Math.round((done * 100) / total);
    var sign = I18N.lang === "fa" ? "٪" : "%";

    el.innerHTML =
      '<span class="stat-big">' + I18N.formatNumber(pct) + sign + "</span>" +
      '<span class="stat-caption">' + I18N.f("tasksDone", I18N.formatNumber(pct)) + "</span>" +
      '<div class="progress" role="progressbar" aria-valuenow="' + pct +
        '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="progress-fill" style="width:' + pct + '%"></div>' +
      "</div>";
  }

  /* ----- Stat: average mood over the past 30 days (out of 10) ----- */
  function renderAvg() {
    var entries = Storage.entries();
    var t = Jalali.today();
    var tjdn = Jalali.jdn(t.jy, t.jm, t.jd);

    var sum = 0;
    var n = 0;
    Object.keys(entries).forEach(function (k) {
      var p = k.split("-");
      if (p.length !== 3) return;
      var jy = +p[0]; var jm = +p[1]; var jd = +p[2];
      if (!jy || !jm || !jd) return;
      var dist = tjdn - Jalali.jdn(jy, jm, jd);
      if (dist < 0 || dist > 29) return; // only the last 30 days
      var e = entries[k];
      if (!e || typeof e.mood !== "number" || e.mood < 1 || e.mood > Moods.COUNT) return;
      sum += scoreOf(e.mood);
      n += 1;
    });

    var el = $("avgValue");
    if (n === 0) {
      el.innerHTML = '<span class="stat-caption">' + I18N.t("noData") + "</span>";
      return;
    }
    el.innerHTML =
      '<span class="stat-big">' + fmtScore(sum / n) + "</span>" +
      '<span class="stat-caption">' + I18N.t("outOf10") + "</span>";
  }

  /* ----- Weekly report: mood chart of the current Jalali week
     (Saturday -> Friday, same week start as the calendar) ----- */
  function renderWeekly() {
    var t = Jalali.today();
    var tjdn = Jalali.jdn(t.jy, t.jm, t.jd);
    var g = Jalali.toGregorian(t.jy, t.jm, t.jd);
    var jsToday = new Date(g.gy, g.gm - 1, g.gd);

    /* Saturday-first index of today (matches the main calendar) */
    var satIndex = (jsToday.getDay() + 1) % 7;

    var weekdays = I18N.t("weekdays");
    var weekdaysLong = I18N.t("weekdaysLong");

    var html = "";
    var sum = 0;
    var n = 0;

    for (var i = 0; i < 7; i += 1) {
      var d = new Date(jsToday);
      d.setDate(d.getDate() - satIndex + i); // day i of the current week

      var j = Jalali.toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      var jdn = Jalali.jdn(j.jy, j.jm, j.jd);
      var entry = Storage.getEntry(j.jy, j.jm, j.jd);

      var cls = "week-cell";
      if (jdn === tjdn) cls += " is-today";
      if (jdn > tjdn) cls += " is-future";

      var emojiHtml;
      if (entry) {
        cls += " mood-bg-" + entry.mood;
        emojiHtml = '<span class="week-emoji">' + Moods.emojiOf(entry.mood) + "</span>";
        sum += scoreOf(entry.mood);
        n += 1;
      } else if (jdn > tjdn) {
        emojiHtml = '<span class="week-emoji week-emoji-future">·</span>';
      } else {
        emojiHtml = '<span class="week-dot"></span>';
      }

      html += '<div class="' + cls + '">' +
        '<span class="week-day" title="' + weekdaysLong[i] + '">' + weekdays[i] + "</span>" +
        emojiHtml +
        '<span class="week-num">' + I18N.formatNumber(j.jd) + "</span>" +
        "</div>";
    }

    $("weekGrid").innerHTML = html;

    var summary = $("weekSummary");
    if (n === 0) {
      summary.innerHTML = '<span class="week-msg">' + I18N.t("weeklyEmpty") + "</span>";
    } else {
      summary.innerHTML =
        '<span class="week-msg">' + I18N.f("weeklyAvg", fmtScore(sum / n)) + "</span>" +
        '<span class="week-msg week-msg-muted">' +
          I18N.f("weeklyDays", I18N.formatNumber(n)) + "</span>";
    }
  }

  /* ----- Profile ----- */
  function fillProfile() {
    $("dashNameInput").value = Storage.getSetting("userName") || "";
    var age = Storage.getSetting("userAge");
    $("ageInput").value = age == null ? "" : age;
    $("interestsInput").value = Storage.getSetting("userInterests") || "";
  }

  function saveProfile() {
    var name = $("dashNameInput").value.trim();
    if (!name) {
      showToast(I18N.t("nameRequiredMsg"));
      return;
    }

    var ageRaw = $("ageInput").value.trim();
    var age = null;
    if (ageRaw !== "") {
      age = Number(ageRaw);
      if (!isFinite(age) || age < 1 || age > 120 || Math.floor(age) !== age) {
        showToast(I18N.t("ageInvalidMsg"));
        return;
      }
    }

    Storage.setSetting("userName", name);
    Storage.setSetting("userAge", age);
    Storage.setSetting("userInterests", $("interestsInput").value.trim());
    showToast(I18N.t("profileSaved"));
  }

  /* ----- Static texts ----- */
  function applyTexts() {
    $("profileTitle").textContent = I18N.t("profileTitle");
    $("nameLabel").textContent = I18N.t("nameLabel");
    $("ageLabel").textContent = I18N.t("ageLabel");
    $("interestsLabel").textContent = I18N.t("interestsLabel");
    $("dashNameInput").placeholder = I18N.t("namePlaceholder");
    $("ageInput").placeholder = I18N.t("agePlaceholder");
    $("interestsInput").placeholder = I18N.t("interestsPlaceholder");
    $("saveProfileBtn").textContent = I18N.t("saveProfile");

    $("moodTodayTitle").textContent = I18N.t("moodToday");
    $("notesTitle").textContent = I18N.t("notesCount");
    $("tasksTitle").textContent = I18N.t("tasksTitle");
    $("avgTitle").textContent = I18N.t("avgMood");

    $("weeklyTitle").textContent = I18N.t("weeklyReport");

    $("themesTitle").textContent = I18N.t("themesTitle");
  }

  function applyAll() {
    applyTexts();
    fillProfile();
    renderMoodToday();
    renderNotesCount();
    renderTasks();
    renderAvg();
    renderWeekly();
    ThemeManager.refresh();
    Streak.refresh();
  }

  /* ----- Events -----
     (Theme buttons are wired by ThemeManager.init in js/theme.js) */
  function wireEvents() {
    $("saveProfileBtn").addEventListener("click", saveProfile);

    ["dashNameInput", "ageInput", "interestsInput"].forEach(function (id) {
      $(id).addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          saveProfile();
        }
      });
    });
  }

  /* ----- Show -----
     Called by Views each time the dashboard view opens
     (the dashboard is embedded in index.html now, so it
     no longer manages its own page/theme/streak init —
     app.js owns those). Events are wired once; stats
     refresh on every open. */
  var inited = false;
  function show() {
    if (!inited) {
      inited = true;
      wireEvents();
    }
    applyAll();
  }

  return { show: show, refresh: applyAll };
})();