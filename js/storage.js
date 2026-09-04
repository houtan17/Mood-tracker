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
   ============================================ */

var Storage = (function () {
  "use strict";

  var KEY = "moodTracker.v1";

  function defaultData() {
    return { entries: {}, settings: { lang: null } };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return defaultData();
      data.entries = data.entries || {};
      data.settings = data.settings || {};
      return data;
    } catch (e) {
      return defaultData();
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    /* Notify the sync engine (guarded: Sync may not be loaded,
       e.g. when running as a plain file or on error pages) */
    if (window.Sync) Sync.onLocalChange("mood");
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
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return jy + "-" + pad(jm) + "-" + pad(jd);
  }

  /* ----- Public API ----- */
  return {
    load: load,
    save: save,
    dateKey: dateKey,

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
