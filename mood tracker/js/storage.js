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
      save(data);
    },

    getSetting: function (name) {
      return load().settings[name];
    },

    exportToFile: function () {
      var blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "mood-tracker-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    /* Merges entries from a backup file into existing data.
       Only well-shaped entries are accepted.
       Calls back with (errorMessage | null). */
    importFromFile: function (file, done) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var incoming = JSON.parse(reader.result);
          if (!incoming || typeof incoming.entries !== "object" ||
            Array.isArray(incoming.entries)) {
            done("invalid");
            return;
          }
          var keyRe = /^\d{4}-\d{2}-\d{2}$/;
          var data = load();
          Object.keys(incoming.entries).forEach(function (k) {
            var e = incoming.entries[k];
            if (!keyRe.test(k) || !e || typeof e !== "object") return;
            if (typeof e.mood !== "number" || e.mood < 1 || e.mood > Moods.COUNT) return;
            if (e.note != null && typeof e.note !== "string") return;
            data.entries[k] = {
              mood: e.mood,
              note: typeof e.note === "string" ? e.note : "",
              updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : Date.now()
            };
          });
          save(data);
          done(null);
        } catch (e) {
          done("invalid");
        }
      };
      reader.onerror = function () { done("invalid"); };
      reader.readAsText(file);
    }
  };
})();
