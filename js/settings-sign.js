/* ============================================
   SETTINGS SIGNATURE — js/settings-sign.js

   A fingerprint of a settings state, so the admin panel can tell
   whether the live settings still match the newest stored version.

   WHAT THIS IS NOT
   This is not authentication and not encryption. It is a checksum
   computed in the browser to answer one question: "has anything
   changed since the last version?" The authoritative record is always
   the database — the snapshot trigger writes it, and the server
   function verifies a restore against the table, not against this
   value. A forged fingerprint can mislead the UI badge and nothing
   else.

   Implementation notes
   - SHA-256 comes from WebCrypto when available (any secure context).
   - The fallback is a deterministic FNV-1a based 128-bit fold, used
     only when crypto.subtle is missing. It is clearly labelled
     "weak" in the result so the UI never claims more than it has.
   - Keys are sorted before hashing, so two states with the same
     content always produce the same digest regardless of key order.
   ============================================ */

var SettingsSign = (function () {
  "use strict";

  /* The byte encoder comes from js/base64url.js. Resolving it once, at
     load time, with an explicit message beats a bare `B64` reference
     that only fails later — deep inside digestSync — with an opaque
     ReferenceError. The global is also accepted so the module can be
     sandboxed in tests. */
  var BASE64 = (typeof B64 !== "undefined" && B64) ||
    (typeof globalThis !== "undefined" && globalThis.B64) || null;

  if (!BASE64 || typeof BASE64.utf8Bytes !== "function") {
    throw new Error("settings-sign.js requires js/base64url.js to be loaded first");
  }

  /* Canonical JSON: object keys sorted, arrays in order, no whitespace
     variance. Numbers are emitted through JSON.stringify so 1 and 1.0
     normalise identically.

     Values that cannot be part of a settings state (functions, symbols,
     undefined) are OMITTED from objects rather than rendered as "null".
     Rendering them as null would make { a: 1, onClick: fn } hash
     differently from { a: 1 } even though the two states are identical
     once serialised — and settings states do get JSON round-tripped
     through Postgres, so that difference is not real. */
  function canonical(value) {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number") return isFinite(value) ? String(value) : "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return "[" + value.map(canonical).join(",") + "]";
    }
    if (typeof value === "object") {
      var keys = Object.keys(value).sort();
      var parts = [];
      for (var i = 0; i < keys.length; i += 1) {
        var v = value[keys[i]];
        if (v === undefined || typeof v === "function" || typeof v === "symbol") continue;
        parts.push(JSON.stringify(keys[i]) + ":" + canonical(v));
      }
      return "{" + parts.join(",") + "}";
    }
    return "null"; /* functions, symbols at the top level */
  }

  function toHex(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 1) {
      var h = bytes[i].toString(16);
      s += h.length === 1 ? "0" + h : h;
    }
    return s;
  }

  /* Deterministic 128-bit fold over UTF-8 bytes. Four independent
     FNV-1a offsets give four 32-bit words, which are concatenated.
     Not cryptographic — collision-resistant enough for a UI badge. */
  function weakDigest(bytes) {
    var seeds = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
    var words = [];
    for (var s = 0; s < seeds.length; s += 1) {
      var h = seeds[s] >>> 0;
      for (var i = 0; i < bytes.length; i += 1) {
        h ^= bytes[i];
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      h ^= bytes.length;
      h = Math.imul(h, 0x85ebca6b) >>> 0;
      words.push(h >>> 0);
    }
    var out = "";
    for (var w = 0; w < words.length; w += 1) {
      var x = words[w].toString(16);
      while (x.length < 8) x = "0" + x;
      out += x;
    }
    return out;
  }

  function hasWebCrypto() {
    return typeof crypto !== "undefined" && crypto.subtle &&
      typeof crypto.subtle.digest === "function";
  }

  /* digest(state) -> Promise<{hash, algorithm, length}> */
  function digest(state) {
    var json = canonical(state);
    var bytes = BASE64.utf8Bytes(json);

    if (!hasWebCrypto()) {
      var weak = weakDigest(bytes);
      return Promise.resolve({ hash: weak, algorithm: "fnv128-weak", length: weak.length });
    }

    var view = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i += 1) view[i] = bytes[i];

    return crypto.subtle.digest("SHA-256", view).then(function (buffer) {
      var hex = toHex(new Uint8Array(buffer));
      return { hash: hex, algorithm: "SHA-256", length: hex.length };
    }).catch(function () {
      var w = weakDigest(bytes);
      return { hash: w, algorithm: "fnv128-weak", length: w.length };
    });
  }

  /* Synchronous variant, for places that only need a cheap change
     detector and cannot await. */
  function digestSync(state) {
    var bytes = BASE64.utf8Bytes(canonical(state));
    return { hash: weakDigest(bytes), algorithm: "fnv128-weak", length: 32 };
  }

  /* Convenience: do two states look identical? Order-insensitive. */
  function equal(a, b) {
    return canonical(a) === canonical(b);
  }

  return {
    canonical: canonical,
    digest: digest,
    digestSync: digestSync,
    equal: equal,
    hasWebCrypto: hasWebCrypto,
    toHex: toHex,
    weakDigest: weakDigest
  };
})();

if (typeof window !== "undefined") window.SettingsSign = SettingsSign;
