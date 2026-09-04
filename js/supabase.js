/* ============================================
   SUPABASE CONFIG — js/supabase.js
   Creates the ONE shared Supabase client used by
   js/auth.js (accounts) and js/sync.js (data sync).

   The library itself is vendored locally at
   js/vendor/supabase.js (UMD build of @supabase/supabase-js),
   so accounts + sync also work offline like the rest of the
   PWA — no CDN round-trip needed.

   If the library ever fails to load, the app simply keeps
   working exactly as before (pure localStorage); the auth
   UI stays hidden and sync stays disabled.
   ============================================ */

var SupaConfig = (function () {
  "use strict";

  /* ----- Project credentials ----- */
  var SUPABASE_URL = "https://pcgdhkczkyxhpybmrcuf.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ2Roa2N6a3l4aHB5Ym1yY3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Njg4OTcsImV4cCI6MjEwNDA0NDg5N30.oJ_tnjXWw2831AKcL7_S7bwFZ_iHQGTphFAEDfDpeKE";

  /* `window.supabase` is the global exposed by the UMD bundle */
  var lib = window.supabase;
  var client = null;

  if (lib && typeof lib.createClient === "function") {
    try {
      client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,     /* session survives reloads (localStorage) */
          autoRefreshToken: true,   /* refresh the token whenever online */
          detectSessionInUrl: true  /* finish Google OAuth / recovery links */
        }
      });
    } catch (e) {
      console.error("Supabase init failed:", e);
      client = null;
    }
  } else {
    console.warn("supabase-js not loaded — account & sync features are disabled.");
  }

  /* ----- Public API ----- */
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,

    getClient: function () { return client; },
    isReady: function () { return !!client; }
  };
})();
