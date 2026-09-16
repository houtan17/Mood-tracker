/* ============================================
   PWA + ANALYTICS — js/pwa.js
   The ONLY copy of the online/PWA glue code
   (the whole app runs inside index.html):
   - Google Analytics bootstrap (gtag)
   - Service worker registration
   - "New version installed" toast (i18n-aware)

   Loaded as the LAST script on every page.
   ============================================ */

(function () {
  "use strict";

  /* ---------- Analytics (Google tag) ---------- */
  var GA_ID = "G-CWVQMFX1BG"; // set to "" to disable analytics

  if (GA_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  /* ---------- "New version installed" toast ----------
     Delegates to the shared helper (js/ui.js); falls back to a
     minimal local toast if ui.js isn't loaded. */
  function showUpdateToast() {
    /* I18N may not be ready on the todo page — fall back to English */
    var msg = (window.I18N && I18N.t("updateInstalled")) ||
      "New version installed \u2728";
    if (window.UI && UI.toast) { UI.toast(msg); return; }
    var holder = document.getElementById("toastHolder");
    if (!holder) return;
    holder.innerHTML = "";
    var box = document.createElement("div");
    box.className = "toast-box";
    box.textContent = msg;
    holder.appendChild(box);
  }

  /* ---------- Service worker registration ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("sw.js")
        .then(function (reg) {
          reg.addEventListener("updatefound", function () {
            var nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", function () {
              /* Announce only when a NEW version takes over an
                 already-controlled page (not on first install) */
              if (
                nw.state === "activated" &&
                navigator.serviceWorker.controller
              ) {
                showUpdateToast();
              }
            });
          });

          /* Ask for a fresh sw.js at most once a day.
             The browser already byte-compares sw.js on navigation,
             but a tab that is never reloaded (or an iOS home-screen
             app that is resumed rather than restarted) can go a long
             time without that check. This is throttled and cheap: the
             request is conditional and 404-safe offline (it rejects
             and is swallowed). */
          try {
            var last = Number(sessionStorage.getItem("swUpdateCheck") || 0);
            if (Date.now() - last > 24 * 60 * 60 * 1000) {
              sessionStorage.setItem("swUpdateCheck", String(Date.now()));
              reg.update().catch(function () { /* offline: fine */ });
            }
          } catch (e) { /* private mode: fine */ }
        })
        .catch(function (err) {
          console.error("Service Worker registration failed:", err);
        });
    });
  }
})();