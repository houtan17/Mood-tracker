/* ============================================
   STORAGE (localStorage + export/import)
   Data shape:
   {
     entries: {
       "1403-05-12": { mood: 2, note: "...", updatedAt: 1690000000000 }
     },
     settings: { lang: "fa" | "en" }
   }
   Date keys are zero-padded Jalali: jy-jm-jd

   PERFORMANCE: the parsed blob is cached in memory and
   written through on save(). Before, every read re-parsed
   the whole store — one calendar render alone called
   getEntry() 31+ times (31 full JSON parses per frame).
   The cache is invalidated by sync.js (which writes this
   key directly when merging cloud data) via
   onExternalWrite(), and by the `storage` event so other
   tabs never see stale data.
   ============================================ */

var Storage = (function () {
  "use strict";

  var KEY = "moodTracker.v1";
  var cache = null;

  function defaultData() {
    return { entries: {}, settings: { lang: null } };
  }

  function load() {
    if (cache) return cache;
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { cache = defaultData(); return cache; }
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") {
        cache = defaultData();
      } else {
        data.entries = data.entries || {};
        data.settings = data.settings || {};
        cache = data;
      }
    } catch (e) {
      cache = defaultData();
    }
    return cache;
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    cache = data; /* write-through: the object IS the new cache */
    /* Notify the sync engine (guarded: Sync may not be loaded,
       e.g. when running as a plain file or on error pages) */
    if (window.Sync) Sync.onLocalChange("mood");
  }

  /* Invalidate when the underlying record changes underneath us
     (sync.js merge / timestamps; another tab via the storage event). */
  function onExternalWrite(key) {
    if (key === KEY) cache = null;
  }

  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", function (e) {
      /* e.key === null means clear(); either way drop the cache */
      if (e.key === KEY || e.key === null) cache = null;
    });
  }

  /* Settings sync by timestamp (last-write-wins). Streak keys
     get their own timestamp so they sync independently. */
  function touchTimestamps(data, name) {
    var t = Date.now();
    data.settingsUpdatedAt = t;
    if (name === "lastVisitDate" || name === "streakCount") {
      data.streakUpdatedAt = t;
    }
  }

  function dateKey(jy, jm, jd) {
    return jy + "-" + UI.pad2(jm) + "-" + UI.pad2(jd);
  }

  /* ----- Public API ----- */
  return {
    load: load,
    save: save,
    dateKey: dateKey,
    onExternalWrite: onExternalWrite,

    /* All entries keyed by Jalali date (read-only view) */
    entries: function () { return load().entries; },

    getEntry: function (jy, jm, jd) {
      return load().entries[dateKey(jy, jm, jd)] || null;
    },

    setEntry: function (jy, jm, jd, mood, note) {
      var data = load();
      data.entries[dateKey(jy, jm, jd)] = {
        mood: mood,
        note: note,
        updatedAt: Date.now()
      };
      save(data);
    },

    removeEntry: function (jy, jm, jd) {
      var data = load();
      delete data.entries[dateKey(jy, jm, jd)];
      save(data);
    },

    setSetting: function (name, value) {
      var data = load();
      data.settings[name] = value;
      touchTimestamps(data, name);
      save(data);
    },

    getSetting: function (name) {
      return load().settings[name];
    }
  };
})();
