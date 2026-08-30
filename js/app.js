/* ============================================
   APP
   Initialization, modal, language switching,
   dashboard button, streak, toast messages, user name +
   time-based greeting, day-edit restrictions.
   ============================================ */

var App = (function () {
  "use strict";

  var selectedDate = null; // { jy, jm, jd }
  var selectedMood = null;
  var firstVisit = false;

  /* ----- Helpers ----- */
  function $(id) { return document.getElementById(id); }

  function showToast(msg) {
    var holder = $("toastHolder");
    var box = document.createElement("div");
    box.className = "toast-box";
    box.textContent = msg;
    holder.innerHTML = "";
    holder.appendChild(box);
  }

  function setChevrons() {
    var rtl = I18N.t("dir") === "rtl";
    $("prevMonthBtn").textContent = rtl ? "\u203A" : "\u2039"; // › : ‹
    $("nextMonthBtn").textContent = rtl ? "\u2039" : "\u203A"; // ‹ : ›
  }

  /* ----- Legend ----- */
  function renderLegend() {
    var labels = I18N.t("moods");
    var html = Moods.list.map(function (m, i) {
      return '<span class="legend-item">' +
        '<span class="legend-dot mood-dot-' + m.colorVar.slice(5) + '"></span>' +
        m.emoji + " " + labels[i] + "</span>";
    }).join("");
    $("moodLegend").innerHTML = html;
  }

  /* ----- Static texts (header, buttons) ----- */
  function applyTexts() {
    $("appTitle").textContent = I18N.t("title");
    $("langToggle").textContent = I18N.t("langSwitchLabel");
    $("todayBtn").textContent = I18N.t("today");
    $("dashboardBtn").textContent = I18N.t("dashboard");
    $("saveEntryBtn").textContent = I18N.t("save");
    $("deleteEntryBtn").textContent = I18N.t("remove");
    $("noteInput").placeholder = I18N.t("notePlaceholder");
    $("nameInput").placeholder = I18N.t("namePlaceholder");
    $("saveNameBtn").textContent = I18N.t("startBtn");
    $("cancelNameBtn").textContent = I18N.t("cancel");
    $("githubLink").title = I18N.t("githubLabel");
    $("githubLink").setAttribute("aria-label", I18N.t("githubLabel"));

    /* Footer button: now opens the Birthdays page */
    $("todoLinkLabel").textContent = I18N.t("birthdays");
    $("todoLink").title = I18N.t("birthdays");
    $("todoLink").setAttribute("aria-label", I18N.t("birthdays"));

    /* To-do side panel */
    $("todoPanelTitle").textContent = I18N.t("todoList");
    $("todoAddBtn").textContent = I18N.t("todoAddBtn");
    $("todoInput").placeholder = I18N.t("todoAddPlaceholder");
    $("todoEmpty").innerHTML =
      '<span class="todo-empty-emoji" aria-hidden="true">🗒️</span><p>' +
      I18N.t("todoEmptyText") + "</p>";

    /* Bottom navigation labels (mobile) */
    $("navBirthdaysLabel").textContent = I18N.t("birthdays");
    $("navDashLabel").textContent = I18N.t("dashboard");
    $("navHomeLabel").textContent = I18N.t("navHome");
    $("navYearLabel").textContent = I18N.t("navYear");
    $("navTodoLabel").textContent = I18N.t("navTodo");

    setChevrons();
    renderGreeting();
  }

  function applyAll() {
    applyTexts();
    renderLegend();
    Calendar.render();
    TodoApp.render();
    YearCounter.render();
    ThemeManager.refresh();
    Streak.refresh();
    if (document.body.getAttribute("data-view") === "dashboard") {
      Dashboard.refresh();
    }
  }

  /* ----- Greeting (time of day + stored name) ----- */
  function greetingKey() {
    var h = new Date().getHours();
    if (h < 12) return "greetMorning";
    if (h < 17) return "greetAfternoon";
    return "greetEvening";
  }

  function renderGreeting() {
    var btn = $("greetBtn");
    var name = Storage.getSetting("userName");

    if (!name) {
      btn.classList.add("hidden");
      return;
    }
    btn.classList.remove("hidden");

    var sep = I18N.lang === "fa" ? "\u060C " : ", ";
    $("greetText").textContent =
      I18N.t(greetingKey()) + sep + name;

    document.title = $("greetText").textContent + " — " + I18N.t("title");
  }

  /* ----- Name dialog (first visit / rename) ----- */
  function promptName(isFirstVisit) {
    firstVisit = !!isFirstVisit;
    $("welcomeTitle").textContent =
      firstVisit ? I18N.t("welcomeTitle") : I18N.t("editNameTitle");
    $("cancelNameBtn").style.display = firstVisit ? "none" : "";
    $("nameInput").value = Storage.getSetting("userName") || "";
    $("welcomeOverlay").classList.remove("hidden");
    setTimeout(function () { $("nameInput").focus(); }, 50);
  }

  function closeNameDialog() {
    $("welcomeOverlay").classList.add("hidden");
    firstVisit = false;
  }

  function saveName() {
    var name = $("nameInput").value.trim();
    if (!name) {
      showToast(I18N.t("nameRequiredMsg"));
      return;
    }
    Storage.setSetting("userName", name);
    closeNameDialog();
    renderGreeting();
  }

  /* ----- Modal ----- */
  function renderMoodPicker() {
    var labels = I18N.t("moods");
    var picker = $("moodPicker");
    picker.innerHTML = "";

    Moods.list.forEach(function (m, i) {
      var level = i + 1;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mood-option" + (selectedMood === level ? " selected" : "");
      btn.title = labels[i];
      btn.innerHTML = "<span>" + m.emoji + "</span><small>" + labels[i] + "</small>";
      btn.addEventListener("click", function () {
        selectedMood = level;
        renderMoodPicker();
      });
      picker.appendChild(btn);
    });
  }

  function openModal(date) {
    if (!Calendar.isEditable(date.jy, date.jm, date.jd)) return;

    selectedDate = date;
    var entry = Storage.getEntry(date.jy, date.jm, date.jd);
    selectedMood = entry ? entry.mood : null;
    $("noteInput").value = entry && entry.note ? entry.note : "";
    $("modalDateTitle").textContent = I18N.formatFullDate(date.jy, date.jm, date.jd);

    /* Hide delete when there is nothing to delete */
    $("deleteEntryBtn").style.display = entry ? "" : "none";

    renderMoodPicker();
    $("modalOverlay").classList.remove("hidden");
  }

  function closeModal() {
    $("modalOverlay").classList.add("hidden");
    selectedDate = null;
    selectedMood = null;
    Calendar.render();
  }

  function anyOverlayOpen() {
    return !$("modalOverlay").classList.contains("hidden") ||
      !$("welcomeOverlay").classList.contains("hidden");
  }

  function closeOverlays() {
    if (!$("modalOverlay").classList.contains("hidden")) closeModal();
    if (!firstVisit && !$("welcomeOverlay").classList.contains("hidden")) {
      closeNameDialog();
    }
  }

  /* ----- Timers (greeting + auto theme re-check) ----- */
  function startTimers() {
    setInterval(function () {
      renderGreeting();
      ThemeManager.refresh();
    }, 60000);
  }

  /* ----- Events ----- */
  function wireEvents() {
    $("prevMonthBtn").addEventListener("click", function () { Calendar.prev(); });
    $("nextMonthBtn").addEventListener("click", function () { Calendar.next(); });
    $("todayBtn").addEventListener("click", function () { Calendar.goToday(); });

    /* Dashboard toggles the embedded dashboard view
       (instead of navigating to a separate page) */
    $("dashboardBtn").addEventListener("click", function (e) {
      e.preventDefault();
      var cur = document.body.getAttribute("data-view");
      Views.show(cur === "dashboard" ? "home" : "dashboard");
    });

    $("closeModalBtn").addEventListener("click", closeModal);
    $("modalOverlay").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });

    $("saveEntryBtn").addEventListener("click", function () {
      if (!selectedDate) return;

      /* Defense in depth: never save outside the editable window */
      if (!Calendar.isEditable(selectedDate.jy, selectedDate.jm, selectedDate.jd)) {
        showToast(I18N.t("dateLockedMsg"));
        return;
      }
      if (!selectedMood) {
        showToast(I18N.t("selectMoodMsg"));
        return;
      }

      Storage.setEntry(selectedDate.jy, selectedDate.jm, selectedDate.jd,
        selectedMood, $("noteInput").value.trim());
      closeModal();
      showToast(I18N.t("savedMsg"));
    });

    $("deleteEntryBtn").addEventListener("click", function () {
      if (!selectedDate) return;
      if (!window.confirm(I18N.t("confirmDelete"))) return;
      Storage.removeEntry(selectedDate.jy, selectedDate.jm, selectedDate.jd);
      closeModal();
      showToast(I18N.t("deletedMsg"));
    });

    $("langToggle").addEventListener("click", function () {
      var lang = I18N.toggle();
      Storage.setSetting("lang", lang);
      applyAll();
    });

    /* Name dialog */
    $("greetBtn").addEventListener("click", function () { promptName(false); });
    $("saveNameBtn").addEventListener("click", saveName);
    $("cancelNameBtn").addEventListener("click", closeNameDialog);
    $("nameInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") saveName();
    });

    /* Escape closes whichever overlay is open */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && anyOverlayOpen()) closeOverlays();
    });
  }

  /* ----- Init ----- */
  function init() {
    var savedLang = Storage.getSetting("lang");
    I18N.setLang(savedLang === "en" ? "en" : "fa");

    wireEvents();

    /* Calendar month must be initialized BEFORE any render
       (fixes the invalid jy=0/jm=0 first paint) */
    Calendar.init(openModal);

    ThemeManager.init();
    Streak.init();
    applyAll();

    startTimers();

    /* First visit → ask for the user's name */
    if (!Storage.getSetting("userName")) {
      promptName(true);
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    get selectedDate() { return selectedDate; },
    openModal: openModal
  };
})();
