// content.js extracts signals on current page returns
// only works inside the web page, does not work if extension-
// -is closed out and does not save any information

//content.js creates a listener, once the signal is recieved-
// - and the conditions are met (gets the metadata)-
// function returns message to user

// each functions tries multiple ways to extract info in different formats

// getMeta takes in each function and looks for the desired property
// returns content if found, returns "" otherwise

// PROOF the script is running
// document.documentElement.setAttribute("data-susability", "loaded");

// // listen for messages from popup.js
// // extracts signals 
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    //tests
    //console.log("SusAbility recieved message:", msg);
    
  if (msg.type == "EXTRACT_PAGE_SIGNALS") {
   try{
    sendResponse({
      title: getTitle() || "",
      author: guessAuthor() || "",
      date: guessDate() || "",
      publisher: getPublisher(),
      doi: getDOI() || "",
      url: location.href,
      https: location.protocol === "https:",
      outboundLinks: getOutboundLinks() || [],
      pageType: getPageTypeFromJSONLD() || "Unknown",
    });
  } catch (err) {
    sendResponse({ error: String(err) });
  }
  }
  
        
    
});



function getMeta(name) {
    const el =
        document.querySelector(`meta[name="${name}"]`) ||
        document.querySelector(`meta[property="${name}"]`);
    return el ? el.getAttribute("content") : "";
    
}

// local publisher call
  function getPublisher() {
    return (
      getMeta("og:site_name") ||
      getMeta("publisher") ||
      getMeta("dc.publisher") ||
      getMeta("article:publisher") ||
      ""
    );
  }

  //local DOI call
  function getDOI() {
    return (
      getMeta("citation_doi") ||
      getMeta("dc.identifier") ||
      getMeta("prism.doi") ||
      ""
    );
  }

// guessAuthor calls a series of functions that examin
// different cases of author like getMeta or a property of document
// returns content if found, returns "" otherwise
// searches the DOM for HTML meta tags
  function guessAuthor() {
    const metaAuthor = getMeta("author");
    if (isProbablyAuthorName(metaAuthor)) return normalizeAuthorValue(metaAuthor);

    const jsonldAuthor = getAuthorFromJSONLD();
    if (isProbablyAuthorName(jsonldAuthor)) return normalizeAuthorValue(jsonldAuthor);

    const ogAuthor = normalizeAuthorValue(getMeta("article:author"));
    if (isProbablyAuthorName(ogAuthor)) return ogAuthor;

    const domAuthor = getAuthorFromDOM();
    if (isProbablyAuthorName(domAuthor)) return normalizeAuthorValue(domAuthor);

    const bylineAuthor = getAuthorFromBylineText();
    if (isProbablyAuthorName(bylineAuthor)) return normalizeAuthorList(bylineAuthor);

    return "";
  }


// // guessDate calls getMeta or a property of document
// // returns content if found, returns "" otherwise
function guessDate() {
  return (
    getDateFromJSONLD() ||
    getMeta("article:published_time") ||
    getMeta("pubdate") ||
    getMeta("publish-date") ||
    document.querySelector("time")?.getAttribute("datetime") ||
    ""
  );  
};

// //didn't know there was a document.title almost did getMeta("title")
// // guessTitle calls getMeta or a property of document
// // returns content if found, returns "" otherwise
function getTitle() {
  return (
    getTitleFromJSONLD() ||
    getMeta("og:title") ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title?.trim() ||
    ""
  );  
};

// // getOutboundLinks looks for and collects links that go outside the current site
// // looks at domain from url
// // stores into an array looking for URL of a hyperlink, trims and collects-
// //- URL's that start with http
function getOutboundLinks() {
  const hostname = location.hostname;

  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => a.href)
    .filter((href) => href.startsWith("http"))
    .filter((href) => {
      try {
        return new URL(href).hostname !== hostname;
      } catch {
        return false;
      }
    });

  //returns only new links, prevents duplicates
  return [...new Set(links)];
}





// Function getJSONItems, another way to grab page info through semantic data

function getJSONLDItems() {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  const items = [];

  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent);

      const pushItem = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
          obj.forEach(pushItem);
          return;
        }
        if (typeof obj === "object") {
          // Flatten @graph if present
          if (Array.isArray(obj["@graph"])) {
            obj["@graph"].forEach(pushItem);
          }
          items.push(obj);
        }
      };

      pushItem(data);
    } catch {
      // ignore bad blocks
    }
  }

  return items;
}

// findArticleJSONLD is a helper function for getJSONLDItems

