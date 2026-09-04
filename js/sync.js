/* ============================================
   SYNC — js/sync.js
   Offline-first two-way sync between localStorage and
   Supabase (Postgres) for logged-in users.

   Principles
   - localStorage stays the single source of truth; the app
     keeps working 100% offline exactly as before.
   - A "snapshot" (localStorage: syncSnapshot.v1) remembers the
     last state known to be on the server. Every local change
     marks the diff dirty; the diff is pushed (upsert / soft
     delete) with a debounced 2-second timer.
   - Server rows are pulled and merged with LAST-WRITE-WINS by
     client_updated_at (the device's epoch-ms timestamp).
   - Deletes are soft (deleted flag) so they propagate instead
     of "resurrecting" rows from other devices.
   - While offline nothing is lost: unpushed changes simply sit
     in the diff and go out automatically when the connection
     returns.

   Dataset map
     moodTracker.v1      -> mood_entries + profiles + streaks
     todoTracker.v1      -> todos
     birthdaysTracker.v1 -> birthdays

   Triggers: sign-in (Auth), 'online' event, tab focus /
   visibility (throttled 30s), manual "Sync now" button.
   No realtime — cheap and battery-friendly.
   ============================================ */

var Sync = (function () {
  "use strict";

  /* ----- Constants ----- */
  var SNAP_KEY = "syncSnapshot.v1";
  var MOOD_KEY = "moodTracker.v1";
  var TODO_KEY = "todoTracker.v1";
  var BDAY_KEY = "birthdaysTracker.v1";
  var STREAK_KEYS = ["streakCount", "lastVisitDate"];
  var PUSH_DEBOUNCE_MS = 2000;   /* mutations settle, then push */
  var FOCUS_RESYNC_MS = 30000;   /* focus re-checks at most 1/30s */

  /* ----- State ----- */
  var userId = null;
  var userEmail = null;
  var syncing = false;
  var rerunNeeded = false;
  var pushTimer = null;
  var lastSyncAt = 0;
  var lastError = null;
  var lastFocusSync = 0;
  var inited = false;
  var listener = null;          /* Auth status callback */

  /* ================= tiny helpers ================= */
  function $(id) { return document.getElementById(id); }
  function client() {
    return window.SupaConfig ? SupaConfig.getClient() : null;
  }
  function ready() { return !!(userId && client()); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function nowMs() { return Date.now(); }

  function eachKey(obj, fn) {
    if (!obj) return;
    Object.keys(obj).forEach(fn);
  }

  function notify() {
    if (listener) {
      try { listener(status()); } catch (e) { /* never break sync */ }
    }
  }

  /* ================= status (for the header menu) ================= */
  function status() {
    if (!window.SupaConfig || !SupaConfig.isReady()) {
      return { state: "disabled" };
    }
    if (!userId) return { state: "signedout" };
    if (lastError) return { state: "error", error: lastError };
    if (syncing) return { state: "syncing" };
    if (!navigator.onLine) return { state: "offline" };
    var pending = countPending();
    if (pending > 0) return { state: "pending", pending: pending };
    return { state: "synced", lastSyncAt: lastSyncAt };
  }

  /* How many local changes are still waiting to be pushed?
     Pure local computation — no network. */
  function countPending() {
    var snap = loadSnap();
    if (snap.userId !== userId) return 1;
    var n = 0;

    var mood = readMood();
    var entries = mood.entries || {};
    var se = snap.mood.entries || {};
    eachKey(entries, function (k) {
      var s = se[k];
      if (!s || (entries[k].updatedAt || 0) > (s.updatedAt || 0)) n += 1;
    });
    eachKey(se, function (k) { if (!entries[k]) n += 1; });
    if ((mood.settingsUpdatedAt || 0) > (snap.mood.settingsUpdatedAt || 0)) n += 1;
    if ((mood.streakUpdatedAt || 0) > (snap.mood.streakUpdatedAt || 0)) n += 1;

    n += countItemPending(readTodo().items, snap.todo.items);
    n += countItemPending(readBday().items, snap.bday.items);
    return n;
  }

  function countItemPending(items, snapMap) {
    var n = 0;
    var map = itemsToMap(items);
    eachKey(map, function (k) {
      var it = map[k];
      var s = snapMap[k];
      var lu = it.updatedAt || it.createdAt || 0;
      var su = s ? (s.updatedAt || s.createdAt || 0) : -1;
      if (!s || lu > su) n += 1;
    });
    eachKey(snapMap, function (k) { if (!map[k]) n += 1; });
    return n;
  }

  /* ================= localStorage access ================= */
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      var data = raw ? JSON.parse(raw) : null;
      return (data && typeof data === "object") ? data : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function readMood() {
    return readJSON(MOOD_KEY, { entries: {}, settings: {} });
  }
  function readTodo() { return readJSON(TODO_KEY, { items: [] }); }
  function readBday() { return readJSON(BDAY_KEY, { items: [] }); }

  function writeJSON(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /* Items are stored as arrays; snapshots use id-keyed maps. */
  function itemsToMap(items) {
    var map = {};
    (items || []).forEach(function (it) {
      if (it && it.id) map[it.id] = it;
    });
    return map;
  }

  /* One-time migration: settings changes are synced by
     timestamp, so old data without timestamps gets some. */
  function ensureTimestamps() {
    var data = readMood();
    if (typeof data.settingsUpdatedAt === "number" &&
        typeof data.streakUpdatedAt === "number") return;
    var t = nowMs();
    if (typeof data.settingsUpdatedAt !== "number") {
      data.settingsUpdatedAt = t;
    }
    if (typeof data.streakUpdatedAt !== "number") {
      data.streakUpdatedAt = data.settingsUpdatedAt;
    }
    writeJSON(MOOD_KEY, data);
  }

  /* ================= snapshot ================= */
  function emptySnap(uid) {
    return {
      userId: uid || null,
      mood: {
        entries: {},
        settings: {},
        settingsUpdatedAt: 0,
        streakUpdatedAt: 0,
        streak: null
      },
      todo: { items: {} },
      bday: { items: {} }
    };
  }

  function loadSnap() {
    try {
      var raw = localStorage.getItem(SNAP_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== "object" || !s.mood) return emptySnap();
      s.mood = s.mood || emptySnap().mood;
      s.todo = s.todo || { items: {} };
      s.bday = s.bday || { items: {} };
      return s;
    } catch (e) {
      return emptySnap();
    }
  }

  function saveSnap(snap) {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  }

  /* Rebuild the whole snapshot from the CURRENT localStorage
     state. Called after a successful push+pull.
     `remote` (optional) = rows the server returned; keys we
     deliberately kept locally (local newer than remote) are
     re-dirtied to their remote values so the next sync pushes
     them again — keeps the server from silently diverging
     (only matters when device clocks skew). */
  function writeSnapFromLocal(remote) {
    var mood = readMood();
    var snap = emptySnap(userId);

    eachKey(mood.entries || {}, function (k) {
      snap.mood.entries[k] = clone(mood.entries[k]);
    });
    eachKey(mood.settings || {}, function (k) {
      if (STREAK_KEYS.indexOf(k) === -1) snap.mood.settings[k] = mood.settings[k];
    });
    snap.mood.settingsUpdatedAt = mood.settingsUpdatedAt || 0;
    snap.mood.streakUpdatedAt = mood.streakUpdatedAt || 0;
    snap.mood.streak = {
      lastVisitDate: mood.settings.lastVisitDate || null,
      streakCount: mood.settings.streakCount || 0
    };

    snap.todo.items = itemsToMap(readTodo().items);
    snap.bday.items = itemsToMap(readBday().items);

    if (remote) {
      (remote.mood || []).forEach(function (r) {
        var l = mood.entries[r.date_key];
        if (l && !r.deleted && (l.updatedAt || 0) > (r.client_updated_at || 0)) {
          snap.mood.entries[r.date_key] = {
            mood: r.mood, note: r.note || "",
            updatedAt: r.client_updated_at || 0
          };
        }
      });
      if (remote.profile &&
          (remote.profile.client_updated_at || 0) < (mood.settingsUpdatedAt || 0)) {
        snap.mood.settingsUpdatedAt = remote.profile.client_updated_at || 0;
      }
      if (remote.streak &&
          (remote.streak.client_updated_at || 0) < (mood.streakUpdatedAt || 0)) {
        snap.mood.streakUpdatedAt = remote.streak.client_updated_at || 0;
      }
      redirtyItems(remote.todo, snap.todo.items, true);
      redirtyItems(remote.bday, snap.bday.items, false);
    }

    saveSnap(snap);
  }

  /* Re-dirty list items that are locally newer than the server.
     isTodo distinguishes todos (text/done/fav) from birthdays
     (name/dateISO) so no cross-type keys leak into the snapshot. */
  function redirtyItems(remoteRows, snapMap, isTodo) {
    (remoteRows || []).forEach(function (r) {
      var l = snapMap[r.client_id];
      if (l && !r.deleted &&
          (l.updatedAt || l.createdAt || 0) > (r.client_updated_at || 0)) {
        var redir = {
          id: r.client_id,
          createdAt: r.client_updated_at || 0,
          updatedAt: r.client_updated_at || 0
        };
        if (isTodo) {
          redir.text = r.text || "";
          redir.done = !!r.done;
          redir.fav = !!r.fav;
        } else {
          redir.name = r.name || "";
          redir.dateISO = r.date_iso || "";
        }
        snapMap[r.client_id] = redir;
      }
    });
  }

  /* ================= push: compute the diff ================= */
  /* Mood entries: local vs snapshot -> upsert payloads */
  function moodPushOps(data, snap) {
    var ops = [];
    var entries = data.entries || {};
    var snapE = snap.mood.entries || {};

    eachKey(entries, function (k) {
      var e = entries[k];
      var s = snapE[k];
      if (!s || (e.updatedAt || 0) > (s.updatedAt || 0)) {
        ops.push({
          user_id: userId,
          date_key: k,
          mood: e.mood,
          note: e.note || "",
          deleted: false,
          client_updated_at: e.updatedAt || nowMs()
        });
      }
    });
    /* Deleted locally since last sync -> soft delete.
       mood/note are re-sent because the columns are NOT NULL. */
    eachKey(snapE, function (k) {
      if (!entries[k]) {
        var s = snapE[k];
        ops.push({
          user_id: userId,
          date_key: k,
          mood: (s && s.mood) || 3,
          note: (s && s.note) || "",
          deleted: true,
          client_updated_at: nowMs()
        });
      }
    });
    return ops;
  }

  /* Generic list diff used by todos + birthdays */
  function itemPushOps(localMap, snapMap, toUp, toDel) {
    var ops = [];
    eachKey(localMap, function (k) {
      var it = localMap[k];
      var s = snapMap[k];
      var lu = it.updatedAt || it.createdAt || 0;
      var su = s ? (s.updatedAt || s.createdAt || 0) : -1;
      if (!s || lu > su) ops.push(toUp(it));
    });
    eachKey(snapMap, function (k) {
      if (!localMap[k]) ops.push(toDel(snapMap[k]));
    });
    return ops;
  }

  function todoPushOps(data, snap) {
    return itemPushOps(
      itemsToMap(data.items),
      snap.todo.items,
      function (it) {
        return {
          user_id: userId,
          client_id: it.id,
          text: it.text || "",
          done: !!it.done,
          fav: !!it.fav,
          deleted: false,
          client_updated_at: it.updatedAt || it.createdAt || nowMs()
        };
      },
      function (snapItem) {
        return {
          user_id: userId,
          client_id: snapItem.id,
          text: snapItem.text || "",
          done: !!snapItem.done,
          fav: !!snapItem.fav,
          deleted: true,
          client_updated_at: nowMs()
        };
      }
    );
  }

  function bdayPushOps(data, snap) {
    return itemPushOps(
      itemsToMap(data.items),
      snap.bday.items,
      function (it) {
        return {
          user_id: userId,
          client_id: it.id,
          name: it.name || "",
          date_iso: it.dateISO || "",
          deleted: false,
          client_updated_at: it.updatedAt || it.createdAt || nowMs()
        };
      },
      function (snapItem) {
        return {
          user_id: userId,
          client_id: snapItem.id,
          name: snapItem.name || "",
          date_iso: snapItem.dateISO || "",
          deleted: true,
          client_updated_at: nowMs()
        };
      }
    );
  }

  /* App settings blob -> profiles row (streak keys excluded;
     they live in the streaks table). */
  function settingsPushOp(data, snap) {
    var su = data.settingsUpdatedAt || 0;
    if (su <= (snap.mood.settingsUpdatedAt || 0)) return null;
    var clean = {};
    eachKey(data.settings || {}, function (k) {
      if (STREAK_KEYS.indexOf(k) === -1) clean[k] = data.settings[k];
    });
    return {
      id: userId,
      display_name: data.settings.userName || null,
      email: userEmail || null,
      settings: clean,
      client_updated_at: su
    };
  }

  /* Streak state -> streaks row */
  function streakPushOp(data, snap) {
    var su = data.streakUpdatedAt || 0;
    if (su <= (snap.mood.streakUpdatedAt || 0)) return null;
    return {
      user_id: userId,
      last_visit_date: data.settings.lastVisitDate || null,
      streak_count: data.settings.streakCount || 0,
      client_updated_at: su
    };
  }

  /* ================= pull + merge ================= */
  function pullRemote(done) {
    var c = client();
    Promise.all([
      c.from("mood_entries")
        .select("date_key,mood,note,deleted,client_updated_at")
        .eq("user_id", userId),
      c.from("todos")
        .select("client_id,text,done,fav,deleted,client_updated_at")
        .eq("user_id", userId),
      c.from("birthdays")
        .select("client_id,name,date_iso,deleted,client_updated_at")
        .eq("user_id", userId),
      c.from("profiles")
        .select("display_name,email,settings,client_updated_at")
        .eq("id", userId)
        .maybeSingle(),
      c.from("streaks")
        .select("last_visit_date,streak_count,client_updated_at")
        .eq("user_id", userId)
        .maybeSingle()
    ]).then(function (res) {
      for (var i = 0; i < res.length; i += 1) {
        if (res[i].error) { done(res[i].error); return; }
      }
      done(null, {
        mood: res[0].data || [],
        todo: res[1].data || [],
        bday: res[2].data || [],
        profile: res[3].data,
        streak: res[4].data
      });
    }).catch(done);
  }

  /* Merge the pulled server rows into localStorage.
     Last-write-wins by client_updated_at; soft deletes remove
     local rows only if the local copy is not newer. Returns
     true when anything visible changed. */
  function mergeAll(remote) {
    var changed = false;

    /* ----- mood entries + settings + streak ----- */
    var data = readMood();
    var entries = data.entries || {};

    (remote.mood || []).forEach(function (r) {
      var k = r.date_key;
      var local = entries[k];
      var ru = r.client_updated_at || 0;
      if (r.deleted) {
        if (local && (local.updatedAt || 0) <= ru) {
          delete entries[k];
          changed = true;
        }
        return;
      }
      if (!local) {
        var s = loadSnap().mood.entries[k];
        /* Skip when this device deleted it and just pushed that */
        if (!s || (s.updatedAt || 0) < ru) {
          entries[k] = { mood: r.mood, note: r.note || "", updatedAt: ru };
          changed = true;
        }
      } else if ((local.updatedAt || 0) < ru) {
        entries[k] = { mood: r.mood, note: r.note || "", updatedAt: ru };
        changed = true;
      }
    });
    data.entries = entries;

    /* ----- profile (settings blob + display name) ----- */
    var rp = remote.profile;
    if (rp && (rp.client_updated_at || 0) > (data.settingsUpdatedAt || 0)) {
      var rs = rp.settings || {};
      eachKey(rs, function (k) {
        if (STREAK_KEYS.indexOf(k) === -1) data.settings[k] = rs[k];
      });
      data.settingsUpdatedAt = rp.client_updated_at;
      changed = true;
    }
    /* Fresh device / new account: adopt the profile name */
    if (!data.settings.userName && rp && rp.display_name) {
      data.settings.userName = rp.display_name;
      data.settingsUpdatedAt = nowMs();
      changed = true;
    }

    /* ----- streak ----- */
    var rst = remote.streak;
    if (rst && (rst.client_updated_at || 0) > (data.streakUpdatedAt || 0)) {
      data.settings.lastVisitDate = rst.last_visit_date;
      data.settings.streakCount = rst.streak_count;
      data.streakUpdatedAt = rst.client_updated_at;
      changed = true;
    }

    writeJSON(MOOD_KEY, data);

    /* ----- todos ----- */
    var todoChanged = mergeItems(remote.todo, TODO_KEY, "todo");
    /* ----- birthdays ----- */
    var bdayChanged = mergeItems(remote.bday, BDAY_KEY, "bday");

    return changed || todoChanged || bdayChanged;
  }

  /* Shared merge for todos + birthdays (both are {items: []}) */
  function mergeItems(remoteRows, storageKey, snapField) {
    if (!remoteRows || remoteRows.length === 0) return false;

    var data = readJSON(storageKey, { items: [] });
    if (!data.items) data.items = [];

    var byId = itemsToMap(data.items);
    var snapMap = loadSnap()[snapField].items;
    var changed = false;
    var isTodo = storageKey === TODO_KEY;

    remoteRows.forEach(function (r) {
      var it = byId[r.client_id];
      var ru = r.client_updated_at || 0;

      if (r.deleted) {
        if (it && (it.updatedAt || it.createdAt || 0) <= ru) {
          data.items = data.items.filter(function (x) {
            return x.id !== r.client_id;
          });
          delete byId[r.client_id];
          changed = true;
        }
        return;
      }

      if (!it) {
        /* Skip when this device deleted it and just pushed that */
        var s = snapMap[r.client_id];
        if (!s || (s.updatedAt || s.createdAt || 0) < ru) {
          var fresh = { id: r.client_id, createdAt: ru, updatedAt: ru };
          if (isTodo) {
            fresh.text = r.text || "";
            fresh.done = !!r.done;
            fresh.fav = !!r.fav;
          } else {
            fresh.name = r.name || "";
            fresh.dateISO = r.date_iso || "";
          }
          data.items.push(fresh);
          byId[r.client_id] = fresh;
          changed = true;
        }
      } else if ((it.updatedAt || it.createdAt || 0) < ru) {
        if (isTodo) {
          it.text = r.text || "";
          it.done = !!r.done;
          it.fav = !!r.fav;
        } else {
          it.name = r.name || "";
          it.dateISO = r.date_iso || "";
        }
        it.updatedAt = ru;
        changed = true;
      }
    });

    if (changed) writeJSON(storageKey, data);
    return changed;
  }

  /* ================= orchestration ================= */
  /* Push the local diff, then pull + merge. All sync paths
     (timer, sign-in, online, focus, manual) go through here. */
  function syncNow(done) {
    done = done || function () {};
    if (!ready()) { done("signedout"); return; }
    if (syncing) { rerunNeeded = true; done(null); return; }

    syncing = true;
    rerunNeeded = false;
    lastError = null;
    notify();

    /* Diff local state against the snapshot */
    var snap = loadSnap();
    var localMood = readMood();
    var localTodo = readTodo();
    var localBday = readBday();
    var ops = {
      mood: moodPushOps(localMood, snap),
      todo: todoPushOps(localTodo, snap),
      bday: bdayPushOps(localBday, snap),
      profile: settingsPushOp(localMood, snap),
      streak: streakPushOp(localMood, snap)
    };

    var c = client();
    var jobs = [];
    if (ops.mood.length) {
      jobs.push(c.from("mood_entries").upsert(ops.mood, { onConflict: "user_id,date_key" }));
    }
    if (ops.todo.length) {
      jobs.push(c.from("todos").upsert(ops.todo, { onConflict: "user_id,client_id" }));
    }
    if (ops.bday.length) {
      jobs.push(c.from("birthdays").upsert(ops.bday, { onConflict: "user_id,client_id" }));
    }
    if (ops.profile) {
      jobs.push(c.from("profiles").upsert(ops.profile, { onConflict: "id" }));
    }
    if (ops.streak) {
      jobs.push(c.from("streaks").upsert(ops.streak, { onConflict: "user_id" }));
    }

    function finish(err) {
      syncing = false;
      lastError = err ? (err.message || String(err)) : null;
      notify();
      /* Changes that happened WHILE syncing: go again */
      if (!err && rerunNeeded) {
        rerunNeeded = false;
        schedulePush(0);
      }
    }

    var pushErr = null;
    Promise.all(jobs.map(function (j) {
      return j.then(function (r) {
        if (r && r.error) pushErr = pushErr || r.error;
        return r;
      });
    })).catch(function (e) {
      pushErr = pushErr || e;
    }).then(function () {
      if (pushErr) {
        /* Any push failure (offline OR a server/RLS/constraint
           error) must keep the diff queued so it is retried.
           If we proceeded here we would rewrite the snapshot to
           match local state, marking failed rows as "synced" and
           silently dropping them from the cloud. Abort, keep the
           diff, and let a later trigger retry it. */
        finish(pushErr);
        done(pushErr);
        return;
      }
      pullRemote(function (pullErr, remote) {
        if (pullErr) {
          finish(pullErr);
          done(pullErr);
          return;
        }
        var mergeChanged = mergeAll(remote);
        /* Snapshot := current local state (post-merge) */
        writeSnapFromLocal(remote);
        lastSyncAt = nowMs();
        lastFocusSync = lastSyncAt;
        finish(null);
        if (mergeChanged) refreshUI();
        done(null);
      });
    });
  }

  /* Debounced push after local mutations */
  function schedulePush(delay) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      if (!ready() || !navigator.onLine) { notify(); return; }
      /* Nothing actually dirty (e.g. sync already ran)? skip */
      if (countPending() === 0 && lastSyncAt) { notify(); return; }
      syncNow();
    }, delay == null ? PUSH_DEBOUNCE_MS : delay);
  }

  /* Hook called by storage/todo/birthdays after every local save */
  function onLocalChange() {
    if (!ready()) return;
    schedulePush();
    notify(); /* show "waiting to sync" immediately */
  }

  /* Auth hands over the session user (or null on sign-out) */
  function setAuthUser(user) {
    var newId = user ? user.id : null;
    if (newId === userId) return; /* same user again (token refresh) */
    userId = newId;
    userEmail = user ? (user.email || "") : null;
    lastError = null;

    if (userId) {
      var snap = loadSnap();
      if (snap.userId !== userId) {
        /* First sync for this account on this device (or a
           different account logged in): empty baseline, so ALL
           local data is pushed and merged with the cloud. */
        snap = emptySnap(userId);
        saveSnap(snap);
      }
      schedulePush(0);
    } else {
      /* Sign out: local data is intentionally KEPT */
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
      notify();
    }
  }

  /* Re-render everything the cloud may have changed
     (language/theme may arrive in the settings blob too) */
  function refreshUI() {
    try {
      var lang = Storage.getSetting("lang");
      if ((lang === "fa" || lang === "en") && I18N.lang !== lang) {
        I18N.setLang(lang);
      }
    } catch (e) { /* not critical */ }
    if (window.ThemeManager && ThemeManager.refresh) ThemeManager.refresh();
    if (window.App && App.applyAll) { App.applyAll(); return; }
    if (window.Calendar && Calendar.render) Calendar.render();
    if (window.TodoApp && TodoApp.render) TodoApp.render();
    if (window.Birthdays && Birthdays.refresh) Birthdays.refresh();
    if (window.YearCounter && YearCounter.render) YearCounter.render();
    if (window.Streak && Streak.refresh) Streak.refresh();
  }

  /* ----- lifecycle triggers ----- */
  function maybeFocusSync() {
    if (!ready() || !navigator.onLine) return;
    var t = nowMs();
    if (t - lastFocusSync < FOCUS_RESYNC_MS) return;
    lastFocusSync = t;
    syncNow();
  }

  function init() {
    if (inited) return;
    inited = true;
    ensureTimestamps();

    window.addEventListener("online", function () {
      if (ready()) syncNow();
      else notify();
    });
    window.addEventListener("offline", notify);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "hidden") maybeFocusSync();
    });
    window.addEventListener("focus", maybeFocusSync);
  }

  document.addEventListener("DOMContentLoaded", init);

  /* ================= public API ================= */
  return {
    init: init,
    onLocalChange: onLocalChange,
    setAuthUser: setAuthUser,
    syncNow: syncNow,
    status: status,
    refreshUI: refreshUI,
    onChange: function (cb) { listener = cb; }
  };
})();





