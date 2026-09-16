/* ============================================
   SEO MANAGER — js/seo-manager.js
   Centralized SEO handler for the public site.
   Manages title, meta, canonical, robots, OG,
   Twitter/X, JSON-LD + automated generation.
   ============================================ */

var SeoMgr = (function () {
  "use strict";
  
  var pageOverrides = {};
  var jsonLdCache = null;
  var lastApplied = null;
  
  function $(id) { return document.getElementById(id); }
  
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  
  function activeView() {
    if (window.Views && Views.active) return Views.active();
    var h = location.hash.replace(/^#/, "");
    return h && h !== "" ? h : "home";
  }
  
  function markApplied(seo) { lastApplied = seo; }
  
  /* Compare every field apply() manages. Comparing only a subset meant a
     schema/OG/Twitter/locale-only change was treated as "nothing changed"
     and silently skipped, so admin SEO edits never reached the head. */
  var COMPARED_KEYS = [
    "title", "description", "canonical", "robots",
    "ogTitle", "ogDescription", "ogImage", "ogUrl", "ogType", "ogSiteName",
    "twitterCard", "twitterTitle", "twitterDescription", "twitterImage",
    "locale", "schemaJson"
  ];
  
  function sameAsLast(seo) {
    if (!lastApplied || !seo) return false;
    for (var i = 0; i < COMPARED_KEYS.length; i++) {
      var k = COMPARED_KEYS[i];
      if (lastApplied[k] !== seo[k]) return false;
    }
    return true;
  }
  
  function apply(seo) {
        if (!seo) seo = resolveSeo(activeView());
    if (sameAsLast(seo)) return; /* skip duplicate update */
    markApplied(seo);
    updateTitle(seo.title);
    updateMetaDescription(seo.description);
    updateCanonical(seo.canonical);
    updateRobots(seo.robots);
    updateOpenGraph(seo);
    updateTwitter(seo);
    updateJsonLd(seo.schemaJson);
    updateLocale(seo.locale);
  }
  
  function updateTitle(title) {
    var existing = document.querySelector('title');
    if (existing) {
      if (!title) { existing.remove(); return; }
      existing.textContent = title;
    } else if (title) {
      var t = document.createElement('title');
      t.textContent = title;
      document.head.appendChild(t);
    }
  }
  
  function updateMetaDescription(desc) {
    var existing = document.querySelector('meta[name="description"]');
    if (existing) existing.remove();
    if (!desc) return;
    var el = document.createElement('meta');
    el.setAttribute('name', 'description');
    el.setAttribute('content', desc);
    document.head.appendChild(el);
  }
  
  function updateCanonical(canonical) {
    var existing = document.querySelector('link[rel="canonical"]');
    if (existing) existing.remove();
    if (!canonical) return;
    var el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    el.setAttribute('href', canonical);
    document.head.appendChild(el);
  }
  
  function updateRobots(robots) {
    var existing = document.querySelector('meta[name="robots"]');
    if (existing) existing.remove();
    if (!robots) return;
    var el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    el.setAttribute('content', robots);
    document.head.appendChild(el);
  }
  
  function updateOpenGraph(s) {
    setOg("og:title", s.ogTitle || "");
    setOg("og:description", s.ogDescription || "");
    setOg("og:image", s.ogImage || "");
    setOg("og:url", s.ogUrl || "");
    setOg("og:type", s.ogType || "website");
    setOg("og:site_name", s.ogSiteName || "");
    setOg("og:locale", s.locale || "fa_IR");
  }
  
  function setOg(property, content) {
    var existing = document.querySelector('meta[property="' + property + '"]');
    if (existing) existing.remove();
    if (!content) return;
    var el = document.createElement('meta');
    el.setAttribute('property', property);
    el.setAttribute('content', content);
    document.head.appendChild(el);
  }
  
  function updateTwitter(s) {
    setMeta("twitter:card", s.twitterCard || "summary_large_image");
    setMeta("twitter:title", s.twitterTitle || "");
    setMeta("twitter:description", s.twitterDescription || "");
    setMeta("twitter:image", s.twitterImage || "");
    var siteHandle = s.ogSiteName ? "@" + s.ogSiteName.replace(/[^a-zA-Z0-9_]/g, "") : "";
    setMeta("twitter:site", siteHandle);
    setMeta("twitter:creator", "");
  }
  
  function setMeta(name, content) {
    var existing = document.querySelector('meta[name="' + name + '"]');
    if (existing) existing.remove();
    if (!content) return;
    var el = document.createElement('meta');
    el.setAttribute('name', name);
    el.setAttribute('content', content);
    document.head.appendChild(el);
  }
  
  function updateJsonLd(schemaJson) {
    if (!schemaJson || !schemaJson.trim()) {
      removeJsonLd();
      jsonLdCache = null;
      return;
    }
    try { JSON.parse(schemaJson); }
    catch (e) { console.error("SEO: Invalid JSON-LD rejected:", e.message); return; }
    if (jsonLdCache === schemaJson && document.getElementById("ss-schema")) return;
    removeJsonLd();
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    /* MUST be an attribute, not just a property: getElementById() reads
       the id ATTRIBUTE, so a plain `ld.id = ...` would make every apply()
       append a second JSON-LD block instead of replacing the old one. */
    ld.setAttribute("id", "ss-schema");
    ld.textContent = schemaJson;
    document.head.appendChild(ld);
    jsonLdCache = schemaJson;
  }

  /* Remove every JSON-LD block this module owns (defensive: clean up
     duplicates created by an earlier double-append bug too). */
  function removeJsonLd() {
    var removed = false;
    while (true) {
      var old = document.getElementById("ss-schema");
      if (!old) break;
      var parent = old.parentNode;
      if (!parent || !parent.removeChild) {
        if (old.remove) old.remove();
        break;
      }
      parent.removeChild(old);
      removed = true;
      if (parent === document.head) continue;
      break;
    }
    return removed;
  }
  
  function updateLocale(locale) {
    if (!locale) return;
    var html = document.documentElement;
    if (html) {
      var langCode = locale.split("_")[0];
      html.setAttribute("lang", langCode);
      html.setAttribute("dir", langCode === "fa" || langCode === "ar" ? "rtl" : "ltr");
    }
  }
  /* ---------- Resolve SEO for a given view ---------- */
  function resolveSeo(viewName) {
    var s = (window.SiteSettings && SiteSettings.groups ? SiteSettings.groups().seo : {});
    var g = (window.SiteSettings && SiteSettings.groups ? SiteSettings.groups().general : {});
    var lang = (window.I18N && I18N.lang) || "fa";
    var ov = pageOverrides[viewName] || {};
    
    var title = ov.title || s.metaTitle || pageDefaultTitle(g, lang);
    var description = ov.description || s.metaDescription || autoDescription(g, lang, viewName);
    var canonical = ov.canonical || s.canonicalUrl || autoCanonical(viewName, s, g, lang);
    var robots = ov.robots || s.robots || "index, follow";
    
    var ogTitle = ov.ogTitle || s.ogTitle || title;
    var ogDesc = ov.ogDescription || s.ogDescription || description;
    var ogImage = ov.ogImage || s.ogImage;
    var ogType = ov.ogType || (viewName === "home" ? "website" : "article");
    var ogUrl = ov.ogUrl || canonical;
    var ogSiteName = ov.ogSiteName || g.siteName || "";
    
    var twitterCard = ov.twitterCard || s.twitterCard || "summary_large_image";
    var twitterTitle = ov.twitterTitle || s.twitterTitle || ogTitle;
    var twitterDesc = ov.twitterDescription || s.twitterDescription || ogDesc;
    var twitterImage = ov.twitterImage || s.twitterImage || ogImage;
    var locale = ov.locale || (lang === "fa" ? "fa_IR" : "en_US");
    
    var schemaJson = ov.schemaJson || s.schemaJson || "";
    try { JSON.parse(schemaJson); } catch (e) { schemaJson = ""; }
    
    return {
      title, description, canonical, robots,
      ogTitle, ogDescription: ogDesc, ogImage, ogType, ogUrl, ogSiteName,
      twitterCard, twitterTitle, twitterDescription: twitterDesc, twitterImage,
      locale, schemaJson, viewName
    };
  }
  
  function pageDefaultTitle(general, lang) {
    if (window.I18N && I18N.t) return I18N.t("title");
    return lang === "en" ? "Mood Tracker" : "ثبت حال روزانه";
  }
  
  function autoDescription(general, lang, viewName) {
    var desc = "";
    if (lang === "en" && general.descriptionEn) desc = general.descriptionEn;
    else if (general.description) desc = general.description;
    if (viewName && viewName !== "home") {
      var viewLabel = (window.I18N && I18N.t) ? I18N.t(viewName + "Title") : viewName;
      if (desc && desc.length + viewLabel.length < 150) desc = desc + " — " + viewLabel;
    }
    return desc || "";
  }
  
  function autoCanonical(viewName, seo, general, lang) {
    if (seo.canonicalUrl) return seo.canonicalUrl;
    var base = location.origin + location.pathname.replace(/\/$/, "") || location.origin;
    if (viewName && viewName !== "home") return base + "/" + viewName + "/";
    return base + "/";
  }
    /* ---------- Page Override API ---------- */
  function setPageOverride(viewName, overrides) {
    if (!viewName || typeof overrides !== "object") return;
    pageOverrides[viewName] = Object.assign({}, pageOverrides[viewName] || {}, overrides);
  }
  
  function clearPageOverride(viewName) {
    if (!viewName) return;
    delete pageOverrides[viewName];
  }
  
  function clearAllOverrides() {
    pageOverrides = {};
  }

  /* ---------- Register auto SEO for views ---------- */
  function addViewSeoOverrides(overrides) {
    if (!overrides || typeof overrides !== "object") return;
    for (var viewName in overrides) {
      if (overrides.hasOwnProperty(viewName)) {
        setPageOverride(viewName, overrides[viewName]);
      }
    }
  }
  
  /* ---------- Search Preview HTML ---------- */
  function searchPreviewHtml(seo) {
    if (!seo) seo = resolveSeo(activeView());
    var url = esc(seo.canonical || location.href);
    var title = esc(seo.title || "");
    var desc = esc(seo.description || "");
    return (
      "<div class=\"preview-card search-preview\">" +
      "<div class=\"preview-url\">" + url + "</div>" +
      "<div class=\"preview-title\">" + title + "</div>" +
      "<div class=\"preview-desc\">" + desc + "</div>" +
      "<div class=\"preview-note\">⚠ Approximate preview — actual Google rendering may differ.</div>" +
      "</div>"
    );
  }
  
  /* ---------- Social Preview HTML ---------- */
  function socialPreviewHtml(seo) {
    if (!seo) seo = resolveSeo(activeView());
    var ogImage = seo.ogImage;
    var imageHtml = ogImage
      ? "<div class=\"preview-image-wrap\"><img src=\"" + esc(ogImage) + "\" alt=\"OG image\" class=\"preview-image\" /></div>"
      : "<div class=\"preview-image-wrap preview-image-empty\"><span>No OG image configured</span></div>";
    return (
      "<div class=\"preview-card social-preview\">" +
      imageHtml +
      "<div class=\"preview-social-info\">" +
      "<div class=\"preview-domain\">" + esc(location.hostname) + "</div>" +
      "<div class=\"preview-title\">" + esc(seo.ogTitle || seo.title || "") + "</div>" +
      "<div class=\"preview-desc\">" + esc(seo.ogDescription || seo.description || "") + "</div>" +
      "</div>" +
      "<div class=\"preview-note\">⚠ Approximate preview — actual social platform rendering may differ.</div>" +
      "</div>"
    );
  }
  /* ---------- SEO Health Report ---------- */
  function healthReport(seo) {
    if (!seo) seo = resolveSeo(activeView());
    var issues = [];
    var title = seo.title || "";
    var desc = seo.description || "";
    var canonical = seo.canonical || "";
    var hasOgImage = !!seo.ogImage;
    var hasOgTitle = !!seo.ogTitle;
    var hasOgDesc = !!seo.ogDescription;
    var hasSchema = !!seo.schemaJson && !!seo.schemaJson.trim();
    
    /* Critical */
    if (!title) issues.push({ level: "critical", msg: "Missing page title" });
    if (!desc) issues.push({ level: "critical", msg: "Missing meta description" });
    if (canonical && !isValidUrl(canonical)) {
      issues.push({ level: "critical", msg: "Invalid canonical URL" });
    }
    
    /* Warnings */
    if (title && title.length > 60) {
      issues.push({ level: "warning", msg: "Title is " + title.length + " chars (recommended 50-60)" });
    }
    if (desc && desc.length > 160) {
      issues.push({ level: "warning", msg: "Description is " + desc.length + " chars (recommended 150-160)" });
    }
    if (desc && desc.length > 0 && desc.length < 50) {
      issues.push({ level: "warning", msg: "Description is " + desc.length + " chars (consider 150-160)" });
    }
    if (!hasOgTitle) issues.push({ level: "warning", msg: "Missing Open Graph title" });
    if (!hasOgDesc) issues.push({ level: "warning", msg: "Missing Open Graph description" });
    if (!hasOgImage) issues.push({ level: "warning", msg: "Missing social share image" });
    if (!hasSchema) issues.push({ level: "warning", msg: "Missing structured data (JSON-LD)" });
    
    /* Good */
    var good = [];
    if (title && title.length >= 10 && title.length <= 60) good.push("Title length OK (" + title.length + " chars)");
    if (desc && desc.length >= 50 && desc.length <= 160) good.push("Description length OK (" + desc.length + " chars)");
    if (canonical && isValidUrl(canonical)) good.push("Canonical URL valid");
    if (hasOgTitle) good.push("Open Graph title present");
    if (hasOgDesc) good.push("Open Graph description present");
    if (hasOgImage) good.push("Social image configured");
    if (hasSchema) good.push("Structured data (JSON-LD) present");
    
    return {
      titleChars: title.length,
      descChars: desc.length,
      issues: issues,
      good: good,
      criticalCount: issues.filter(function (i) { return i.level === "critical"; }).length,
      warningCount: issues.filter(function (i) { return i.level === "warning"; }).length,
      goodCount: good.length
    };
  }
  
  function isValidUrl(str) {
    if (!str || typeof str !== "string") return false;
    var s = str.trim();
    if (!s || s.length > 400) return false;
    /* Must be an absolute http(s) URL. Guard against the classic
       injection schemes before touching the URL parser. */
    if (!/^https?:\/\//i.test(s)) return false;
    if (typeof URL === "function") {
      try {
        var url = new URL(s);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch (e) {
        return false;
      }
    }
    /* No URL constructor (older engines / non-browser host):
       accept only host-looking http(s) URLs. */
    return /^https?:\/\/[^\s<>"']+$/i.test(s);
  }

  /* ---------- Generate JSON-LD from SEO data ---------- */
  function generateJsonLd(seo) {
    if (!seo) seo = resolveSeo(activeView());
    var siteName = seo.ogSiteName || "";
    var baseUrl = location.origin;
    var graph = [];

    /* WebSite type */
    graph.push({
      "@type": "WebSite",
      "name": siteName || "Mood Tracker",
      "url": baseUrl
    });

    /* WebApplication type */
    graph.push({
      "@type": "WebApplication",
      "name": siteName || "Mood Tracker",
      "applicationCategory": "Lifestyle",
      "operatingSystem": "Any"
    });

    var jsonLd = {
      "@context": "https://schema.org",
      "@graph": graph
    };

    try {
      return JSON.stringify(jsonLd);
    } catch (e) {
      return "";
    }
  }

  /* ---------- Generate sitemap XML ---------- */
  function generateSitemap() {
    var baseUrl = location.origin.replace(/\/$/, "");
    var urls = [
      { loc: baseUrl + "/", changefreq: "daily", priority: "1.0" },
      { loc: baseUrl + "/#year", changefreq: "weekly", priority: "0.8" },
      { loc: baseUrl + "/#todo", changefreq: "weekly", priority: "0.7" },
      { loc: baseUrl + "/#dashboard", changefreq: "weekly", priority: "0.7" },
      { loc: baseUrl + "/#birthdays", changefreq: "weekly", priority: "0.6" }
    ];

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (var i = 0; i < urls.length; i++) {
      xml += '  <url>\n';
      xml += '    <loc>' + esc(urls[i].loc) + '</loc>\n';
      xml += '    <changefreq>' + esc(urls[i].changefreq) + '</changefreq>\n';
      xml += '    <priority>' + esc(urls[i].priority) + '</priority>\n';
      xml += '  </url>\n';
    }
    xml += '</urlset>';
    return xml;
  }

  /* ---------- Update robots.txt meta ---------- */
  function updateRobotsTxt() {
    var existing = document.querySelector('meta[name="robots"]');
    if (existing) existing.remove();
    var robots = "noindex, nofollow";
    var el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    el.setAttribute('content', robots);
    document.head.appendChild(el);
  }

        /* ---------- Boot: initialize SEO manager ---------- */
  function boot() {
    /* Register view-specific SEO overrides */
    addViewSeoOverrides({
      year: { title: "ثبت حال سالانه — Mood Tracker" },
      todo: { title: "لیست کارها — Mood Tracker" },
      dashboard: { title: "داشبورد — Mood Tracker" },
      birthdays: { title: "تولدها — Mood Tracker" }
    });

    /* Apply SEO for current view */
    apply();

    /* Listen for hash changes (SPA navigation) */
    window.addEventListener("hashchange", function() {
      apply();
    });

    /* Also listen for view changes if Views module exists */
    if (window.Views && Views.onChange) {
      Views.onChange(function() {
        apply();
      });
    }
  }

  /* ---------- PUBLIC API ---------- */
  return {
    apply: apply,
    resolve: resolveSeo,
    boot: boot,
    setPageOverride: setPageOverride,
    clearPageOverride: clearPageOverride,
        clearAllOverrides: clearAllOverrides,
    addViewSeoOverrides: addViewSeoOverrides,
    generateSitemap: generateSitemap,
    generateJsonLd: generateJsonLd,
    healthReport: healthReport,
    searchPreviewHtml: searchPreviewHtml,
    socialPreviewHtml: socialPreviewHtml,
    updateRobotsTxt: updateRobotsTxt,
    isValidUrl: isValidUrl
  };
})();

/* Auto-initialize when DOM is ready */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    SeoMgr.boot();
  });
} else {
  SeoMgr.boot();
}
