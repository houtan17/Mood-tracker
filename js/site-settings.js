/* ============================================
   SITE SETTINGS (DB-backed) — js/site-settings.js
   Loads the global website settings from the
   `site_settings` table (supabase-admin.sql) and
   applies them to the existing CSS variable system.

   HOW IT WORKS
   - Loaded SYNCHRONOUSLY in <head>, right after
     css/variables.css (see index.html):
       1. A sessionStorage cache (30-min TTL) is
          applied IMMEDIATELY -> repeat visits have
          zero flash of default colors.
       2. A single REST fetch starts right away;
          when it resolves, fresh values are applied
          and the cache is refreshed.
   - Values are injected as CSS custom-property
     overrides in a <style> inserted AFTER
     variables.css, so they win the cascade while
     leaving css/variables.css untouched as the
     default/fallback configuration.
   - EVERY value is validated before applying
     (color regex, numeric clamps, booleans); an
     invalid stored value can never break the site.
   - If Supabase is unavailable (or the fetch
     fails), the site silently keeps the
     css/variables.css defaults -> fully usable.

   SECURITY NOTE
   - Uses ONLY the public anon key (no service-role
     key, no secrets) and only READS `site_settings`
     (public SELECT per RLS). Writes are admin-only,
     enforced by RLS in supabase-admin.sql.
   - The REST fetch here does not depend on
     js/supabase.js so settings start as early as
     possible; keep SUPABASE_URL / SUPABASE_ANON_KEY
     in sync with js/supabase.js if they ever change.

   KEEP IN SYNC
   - DEFAULTS below mirror css/variables.css
     (light + dark palettes) — they are the fallback
     when the database has no value for a token.
   ============================================ */