function findArticleJSONLD(items) {
  const preferredTypes = new Set([
    "ScholarlyArticle",
    "NewsArticle",
    "Article",
    "BlogPosting",
    "Report",
    "WebPage",
  ]);

  // looking for an item within the preferred type AND an author field
  for (const item of items) {
    const t = item?.["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.some((x) => preferredTypes.has(x))) return item;
  }

  // looks at next best preferred type
  for (const item of items) {
    const t = item?.["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.some((x) => preferredTypes.has(x))) return item;
  }
  return null;
}

// getAuthorFromJSONLD helps look for semantic data: specifically author data
function getAuthorFromJSONLD() {
  const items = getJSONLDItems();
  const article = findArticleJSONLD(items);
  const a = article?.author || article?.creator || article?.contributor;
  if (!a) return "";

  // author can be a string, object, or array
  if (typeof a === "string") return a.trim();

  if (Array.isArray(a)) {
    return a
      .map((x) => (typeof x === "string" ? x : x?.name))
      .filter(Boolean)
      .map((s) => s.trim())
      .join(", ");
  }

  // object case
  if (a?.name) return String(a.name).trim();

  return "";
}

// getTitleFromJSONLD helps look for semantic data for Title
function getTitleFromJSONLD() {
  const items = getJSONLDItems();
  const article = findArticleJSONLD(items);
  const v = article?.headline || article?.name;
  return typeof v === "string" ? v.trim() : "";
}

// getDateFromJSONLD helps look for semantic data for publish date or last update
function getDateFromJSONLD() {
  const items = getJSONLDItems();
  const article = findArticleJSONLD(items);
  const v =
    article?.datePublished || article?.dateCreated || article?.dateModified;
  return typeof v === "string" ? v.trim() : "";
}

// getPageTypeFromJSONLD helps look for page type.. article, scholarly, news, etc.
function getPageTypeFromJSONLD() {
  const items = getJSONLDItems();
  const article = findArticleJSONLD(items);
  const t = article?.["@type"];
  if (!t) return "";
  return Array.isArray(t) ? t.join(", ") : String(t);
}

// if author is within a URL
function normalizeAuthorValue(v) {
  v = (v || "").trim();
  if (!v) return "";

  // If it’s a URL, try to turn last segment into a name
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const slug = u.pathname.split("/").filter(Boolean).pop() || "";
      if (!slug) return v;
      return slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      return v;
    }
  }
  return v;
}

// if author is in the byline
function getAuthorFromBylineText() {
  const candidates = [
    ".byline",
    ".article-byline",
    "[class*='byline']",
    "[data-testid*='byline']",
    "[data-test*='byline']",
  ];

  for (const sel of candidates) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim() || "";
    if (!text) continue;

    const m = text.match(
      /\bby\s+([A-Z][A-Za-z.\-']+(?:\s+[A-Z][A-Za-z.\-']+){0,3})/i,
    );
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

// if there are multiple authors
function normalizeAuthorList(str) {
  return str
    .replace(/\s*&\s*/g, ", ")
    .replace(/\s+and\s+/gi, ", ")
    .replace(/\s+et al\.?/i, " (et al.)")
    .trim();
}

function safeText(s) {
  return (s || "").trim();
}

// Scope to the area near the title
function getAuthorFromDOM() {
  const h1 = document.querySelector("h1");
  const scope = h1?.closest("main") || h1?.parentElement || document;

  const selectors = [
    // Nature / Springer
    'a[data-test="author-name"]',
    'a[data-test="author-link"]',
    ".c-article-author-list a",
    ".c-author-list a",
    ".c-article-author-affiliation__name",

    // more general fallbacks
    '[rel="author"]',
    '[itemprop="author"] [itemprop="name"]',
    '[class*="author"] a',
    '[class*="byline"] a',
    'a[href*="/author/"]',
    'a[href*="/authors/"]',
  ];

  for (const sel of selectors) {
    const els = scope.querySelectorAll(sel);
    if (!els || els.length === 0) continue;

    const names = Array.from(els)
      .map((el) => safeText(el.textContent))
      .filter(Boolean)
      .filter((t) => t.length >= 3)
      .filter((t) => !/^(by|author|written|updated|posted)\b/i.test(t))
      .filter(isProbablyAuthorName);

    if (names.length) return [...new Set(names)].join(", ");
  }

  return "";
}

// a helper to reject non-authors
function isProbablyAuthorName(text) {
  if (!text) return false;

  const t = text.toLowerCase();

  // Reject obvious non-author content
  if (
    t.includes("article") ||
    t.includes("reports") ||
    t.includes("journal") ||
    t.includes("nature") ||
    t.includes("scientific") ||
    t.includes("open access") ||
    t.includes("published") ||
    t.includes("breadcrumb")
  ) {
    return false;
  }

  // Reject very long strings (breadcrumbs)
  if (text.length > 80) return false;

  // Require at least one space (First Last)
  if (!/\s/.test(text)) return false;

  return true;
}
// remember if content is "" in each message function, include an if statement that catches this
