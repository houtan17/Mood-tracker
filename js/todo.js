/* ============================================
   TODO APP — js/todo.js
   To-do list rendered inside index.html
   (desktop right panel + mobile view).
   Storage key: "todoTracker.v1" (separate from
   the mood tracker data on purpose).
   Item shape: { id, text, done, fav, createdAt }
   Features: add, EDIT, delete, favorite
   (pinned top), check done (moved to bottom).
   All texts come from js/i18n.js (FA + EN).
   ============================================ */

var TodoApp = (function () {
  "use strict";

  var KEY = "todoTracker.v1";
  var editingId = null;

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
    /* Notify the sync engine (guarded: Sync may not be loaded) */
    if (window.Sync) Sync.onLocalChange("todo");
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
    /* The animation ends at opacity 0 — remove the box so dead
       toasts don't pile up in the DOM */
    setTimeout(function () { box.remove(); }, 2400);
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
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    save(data);
    render();
    showToast(I18N.t("todoAdded"));
  }

  function updateItem(id, text) {
    var data = load();
    data.items.forEach(function (it) {
      if (it.id === id) { it.text = text; it.updatedAt = Date.now(); }
    });
    save(data);
    render();
    showToast(I18N.t("todoEdited"));
  }

  function removeItem(id) {
    var data = load();
    data.items = data.items.filter(function (it) { return it.id !== id; });
    save(data);
    render();
    showToast(I18N.t("todoDeleted"));
  }

  function toggleDone(id) {
    var data = load();
    data.items.forEach(function (it) {
      if (it.id === id) { it.done = !it.done; it.updatedAt = Date.now(); }
    });
    save(data);
    render();
  }

  function toggleFav(id) {
    var data = load();
    data.items.forEach(function (it) {
      if (it.id === id) { it.fav = !it.fav; it.updatedAt = Date.now(); }
    });
    save(data);
    render();
  }

  /* ----- Edit helpers ----- */
  function startEdit(id) {
    editingId = id;
    render();
    var input = document.querySelector(".todo-edit-input");
    if (input) { input.focus(); input.select(); }
  }

  function cancelEdit() {
    if (editingId === null) return;
    editingId = null;
    render();
  }

  function saveEdit(id) {
    var input = document.querySelector(".todo-edit-input");
    if (!input) { editingId = null; render(); return; }
    var text = input.value.trim();
    if (!text) {
      showToast(I18N.t("todoTextRequired"));
      input.focus();
      return;
    }
    editingId = null;
    updateItem(id, text);
  }

  /* ----- Render -----
     Order: active favorites first, then other active items,
     then done items at the bottom (done always wins over fav). */
  function render() {
    var list = $("todoList");
    if (!list) return;

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
          html += '<li class="todo-divider"><span>' +
            I18N.t("todoFavDivider") + "</span></li>";
        } else if (group === "done") {
          html += '<li class="todo-divider"><span>' +
            I18N.t("todoDoneDivider") + "</span></li>";
        }
        lastGroup = group;
      }

      var isEditing = item.id === editingId;
      html += '<li class="todo-item' +
        (item.done ? " done" : "") + (item.fav ? " fav" : "") +
        (isEditing ? " editing" : "") +
        '" data-id="' + item.id + '">';

      if (isEditing) {
        /* Inline edit mode: text becomes an input */
        html += '<input type="text" class="todo-edit-input" maxlength="200"' +
          ' value="' + escapeHtml(item.text) + '" />' +
          '<button class="todo-edit-save" data-action="save-edit" ' +
          'aria-label="save">✓</button>' +
          '<button class="todo-edit-cancel" data-action="cancel-edit" ' +
          'aria-label="cancel">✕</button>';
      } else {
        html += '<button class="todo-check" data-action="toggle-done" ' +
          'aria-label="done" aria-pressed="' + item.done + '">✓</button>' +
          '<span class="todo-text">' + escapeHtml(item.text) + "</span>" +
          '<button class="todo-fav" data-action="toggle-fav" ' +
          'aria-label="favorite" aria-pressed="' + item.fav + '">' +
          (item.fav ? "★" : "☆") + "</button>" +
          '<button class="todo-edit" data-action="edit" ' +
          'aria-label="edit">✏️</button>' +
          '<button class="todo-del" data-action="remove" ' +
          'aria-label="delete">✕</button>';
      }

      html += "</li>";
    });

    list.innerHTML = html;

    var empty = $("todoEmpty");
    if (items.length === 0) {
      empty.classList.remove("hidden");
    } else {
      empty.classList.add("hidden");
    }

    var remaining = items.filter(function (it) { return !it.done; }).length;
    $("todoCount").textContent = items.length === 0 ? "" :
      I18N.f("todoLeft",
        I18N.formatNumber(remaining), I18N.formatNumber(items.length));
  }

  /* ----- Events ----- */
  function wireEvents() {
    var form = $("todoAddForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("todoInput");
      var text = input.value.trim();
      if (!text) {
        showToast(I18N.t("todoWriteFirst"));
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
      else if (action === "edit") startEdit(id);
      else if (action === "save-edit") saveEdit(id);
      else if (action === "cancel-edit") cancelEdit();
      else if (action === "remove") {
        if (window.confirm(I18N.t("todoConfirmDelete"))) removeItem(id);
      }
    });

    /* While editing: Enter saves, Escape cancels */
    $("todoList").addEventListener("keydown", function (e) {
      var input = e.target.closest(".todo-edit-input");
      if (!input) return;
      var li = input.closest(".todo-item");
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit(li.getAttribute("data-id"));
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    });
  }

  /* ----- Init ----- */
  function init() {
    if (!$("todoList")) return; // not on this page
    wireEvents();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { render: render, refresh: render };
})();
