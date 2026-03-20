// runs in the background so the extension runs efficiently
// can run offline


// load the seeded list from seed_sources
import { putMany} from "./db.js";


// this is a test function

async function getRatingSmart(url) {
  const host = getDomain(url); // e.g. "www.foxnews.com" => "foxnews.com"
  const normalized = normalizeDomain(host); // e.g. "edition.cnn.com" => "cnn.com"

  // Try a few candidates in order
  const candidates = [];
  if (host) candidates.push(host);
  if (normalized && normalized !== host) candidates.push(normalized);

  // If still not found, try stripping one more subdomain (e.g. "news.bbc.co.uk" -> "co.uk" is bad,
  // but for most US sites this helps: "m.apnews.com" -> "apnews.com")
  if (host.split(".").length > 2) {
    candidates.push(host.split(".").slice(-2).join("."));
  }

  // console.log("[SusAbility] domain candidates:", {
  //   url,
  //   host,
  //   normalized,
  //   candidates,
  // });



  for (const d of candidates) {
    const r = await getRatingDirect(d);
    if (r) return { domain: d, rating: r };
  }

  return { domain: normalized || host || "", rating: null };
}

//rating test
async function getRatingDirect(domain) {
  return new Promise((resolve) => {
    const req = indexedDB.open("susability");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("sourceRatings", "readonly");
      const store = tx.objectStore("sourceRatings");
      const g = store.get(domain);
      g.onsuccess = () => resolve(g.result || null);
      g.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

 
  
function normalizeDomain(host) {
  // remove www. already handled, but just in case
  host = (host || "").replace(/^www\./, "");

  // common subdomain collapsing
  // edition.cnn.com -> cnn.com
  // m.apnews.com -> apnews.com
  // news.yahoo.com -> yahoo.com (if you want yahoo.com seed)
  // using common aliases so we don't run into cors errors 
  const ALIASES = {
    "ms.now": "msnbc.com",

    // Fox ecosystem
    "fxn.ws": "foxnews.com",

    // New York Times / Wirecutter ecosystem
    "nyti.ms": "nytimes.com",

    // Washington Post shortener
    "wapo.st": "washingtonpost.com",

    // NPR shortener
    "n.pr": "npr.org",

    // BBC shortener (commonly used)
    "bbc.in": "bbc.com",

    // Guardian shortener
    "gu.com": "theguardian.com",
  };
  if (ALIASES[host]) return ALIASES[host];

  const parts = host.split(".");
  if (parts.length <= 2) return host;

  return parts.slice(-2).join(".");
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}


// When called, reads seed file, inserts all rows
chrome.runtime.onInstalled.addListener(async () => {
  const seedUrl = chrome.runtime.getURL("seed_sources.json");
  const rows = await (await fetch(seedUrl)).json();

  const req = indexedDB.open("susability");
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction("sourceRatings", "readonly");
    const store = tx.objectStore("sourceRatings");
    const countReq = store.count();
    countReq.onsuccess = async () => {
      if ((countReq.result || 0) > 0) return; // already seeded
      await putMany("sourceRatings", rows);
    };
  };
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");
  return tab;
}

// missingFields keeps track of the data we need to find with APIs
function missingFields(local) {
  return {
    title: !local?.title,
    author: !local?.author,
    date: !local?.date,
    doi: !local?.doi,
    publisher: !local?.publisher,
    pageType: !local?.pageType,
    citationCount: typeof local?.citationCount !== "number",
  };
}

function domainFromAnyUrl(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function getRatingForHost(host) {
  const candidates = [];
  if (host) candidates.push(host);
  const normalized = normalizeDomain(host);
  if (normalized && normalized !== host) candidates.push(normalized);
  if (host.split(".").length > 2)
    candidates.push(host.split(".").slice(-2).join("."));

  for (const d of candidates) {
    const r = await getRatingDirect(d); // or getRating(d) if db.js works everywhere
    if (r) return { domain: d, rating: r };
  }
  return { domain: normalized || host || "", rating: null };
}

// used to extract domain for domain comparisions/ scoring
async function computeOutboundSkew(outboundLinks = [], pageDomain = "") {
  const counts = {
    left: 0,
    lean_left: 0,
    center: 0,
    lean_right: 0,
    right: 0,
    unknown: 0,
  };
  let sum = 0;
  let n = 0;

  for (const href of outboundLinks) {
    const host = domainFromAnyUrl(href);
    if (!host) continue;

    // skip self-links 
    if (pageDomain && normalizeDomain(host) === normalizeDomain(pageDomain))
      continue;

    const { rating } = await getRatingForHost(host);
    if (!rating) {
      counts.unknown++;
      continue;
    }

    counts[rating.bucket] = (counts[rating.bucket] || 0) + 1;
    sum += rating.x;
    n++;
  }

  return { counts, avgX: n ? sum / n : 0 };
}

// fetchJson is a helper function to catch errors
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

// Dictionary of words based on allsides website 
// looks at wording style/ patterns present in text 
function detectBiasTechniques(text = "") {
  const t = (text || "").toLowerCase();

  const SPIN_WORDS = [
    "slam",
    "slams",
    "blast",
    "blasts",
    "rips",
    "ripped",
    "rages",
    "raged",
    "fumes",
    "fumed",
    "lashes out",
    "mocked",
    "mocking",
    "outrage",
    "outraged",
  ];

  const SENSATIONAL = [
    "shocking",
    "stunning",
    "bombshell",
    "explosive",
    "chaos",
    "meltdown",
    "disaster",
    "crisis",
    "terrifying",
    "massive",
    "unbelievable",
  ];

  const SUBJECTIVE = [
    "apparently",
    "seemingly",
    "clearly",
    "obviously",
    "extreme",
    "dangerous",
    "radical",
    "alarming",
  ];

  const ATTRIBUTION_GAPS = [
    "critics say",
    "some say",
    "many believe",
    "people are saying",
    "it is said",
    "sources say",
  ];

  const find = (phrases, max = 4) => {
    const hits = [];
    for (const p of phrases) {
      if (t.includes(p)) hits.push(p);
      if (hits.length >= max) break;
    }
    return hits;
  };

  const spin = find(SPIN_WORDS);
  const sensationalism = find(SENSATIONAL);
  const subjectiveCues = find(SUBJECTIVE);
  const attributionGaps = find(ATTRIBUTION_GAPS);

  return {
    spin: { count: spin.length, examples: spin },
    sensationalism: { count: sensationalism.length, examples: sensationalism },
    subjectiveCues: { count: subjectiveCues.length, examples: subjectiveCues },
    attributionGaps: {
      count: attributionGaps.length,
      examples: attributionGaps,
    },
  };
}


function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function sign(n) {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

// helps add information to the x axis
// looks at cues so if x axis defaults to 0, this is called to more accurately place/ compare information 
function computeSemanticCueScore(text = "") {
  const t = (text || "").toLowerCase();

  // MVP cue lists (expand later using your Media Bias ratings doc)
  const LEFT_CUES = [
    "systemic",
    "equity",
    "racial justice",
    "gender-affirming",
    "reproductive rights",
    "gun violence",
    "climate crisis",
    "wealth inequality",
    "labor rights",
    "union",
    "social safety net",
    "universal healthcare",
    "marginalized",
    "disinformation",
  ];

  const RIGHT_CUES = [
    "border security",
    "illegal immigration",
    "woke",
    "cancel culture",
    "second amendment",
    "parental rights",
    "law and order",
    "deep state",
    "free speech",
    "big government",
    "tax relief",
    "energy independence",
    "national security",
    "traditional values",
  ];

  const countHits = (phrases) => {
    let c = 0;
    for (const p of phrases) {
      if (t.includes(p)) c++;
    }
    return c;
  };

  const left = countHits(LEFT_CUES);
  const right = countHits(RIGHT_CUES);

  // positive => right-coded, negative => left-coded
  return {
    score: right - left,
    leftHits: left,
    rightHits: right,
  };
}



function computeArticleAdjustmentX(
  bucketX,
  outboundAvgX,
  techniques,
  semantic
) {
  // Outbound skew moves within bucket
  const outboundAdj = clamp((outboundAvgX / 2) * 0.6, -0.6, 0.6);

  // Wording intensity pushes away from center (magnitude)
  const intensity = clamp(
    techniques.spin.count * 0.08 +
      techniques.sensationalism.count * 0.07 +
      techniques.subjectiveCues.count * 0.05 +
      techniques.attributionGaps.count * 0.08,
    0,
    0.5,
  );

  // adds extra Semantic cue (direction + extra magnitude)
  const semanticScore = semantic?.score || 0;
  const semanticDir = sign(semanticScore);

  // Normalize semantic magnitude so a few hits matter but don’t dominate
  const semanticMag = clamp(Math.abs(semanticScore) * 0.12, 0, 0.6);

  // Direction preference order:
  // 1) outbound citations
  // 2) semantic cues (topic/value language)
  // 3) baseline domain bucket
  const dir = sign(outboundAvgX) || semanticDir || sign(bucketX);

  // Language pushes away from center in chosen direction
  const languageAdj = dir ? dir * intensity : 0;

  // Semantic cues push in a direction even if outboundAvgX is 0
  const semanticAdj = dir ? dir * semanticMag : 0;

  return {
    outboundAdj,
    languageAdj,
    semanticAdj,
    total: clamp(outboundAdj + languageAdj + semanticAdj, -0.9, 0.9),
  };
}

// API calls
async function findWithAPIs(url, need, local) {
  const out = {};
  const needsAnything =
    need.title ||
    need.author ||
    need.date ||
    need.publisher ||
    need.doi ||
    need.pageType ||
    need.citationCount;

  if (!needsAnything) return out;

  // API call to Crossref - Scholarly work #1
  // Crossref docs say to use /works with query parameters
  async function crossrefLookupByUrl(pageUrl) {
    // Crossref "works" query using the page URL
    const endpoint =
      "https://api.crossref.org/works?rows=1&query.url=" +
      encodeURIComponent(pageUrl);

    const data = await fetchJson(endpoint);
    const item = data?.message?.items?.[0];
    if (!item) return {};

    const author = Array.isArray(item.author)
      ? item.author
          .map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
          .filter(Boolean)
          .join(", ")
      : "";

    const title = Array.isArray(item.title) ? item.title[0] || "" : "";
    const doi = item.DOI || "";
    const publisher = item.publisher || "";
    const pageType = item.type || "";

    // published-print or published-online, then fallback to created
    const dateParts =
      item?.published?.["date-parts"]?.[0] ||
      item?.["published-online"]?.["date-parts"]?.[0] ||
      item?.created?.["date-parts"]?.[0] ||
      null;

    const date = Array.isArray(dateParts) ? dateParts.join("-") : "";

    return { title, author, date, doi, publisher, pageType };
  }

  // API call to Semantiac Scholar  - Scholarly work #2
  async function semanticScholarLookupByDOI(doi) {
    // Fields I want back (kept small for speed)
    const fields = [
      "title",
      "authors",
      "year",
      "publicationDate",
      "citationCount",
      "references.paperId",
      "references.externalIds",
      "citations.paperId",
      "citations.externalIds",
      "fieldsOfStudy",
    ].join(",");

    const endpoint =
      "https://api.semanticscholar.org/graph/v1/paper/DOI:" +
      encodeURIComponent(doi) +
      "?fields=" +
      encodeURIComponent(fields);

    const data = await fetchJson(endpoint);

    const author = Array.isArray(data?.authors)
      ? data.authors
          .map((a) => a.name)
          .filter(Boolean)
          .join(", ")
      : "";

    // Prefer publicationDate if present; otherwise year
    const date = data?.publicationDate || (data?.year ? String(data.year) : "");

    return {
      title: data?.title || "",
      author,
      date,
      citationCount:
        typeof data?.citationCount === "number" ? data.citationCount : null,
      references: Array.isArray(data?.references) ? data.references : [],
      citations: Array.isArray(data?.citations) ? data.citations : [],
      fieldsOfStudy: Array.isArray(data?.fieldsOfStudy)
        ? data.fieldsOfStudy
        : [],
    };
  }

  // rapidApiLook up - references API text extract




  // 1. Check Crossref (scholarly work)
  try {
    const cr = await crossrefLookupByUrl(url);
    if (need.title && cr.title) out.title = cr.title;
    if (need.author && cr.author) out.author = cr.author;
    if (need.date && cr.date) out.date = cr.date;
    if (need.publisher && cr.publisher) out.publisher = cr.publisher;
    if (need.doi && cr.doi) out.doi = cr.doi;
    if (need.pageType && cr.pageType) out.pageType = cr.pageType;
  } catch (e) {}

  // 2.Semantic
  //DOI - Digital Object Identifier, unique set of characters that provide a stable link or reference to a scholarly digital object
  const doi = local?.doi || out.doi; // from Crossref
  if (doi) {
    try {
      const s2 = await semanticScholarLookupByDOI(doi);

      // Use S2 data mostly for graph stuff; also can fill metadata if missing
      if (need.title && !out.title && s2.title) out.title = s2.title;
      if (need.author && !out.author && s2.author) out.author = s2.author;
      if (need.date && !out.date && s2.date) out.date = s2.date;

      // Graph-related signals
      if (need.citationCount && typeof s2.citationCount === "number") {
        out.citedByCount = s2.citationCount;
        out.citationCount = s2.citationCount;
      }
      if (Array.isArray(s2.references)) out.references = s2.references; // list of referenced papers (ids/DOIs)
      if (Array.isArray(s2.references)) out.referenceCount = s2.references.length;
      if (Array.isArray(s2.citations)) out.citations = s2.citations; // list of citing papers (ids/DOIs)
      if (Array.isArray(s2.fieldsOfStudy)) out.fieldsOfStudy = s2.fieldsOfStudy;
    } catch (e) {
      // ignore and fall through
    }
  }
  // 3.Rapid API
  // things to consider... what api in rapid api are we using for analytics
  // we need an end point
  const stillMissingTitle = need.title && !out.title;
  const stillMissingAuthor = need.author && !out.author;
  const stillMissingDate = need.date && !out.date;

  if (stillMissingTitle || stillMissingAuthor || stillMissingDate) {
    try {
      const r = await rapidApiLookup(url); // customize this for the chosen endpoint

      if (stillMissingTitle && r.title) out.title = r.title;
      if (stillMissingAuthor && r.author) out.author = r.author;
      if (stillMissingDate && r.date) out.date = r.date;

      // optional if endpoint provides it
      if (need.publisher && !out.publisher && r.publisher)
        out.publisher = r.publisher;
      if (need.pageType && !out.pageType && r.pageType)
        out.pageType = r.pageType;
    } catch (e) {
      // ignore
    }
  }

  return out;
}

async function rapidApiLookup(pageUrl) {
  const RAPID_API_KEY = "77a394fadamsh10f7bbff540f9ffp18f886jsna3ddadbefb9c";

  const endpoint =
    "https://text-extract7.p.rapidapi.com/?url=" +
    encodeURIComponent(pageUrl);

  const data = await fetchJson(endpoint, {
    method: "GET",
    headers: {
      "x-rapidapi-key": RAPID_API_KEY,
      "x-rapidapi-host": "text-extract7.p.rapidapi.com",
    },
  });

  // Return in the shape code expects
  return {
    title: data?.title || "",
    author: data?.author || "",
    date: data?.published || data?.date || "",
    publisher: data?.siteName || data?.publisher || "",
    pageType: data?.type || data?.pageType || "",
    text: data?.text || "",
  };
}

// better point system for y-axis graph
// based off of Ad fontes

function computeReliabilityScore(data) {
  // Similar to Ad Fontes: Evidence & sourcing + reporting quality - penalties, scaled 0–64
  let y = 0;
  const why = [];

  // Evidence & sourcing (0–36)
  const outboundCounts = data.outboundSkew?.counts || {};
  const extKnown =
    (outboundCounts.left || 0) +
    (outboundCounts.lean_left || 0) +
    (outboundCounts.center || 0) +
    (outboundCounts.lean_right || 0) +
    (outboundCounts.right || 0);

  const extUnknown = outboundCounts.unknown || 0;
  const extTotal = extKnown + extUnknown;

  // Reward external sourcing volume
  if (extTotal >= 10) {
    y += 14;
    why.push("+14: strong external sourcing");
  } else if (extTotal >= 5) {
    y += 10;
    why.push("+10: moderate external sourcing (5–9)");
  } else if (extTotal >= 1) {
    y += 5;
    why.push("+5: minimal external sourcing (1–4)");
  } else {
    why.push("+0: no external outbound sources detected");
  }

  // Reward citing known/rated sources (seeded domains)
  if (extKnown >= 3) {
    y += 6;
    why.push("+6 cites known rated sources");
  } else if (extKnown >= 1) {
    y += 3;
    why.push("+3 cites at least one known rated source");
  }

  // Reward diversity of sourcing (not all from one bucket)
  const nonZeroBuckets = [
    "left",
    "lean_left",
    "center",
    "lean_right",
    "right",
  ].filter((b) => (outboundCounts[b] || 0) > 0).length;
  if (nonZeroBuckets >= 3) {
    y += 6;
    why.push("+6: diverse outbound sourcing (3+ categories)");
  } else if (nonZeroBuckets === 2) {
    y += 3;
    why.push("+3: some sourcing diversity (2 categories)");
  }

  // Basic metadata (0–12)
  if (data.author) {
    y += 4;
    why.push("+4: author listed");
  }
  if (data.date) {
    y += 3;
    why.push("+3: date listed");
  }
  if (data.publisher) {
    y += 2;
    why.push("+2: publisher listed");
  }
  if (data.https === true) {
    y += 3;
    why.push("+3: HTTPS");
  }

  // Reporting quality / penalties (0 to -26) 
  const bt = data.biasTechniques || {};
  const spin = bt.spin?.count || 0;
  const sens = bt.sensationalism?.count || 0;
  const subj = bt.subjectiveCues?.count || 0;
  const gaps = bt.attributionGaps?.count || 0;

  const penalty = spin * 2.0 + sens * 2.0 + subj * 1.0 + gaps * 3.0;
  const cappedPenalty = clamp(penalty, 0, 18);
  if (cappedPenalty > 0) {
    y -= cappedPenalty;
    why.push(
      `-${cappedPenalty.toFixed(0)} biased language/attribution penalties`,
    );
  }

  const pt = (data.pageType || "").toLowerCase();
  if (pt.includes("opinion")) {
    y -= 8;
    why.push("-8 opinion content");
  }

  // ---------- Scholarly bonuses (0–10) ----------
  // Small bonuses so news pages aren't punished for lacking DOI/references
  if (data.doi) {
    y += 4;
    why.push("+4 DOI present");
  }

  const refs = Array.isArray(data.references) ? data.references.length : 0;
  if (refs >= 10) {
    y += 6;
    why.push("+6: strong references");
  } else if (refs >= 3) {
    y += 4;
    why.push("+4: some references (3–9)");
  } else if (refs > 0) {
    y += 2;
    why.push("+2: minimal references (1–2)");
  }

  y = clamp(y, 0, 64);
  return { y, why };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "API_CALLS") return;

  (async () => {
    const tab = await getActiveTab();
    const clean = new URL(tab.url);
    clean.hash = "";
    const pageUrl = clean.toString();

    //testing
    let local;
    try {
      local = await chrome.tabs.sendMessage(tab.id, {
        type: "EXTRACT_PAGE_SIGNALS",
      });
    } catch (e) {
      throw new Error(
        "Content script not reachable. Refresh the page and try again.",
      );
    }
    //testing

    // 1) Ask content script for local signals
    // const local = await chrome.tabs.sendMessage(tab.id, {
    //   type: "EXTRACT_PAGE_SIGNALS",
    // });

    // 2) Decide what’s missing
    const need = missingFields(local);

    // 3) Call APIs only if needed
    const apiData = await findWithAPIs(pageUrl, need, local);

    // 4) Merge: prefer local values, fill missing with apiData
    const merged = {
      ...local,

      // fill missing metadata
      title: local.title || apiData.title || "",
      author: local.author || apiData.author || "",
      date: local.date || apiData.date || "",
      publisher: local.publisher || apiData.publisher || "",
      doi: local.doi || apiData.doi || "",
      pageType: local.pageType || apiData.pageType || "",

      // pass through “graph” + scholarly signals if present
      citationCount:
        typeof apiData.citationCount === "number"
          ? apiData.citationCount
          : null,
      fieldsOfStudy: Array.isArray(apiData.fieldsOfStudy)
        ? apiData.fieldsOfStudy
        : [],
      references: Array.isArray(apiData.references) ? apiData.references : [],
      citations: Array.isArray(apiData.citations) ? apiData.citations : [],

      apiUsed: Object.keys(apiData).length > 0,
      citedByCount:
        typeof apiData.citedByCount === "number" ? apiData.citedByCount : null,

      referenceCount:
        typeof apiData.referenceCount === "number"
          ? apiData.referenceCount
          : typeof local.referenceCountOnPage === "number"
            ? local.referenceCountOnPage
            : 0,
    };

    // --- X axis (bias) from DB ---
    // const rawDomain = getDomain(pageUrl);
    // const domain = normalizeDomain(rawDomain);
    // merged.url = merged.url || pageUrl; // ensure url exists
    // merged.domain = domain;
    // const rating = domain ? await getRating(domain) : null;

    // merged.bucket = rating?.bucket || "unknown";
    // merged.x = typeof rating?.x === "number" ? rating.x : 0; // default center if unknown

    //temporary db lookup
    const { domain, rating } = await getRatingSmart(pageUrl);

    merged.url = merged.url || pageUrl;
    merged.domain = domain;
    merged.bucket = rating?.bucket || "unknown";
    merged.x = typeof rating?.x === "number" ? rating.x : 0;

    // is storage updating??
    // console.log("[SusAbility] saving lastAnalysis:", {
    //   url: merged.url,
    //   domain: merged.domain,
    //   bucket: merged.bucket,
    //   x: merged.x,
    //   y: merged.y,
    // });

    // Y axis (reliability) from scoring
    // 1) outbound skew (external sources only)
    const outbound = await computeOutboundSkew(
      merged.outboundLinks || merged.refs || [],
      merged.domain,
    );
    merged.outboundSkew = outbound;

    // 2) bias techniques from text sample
    const textForBias = `${merged.title || ""} ${merged.textSample || ""}`;
    const techniques = detectBiasTechniques(textForBias);
    merged.biasTechniques = techniques;

    // 2b) semantic cues for X direction (pattern-based)
    const semantic = computeSemanticCueScore(textForBias);
    merged.semanticCue = semantic;

    // 3) compute article-level X adjustment (within bucket)
    const adj = computeArticleAdjustmentX(
      merged.x,
      outbound.avgX,
      techniques,
      semantic
    );
    merged.articleAdjustmentX = adj;
    merged.articleX = clamp(merged.x + adj.total, -2, 2);

    // 4) NOW compute Y using Ad Fontes-ish reliability scoring
    const scored = computeReliabilityScore(merged);
    merged.y = scored.y;
    merged.why = (merged.why || []).concat(scored.why);

    // Add explainable bullets
    merged.why.push(
      `Outbound skew avgX=${outbound.avgX.toFixed(2)} (L:${outbound.counts.left} LL:${outbound.counts.lean_left} C:${outbound.counts.center} LR:${outbound.counts.lean_right} R:${outbound.counts.right})`,
    );
    if (techniques.spin.count)
      merged.why.push(`Spin language: ${techniques.spin.examples.join(", ")}`);
    if (techniques.sensationalism.count)
      merged.why.push(
        `Sensational terms: ${techniques.sensationalism.examples.join(", ")}`,
      );
    if (techniques.attributionGaps.count)
      merged.why.push(
        `Attribution gaps: ${techniques.attributionGaps.examples.join(", ")}`,
      );
    merged.why.push(
      `Semantic cues: L=${semantic.leftHits}, R=${semantic.rightHits}, score=${semantic.score}`,
    );
    await chrome.storage.local.set({ lastAnalysis: merged });

    return merged;
  })()
    .then((merged) => sendResponse({ ok: true, data: merged }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  // keep the message channel open for async response
  return true;
});