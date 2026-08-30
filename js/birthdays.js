/* ============================================
   BIRTHDAYS — js/birthdays.js
   The former to-do page, repurposed. Persian-only.
   Storage key: "birthdaysTracker.v1"
   Item shape: { id, name, dateISO "yyyy-mm-dd", createdAt }
   Birth dates are entered with Jalali (Shamsi)
   day / month / year dropdowns; the stored dateISO
   is the equivalent Gregorian date. Each card shows
   the name, the Jalali date and the days remaining
   until the next birthday.
   Features: add, edit, delete, sorted by soonest.
   ============================================ */

var Birthdays = (function () {
  "use strict";

  var KEY = "birthdaysTracker.v1";
  var editingId = null;
  var MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var YEAR_RANGE = 120; // how many years back the year dropdown goes

  function $(id) { return document.getElementById(id); }

  /* ----- Storage ----- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
        return { items: [] };
      }
      return data;
    } catch (e) {
      return { items: [] };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ----- UI helpers ----- */
  function showToast(msg) {
    var holder = $("toastHolder");
    var box = document.createElement("div");
    box.className = "toast-box";
    box.textContent = msg;
    holder.innerHTML = "";
    holder.appendChild(box);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ----- Date helpers ----- */
  function parseISO(iso) {
    var p = iso.split("-");
    return { gy: +p[0], gm: +p[1], gd: +p[2] };
  }

  function maxDay(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return Jalali.isLeapYear(jy) ? 30 : 29;
  }

  /* Days until the next occurrence of this month/day
     (0 = today). Feb 29 rolls over to Mar 1 in
     non-leap years (native Date behavior). */
  function daysUntil(gm, gd) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var occ = new Date(now.getFullYear(), gm - 1, gd);
    if (occ.getTime() < today.getTime()) {
      occ = new Date(now.getFullYear() + 1, gm - 1, gd);
    }
    return Math.round((occ.getTime() - today.getTime()) / 86400000);
  }

  function jalaliText(iso) {
    var g = parseISO(iso);
    var j = Jalali.toJalali(g.gy, g.gm, g.gd);
    return I18N.formatFullDate(j.jy, j.jm, j.jd);
  }

  /* ----- Jalali dropdowns ----- */
  function fill(year, month, day) {
    var t = Jalali.today();

    /* Day options: always 1..31, validity checked on submit/clamp */
    var daySel = $("bdayDay");
    daySel.innerHTML = "";
    for (var d = 1; d <= 31; d += 1) {
      var od = document.createElement("option");
      od.value = d;
      od.textContent = I18N.formatNumber(d);
      daySel.appendChild(od);
    }

    /* Month options (فروردین … اسفند) */
    var mSel = $("bdayMonth");
    mSel.innerHTML = "";
    MONTHS.forEach(function (name, i) {
      var om = document.createElement("option");
      om.value = i + 1;
      om.textContent = name;
      mSel.appendChild(om);
    });

    /* Year options: current Jalali year - RANGE .. current year */
    var ySel = $("bdayYear");
    ySel.innerHTML = "";
    for (var y = t.jy - YEAR_RANGE; y <= t.jy; y += 1) {
      var oy = document.createElement("option");
      oy.value = y;
      oy.textContent = I18N.formatNumber(y);
      ySel.appendChild(oy);
    }

    daySel.value = day || 1;
    mSel.value = month || 1;
    ySel.value = year || t.jy - 20;
  }

  function selectedDate() {
    return {
      jy: +$("bdayYear").value,
      jm: +$("bdayMonth").value,
      jd: +$("bdayDay").value
    };
  }

  /* When the month/year changes, keep the day valid */
  function clampDay() {
    var s = selectedDate();
    var mx = maxDay(s.jy, s.jm);
    if (s.jd > mx) $("bdayDay").value = mx;
  }

  /* Live Jalali preview under the form */
  function updatePreview() {
    var el = $("bdayPreview");
    if (!$("bdayDay").value) { el.textContent = ""; return; }
    var s = selectedDate();
    el.textContent = I18N.formatFullDate(s.jy, s.jm, s.jd);
  }

  function toISO(jy, jm, jd) {
    var g = Jalali.toGregorian(jy, jm, jd);
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return g.gy + "-" + pad(g.gm) + "-" + pad(g.gd);
  }

  function isoParts(iso) {
    var g = parseISO(iso);
    return Jalali.toJalali(g.gy, g.gm, g.gd);
  }

  /* ----- Mutations ----- */
  function addItem(name, dateISO) {
    var data = load();
    data.items.push({
      id: makeId(),
      name: name,
      dateISO: dateISO,
      createdAt: Date.now()
    });
    save(data);
    render();
    showToast("اضافه شد ✓");
  }

  function updateItem(id, name, dateISO) {
    var data = load();
    data.items.forEach(function (it) {
      if (it.id === id) { it.name = name; it.dateISO = dateISO; }
    });
    save(data);
    render();
    showToast("ویرایش شد ✓");
  }

  function removeItem(id) {
    var data = load();
    data.items = data.items.filter(function (it) { return it.id !== id; });
    save(data);
    render();
    showToast("حذف شد");
  }

  /* ----- Edit (fills the form, switches it to update mode) ----- */
  function startEdit(id) {
    var item = null;
    load().items.forEach(function (it) { if (it.id === id) item = it; });
    if (!item) return;

    editingId = id;
    var j = isoParts(item.dateISO);
    fill(j.jy, j.jm, j.jd);
    $("bdayName").value = item.name;
    updatePreview();
    $("bdayAddBtn").textContent = "✓ ذخیره";
    render();
    $("bdayName").focus();
  }

  function cancelEdit() {
    editingId = null;
    $("bdayName").value = "";
    fill();
    updatePreview();
    $("bdayAddBtn").textContent = "＋ افزودن";
    render();
  }

  /* ----- Render -----
     Sorted by soonest upcoming birthday first. */
  function render() {
    var items = load().items.map(function (it) {
      var g = parseISO(it.dateISO);
      return {
        id: it.id,
        name: it.name,
        dateISO: it.dateISO,
        left: daysUntil(g.gm, g.gd)
      };
    }).sort(function (a, b) {
      return a.left - b.left || a.name.localeCompare(b.name, "fa");
    });

    var html = "";
    items.forEach(function (it) {
      var initial = it.name.trim().charAt(0) || "🎂";
      var badge;
      if (it.left === 0) {
        badge = '<span class="bday-badge is-today">امروز تولدشه! 🎉</span>';
      } else if (it.left === 1) {
        badge = '<span class="bday-badge is-soon">فردا! 🎁</span>';
      } else {
        badge = '<span class="bday-badge">' +
          I18N.formatNumber(it.left) + " روز مانده</span>";
      }

      html += '<div class="bday-item" data-id="' + it.id + '">' +
        '<span class="bday-avatar" aria-hidden="true">' +
          escapeHtml(initial) + "</span>" +
        '<div class="bday-info">' +
          '<span class="bday-name">' + escapeHtml(it.name) + "</span>" +
          '<span class="bday-date">' + jalaliText(it.dateISO) + "</span>" +
          badge +
        "</div>" +
        '<div class="bday-actions">' +
          '<button class="bday-edit" data-action="edit" ' +
          'aria-label="ویرایش">✏️</button>' +
          '<button class="bday-del" data-action="remove" ' +
          'aria-label="حذف">✕</button>' +
        "</div>" +
        "</div>";
    });

    $("bdayList").innerHTML = html;

    var empty = $("bdayEmpty");
    if (items.length === 0) empty.classList.remove("hidden");
    else empty.classList.add("hidden");

    $("bdayCount").textContent = items.length === 0 ? "" :
      I18N.formatNumber(items.length) + " تولد ثبت شده";
  }

  /* ----- Events ----- */
  function wireEvents() {
    $("bdayAddForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var nameEl = $("bdayName");
      var name = nameEl.value.trim();

      if (!name) { showToast("اول اسم را بنویس"); nameEl.focus(); return; }

      var s = selectedDate();
      var mx = maxDay(s.jy, s.jm);
      if (s.jd < 1 || s.jd > mx) {
        showToast("این روز در این ماه معتبر نیست");
        return;
      }

      var iso = toISO(s.jy, s.jm, s.jd);

      if (editingId) {
        updateItem(editingId, name, iso);
        cancelEdit();
      } else {
        addItem(name, iso);
        nameEl.value = "";
        fill();
        updatePreview();
      }
      nameEl.focus();
    });

    ["bdayDay", "bdayMonth", "bdayYear"].forEach(function (id) {
      $(id).addEventListener("change", function () {
        clampDay();
        updatePreview();
      });
    });

    $("bdayList").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var item = e.target.closest(".bday-item");
      if (!item) return;
      var id = item.getAttribute("data-id");
      var action = btn.getAttribute("data-action");

      if (action === "edit") startEdit(id);
      else if (action === "remove") {
        if (window.confirm("این تولد حذف شود؟")) removeItem(id);
      }
    });
  }

  /* ----- Init ----- */
  function init() {
    I18N.setLang("fa"); // Persian-only page (like the old to-do page)
    document.title = "تولدها رو فراموش نکن 🥳🥳";
    ThemeManager.init();
    wireEvents();
    fill();
    render();
    updatePreview();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { render: render };
})();