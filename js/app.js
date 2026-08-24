/* ============================================
   APP
   Initialization, modal, language switching,
   export/import, toast messages.
   ============================================ */

var App = (function () {
  "use strict";

  var selectedDate = null; // { jy, jm, jd }
  var selectedMood = null;

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
    $("exportBtn").textContent = I18N.t("exportBtn");
    $("importBtn").textContent = I18N.t("importBtn");
    $("saveEntryBtn").textContent = I18N.t("save");
    $("deleteEntryBtn").textContent = I18N.t("remove");
    $("noteInput").placeholder = I18N.t("notePlaceholder");
    setChevrons();
  }

  function applyAll() {
    applyTexts();
    renderLegend();
    Calendar.render();
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
    selectedDate = date;
    var entry = Storage.getEntry(date.jy, date.jm, date.jd);
    selectedMood = entry ? entry.mood : null;
    $("noteInput").value = entry && entry.note ? entry.note : "";
    $("modalDateTitle").textContent = I18N.formatFullDate(date.jy, date.jm, date.jd);
    renderMoodPicker();
    $("modalOverlay").classList.remove("hidden");
  }

  function closeModal() {
    $("modalOverlay").classList.add("hidden");
    selectedDate = null;
    selectedMood = null;
    Calendar.render();
  }

  /* ----- Events ----- */
  function wireEvents() {
    $("prevMonthBtn").addEventListener("click", function () { Calendar.prev(); });
    $("nextMonthBtn").addEventListener("click", function () { Calendar.next(); });
    $("todayBtn").addEventListener("click", function () { Calendar.goToday(); });

    $("closeModalBtn").addEventListener("click", closeModal);
    $("modalOverlay").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });

    $("saveEntryBtn").addEventListener("click", function () {
      if (!selectedDate || !selectedMood) {
        showToast(I18N.t("importErrorMsg")); // fallback text, should not happen
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

    $("exportBtn").addEventListener("click", function () {
      Storage.exportToFile();
    });

    $("importFileInput").addEventListener("change", function () {
      var file = this.files[0];
      this.value = "";
      if (!file) return;
      Storage.importFromFile(file, function (err) {
        if (err) {
          showToast(I18N.t("importErrorMsg"));
        } else {
          Calendar.goToday();
          showToast(I18N.t("importedMsg"));
        }
      });
    });

    $("importBtn").addEventListener("click", function () {
      $("importFileInput").click();
    });

    $("langToggle").addEventListener("click", function () {
      var lang = I18N.toggle();
      Storage.setSetting("lang", lang);
      applyAll();
    });
  }

  /* ----- Init ----- */
  function init() {
    var savedLang = Storage.getSetting("lang");
    I18N.setLang(savedLang === "en" ? "en" : "fa");

    wireEvents();
    applyAll();
    Calendar.init(openModal);
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    get selectedDate() { return selectedDate; },
    openModal: openModal
  };
})();
