/* ============================================
   AUTH — js/auth.js
   Account system UI + session management on top of
   Supabase Auth (js/supabase.js):

   - Email + password: sign up, log in, forgot-password email,
     change password
   - Google OAuth (shows a friendly error until the provider is
     enabled in the Supabase dashboard)
   - Header UI: "Log in" button -> user chip with dropdown menu
     (name, email, sync status, sync now, change password, logout)
   - Hands the session to Sync (js/sync.js) for data syncing

   Notes
   - Email confirmation is expected to be OFF in the Supabase
     project, so signup signs the user in right away. (If it is
     ever turned on, a friendly "check your email" message shows.)
   - Logging out keeps all local data (no localStorage clearing).
   - If Supabase is unavailable the app keeps working exactly as
     before (pure localStorage); the auth UI stays hidden.
   ============================================ */

var Auth = (function () {
  "use strict";

  var user = null;        /* { id, email, name } */
  var mode = "login";     /* login | signup | reset */
  var busy = false;
  var menuOpen = false;
  var readyFlag = false;
  var readyCbs = [];

  function $(id) { return document.getElementById(id); }
  function cl() { return SupaConfig.getClient(); }

  function showToast(msg) {
    var holder = document.getElementById("toastHolder");
    if (!holder) return;
    var box = document.createElement("div");
    box.className = "toast-box";
    box.textContent = msg;
    holder.appendChild(box);
    setTimeout(function () { box.remove(); }, 2400);
  }

  function whenReady(cb) {
    if (readyFlag) { cb(); return; }
    readyCbs.push(cb);
  }

  function markReady() {
    if (readyFlag) return;
    readyFlag = true;
    for (var i = 0; i < readyCbs.length; i += 1) {
      try { readyCbs[i](); } catch (e) { /* keep going */ }
    }
    readyCbs = [];
  }

  function isSignedIn() { return !!user; }

  /* Best-effort display name (Google gives full_name) */
  function nameOf(u) {
    var meta = (u && u.user_metadata) || {};
    var n = meta.full_name || meta.name || "";
    if (!n && u && u.email) n = u.email.split("@")[0];
    return n || "user";
  }

  function isEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  /* ================= session ================= */
  function setUser(u, justSignedIn) {
    if (!u) {
      var was = !!user;
      user = null;
      render();
      if (was && window.Sync) Sync.setAuthUser(null);
      return;
    }
    var same = user && user.id === u.id;
    user = { id: u.id, email: u.email || "", name: nameOf(u) };
    render();
    if (!same) {
      if (window.Sync) Sync.setAuthUser(user);
      if (justSignedIn) {
        closeModal();
        showToast(I18N.t("authLoginOk"));
      }
    }
  }

  function init() {
    if (!SupaConfig.isReady()) {
      render(); /* keeps the whole area hidden; app stays offline-only */
      markReady();
      return;
    }
    if (window.Sync) Sync.onChange(onSyncStatus);
    wireEvents();

    var c = cl();
    c.auth.onAuthStateChange(function (event, session) {
      var u = session ? session.user : null;
      if (event === "INITIAL_SESSION") {
        setUser(u, false);
        markReady();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" ||
                 event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") {
        setUser(u, event === "SIGNED_IN");
      } else if (event === "SIGNED_OUT") {
        setUser(null, false);
      }
    });

    /* Restore an existing session (page reload) */
    c.auth.getSession().then(function (res) {
      var s = res && res.data && res.data.session;
      setUser(s ? s.user : null, false);
    }).catch(function () {
      setUser(null, false);
    }).then(markReady);
  }

  document.addEventListener("DOMContentLoaded", init);

  /* ================= auth actions ================= */
  function mapError(err) {
    var m = ((err && err.message) || "").toLowerCase();
    if (m.indexOf("invalid login credentials") !== -1) return I18N.t("authErrInvalid");
    if (m.indexOf("already registered") !== -1 || m.indexOf("already exists") !== -1) {
      return I18N.t("authErrExists");
    }
    if (m.indexOf("at least 6") !== -1) return I18N.t("authErrWeakPass");
    if (m.indexOf("rate limit") !== -1) return I18N.t("authErrRateLimit");
    if (m.indexOf("fetch") !== -1 || m.indexOf("network") !== -1) {
      return I18N.t("authErrNetwork");
    }
    if (m.indexOf("email not confirmed") !== -1) return I18N.t("authCheckEmail");
    return (err && err.message) || I18N.t("authErrGeneric");
  }

  function setBusy(b) {
    busy = b;
    var submit = $("authSubmitBtn");
    var resetSubmit = $("authResetSubmitBtn");
    if (submit) {
      submit.disabled = b;
      submit.textContent = b ? I18N.t("authBusy") :
        (mode === "signup" ? I18N.t("authSignupBtn") : I18N.t("authLoginBtn"));
    }
    if (resetSubmit) {
      resetSubmit.disabled = b;
      resetSubmit.textContent = b ? I18N.t("authBusy") : I18N.t("authChangePassBtn");
    }
    var google = $("authGoogleBtn");
    if (google) google.disabled = b;
  }

  function showErr(msg) {
    var el = $("authError");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function hideErr() {
    var el = $("authError");
    if (el) el.classList.add("hidden");
  }

  /* Login / signup form */
  function submitAuth(e) {
    e.preventDefault();
    if (busy) return;

    var email = $("authEmail").value.trim().toLowerCase();
    var pass = $("authPass").value;
    if (!isEmail(email)) { showErr(I18N.t("authErrEmail")); return; }
    if (!pass) { showErr(I18N.t("authErrPassRequired")); return; }
    if (mode === "signup" && pass.length < 6) {
      showErr(I18N.t("authErrWeakPass"));
      return;
    }

    hideErr();
    setBusy(true);
    var p = (mode === "signup")
      ? cl().auth.signUp({ email: email, password: pass })
      : cl().auth.signInWithPassword({ email: email, password: pass });

    p.then(function (res) {
      setBusy(false);
      if (res.error) { showErr(mapError(res.error)); return; }
      if (mode === "signup" && !res.data.session) {
        /* Defensive: email confirmation was re-enabled in Supabase */
        showErr(I18N.t("authCheckEmail"));
        return;
      }
      /* onAuthStateChange(SIGNED_IN) closes the modal + toasts */
    }).catch(function () {
      setBusy(false);
      showErr(I18N.t("authErrNetwork"));
    });
  }

  /* Google OAuth — redirects away and comes back to this page */
  function google() {
    if (busy) return;
    hideErr();
    setBusy(true);
    cl().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    }).then(function (res) {
      if (res.error) {
        setBusy(false);
        showErr(mapError(res.error));
      }
      /* success: the browser redirects away */
    }).catch(function () {
      setBusy(false);
      showErr(I18N.t("authErrNetwork"));
    });
  }

  /* "Forgot password" -> send a recovery email */
  function forgot() {
    if (busy) return;
    var email = $("authEmail").value.trim().toLowerCase();
    if (!isEmail(email)) { showErr(I18N.t("authErrEmail")); return; }
    hideErr();
    setBusy(true);
    cl().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    }).then(function (res) {
      setBusy(false);
      if (res.error) { showErr(mapError(res.error)); return; }
      showToast(I18N.t("authResetSent"));
    }).catch(function () {
      setBusy(false);
      showErr(I18N.t("authErrNetwork"));
    });
  }

  /* Change-password form (menu item / after recovery link) */
  function submitNewPassword(e) {
    e.preventDefault();
    if (busy) return;
    var p1 = $("authNewPass").value;
    if (!p1 || p1.length < 6) { showErr(I18N.t("authErrWeakPass")); return; }
    hideErr();
    setBusy(true);
    cl().auth.updateUser({ password: p1 }).then(function (res) {
      setBusy(false);
      if (res.error) { showErr(mapError(res.error)); return; }
      $("authNewPass").value = "";
      closeModal();
      showToast(I18N.t("authPassChanged"));
    }).catch(function () {
      setBusy(false);
      showErr(I18N.t("authErrNetwork"));
    });
  }

  /* Logging out intentionally keeps localStorage data */
  function logout() {
    closeMenu();
    cl().auth.signOut().then(function () {
      /* onAuthStateChange(SIGNED_OUT) updates the UI + Sync */
      showToast(I18N.t("authLoggedOut"));
    }).catch(function () {
      showToast(I18N.t("authErrNetwork"));
    });
  }

  /* ================= UI: modal ================= */
  function openModal(m) {
    mode = m || "login";
    hideErr();
    applyMode();
    $("authOverlay").classList.remove("hidden");
    setTimeout(function () {
      var el = (mode === "reset") ? $("authNewPass") : $("authEmail");
      if (el) el.focus();
    }, 50);
  }

  function closeModal() {
    var ov = $("authOverlay");
    if (ov) ov.classList.add("hidden");
  }

  function isModalOpen() {
    var ov = $("authOverlay");
    return ov && !ov.classList.contains("hidden");
  }

  function setMode(m) {
    mode = m;
    hideErr();
    applyMode();
    setTimeout(function () { if ($("authEmail")) $("authEmail").focus(); }, 50);
  }

  function applyMode() {
    var login = mode === "login";
    var signup = mode === "signup";
    var reset = mode === "reset";

    $("authTabs").classList.toggle("hidden", reset);
    $("authTabLogin").classList.toggle("active", login);
    $("authTabSignup").classList.toggle("active", signup);
    $("authForm").classList.toggle("hidden", reset);
    $("authResetForm").classList.toggle("hidden", !reset);
    $("authForgotBtn").style.display = login ? "" : "none";
    $("authDivider").style.display = reset ? "none" : "";
    $("authGoogleBtn").style.display = reset ? "none" : "";
    $("authPass").setAttribute("autocomplete", login ? "current-password" : "new-password");
    applyTexts();
  }

  /* ================= UI: header + texts ================= */
  function render() {
    var area = $("authArea");
    if (!area) return;

    if (!SupaConfig.isReady()) {
      area.classList.add("hidden");
      return;
    }
    area.classList.remove("hidden");
    $("authLoginBtn").classList.toggle("hidden", !!user);
    $("userChipWrap").classList.toggle("hidden", !user);

    if (user) {
      var n = user.name || (user.email ? user.email.split("@")[0] : "?");
      $("userAvatar").textContent = (n.trim().charAt(0) || "?").toUpperCase();
      $("userChipName").textContent = n;
      $("userMenuName").textContent = n;
      $("userMenuEmail").textContent = user.email;
    }
    closeMenu();
    applyTexts();
  }

  function applyTexts() {
    /* header buttons */
    if ($("authLoginLabel")) $("authLoginLabel").textContent = I18N.t("authLogin");
    if ($("syncNowLabel")) $("syncNowLabel").textContent = I18N.t("syncNow");
    if ($("changePassLabel")) $("changePassLabel").textContent = I18N.t("authChangePass");
    if ($("logoutLabel")) $("logoutLabel").textContent = I18N.t("authLogout");

    /* modal */
    if ($("authTitle")) {
      $("authTitle").textContent = (mode === "reset")
        ? I18N.t("authChangePass")
        : (mode === "signup" ? I18N.t("authSignupTitle") : I18N.t("authLoginTitle"));
    }
    if ($("authTabLogin")) {
      $("authTabLogin").textContent = I18N.t("authLogin");
      $("authTabSignup").textContent = I18N.t("authSignup");
      $("authEmailLabel").textContent = I18N.t("authEmail");
      $("authPassLabel").textContent = I18N.t("authPassword");
      $("authNewPassLabel").textContent = I18N.t("authNewPassword");
      $("authEmail").placeholder = I18N.t("authEmailPlaceholder");
      $("authPassHint").textContent = (mode === "signup") ? I18N.t("authPassHint") : "";
      $("authForgotBtn").textContent = I18N.t("authForgot");
      $("authOrLabel").textContent = I18N.t("authOr");
      $("authGoogleLabel").textContent = I18N.t("authGoogle");
      $("authPassToggle").setAttribute("aria-label", I18N.t("authShowPass"));
      $("authHint").textContent = (mode === "signup")
        ? I18N.t("authHintSignup") : I18N.t("authHintLogin");
      $("authSubmitBtn").textContent = busy ? I18N.t("authBusy")
        : (mode === "signup" ? I18N.t("authSignupBtn") : I18N.t("authLoginBtn"));
      $("authResetSubmitBtn").textContent = busy ? I18N.t("authBusy")
        : I18N.t("authChangePassBtn");
    }
    renderStatus();
  }

  /* ================= UI: user menu ================= */
  function openMenu() {
    menuOpen = true;
    $("userMenu").classList.remove("hidden");
    $("userChip").setAttribute("aria-expanded", "true");
    renderStatus();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    var menu = $("userMenu");
    if (menu) menu.classList.add("hidden");
    var chip = $("userChip");
    if (chip) chip.setAttribute("aria-expanded", "false");
  }

  function fmtTime(ms) {
    var d = new Date(ms);
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function renderStatus(st) {
    var dot = $("syncDot");
    var txt = $("syncStatusText");
    if (!dot || !txt) return;
    st = st || (window.Sync ? Sync.status() : { state: "disabled" });

    var cls = "sync-dot";
    var key = "syncStatusSynced";
    if (st.state === "pending") { cls += " is-warn"; key = "syncStatusPending"; }
    else if (st.state === "syncing") { cls += " is-warn"; key = "syncStatusSyncing"; }
    else if (st.state === "offline") { cls += " is-warn"; key = "syncStatusOffline"; }
    else if (st.state === "error") { cls += " is-err"; key = "syncStatusError"; }
    else if (st.state === "disabled" || st.state === "signedout") { cls += " is-off"; key = "syncStatusOff"; }
    dot.className = cls;

    if (st.state === "synced") {
      txt.textContent = st.lastSyncAt
        ? I18N.f("syncStatusSyncedAt", fmtTime(st.lastSyncAt))
        : I18N.t("syncStatusSynced");
    } else {
      var t = I18N.t(key);
      txt.textContent = String(t).replace("{0}", I18N.formatNumber(st.pending || 0));
    }
  }

  /* Sync -> Auth status updates */
  function onSyncStatus(st) {
    if (menuOpen) renderStatus(st);
  }

  /* ================= events ================= */
  function wireEvents() {
    /* header */
    $("authLoginBtn").addEventListener("click", function () { openModal("login"); });
    $("userChip").addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuOpen) closeMenu(); else openMenu();
    });
    $("syncNowBtn").addEventListener("click", function () {
      closeMenu();
      if (window.Sync) {
        Sync.syncNow(function (err) {
          showToast(err ? I18N.t("syncStatusError") : I18N.t("syncStatusSynced"));
        });
      }
    });
    $("changePassBtn").addEventListener("click", function () {
      closeMenu();
      openModal("reset");
    });
    $("logoutBtn").addEventListener("click", logout);

    /* click outside closes the menu */
    document.addEventListener("click", function (e) {
      if (menuOpen && e.target.closest &&
          !e.target.closest("#userChipWrap")) closeMenu();
    });

    /* modal */
    $("closeAuthBtn").addEventListener("click", closeModal);
    $("authOverlay").addEventListener("click", function (e) {
      if (e.target === $("authOverlay")) closeModal();
    });
    $("authTabLogin").addEventListener("click", function () { setMode("login"); });
    $("authTabSignup").addEventListener("click", function () { setMode("signup"); });
    $("authForm").addEventListener("submit", submitAuth);
    $("authResetForm").addEventListener("submit", submitNewPassword);
    $("authForgotBtn").addEventListener("click", forgot);
    $("authGoogleBtn").addEventListener("click", google);
    $("authPassToggle").addEventListener("click", function () {
      var input = $("authPass");
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      $("authPassToggle").setAttribute("aria-label",
        I18N.t(show ? "authHidePass" : "authShowPass"));
    });

    /* Escape: close menu first, then the modal
       (app.js closes its own overlays separately) */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (menuOpen) { closeMenu(); return; }
      if (isModalOpen()) closeModal();
    });
  }

  /* ================= public API ================= */
  return {
    init: init,
    render: render,
    applyTexts: applyTexts,
    isSignedIn: isSignedIn,
    whenReady: whenReady,
    openModal: openModal,
    closeModal: closeModal
  };
})();