var SiteSettings = (function () {
  "use strict";

  /* ----- Supabase REST endpoint (public anon) ----- */
  var SUPABASE_URL = "https://pcgdhkczkyxhpybmrcuf.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZ2Roa2N6a3l4aHB5Ym1yY3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0Njg4OTcsImV4cCI6MjEwNDA0NDg5N30.oJ_tnjXWw2831AKcL7_S7bwFZ_iHQGTphFAEDfDpeKE";
  var REST_URL = SUPABASE_URL + "/rest/v1/site_settings";
  var REST_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: "Bearer " + SUPABASE_ANON_KEY,
    Accept: "application/json"
  };

  /* ----- Cache ----- */
  var CACHE_KEY = "siteSettings.v1";
  var CACHE_TTL = 30 * 60 * 1000; /* 30 minutes */
  var STYLE_ID = "ss-overrides";

  /* ============================================================
     DEFAULTS — mirror css/variables.css (fallback values)
     ============================================================ */
  var DEFAULTS = {
    light: {
      bg: "#f4f6fb",
      bgGradientFrom: "#eef3ff",
      bgGradientVia: "#f7f5ff",
      bgGradientTo: "#fdf4ec",
      bgGradientAngle: 165,
      card: "#ffffff",
      headerGlass: "rgba(255, 255, 255, 0.72)",
      border: "#e6eaf3",
      overlay: "rgba(38, 48, 67, 0.35)",
      text: "#263043",
      textMuted: "#8a94ab",
      primary: "#5b7cfa",
      primary2: "#5b7cfa",
      primaryDark: "#4a68e0",
      primarySoft: "#eef2ff",
      danger: "#ef5350",
      dangerSoft: "#fdecec",
      /* Status tokens (mirror css/variables.css :root) */
      success: "#2e9e57",
      successSoft: "#e0f6e7",
      warning: "#c98a1b",
      warningSoft: "#fff3d9"
    }
  };

  DEFAULTS.dark = {
    bg: "#0f1220",
    bgGradientFrom: "#0b0e1c",
    bgGradientVia: "#121830",
    bgGradientTo: "#1a1430",
    bgGradientAngle: 165,
    card: "#181d2e",
    headerGlass: "rgba(15, 18, 32, 0.72)",
    border: "#2a3145",
    overlay: "rgba(0, 0, 0, 0.55)",
    text: "#e9edf7",
    textMuted: "#9099b0",
    primary: "#7d95ff",
    primary2: "#a78bfa",
    primaryDark: "#98acff",
    primarySoft: "#232b47",
    danger: "#f27572",
    dangerSoft: "#3a2226",
    /* Status tokens (mirror css/variables.css html[data-theme="dark"]) */
    success: "#4fce7c",
    successSoft: "#16321f",
    warning: "#e6b04f",
    warningSoft: "#33270e"
  };

  DEFAULTS.moodLight = {
    mood1Bg: "#e0f6e7", mood1Color: "#2e9e57",
    mood2Bg: "#edf7da", mood2Color: "#71a632",
    mood3Bg: "#fff3d9", mood3Color: "#c98a1b",
    mood4Bg: "#ffeadb", mood4Color: "#e07a3f",
    mood5Bg: "#fde3e3", mood5Color: "#d84a4a"
  };

  DEFAULTS.moodDark = {
    mood1Bg: "#16321f", mood1Color: "#4fce7c",
    mood2Bg: "#25301a", mood2Color: "#a3cf5f",
    mood3Bg: "#33270e", mood3Color: "#e6b04f",
    mood4Bg: "#362211", mood4Color: "#ef9558",
    mood5Bg: "#38191b", mood5Color: "#f07575"
  };

  DEFAULTS.ui = {
    radius: 18,
    radiusPreset: "medium",
    glassEnabled: true,
    glassBlur: 12,
    glassOpacity: 0.72,
    glassBorderOpacity: 1,
    shadowsEnabled: true,
    shadowPreset: "medium",
    shadowStrength: 100,
    gradientEnabled: true,
    gradientFrom: "#eef3ff",
    gradientVia: "#f7f5ff",
    gradientTo: "#fdf4ec",
    gradientAngle: 165,
    animationsEnabled: true,
    animationSpeed: 1,
    animationIntensity: "normal",
    reducedMotion: false
  };

  DEFAULTS.general = {
    siteName: "",
    siteNameEn: "",
    description: "",
    descriptionEn: "",
    logoUrl: ""
  };

  DEFAULTS.seo = {
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    robots: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterCard: "summary_large_image",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
    schemaJson: "",
    sitemapEnabled: false,
    sitemapUrl: "/sitemap.xml"
  };

  /* ----- Resolved groups (validated DB values over defaults) ----- */
  var groups = {
    light: Object.assign({}, DEFAULTS.light),
    dark: Object.assign({}, DEFAULTS.dark),
    moodLight: Object.assign({}, DEFAULTS.moodLight),
    moodDark: Object.assign({}, DEFAULTS.moodDark),
    ui: Object.assign({}, DEFAULTS.ui),
    general: Object.assign({}, DEFAULTS.general),
    seo: Object.assign({}, DEFAULTS.seo)
  };

  /* ============================================================
     VALIDATION
     ============================================================ */
  var COLOR_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^(rgba?|hsla?)\(\s*[^()]*\s*\)$/;
  var URL_RE = /^(https?:\/\/|\/)[^\s"']*$/;

  function validColor(v) {
    if (typeof v !== "string") return false;
    var s = v.trim();
    if (!s || s.length > 120) return false;
    return COLOR_RE.test(s);
  }
  function validUrl(v) {
    if (typeof v !== "string") return false;
    var s = v.trim();
    if (!s) return true; /* empty = unset */
    return s.length <= 400 && URL_RE.test(s);
  }
  function num(v, min, max, fallback) {
    var n = typeof v === "number" ? v : parseFloat(v);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
  function bool(v) { return v === true; }
  function rawText(v, maxLen) {
    if (typeof v !== "string") return "";
    return v.trim().slice(0, maxLen || 200);
  }

  /* Scale the alpha of "rgba(r, g, b, a)" color strings (shadows) */
  function scaleAlpha(color, factor) {
    var m = color.match(/^(rgba?|hsla?)\(\s*([^)]*)\)$/);
    if (!m) return color;
    var parts = m[2].split(",").map(function (p) { return p.trim(); });
    if (parts.length < 4) return color;
    var a = parseFloat(parts[3]);
    if (!isFinite(a)) return color;
    a = Math.min(1, Math.max(0, a * factor));
    parts[3] = String(a);
    return m[1] + "(" + parts.join(", ") + ")";
  }

  function validatePalette(p, fallback) {
    var out = Object.assign({}, fallback);
    if (!p || typeof p !== "object") return out;
    Object.keys(fallback).forEach(function (k) {
      if (k === "bgGradientAngle") {
        out[k] = num(p[k], 0, 360, fallback[k]);
      } else {
        if (validColor(p[k])) out[k] = String(p[k]).trim();
      }
    });
    return out;
  }

  function validateMood(m, fallback) {
    var out = Object.assign({}, fallback);
    if (!m || typeof m !== "object") return out;
    Object.keys(fallback).forEach(function (k) {
      if (validColor(m[k])) out[k] = String(m[k]).trim();
    });
    return out;
  }

  var RADIUS_PRESETS = ["none", "small", "medium", "large", "xlarge", "pill", "custom"];
  var SHADOW_PRESETS = ["none", "subtle", "medium", "strong", "custom"];
  var ANIM_INTENSITIES = ["subtle", "normal", "express"];

  function oneOf(v, allowed, fallback) {
    return allowed.indexOf(v) !== -1 ? v : fallback;
  }

  function validateUi(u, fallback) {
    var out = Object.assign({}, fallback);
    if (!u || typeof u !== "object") return out;
    out.radius = num(u.radius, 0, 32, fallback.radius);
    out.radiusPreset = oneOf(u.radiusPreset, RADIUS_PRESETS, fallback.radiusPreset);
    out.glassEnabled = bool(u.glassEnabled);
    out.glassBlur = num(u.glassBlur, 0, 40, fallback.glassBlur);
    out.glassOpacity = num(u.glassOpacity, 0, 1, fallback.glassOpacity);
    out.glassBorderOpacity = num(u.glassBorderOpacity, 0, 1, fallback.glassBorderOpacity);
    out.shadowsEnabled = bool(u.shadowsEnabled);
    out.shadowPreset = oneOf(u.shadowPreset, SHADOW_PRESETS, fallback.shadowPreset);
    out.shadowStrength = num(u.shadowStrength, 0, 200, fallback.shadowStrength);
    out.gradientEnabled = bool(u.gradientEnabled);
    /* Gradient colors also fall back to the palette's own bgGradient*
       values, so a missing UI value never blanks the background. */
    out.gradientFrom = validColor(u.gradientFrom) ? String(u.gradientFrom).trim() : fallback.gradientFrom;
    out.gradientVia = validColor(u.gradientVia) ? String(u.gradientVia).trim() : fallback.gradientVia;
    out.gradientTo = validColor(u.gradientTo) ? String(u.gradientTo).trim() : fallback.gradientTo;
    out.gradientAngle = num(u.gradientAngle, 0, 360, fallback.gradientAngle);
    out.animationsEnabled = bool(u.animationsEnabled);
    out.animationSpeed = num(u.animationSpeed, 0.25, 2.5, fallback.animationSpeed);
    out.animationIntensity = oneOf(u.animationIntensity, ANIM_INTENSITIES, fallback.animationIntensity);
    out.reducedMotion = bool(u.reducedMotion);
    return out;
  }

  function validateGeneral(g, fallback) {
    var out = Object.assign({}, fallback);
    if (!g || typeof g !== "object") return out;
    out.siteName = rawText(g.siteName, 60);
    out.siteNameEn = rawText(g.siteNameEn, 60);
    out.description = rawText(g.description, 200);
    out.descriptionEn = rawText(g.descriptionEn, 200);
    out.logoUrl = validUrl(g.logoUrl) ? rawText(g.logoUrl, 400) : fallback.logoUrl;
    return out;
  }

  function validateSeo(s, fallback) {
    var out = Object.assign({}, fallback);
    if (!s || typeof s !== "object") return out;
    out.metaTitle = rawText(s.metaTitle, 60);
    out.metaDescription = rawText(s.metaDescription, 160);
    out.canonicalUrl = validUrl(s.canonicalUrl) ? rawText(s.canonicalUrl, 400) : fallback.canonicalUrl;
    out.robots = rawText(s.robots, 60);
    out.ogTitle = rawText(s.ogTitle, 60);
    out.ogDescription = rawText(s.ogDescription, 160);
    out.ogImage = validUrl(s.ogImage) ? rawText(s.ogImage, 400) : fallback.ogImage;
    var tc = ["summary", "summary_large_image"];
    var card = rawText(s.twitterCard, 40);
    out.twitterCard = tc.indexOf(card) !== -1 ? card : fallback.twitterCard;
    out.twitterTitle = rawText(s.twitterTitle, 60);
    out.twitterDescription = rawText(s.twitterDescription, 160);
    out.twitterImage = validUrl(s.twitterImage) ? rawText(s.twitterImage, 400) : fallback.twitterImage;
    out.schemaJson = typeof s.schemaJson === "string" ? s.schemaJson.slice(0, 4000) : fallback.schemaJson;
    out.sitemapEnabled = bool(s.sitemapEnabled);
    out.sitemapUrl = validUrl(s.sitemapUrl) ? rawText(s.sitemapUrl, 400) : fallback.sitemapUrl;
    return out;
  }

  /* Merge a [{key, value}] row list into the resolved groups */
  function mergeRows(rows) {
    if (!rows || !rows.length) return;
    rows.forEach(function (row) {
      var k = row && row.key;
      var v = row && row.value;
      if (!k || !v || typeof v !== "object") return;
      switch (k) {
        case "appearance.light": groups.light = validatePalette(v, DEFAULTS.light); break;
        case "appearance.dark": groups.dark = validatePalette(v, DEFAULTS.dark); break;
        case "moodColors.light": groups.moodLight = validateMood(v, DEFAULTS.moodLight); break;
        case "moodColors.dark": groups.moodDark = validateMood(v, DEFAULTS.moodDark); break;
        case "ui": groups.ui = validateUi(v, DEFAULTS.ui); break;
        case "general": groups.general = validateGeneral(v, DEFAULTS.general); break;
        case "seo": groups.seo = validateSeo(v, DEFAULTS.seo); break;
        /* unknown keys are ignored -> adding groups later needs no change here */
      }
    });
  }

  /* ============================================================
     CSS BUILD + APPLY
     Custom-property overrides only — they win the cascade over
     css/variables.css (which stays untouched as the defaults).
     ============================================================ */
  var PALETTE_VARS = {
    bg: "--bg",
    card: "--card",
    headerGlass: "--header-glass",
    border: "--border",
    overlay: "--overlay",
    text: "--text",
    textMuted: "--text-muted",
    primary: "--primary",
    primary2: "--primary-2",
    primaryDark: "--primary-dark",
    primarySoft: "--primary-soft",
    danger: "--danger",
    dangerSoft: "--danger-soft"
  };

  var MOOD_VARS = {
    mood1Bg: "--mood-1-bg", mood1Color: "--mood-1-color",
    mood2Bg: "--mood-2-bg", mood2Color: "--mood-2-color",
    mood3Bg: "--mood-3-bg", mood3Color: "--mood-3-color",
    mood4Bg: "--mood-4-bg", mood4Color: "--mood-4-color",
    mood5Bg: "--mood-5-bg", mood5Color: "--mood-5-color"
  };

  function gradientOf(pal) {
    /* UI options own the gradient stops (Appearance Editor); the palette's
       bgGradient* values remain the fallback so older rows still render. */
    var from = groups.ui.gradientFrom || pal.bgGradientFrom;
    var via = groups.ui.gradientVia || pal.bgGradientVia;
    var to = groups.ui.gradientTo || pal.bgGradientTo;
    var angle = num(groups.ui.gradientAngle, 0, 360, pal.bgGradientAngle);
    return "linear-gradient(" + angle + "deg, " +
      from + " 0%, " + via + " 55%, " + to + " 100%)";
  }

  function glowOf(primary, isDark) {
    var m = String(primary || "").match(/^#([0-9a-fA-F]{6})$/);
    if (!m) return isDark
      ? "0 6px 18px rgba(125, 149, 255, 0.28)"
      : "0 6px 18px rgba(91, 124, 250, 0.35)";
    var r = parseInt(m[1].slice(0, 2), 16);
    var g = parseInt(m[1].slice(2, 4), 16);
    var b = parseInt(m[1].slice(4, 6), 16);
    return "0 6px 18px rgba(" + r + ", " + g + ", " + b + ", " +
      (isDark ? "0.28" : "0.35") + ")";
  }

  /* Parse a validated hex or rgb()/rgba() color into components.
     Returns { css, r, g, b, a } or null when the value is unusable.
     Used by moodGradientOf() to derive a subtle sheen from a mood
     background token without introducing a second color system. */
  function parseColor(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return null;

    var hex = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    if (hex) {
      var h = hex[1];
      if (h.length === 3 || h.length === 4) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] +
          (h.length === 4 ? h[3] + h[3] : "");
      }
      var r = parseInt(h.slice(0, 2), 16);
      var g = parseInt(h.slice(2, 4), 16);
      var b = parseInt(h.slice(4, 6), 16);
      var a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { css: s, r: r, g: g, b: b, a: a };
    }

    var rgb = s.match(/^rgba?\(\s*([^)]*)\)$/i);
    if (rgb) {
      var parts = rgb[1].split(/[,\s/]+/).filter(function (p) { return p !== ""; });
      if (parts.length < 3) return null;
      function channel(n) {
        var v = String(n).trim();
        if (v.indexOf("%") !== -1) return Math.round(parseFloat(v) * 2.55);
        return parseInt(v, 10);
      }
      var rr = channel(parts[0]);
      var gg = channel(parts[1]);
      var bb = channel(parts[2]);
      if (!isFinite(rr) || !isFinite(gg) || !isFinite(bb)) return null;
      var aa = parts.length >= 4 ? parseFloat(parts[3]) : 1;
      return {
        css: s,
        r: Math.min(255, Math.max(0, rr)),
        g: Math.min(255, Math.max(0, gg)),
        b: Math.min(255, Math.max(0, bb)),
        a: isFinite(aa) ? Math.min(1, Math.max(0, aa)) : 1
      };
    }
    return null;
  }

  /* Scale a parsed color's lightness by `factor` (>1 lighten, <1 darken)
     while preserving its alpha. Always returns a usable color object. */
  function shade(color, factor) {
    if (!color) return { css: "", r: 0, g: 0, b: 0, a: 1 };
    var f = num(factor, 0, 4, 1);
    function mix(c) {
      var v = f >= 1 ? c + (255 - c) * (f - 1) : c * f;
      return Math.min(255, Math.max(0, Math.round(v)));
    }
    var r = mix(color.r);
    var g = mix(color.g);
    var b = mix(color.b);
    var css = color.a >= 1
      ? "rgb(" + r + ", " + g + ", " + b + ")"
      : "rgba(" + r + ", " + g + ", " + b + ", " + color.a + ")";
    return { css: css, r: r, g: g, b: b, a: color.a };
  }

  function moodGradientOf(bg, dir) {
    /* Subtle 120deg sheen derived around the validated base bg color.
       The returned pair stays dominated by the base color so the mood
       token itself is never visually replaced by the gradient. */
    var out = parseColor(bg);
    if (!out) return bg;
    var f = dir < 0 ? 0.94 : 1.06;
    return "linear-gradient(120deg, " + out.css + " 0%, " +
      shade(out, f).css + " 100%)";
  }

  function buildCss() {
    var css = "";

    /* ----- Light palette (:root) ----- */
    css += ":root {\n";
    Object.keys(PALETTE_VARS).forEach(function (k) {
      css += "  " + PALETTE_VARS[k] + ": " + groups.light[k] + ";\n";
    });
    css += "  --bg-gradient: " + (groups.ui.gradientEnabled ? gradientOf(groups.light) : groups.light.bg) + ";\n";

    /* Semantic status tokens (from the palette; mood 1/3 provide the
       success/warning tints exactly like css/variables.css does) */
    css += "  --secondary: " + groups.light.primary + ";\n";
    css += "  --secondary-soft: " + groups.light.primarySoft + ";\n";
    css += "  --success: " + groups.light.success + ";\n";
    css += "  --success-soft: " + groups.light.successSoft + ";\n";
    css += "  --warning: " + groups.light.warning + ";\n";
    css += "  --warning-soft: " + groups.light.warningSoft + ";\n";
    css += "  --info: " + groups.light.primary + ";\n";
    css += "  --info-soft: " + groups.light.primarySoft + ";\n";
    css += "  --focus-ring: " + groups.light.primary + ";\n";

    /* Shadows */
    if (!groups.ui.shadowsEnabled) {
      css += "  --shadow: none;\n  --shadow-lg: none;\n";
    } else if (groups.ui.shadowStrength !== 100) {
      var f = groups.ui.shadowStrength / 100;
      css += "  --shadow: " + scaleAlpha("rgba(70, 80, 130, 0.10)", f) + ";\n";
      css += "  --shadow-lg: " + scaleAlpha("rgba(70, 80, 130, 0.16)", f) + ";\n";
    } else {
      css += "  --shadow: " + glowOf(groups.light.primary, false) + ";\n";
      css += "  --shadow-lg: " + scaleAlpha("rgba(70, 80, 130, 0.16)", 1) + ";\n";
    }
    css += "  --shadow-sm: " + scaleAlpha("rgba(70, 80, 130, 0.08)", groups.ui.shadowStrength / 100) + ";\n";
    css += "  --shadow-md: " + scaleAlpha("rgba(70, 80, 130, 0.10)", groups.ui.shadowStrength / 100) + ";\n";
    css += "  --shadow-xl: " + scaleAlpha("rgba(70, 80, 130, 0.20)", groups.ui.shadowStrength / 100) + ";\n";
    css += "  --glow: " + glowOf(groups.light.primary, false) + ";\n";

    /* Radius scale */
    var r = groups.ui.radius;
    css += "  --radius: " + r + "px;\n";
    css += "  --radius-sm: " + Math.max(0, r - 6) + "px;\n";
    css += "  --radius-xs: " + Math.max(0, r - 10) + "px;\n";
    css += "  --radius-md: " + r + "px;\n";
    css += "  --radius-lg: " + Math.min(999, r + 4) + "px;\n";
    css += "  --radius-xl: " + Math.min(999, r + 10) + "px;\n";
    css += "  --radius-full: 999px;\n";

    /* Mood system: base colors + derived gradients */
    Object.keys(MOOD_VARS).forEach(function (k) {
      css += "  " + MOOD_VARS[k] + ": " + groups.moodLight[k] + ";\n";
    });
    css += "  --mood-1: " + groups.moodLight.mood1Color + ";\n";
    css += "  --mood-2: " + groups.moodLight.mood2Color + ";\n";
    css += "  --mood-3: " + groups.moodLight.mood3Color + ";\n";
    css += "  --mood-4: " + groups.moodLight.mood4Color + ";\n";
    css += "  --mood-5: " + groups.moodLight.mood5Color + ";\n";
    css += "  --gradient-mood-1: " + moodGradientOf(groups.moodLight.mood1Bg, 1) + ";\n";
    css += "  --gradient-mood-2: " + moodGradientOf(groups.moodLight.mood2Bg, 1) + ";\n";
    css += "  --gradient-mood-3: " + moodGradientOf(groups.moodLight.mood3Bg, 1) + ";\n";
    css += "  --gradient-mood-4: " + moodGradientOf(groups.moodLight.mood4Bg, 1) + ";\n";
    css += "  --gradient-mood-5: " + moodGradientOf(groups.moodLight.mood5Bg, 1) + ";\n";

    /* Type + spacing + motion + component tokens */
    css += "  --font-size-xs: 0.72rem;\n";
    css += "  --font-size-sm: 0.82rem;\n";
    css += "  --font-size-md: 0.925rem;\n";
    css += "  --font-size-lg: 1.05rem;\n";
    css += "  --font-size-xl: 1.2rem;\n";
    css += "  --font-size-2xl: clamp(1.4rem, 4.5vw, 1.9rem);\n";
    css += "  --line-height-tight: 1.25;\n";
    css += "  --line-height-normal: 1.55;\n";
    css += "  --line-height-relaxed: 1.75;\n";
    css += "  --space-1: 4px;\n";
    css += "  --space-2: 8px;\n";
    css += "  --space-3: 12px;\n";
    css += "  --space-4: 16px;\n";
    css += "  --space-5: 20px;\n";
    css += "  --space-6: 24px;\n";
    css += "  --space-8: 32px;\n";
    css += "  --space-10: 40px;\n";
    css += "  --space-12: 48px;\n";
    css += "  --duration-fast: 120ms;\n";
    css += "  --duration-normal: 200ms;\n";
    css += "  --duration-slow: 350ms;\n";
    css += "  --ease-standard: ease;\n";
    css += "  --ease-emphasized: cubic-bezier(0.22, 0.9, 0.3, 1.2);\n";
    css += "  --anim-speed: 1;\n";
    css += "  --btn-height: 42px;\n";
    css += "  --btn-padding: 0 var(--space-4);\n";
    css += "  --btn-radius: var(--radius-sm);\n";
    css += "  --input-height: 44px;\n";
    css += "  --input-padding: 0 var(--space-3);\n";
    css += "  --input-radius: var(--radius-sm);\n";
    css += "  --card-padding: var(--space-4);\n";
    css += "  --card-radius: var(--radius);\n";
    css += "  --modal-radius: var(--radius-lg);\n";
    css += "  --modal-shadow: var(--shadow-lg);\n";
    css += "  --gradient-primary: linear-gradient(135deg, " + groups.light.primary + ", " + groups.light.primary2 + ");\n";
    css += "  --gradient-card: linear-gradient(180deg, " + groups.light.card + " 0%, " + groups.light.primarySoft + " 220%);\n";
    css += "  --glass-opacity: " + (groups.ui.glassEnabled ? groups.ui.glassOpacity : 1) + ";\n";
    css += "  --glass-shadow: var(--shadow-md);\n";
    css += "  --glass-border: " + groups.light.border + ";\n";

    css += "  --anim-speed: " + groups.ui.animationSpeed + ";\n";
    css += "  --glass-blur: " + (groups.ui.glassEnabled ? groups.ui.glassBlur : 0) + "px;\n";
    css += "}\n";

    /* ----- Dark palette ----- */
    css += 'html[data-theme="dark"] {\n';
    Object.keys(PALETTE_VARS).forEach(function (k) {
      css += "  " + PALETTE_VARS[k] + ": " + groups.dark[k] + ";\n";
    });
    css += "  --bg-gradient: " + (groups.ui.gradientEnabled ? gradientOf(groups.dark) : groups.dark.bg) + ";\n";

    /* Semantic status tokens (dark: light tint overrides) */
    css += "  --secondary: " + groups.dark.primary + ";\n";
    css += "  --secondary-soft: " + groups.dark.primarySoft + ";\n";
    css += "  --success: " + groups.dark.success + ";\n";
    css += "  --success-soft: " + groups.dark.successSoft + ";\n";
    css += "  --warning: " + groups.dark.warning + ";\n";
    css += "  --warning-soft: " + groups.dark.warningSoft + ";\n";
    css += "  --info: " + groups.dark.primary + ";\n";
    css += "  --info-soft: " + groups.dark.primarySoft + ";\n";
    css += "  --focus-ring: " + groups.dark.primary + ";\n";

    /* Shadows */
    if (!groups.ui.shadowsEnabled) {
      css += "  --shadow: none;\n  --shadow-lg: none;\n";
    } else if (groups.ui.shadowStrength !== 100) {
      var f2 = groups.ui.shadowStrength / 100;
      css += "  --shadow: " + scaleAlpha("rgba(0, 0, 0, 0.45)", f2) + ";\n";
      css += "  --shadow-lg: " + scaleAlpha("rgba(0, 0, 0, 0.55)", f2) + ";\n";
    } else {
      css += "  --shadow: " + glowOf(groups.dark.primary, true) + ";\n";
      css += "  --shadow-lg: " + scaleAlpha("rgba(0, 0, 0, 0.55)", 1) + ";\n";
    }
    css += "  --shadow-sm: " + scaleAlpha("rgba(0, 0, 0, 0.35)", groups.ui.shadowStrength / 100) + ";\n";
    css += "  --shadow-md: " + scaleAlpha("rgba(0, 0, 0, 0.40)", groups.ui.shadowStrength / 100) + ";\n";
    css += "  --shadow-xl: " + scaleAlpha("rgba(0, 0, 0, 0.60)", groups.ui.shadowStrength / 100) + ";\n";
    css += "  --glow: " + glowOf(groups.dark.primary, true) + ";\n";

    /* Radius scale */
    var r2 = groups.ui.radius;
    css += "  --radius: " + r2 + "px;\n";
    css += "  --radius-sm: " + Math.max(0, r2 - 6) + "px;\n";
    css += "  --radius-xs: " + Math.max(0, r2 - 10) + "px;\n";
    css += "  --radius-md: " + r2 + "px;\n";
    css += "  --radius-lg: " + Math.min(999, r2 + 4) + "px;\n";
    css += "  --radius-xl: " + Math.min(999, r2 + 10) + "px;\n";
    css += "  --radius-full: 999px;\n";

    /* Mood system: base colors + derived gradients */
    Object.keys(MOOD_VARS).forEach(function (k) {
      css += "  " + MOOD_VARS[k] + ": " + groups.moodDark[k] + ";\n";
    });
    css += "  --mood-1: " + groups.moodDark.mood1Color + ";\n";
    css += "  --mood-2: " + groups.moodDark.mood2Color + ";\n";
    css += "  --mood-3: " + groups.moodDark.mood3Color + ";\n";
    css += "  --mood-4: " + groups.moodDark.mood4Color + ";\n";
    css += "  --mood-5: " + groups.moodDark.mood5Color + ";\n";
    css += "  --gradient-mood-1: " + moodGradientOf(groups.moodDark.mood1Bg, -1) + ";\n";
    css += "  --gradient-mood-2: " + moodGradientOf(groups.moodDark.mood2Bg, -1) + ";\n";
    css += "  --gradient-mood-3: " + moodGradientOf(groups.moodDark.mood3Bg, -1) + ";\n";
    css += "  --gradient-mood-4: " + moodGradientOf(groups.moodDark.mood4Bg, -1) + ";\n";
    css += "  --gradient-mood-5: " + moodGradientOf(groups.moodDark.mood5Bg, -1) + ";\n";

    /* Type + spacing + motion + component tokens */
    css += "  --font-size-xs: 0.72rem;\n";
    css += "  --font-size-sm: 0.82rem;\n";
    css += "  --font-size-md: 0.925rem;\n";
    css += "  --font-size-lg: 1.05rem;\n";
    css += "  --font-size-xl: 1.2rem;\n";
    css += "  --font-size-2xl: clamp(1.4rem, 4.5vw, 1.9rem);\n";
    css += "  --line-height-tight: 1.25;\n";
    css += "  --line-height-normal: 1.55;\n";
    css += "  --line-height-relaxed: 1.75;\n";
    css += "  --space-1: 4px;\n";
    css += "  --space-2: 8px;\n";
    css += "  --space-3: 12px;\n";
    css += "  --space-4: 16px;\n";
    css += "  --space-5: 20px;\n";
    css += "  --space-6: 24px;\n";
    css += "  --space-8: 32px;\n";
    css += "  --space-10: 40px;\n";
    css += "  --space-12: 48px;\n";
    css += "  --duration-fast: 120ms;\n";
    css += "  --duration-normal: 200ms;\n";
    css += "  --duration-slow: 350ms;\n";
    css += "  --ease-standard: ease;\n";
    css += "  --ease-emphasized: cubic-bezier(0.22, 0.9, 0.3, 1.2);\n";
    css += "  --anim-speed: 1;\n";
    css += "  --btn-height: 42px;\n";
    css += "  --btn-padding: 0 var(--space-4);\n";
    css += "  --btn-radius: var(--radius-sm);\n";
    css += "  --input-height: 44px;\n";
    css += "  --input-padding: 0 var(--space-3);\n";
    css += "  --input-radius: var(--radius-sm);\n";
    css += "  --card-padding: var(--space-4);\n";
    css += "  --card-radius: var(--radius);\n";
    css += "  --modal-radius: var(--radius-lg);\n";
    css += "  --modal-shadow: var(--shadow-lg);\n";
    css += "  --gradient-primary: linear-gradient(135deg, " + groups.dark.primary + ", " + groups.dark.primary2 + ");\n";
    css += "  --gradient-card: linear-gradient(180deg, " + groups.dark.card + " 0%, " + groups.dark.primarySoft + " 220%);\n";
    css += "  --glass-opacity: " + (groups.ui.glassEnabled ? groups.ui.glassOpacity : 1) + ";\n";
    css += "  --glass-shadow: var(--shadow-md);\n";
    css += "  --glass-border: " + groups.dark.border + ";\n";

    css += "  --anim-speed: " + groups.ui.animationSpeed + ";\n";
    css += "  --glass-blur: " + (groups.ui.glassEnabled ? groups.ui.glassBlur : 0) + "px;\n";
    css += "}\n";
    return css;
  }

  function removeStyle() {
    var old = document.getElementById(STYLE_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function applyOverrides() {
    try {
      removeStyle();
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = buildCss();
      /* Insert right AFTER css/variables.css so the custom
         properties win the cascade (other files only USE them). */
      var link = null;
      var links = document.getElementsByTagName("link");
      for (var i = 0; i < links.length; i += 1) {
        var href = links[i].getAttribute("href") || "";
        if (href.indexOf("variables.css") !== -1) { link = links[i]; break; }
      }
      if (link && link.parentNode) {
        link.parentNode.insertBefore(style, link.nextSibling);
      } else {
        document.head.appendChild(style);
      }
      /* State attributes (managed rules live in css/variables.css) */
      var root = document.documentElement;
      if (groups.ui.animationsEnabled) root.removeAttribute("data-anim");
      else root.setAttribute("data-anim", "off");
    } catch (e) {
      /* never break the website over settings */
    }
  }

  /* ============================================================
     CACHE (sessionStorage, 30-min TTL)
     ============================================================ */
  function cacheData() {
    return {
      light: groups.light, dark: groups.dark,
      moodLight: groups.moodLight, moodDark: groups.moodDark,
      ui: groups.ui, general: groups.general, seo: groups.seo
    };
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var box = JSON.parse(raw);
      if (!box || !box.t || !box.d) return null;
      return { t: box.t, d: box.d };
    } catch (e) {
      return null;
    }
  }

  function writeCache() {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: cacheData() }));
    } catch (e) { /* storage may be unavailable — fine */ }
  }

  /* ============================================================
     SEO — dynamic metadata (never removes existing tags)
     ============================================================ */
  function meta(name, attr) {
    var key = attr || "name";
    var el = document.head.querySelector("meta[" + key + '="' + name + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(key, name);
      document.head.appendChild(el);
    }
    return el;
  }

  function applySeo() {
    try {
      var s = groups.seo;
      var g = groups.general;
      var desc = s.metaDescription || g.description || "";
      if (desc) meta("description").setAttribute("content", desc);

      if (s.metaTitle || g.siteName) {
        /* pageTitle() composes the DB title over the app default */
        document.title = pageTitle(window.I18N ? I18N.t("title") : document.title);
      }

      if (s.canonicalUrl) {
        var link = document.head.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement("link");
          link.setAttribute("rel", "canonical");
          document.head.appendChild(link);
        }
        link.setAttribute("href", s.canonicalUrl);
      }

      if (s.robots) meta("robots").setAttribute("content", s.robots);

      /* Open Graph */
      if (s.ogTitle || g.siteName) {
        meta("og:title", "property").setAttribute("content", s.ogTitle || g.siteName);
      }
      if (s.ogDescription || desc) {
        meta("og:description", "property").setAttribute("content", s.ogDescription || desc);
      }
      if (s.ogImage) meta("og:image", "property").setAttribute("content", s.ogImage);
      if (s.canonicalUrl) {
        meta("og:url", "property").setAttribute("content", s.canonicalUrl);
        meta("og:type", "property").setAttribute("content", "website");
      }
      if (g.siteName) meta("og:site_name", "property").setAttribute("content", g.siteName);

      /* Twitter / X card */
      meta("twitter:card").setAttribute("content", s.twitterCard || "summary_large_image");
      if (s.twitterTitle || s.ogTitle) meta("twitter:title").setAttribute("content", s.twitterTitle || s.ogTitle);
      if (s.twitterDescription || s.ogDescription) {
        meta("twitter:description").setAttribute("content", s.twitterDescription || s.ogDescription);
      }
      if (s.twitterImage || s.ogImage) meta("twitter:image").setAttribute("content", s.twitterImage || s.ogImage);

      /* Sitemap hint */
      if (s.sitemapEnabled && s.sitemapUrl) {
        var sm = document.head.querySelector('link[rel="sitemap"]');
        if (!sm) {
          sm = document.createElement("link");
          sm.setAttribute("rel", "sitemap");
          sm.setAttribute("type", "application/xml");
          document.head.appendChild(sm);
        }
        sm.setAttribute("href", s.sitemapUrl);
      }

      /* Custom favicon / logo (existing manifest + icons untouched) */
      if (g.logoUrl) {
        var fav = document.createElement("link");
        fav.setAttribute("rel", "icon");
        fav.setAttribute("href", g.logoUrl);
        document.head.appendChild(fav);
      }

      /* Schema.org JSON-LD (own script only; other ld+json untouched).
         Only injected when SeoMgr is NOT present: seo-manager.js owns the
         same `ss-schema` slot and runs its own JSON-LD pipeline, so both
         writing it would duplicate the structured-data block. */
      if (!window.SeoMgr) {
        removeJsonLd();
        if (s.schemaJson && s.schemaJson.trim()) {
          try {
            JSON.parse(s.schemaJson); /* validate before injecting */
            var ld = document.createElement("script");
            ld.type = "application/ld+json";
            /* Attribute (not property): getElementById() reads the
               attribute, otherwise the old block is never found. */
            ld.setAttribute("id", "ss-schema");
            ld.textContent = s.schemaJson;
            document.head.appendChild(ld);
          } catch (e) { /* invalid JSON-LD: skip silently */ }
        }
      }
    } catch (e) { /* SEO is best-effort, never critical */ }
  }

  /* Remove every JSON-LD block owned by this module. */
  function removeJsonLd() {
    while (true) {
      var old = document.getElementById("ss-schema");
      if (!old) break;
      var parent = old.parentNode;
      if (parent && parent.removeChild) {
        parent.removeChild(old);
        if (parent === document.head) continue;
        break;
      }
      if (old.remove) old.remove();
      break;
    }
  }

  /* ============================================================
     TEXT HELPERS (site name respects the current language)
     ============================================================ */
  function lang() {
    return (window.I18N && I18N.lang) || "fa";
  }

  function siteName() {
    var g = groups.general;
    if (lang() === "en" && g.siteNameEn) return g.siteNameEn;
    return g.siteName || "";
  }

  function siteTitle(fallback) {
    return siteName() || fallback;
  }

  function pageTitle(fallback) {
    return groups.seo.metaTitle || siteTitle(fallback);
  }

  function siteDescription(fallback) {
    var g = groups.general;
    var d = lang() === "en"
      ? (g.descriptionEn || g.description)
      : (g.description || g.descriptionEn);
    return d || fallback || "";
  }

  /* ============================================================
     FETCH (single request; public anon key; read-only)
     ============================================================ */
  var fetching = false;

  function fetchFromSupabase() {
    if (fetching || !navigator.onLine) return;
    fetching = true;
    fetch(REST_URL + "?select=key,value", { headers: REST_HEADERS })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (rows) {
        mergeRows(Array.isArray(rows) ? rows : []);
        applyOverrides();
        applySeo();
        writeCache();
        fetching = false;
      })
      .catch(function () {
        /* Supabase unavailable -> keep css/variables.css defaults.
           Quiet console hint only; no user-visible error. */
        console.info("Site settings unavailable — using default theme.");
        fetching = false;
      });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    /* 1. Apply cached values immediately (no flash on repeat visits) */
    var cached = readCache();
    if (cached && cached.d) {
      groups.light = validatePalette(cached.d.light, DEFAULTS.light);
      groups.dark = validatePalette(cached.d.dark, DEFAULTS.dark);
      groups.moodLight = validateMood(cached.d.moodLight, DEFAULTS.moodLight);
      groups.moodDark = validateMood(cached.d.moodDark, DEFAULTS.moodDark);
      groups.ui = validateUi(cached.d.ui, DEFAULTS.ui);
      groups.general = validateGeneral(cached.d.general, DEFAULTS.general);
      groups.seo = validateSeo(cached.d.seo, DEFAULTS.seo);
      applyOverrides();
      applySeo();
    }
    /* 2. Fetch fresh values unless the cache is still fresh */
    if (!cached || (Date.now() - cached.t) > CACHE_TTL) {
      fetchFromSupabase();
    }
  }

  boot();

  /* Note: language switches re-apply SEO/texts through the guarded
     SiteSettings hooks in js/i18n.js (I18N.setLang) and js/app.js
     (applyTexts / renderGreeting) — no event bus needed here. */
  document.addEventListener("DOMContentLoaded", function () {
    if (window.I18N && I18N.onChange) { /* future-proof; I18N has no bus yet */
      I18N.onChange(function () {
        try { applySeo(); } catch (e) { /* best effort */ }
      });
    }
  });

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    defaults: DEFAULTS,
    groups: function () { return groups; },

    siteTitle: siteTitle,
    pageTitle: pageTitle,
    siteName: siteName,
    siteDescription: siteDescription,

    /* Force a fresh fetch (debugging) */
    refresh: function () {
      try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* fine */ }
      fetchFromSupabase();
    },

    /* Test hook: apply a raw {key: value} groups object (validated) */
    applyGroups: function (raw) {
      if (!raw || typeof raw !== "object") return;
      mergeRows(Object.keys(raw).map(function (k) {
        return { key: k, value: raw[k] };
      }));
      applyOverrides();
      applySeo();
    }
  };
})();
