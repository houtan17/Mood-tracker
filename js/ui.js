/* ============================================
   SHARED UI HELPERS — js/ui.js
   One implementation of the tiny helpers that used
   to be duplicated across modules:
   - UI.toast      floating message (fixed, bottom-center)
   - UI.escapeHtml safe insertion of user text into HTML
   - UI.makeId     collision-safe random id
   - UI.pad2       "7" -> "07" (dates)
   ============================================ */

var UI = (function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  /* ----- Toast -----
     Single floating message; any new toast replaces the
     previous one and is removed from the DOM afterwards
     (fixes the old dashboard leak where toasts stayed in
     the DOM forever). */
  function toast(msg) {
    var holder = $("toastHolder");
    if (!holder || !msg) return;
    holder.innerHTML = "";
    var box = document.createElement("div");
    box.className = "toast-box";
    box.setAttribute("role", "status");
    box.textContent = msg;
    holder.appendChild(box);
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
    }, 2400);
  }

  /* ----- Escape HTML ----- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ----- Random id ----- */
  function makeId() {
    return (
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  /* ----- Zero-pad to 2 digits ----- */
  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  return {
    toast: toast,
    escapeHtml: escapeHtml,
    makeId: makeId,
    pad2: pad2
  };
})();
