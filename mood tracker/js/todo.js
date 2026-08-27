/* ============================================
   TODO APP — js/todo.js
   Persian-only to-do list page.
   Storage key: "todoTracker.v1" (separate from
   the mood tracker data on purpose).
   Item shape: { id, text, done, fav, createdAt }
   Features: add, delete, favorite (pinned top),
   check done (moved to bottom).
   ============================================ */

var TodoApp = (function () {
  "use strict";

  var KEY = "todoTracker.v1";

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

  /* ----- Mutations ----- */
  function addItem(text) {
    var data = load();
    data.items.push({
      id: makeId(),
      text: text,
      done: false,
      fav: false,
      createdAt: Date.now()
    });
    save(data);
    render();
    showToast("اضافه شد ✓");
  }

  function removeItem(id) {
    var data = load();
    data.items = data.items.filter(function (it) { return it.id !== id; });
    save(data);
    render();
    showToast("حذف شد");
  }

  function toggleDone(id) {
    var data = load();
    data.items.forEach(function (it) {
      if (it.id === id) it.done = !it.done;
    });
    save(data);
    render();
  }

  function toggleFav(id) {
    var data = load();
    data.items.forEach(function (it) {
      if (it.id === id) it.fav = !it.fav;
    });
    save(data);
    render();
  }

  /* ----- Render -----
     Order: active favorites first, then other active items,
     then done items at the bottom (done always wins over fav). */
  function render() {
    var data = load();
    var items = data.items.slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.fav !== b.fav) return a.fav ? -1 : 1;
      return b.createdAt - a.createdAt;
    });

    var html = "";
    var lastGroup = null;

    items.forEach(function (item) {
      var group = item.done ? "done" : item.fav ? "fav" : "active";
      if (group !== lastGroup) {
        if (group === "fav") {
          html += '<li class="todo-divider"><span>⭐ مهم</span></li>';
        } else if (group === "done") {
          html += '<li class="todo-divider"><span>انجام‌شده</span></li>';
        }
        lastGroup = group;
      }

      html += '<li class="todo-item' +
        (item.done ? " done" : "") + (item.fav ? " fav" : "") +
        '" data-id="' + item.id + '">' +
        '<button class="todo-check" data-action="toggle-done" ' +
        'aria-label="انجام شد" aria-pressed="' + item.done + '">✓</button>' +
        '<span class="todo-text">' + escapeHtml(item.text) + "</span>" +
        '<button class="todo-fav" data-action="toggle-fav" ' +
        'aria-label="مهم" aria-pressed="' + item.fav + '">' +
        (item.fav ? "★" : "☆") + "</button>" +
        '<button class="todo-del" data-action="remove" ' +
        'aria-label="حذف">✕</button>' +
        "</li>";
    });

    $("todoList").innerHTML = html;

    var empty = $("todoEmpty");
    if (items.length === 0) {
      empty.classList.remove("hidden");
    } else {
      empty.classList.add("hidden");
    }

    var remaining = items.filter(function (it) { return !it.done; }).length;
    $("todoCount").textContent = items.length === 0 ? "" :
      I18N.formatNumber(remaining) + " کار باقی مانده از " +
      I18N.formatNumber(items.length);
  }

  /* ----- Events ----- */
  function wireEvents() {
    $("todoAddForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("todoInput");
      var text = input.value.trim();
      if (!text) {
        showToast("اول متن کار را بنویس");
        input.focus();
        return;
      }
      input.value = "";
      addItem(text);
      input.focus();
    });

    $("todoList").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var li = e.target.closest(".todo-item");
      if (!li) return;
      var id = li.getAttribute("data-id");
      var action = btn.getAttribute("data-action");

      if (action === "toggle-done") toggleDone(id);
      else if (action === "toggle-fav") toggleFav(id);
      else if (action === "remove") {
        if (window.confirm("این کار حذف شود؟")) removeItem(id);
      }
    });
  }

  /* ----- Init ----- */
  function init() {
    I18N.setLang("fa"); // Persian-only page
    document.title = "لیست کارها";
    ThemeManager.init();
    wireEvents();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { render: render };
})();