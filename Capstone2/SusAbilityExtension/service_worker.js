// runs in the background so the extension runs efficiently
// can run offline


// load the seeded list from seed_sources
import { putMany} from "./db.js";




async function getRatingSmart(urlOrHost) {
  const host = String(urlOrHost || "").includes("://")
    ? getDomain(urlOrHost)
    : String(urlOrHost || "").replace(/^www\./, "");

  const normalized = normalizeDomain(host);

  const req = indexedDB.open("susability");

  const row = await new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("sourceRatings", "readonly");
      const store = tx.objectStore("sourceRatings");

      findBestSeedRowForHost(store, normalized || host)
        .then(resolve)
        .catch(reject);
    };
    req.onerror = () => reject(req.error);
  });

  return {
    domain: normalized || host || "",
    rating: row || null,
  };
}

function getPoliticalBucketFromX(x) {
  if (x <= -1.5) return "left";
  if (x <= -0.5) return "lean_left";
  if (x < 0.5) return "center";
  if (x < 1.5) return "lean_right";
  return "right";
}

// DB List of known domains
const SOURCE_ALIASES = {
  "msnbc.com": ["ms now", "msnbc"],
  "foxnews.com": ["fox news"],
  "abcnews.go.com": ["abc news"],
  "abc.com": ["abc news"],
  "aol.com": ["aol"],
  "apple.news": ["apple news"],
  "aljazeera.com": ["al jazeera"],
  "apnews.com": ["associated press", "ap news", "ap-norc"],
  "afp.com": ["agence france-presse", "afp"],
  "washingtonpost.com": ["washington post"],
  "nytimes.com": ["new york times", "nyt"],
  "wsj.com": ["wall street journal", "wsj"],
  "bbc.com": ["bbc", "bbc news"],
  "npr.org": ["npr"],
  "theguardian.com": ["the guardian"],
  "reuters.com": ["reuters"],
  "cnn.com": ["cnn"],
  "usatoday.com": ["usa today"],
  "time.com": ["time"],
  "newsweek.com": ["newsweek"],
  "forbes.com": ["forbes"],
  "bloomberg.com": ["bloomberg"],
  "politico.com": ["politico"],
  "axios.com": ["axios"],
  "propublica.org": ["propublica"],
  "thehill.com": ["the hill"],
  "washingtontimes.com": ["washington times"],
};

// small changes for tie breakers
const OUTLET_PRIORS = {
  "foxnews.com": 1.5,
  "msnbc.com": -1.5,
  "cnn.com": -0.75,
  "nytimes.com": -0.75,
  "washingtonpost.com": -0.5,
  "reuters.com": 0,
  "apnews.com": 0,
  "npr.org": -0.5,
  "wsj.com": 0.75,
};

const MEDIA_FAMILIES = {
  fox: [
    "foxnews.com",
    "foxbusiness.com",
    "foxweather.com",
    "foxsports.com",
    "outkick.com",
    "foxnation.com",
    "radio.foxnews.com",
  ],
  nbc: ["msnbc.com", "nbcnews.com", "ms.now"],
  cnn: ["cnn.com"],
  nyt: ["nytimes.com"],
  wapo: ["washingtonpost.com"],
  reuters: ["reuters.com"],
  ap: ["apnews.com"],
  wsj: ["wsj.com"],
  npr: ["npr.org"],
  pbs: ["pbs.org"],
  abc: ["abcnews.go.com"],
  cbs: ["cbsnews.com"],
  bloomberg: ["bloomberg.com"],
  politico: ["politico.com"],
  axios: ["axios.com"],
  propublica: ["propublica.org"],
  hill: ["thehill.com"],
  bbc: ["bbc.com", "bbc.co.uk"],
  guardian: ["theguardian.com", "theguardian.co.uk"],
  usatoday: ["usatoday.com"],
};

function normalizeLookupText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function coreHost(host) {
  const raw = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  const parts = raw.split(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : raw;
}

function getLookupVariantsForHost(host) {
  const raw = String(host || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  const core = coreHost(raw);

  return [
    raw,
    core,
    normalizeLookupText(raw),
    normalizeLookupText(core),
    ...(SOURCE_ALIASES[core] || []),
  ].filter(Boolean);
}

async function findBestSeedRowForHost(store, host) {
  const variants = getLookupVariantsForHost(host);

  // 1) exact key attempts first
  for (const key of variants) {
    const exact = await new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (exact) return exact;
  }

  // 2) fallback: scan all rows and score approximate matches
  const allRows = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  const scored = allRows
    .map((row) => {
      const d = normalizeLookupText(row.domain || "");
      const l = normalizeLookupText(row.label || "");
      let score = 0;

      for (const variant of variants) {
        const v = normalizeLookupText(variant);
        if (!v) continue;

        if (d === v || l === v) score += 100;
        else if (d.includes(v) || l.includes(v)) score += 35;
        else if (v.includes(d) || v.includes(l)) score += 15;
      }

      // prefer cleaner/national matches over noisy local affiliate names
      if (/\bfox\s+\d+\b/.test(d) || /\bfox\s+\d+\b/.test(l)) score -= 15;
      if (/\bnews\b/.test(d) || /\bnews\b/.test(l)) score += 3;

      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].row : null;
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

function sameMediaNetwork(hostA, hostB) {
  const a = normalizeDomain(hostA || "");
  const b = normalizeDomain(hostB || "");

  if (!a || !b) return false;
  if (a === b) return true;

  return Object.values(MEDIA_FAMILIES).some(
    (group) => group.includes(a) && group.includes(b),
  );
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

const NON_EDITORIAL_EXACT_DOMAINS = new Set([
  "facebook.com",
  "m.facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "t.co",
  "wa.me",
  "whatsapp.com",
  "apps.apple.com",
  "play.google.com",
  "ap.org",
]);

const NON_EDITORIAL_DOMAIN_PATTERNS = [
  "privacy",
  "cookie",
  "consent",
  "account",
  "login",
  "signup",
  "subscribe",
  "subscriptions",
  "help",
  "support",
  "advertis",
  "analytics",
  "tracking",
  "doubleclick",
  "googletagmanager",
  "onetrust",
  "privacyportal",
  "legal",
  "terms",
  "policy",
];

const LOW_VALUE_REFERENCE_DOMAINS = new Set([
  "factset.com",
  "refinitiv.com",
  "lipperalpha.refinitiv.com",
]);

function getRootishHost(hostname) {
  const host = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  const parts = host.split(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : host;
}

function isSameSiteOrSubdomain(linkHost, articleHost) {
  const a = String(linkHost || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  const b = String(articleHost || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();

  if (!a || !b) return false;
  if (a === b) return true;
  return a.endsWith("." + b) || b.endsWith("." + a);
}

function isNonEditorialDomain(hostname) {
  const host = getRootishHost(hostname);
  if (!host) return true;

  if (NON_EDITORIAL_EXACT_DOMAINS.has(host)) return true;
  return NON_EDITORIAL_DOMAIN_PATTERNS.some((pattern) =>
    host.includes(pattern),
  );
}

function isLowValueReferenceDomain(hostname) {
  const host = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  return LOW_VALUE_REFERENCE_DOMAINS.has(host);
}

function classifyOutboundLink(href, pageDomain = "") {
  const host = domainFromAnyUrl(href);

  if (!host) {
    return {
      host: "",
      type: "invalid",
      keepForNeighborhood: false,
      weightMultiplier: 0,
    };
  }

  if (
    isSameSiteOrSubdomain(host, pageDomain) ||
    sameMediaNetwork(host, pageDomain)
  ) {
    return {
      host,
      type: "self_or_same_family",
      keepForNeighborhood: false,
      weightMultiplier: 0,
    };
  }

  if (isNonEditorialDomain(host)) {
    return {
      host,
      type: "non_editorial",
      keepForNeighborhood: false,
      weightMultiplier: 0,
    };
  }

  if (isLowValueReferenceDomain(host)) {
    return {
      host,
      type: "low_value_reference",
      keepForNeighborhood: true,
      weightMultiplier: 0.2,
    };
  }

  return {
    host,
    type: "editorial_or_institutional",
    keepForNeighborhood: true,
    weightMultiplier: 1.0,
  };
}

// outbound link filtering helpers
function getOutboundPositionWeight(index, total) {
  if (!total || total <= 0) return 1.0;

  const ratio = index / total;

  if (ratio <= 0.2) return 1.6;
  if (ratio <= 0.5) return 1.25;
  if (ratio <= 0.8) return 0.95;
  return 0.65;
}

async function getRatingForHost(host) {
  return await getRatingSmart(host);
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
    
    const linkInfo = classifyOutboundLink(href, pageDomain);
    const host = linkInfo.host;

if (!linkInfo.keepForNeighborhood) continue;

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

// look at outbound sources and weighs them/ looks at linked neighborhoods of sources
// filters out social platforms
// places more weight on initial links
async function computeWeightedOutboundNeighborhood(
  outboundLinks = [],
  pageDomain = "",
) {
  const counts = {
    left: 0,
    lean_left: 0,
    center: 0,
    lean_right: 0,
    right: 0,
    unknown: 0,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  let ratedEditorialCount = 0;
  let keptCount = 0;
  let filteredCount = 0;

  const reasons = [];
  const filteredReasons = [];

  for (let i = 0; i < outboundLinks.length; i++) {
    const href = outboundLinks[i];
    const linkInfo = classifyOutboundLink(href, pageDomain);
    const host = linkInfo.host;

    if (!linkInfo.keepForNeighborhood) {
      filteredCount++;
      if (filteredReasons.length < 10) {
        filteredReasons.push(
          `${host || "[invalid]"} -> filtered (${linkInfo.type})`,
        );
      }
      continue;
    }

    keptCount++;

    const { rating } = await getRatingForHost(host);
    if (!rating) {
      counts.unknown++;
      if (reasons.length < 10) {
        reasons.push(`${host} -> unrated (${linkInfo.type})`);
      }
      continue;
    }

    counts[rating.bucket] = (counts[rating.bucket] || 0) + 1;

    const positionWeight = getOutboundPositionWeight(i, outboundLinks.length);
    const finalWeight = linkInfo.weightMultiplier * positionWeight;

    weightedSum += Number(rating.x || 0) * finalWeight;
    totalWeight += finalWeight;
    ratedEditorialCount++;

    if (reasons.length < 10) {
      reasons.push(
        `${host} -> ${rating.bucket} (x=${rating.x}, w=${finalWeight.toFixed(2)}, type=${linkInfo.type})`,
      );
    }
  }

  let confidence = 0;
  if (ratedEditorialCount >= 5) confidence = 1.0;
  else if (ratedEditorialCount === 4) confidence = 0.85;
  else if (ratedEditorialCount === 3) confidence = 0.7;
  else if (ratedEditorialCount === 2) confidence = 0.45;
  else if (ratedEditorialCount === 1) confidence = 0.2;

  return {
    counts,
    avgX: totalWeight ? weightedSum / totalWeight : 0,
    totalWeight,
    ratedEditorialCount,
    keptCount,
    filteredCount,
    confidence,
    reasons,
    filteredReasons,
  };
}

function computeNeighborhoodAgreementSignals(
  articleShiftTotal,
  weightedNeighborhood,
) {
  const neighborhoodX = Number(weightedNeighborhood?.avgX || 0);
  const articleDir = sign(articleShiftTotal);
  const neighborhoodDir = sign(neighborhoodX);

  let shift = 0;
  const reasons = [];

  if (articleDir && neighborhoodDir) {
    if (articleDir === neighborhoodDir) {
      shift += 0.25;
      reasons.push("article shift aligns with linked-source neighborhood");
    } else {
      shift -= 0.2;
      reasons.push("article shift conflicts with linked-source neighborhood");
    }
  }

  if (Math.abs(neighborhoodX) >= 1.0) {
    shift += 0.1 * neighborhoodDir;
    reasons.push(`strong neighborhood pull x=${neighborhoodX.toFixed(2)}`);
  }

  return {
    shift: clamp(shift, -0.35, 0.35),
    reasons,
  };
}

function computePlacementConfidence(
  sourceFound,
  weightedNeighborhood,
  articleShiftTotal,
) {
  let score = 0;

  if (sourceFound) score += 0.35;
  if (Number(weightedNeighborhood?.confidence || 0) >= 0.7) score += 0.35;
  else if (Number(weightedNeighborhood?.confidence || 0) >= 0.45) score += 0.2;

  if (Math.abs(Number(articleShiftTotal || 0)) >= 0.35) score += 0.3;

  score = clamp(score, 0, 1);

  let label = "low";
  if (score >= 0.75) label = "high";
  else if (score >= 0.5) label = "medium";

  return { score, label };
}

function computeOutletPriorTieBreaker(
  domain,
  pageType,
  currentArticleX,
  articleShiftTotal,
) {
  const prior = OUTLET_PRIORS[domain];
  if (!Number.isFinite(prior)) return 0;

  // only break ties near center
  if (Math.abs(currentArticleX) > 0.9) return 0;

  // only apply if article evidence is not trivial
  if (Math.abs(articleShiftTotal) < 0.35) return 0;

  const shiftDir = sign(articleShiftTotal);
  const priorDir = sign(prior);
  if (!shiftDir || shiftDir !== priorDir) return 0;

  const isOpinion = String(pageType || "")
    .toLowerCase()
    .includes("opinion");
  return clamp(priorDir * (isOpinion ? 0.3 : 0.18), -0.3, 0.3);
}

function resolveSourcePriorX(domain, rating) {
  const dbX = typeof rating?.x === "number" ? clamp(rating.x, -2, 2) : null;

  const dbBucket = String(rating?.bucket || "").toLowerCase();
  const outletPrior = OUTLET_PRIORS[domain];

  // If DB gives a meaningful political value, use it.
  if (
    Number.isFinite(dbX) &&
    !(dbX === 0 && (dbBucket === "unknown" || dbBucket === "center"))
  ) {
    return dbX;
  }

  // Otherwise fall back to outlet prior when known.
  if (Number.isFinite(outletPrior)) {
    return clamp(outletPrior, -2, 2);
  }

  return 0;
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
// newer version adds context to the cues to understand the tone of the article
function computeSemanticCueScore(text = "") {
  const t = String(text || "").toLowerCase();

  const ACTORS = {
    right: [
      "republican",
      "republicans",
      "gop",
      "conservative",
      "conservatives",
      "trump",
      "desantis",
      "right-wing",
      "right wing",
    ],
    left: [
      "democrat",
      "democrats",
      "liberal",
      "liberals",
      "progressive",
      "progressives",
      "biden",
      "harris",
      "left-wing",
      "left wing",
    ],
  };

  const POSITIVE_WORDS = [
    "support",
    "supports",
    "supported",
    "back",
    "backs",
    "backed",
    "defend",
    "defends",
    "defended",
    "protect",
    "protects",
    "protected",
    "benefit",
    "benefits",
    "beneficial",
    "fair",
    "commonsense",
    "common-sense",
    "needed",
    "necessary",
    "effective",
    "reasonable",
    "popular",
    "improve",
    "improves",
    "improved",
    "restore",
    "restores",
    "restored",
    "expand",
    "expands",
    "expanded",
    "strengthen",
    "strengthens",
    "strengthened",
  ];

  const NEGATIVE_WORDS = [
    "oppose",
    "opposes",
    "opposed",
    "criticize",
    "criticizes",
    "criticized",
    "attack",
    "attacks",
    "attacked",
    "harmful",
    "extreme",
    "dangerous",
    "controversial",
    "radical",
    "unfair",
    "threat",
    "threatens",
    "threatened",
    "restrict",
    "restricts",
    "restricted",
    "ban",
    "bans",
    "banned",
    "cut",
    "cuts",
    "gut",
    "guts",
    "gutted",
    "undermine",
    "undermines",
    "undermined",
    "false",
    "baseless",
    "debunked",
    "misleading",
    "rigged",
  ];

  const ISSUE_FRAMES = [
    {
      topic: "healthcare",
      left: [
        "universal healthcare",
        "medicare for all",
        "public option",
        "expand medicaid",
        "affordable healthcare",
        "healthcare as a right",
      ],
      right: [
        "government-run healthcare",
        "socialized medicine",
        "private healthcare choice",
        "market-based healthcare",
        "health savings accounts",
      ],
    },
    {
      topic: "abortion",
      left: [
        "reproductive rights",
        "abortion rights",
        "access to abortion",
        "bodily autonomy",
        "pro-choice",
      ],
      right: [
        "pro-life",
        "right to life",
        "unborn child",
        "late-term abortion",
        "protect the unborn",
      ],
    },
    {
      topic: "lgbtq",
      left: [
        "lgbtq rights",
        "trans rights",
        "gender-affirming care",
        "same-sex marriage",
        "anti-discrimination protections",
        "pride",
      ],
      right: [
        "gender ideology",
        "biological sex",
        "protect women's sports",
        "parental notification",
        "anti-woke",
        "woke ideology",
      ],
    },
    {
      topic: "speech_culture",
      left: [
        "hate speech",
        "misinformation",
        "disinformation",
        "online harms",
        "content moderation",
      ],
      right: [
        "free speech",
        "censorship",
        "cancel culture",
        "big tech censorship",
        "speech suppression",
      ],
    },
    {
      topic: "elections",
      left: [
        "voting rights",
        "voter suppression",
        "election denial",
        "certified results",
        "protect democracy",
      ],
      right: [
        "election integrity",
        "voter fraud",
        "rigged election",
        "ballot harvesting",
        "secure the vote",
      ],
    },
    {
      topic: "immigration",
      left: [
        "pathway to citizenship",
        "immigrant rights",
        "asylum seekers",
        "family reunification",
        "mass deportation",
      ],
      right: [
        "border security",
        "illegal immigration",
        "border crisis",
        "secure the border",
        "deportation",
        "sanctuary cities",
      ],
    },
    {
      topic: "taxes_economy",
      left: [
        "wealth tax",
        "fair share",
        "corporate loopholes",
        "income inequality",
        "raise taxes on the wealthy",
        "worker protections",
        "living wage",
      ],
      right: [
        "tax relief",
        "tax cuts",
        "lower taxes",
        "small government",
        "job creators",
        "deregulation",
        "economic freedom",
      ],
    },
    {
      topic: "climate_energy",
      left: [
        "climate crisis",
        "climate emergency",
        "clean energy",
        "environmental justice",
        "green jobs",
        "renewable energy",
      ],
      right: [
        "energy independence",
        "fossil fuels",
        "drill more",
        "anti-esg",
        "climate alarmism",
      ],
    },
    {
      topic: "policing_crime",
      left: [
        "police reform",
        "criminal justice reform",
        "end qualified immunity",
        "reduce police funding",
        "community violence prevention",
      ],
      right: [
        "law and order",
        "back the blue",
        "tough on crime",
        "anti-police rhetoric",
        "defund the police",
      ],
    },
    {
      topic: "guns",
      left: [
        "gun violence",
        "gun safety",
        "assault weapons ban",
        "universal background checks",
        "red flag laws",
      ],
      right: [
        "second amendment",
        "gun rights",
        "constitutional carry",
        "law-abiding gun owners",
      ],
    },
    {
      topic: "education_family",
      left: [
        "book bans",
        "inclusive curriculum",
        "student protections",
        "public school funding",
      ],
      right: [
        "parental rights",
        "school choice",
        "critical race theory",
        "protect children from woke ideology",
      ],
    },
    {
      topic: "israel_palestine",
      left: [
        "free palestine",
        "palestinian rights",
        "ceasefire now",
        "occupation",
        "settler violence",
        "humanitarian crisis in gaza",
      ],
      right: [
        "stand with israel",
        "support israel",
        "israel has the right to defend itself",
        "hamas terrorism",
        "pro-israel",
      ],
    },
    {
      topic: "iran_war",
      left: [
        "avoid war with iran",
        "diplomacy with iran",
        "anti-war",
        "ceasefire",
        "prevent escalation",
      ],
      right: [
        "strike iran",
        "military deterrence",
        "maximum pressure",
        "national security threat",
        "support military action",
      ],
    },
  ];


  const containsAny = (textChunk, phrases) => {
    const hits = [];
    for (const p of phrases) {
      if (textChunk.includes(p)) hits.push(p);
    }
    return hits;
  };

  const windows = [];
  const allPhrases = ISSUE_FRAMES.flatMap((frame) => [
    ...frame.left.map((p) => ({ side: "left", topic: frame.topic, phrase: p })),
    ...frame.right.map((p) => ({
      side: "right",
      topic: frame.topic,
      phrase: p,
    })),
  ]);

  for (const item of allPhrases) {
    let idx = t.indexOf(item.phrase);
    while (idx !== -1) {
      const start = Math.max(0, idx - 120);
      const end = Math.min(t.length, idx + item.phrase.length + 120);
      windows.push({
        ...item,
        context: t.slice(start, end),
      });
      idx = t.indexOf(item.phrase, idx + item.phrase.length);
    }
  }

  let score = 0;
  let leftHits = 0;
  let rightHits = 0;
  let leftSupport = 0;
  let leftCritique = 0;
  let rightSupport = 0;
  let rightCritique = 0;
  const examples = [];

  for (const hit of windows) {
    const ctx = hit.context;

    const posHits = containsAny(ctx, POSITIVE_WORDS);
    const negHits = containsAny(ctx, NEGATIVE_WORDS);
    const rightActorHits = containsAny(ctx, ACTORS.right);
    const leftActorHits = containsAny(ctx, ACTORS.left);

    const tone =
      posHits.length > negHits.length
        ? "positive"
        : negHits.length > posHits.length
          ? "negative"
          : "neutral";

    if (hit.side === "left") leftHits++;
    if (hit.side === "right") rightHits++;

    // support/critique logic
    if (hit.side === "right" && tone === "positive") {
      score += 1.0;
      rightSupport++;
    } else if (hit.side === "right" && tone === "negative") {
      score -= 1.0;
      rightCritique++;
    } else if (hit.side === "left" && tone === "positive") {
      score -= 1.0;
      leftSupport++;
    } else if (hit.side === "left" && tone === "negative") {
      score += 1.0;
      leftCritique++;
    }

    // actor reinforcement
    if (hit.side === "right" && rightActorHits.length && tone === "positive")
      score += 0.35;
    if (hit.side === "right" && leftActorHits.length && tone === "negative")
      score += 0.15;
    if (hit.side === "left" && leftActorHits.length && tone === "positive")
      score -= 0.35;
    if (hit.side === "left" && rightActorHits.length && tone === "negative")
      score -= 0.15;

    if (examples.length < 8) {
      examples.push(`${hit.topic}: "${hit.phrase}" (${hit.side}, ${tone})`);
    }
  }

  score = clamp(score, -6, 6);

  return {
    score,
    leftHits,
    rightHits,
    leftSupport,
    leftCritique,
    rightSupport,
    rightCritique,
    examples,
  };
}

function computeFramingSignals(title = "", textSample = "") {
  const head = String(title || "").toLowerCase();
  const body = String(textSample || "").toLowerCase();
  const combined = `${head} ${body}`;

  const preferredFrameWords = [
    "endgame",
    "showdown",
    "victory",
    "collapse",
    "humiliation",
    "crackdown",
    "deadline",
    "finally",
    "must act",
    "path forward",
  ];

  const hawkishWords = [
    "strike",
    "deterrence",
    "military action",
    "strength",
    "retaliation",
    "maximum pressure",
    "show of force",
  ];

  const skepticismWords = [
    "critics say",
    "without evidence",
    "baseless",
    "unverified",
    "opponents argue",
    "analysts warn",
    "skeptics say",
  ];

  let score = 0;
  const reasons = [];

  const frameHits = preferredFrameWords.filter((w) => combined.includes(w));
  const hawkHits = hawkishWords.filter((w) => combined.includes(w));
  const skepticHits = skepticismWords.filter((w) => combined.includes(w));

  if (frameHits.length) {
    score += Math.min(2, frameHits.length * 0.5);
    reasons.push(`headline/narrative framing: ${frameHits.join(", ")}`);
  }

  if (hawkHits.length) {
    score += Math.min(2, hawkHits.length * 0.5);
    reasons.push(`hawkish/conflict framing: ${hawkHits.join(", ")}`);
  }

  if (skepticHits.length) {
    score -= Math.min(1.5, skepticHits.length * 0.5);
    reasons.push(`skepticism/context present: ${skepticHits.join(", ")}`);
  }

  return {
    score: clamp(score, -3, 3),
    reasons,
  };
}

function computeArticleShift(techniques, semantic, framing) {
  const semanticScore = Number(semantic?.score || 0);
  const framingScore = Number(framing?.score || 0);

  // cue words stay in the system, but smaller
  const semanticShift = clamp(semanticScore * 0.08, -0.3, 0.3);

  // framing matters more than raw cue words
  const framingShift = clamp(framingScore * 0.16, -0.55, 0.55);

  // rhetoric is only a small reinforcement layer
  const intensity = clamp(
    (techniques?.spin?.count || 0) * 0.04 +
      (techniques?.sensationalism?.count || 0) * 0.04 +
      (techniques?.subjectiveCues?.count || 0) * 0.03 +
      (techniques?.attributionGaps?.count || 0) * 0.05,
    0,
    0.22,
  );

  const dir = sign(framingScore) || sign(semanticScore);

  const languageShift = dir ? dir * intensity : 0;

  return {
    semanticShift,
    framingShift,
    languageShift,
    total: clamp(semanticShift + framingShift + languageShift, -1.0, 1.0),
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
  if (extKnown >= 5) {
    y += 8;
    why.push("+8 cites many known rated sources");
  } else if (extKnown >= 3) {
    y += 6;
    why.push("+6 cites several known rated sources");
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

  // Penalize pages whose outbound profile is mostly unknown/unrated
  if (extTotal >= 5) {
    const unknownRatio = extUnknown / extTotal;
    if (unknownRatio >= 0.7) {
      y -= 6;
      why.push("-6: most outbound sources are unknown/unrated");
    } else if (unknownRatio >= 0.5) {
      y -= 3;
      why.push("-3: many outbound sources are unknown/unrated");
    }
  }

  // Scoring: Basic metadata matters, but does not dominate reliability
  if (data.author) {
    y += 2;
    why.push("+2: author listed");
  }
  if (data.date) {
    y += 2;
    why.push("+2: date listed");
  }
  if (data.publisher) {
    y += 1;
    why.push("+1: publisher listed");
  }
  if (data.https === true) {
    y += 1;
    why.push("+1: HTTPS");
  }
  if (typeof data.sourceBaselineY === "number") {
    y += 4;
    why.push("+4: matched known rated source baseline");
  }

  //notes the lean of outbound sources
  const sourceX = Number(data.x);
  const outboundAvgX = Number(data.outboundSkew?.avgX);

  if (Number.isFinite(sourceX) && Number.isFinite(outboundAvgX)) {
    const drift = Math.abs(outboundAvgX - sourceX);
    if (drift <= 0.5) {
      y += 3;
      why.push("+3: source baseline aligns with outbound profile");
    } else if (drift >= 1.25) {
      y -= 3;
      why.push("-3: source baseline differs sharply from outbound profile");
    }
  }

  const framingScore = Number(data.framingSignals?.score || 0);
  if (framingScore >= 1.5) {
    y -= 3;
    why.push("-3: strong one-sided narrative framing");
  } else if (framingScore <= -1.0) {
    y += 1;
    why.push("+1: skeptical/contextual framing present");
  }

  // Reporting quality / penalties (0 to -26)
  // Places slighly less importance on language/ wording
  const bt = data.biasTechniques || {};
  const spin = bt.spin?.count || 0;
  const sens = bt.sensationalism?.count || 0;
  const subj = bt.subjectiveCues?.count || 0;
  const gaps = bt.attributionGaps?.count || 0;

  const penalty = spin * 1.5 + sens * 1.5 + subj * 1.0 + gaps * 2.0;
  const cappedPenalty = clamp(penalty, 0, 14);
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

    //baseline lookup from local db
    const { domain, rating } = await getRatingSmart(pageUrl);

    merged.url = merged.url || pageUrl;
    merged.domain = domain;
    merged.bucket = rating?.bucket || "unknown";
    merged.x = typeof rating?.x === "number" ? rating.x : 0;
    merged.sourceBaselineY =
      typeof rating?.baselineY === "number" ? rating.baselineY : 32;

    // Y axis (reliability) from scoring
    // 1) outbound skew (external sources only)
    const outbound = await computeOutboundSkew(
      merged.outboundLinks || merged.refs || [],
      merged.domain,
    );
    merged.outboundSkew = outbound;

    const weightedNeighborhood = await computeWeightedOutboundNeighborhood(
      merged.outboundLinks || merged.refs || [],
      merged.domain,
      merged.textSample || "",
    );
    merged.weightedNeighborhood = weightedNeighborhood;

    // Build a political baseline from source matching with db, then look at outbound rated links if needed

    const knownCount =
      (outbound.counts.left || 0) +
      (outbound.counts.lean_left || 0) +
      (outbound.counts.center || 0) +
      (outbound.counts.lean_right || 0) +
      (outbound.counts.right || 0);

    const sourceFound = !!rating;
    const sourcePriorX = resolveSourcePriorX(merged.domain, rating);

    const neighborhoodX =
      Number(weightedNeighborhood.totalWeight || 0) > 0
        ? weightedNeighborhood.avgX
        : Number.isFinite(outbound.avgX) && knownCount > 0
          ? outbound.avgX
          : 0;

    // Display baseline in the dashboard:
    // known source -> source prior
    // unknown source -> neighborhood estimate
    merged.x = sourceFound ? sourcePriorX : clamp(neighborhoodX, -2, 2);

    merged.bucket =
      merged.x <= -1.5
        ? "left"
        : merged.x <= -0.5
          ? "lean_left"
          : merged.x < 0.5
            ? "center"
            : merged.x < 1.5
              ? "lean_right"
              : "right";

    merged.why = merged.why || [];
    if (sourceFound) {
      const rawDbX =
        typeof rating?.x === "number" ? clamp(rating.x, -2, 2) : null;
      const outletPrior = OUTLET_PRIORS[merged.domain];

      if (
        Number.isFinite(outletPrior) &&
        Number.isFinite(rawDbX) &&
        rawDbX === 0 &&
        ["unknown", "center"].includes(
          String(rating?.bucket || "").toLowerCase(),
        )
      ) {
        merged.why.push(
          `Source prior fallback used outlet prior for ${merged.domain}: x=${sourcePriorX.toFixed(2)}`,
        );
      } else {
        merged.why.push(`Source prior: x=${sourcePriorX.toFixed(2)}`);
      }
    } else if (Number(weightedNeighborhood.totalWeight || 0) > 0) {
      merged.why.push(
        `Unknown source; baseline inferred from weighted linked neighborhood x=${neighborhoodX.toFixed(2)}`,
      );
    } else if (Number.isFinite(outbound.avgX) && knownCount > 0) {
      merged.why.push(
        `Unknown source; baseline inferred from linked-source pattern x=${outbound.avgX.toFixed(2)}`,
      );
    } else {
      merged.why.push(
        "No direct source match and no rated linked neighborhood; baseline defaults to center",
      );
    }

    // 2) bias techniques from text sample
    const textForBias = `${merged.title || ""} ${merged.textSample || ""}`;
    const techniques = detectBiasTechniques(textForBias);
    merged.biasTechniques = techniques;

    const semantic = computeSemanticCueScore(textForBias);
    merged.semanticCue = semantic;

    const framing = computeFramingSignals(
      merged.title || "",
      merged.textSample || "",
    );
    merged.framingSignals = framing;

    // Article-specific shift
    const articleShift = computeArticleShift(techniques, semantic, framing);
    merged.articleShift = articleShift;

    // Neighborhood shift:
    // known source -> move relative to source prior
    // unknown source -> neighborhood itself is the main directional block
    const neighborhoodConfidence = Number(weightedNeighborhood.confidence || 0);

    const rawNeighborhoodShift = sourceFound
      ? neighborhoodX - sourcePriorX
      : neighborhoodX;

    const neighborhoodShift = clamp(
      rawNeighborhoodShift * 0.45 * neighborhoodConfidence,
      -0.85,
      0.85,
    );

    merged.why.push(
      `Neighborhood confidence=${neighborhoodConfidence.toFixed(2)}, rawNeighborhoodShift=${rawNeighborhoodShift.toFixed(2)}`,
    );

    const neighborhoodAgreement = computeNeighborhoodAgreementSignals(
      articleShift.total,
      weightedNeighborhood,
    );
    merged.neighborhoodAgreementSignals = neighborhoodAgreement;

    merged.articleX = clamp(
      sourcePriorX +
        neighborhoodShift +
        articleShift.total +
        neighborhoodAgreement.shift,
      -2,
      2,
    );

    const outletPriorAdj = computeOutletPriorTieBreaker(
      merged.domain,
      merged.pageType,
      merged.articleX,
      articleShift.total,
    );

    merged.articleX = clamp(merged.articleX + outletPriorAdj, -2, 2);
    merged.bucket = getPoliticalBucketFromX(merged.articleX);

    const placementConfidence = computePlacementConfidence(
      sourceFound,
      weightedNeighborhood,
      articleShift.total,
    );
    merged.placementConfidence = placementConfidence;

    // low-confidence center zone
    if (placementConfidence.score < 0.45 && Math.abs(merged.articleX) < 0.85) {
      merged.articleX = clamp(merged.articleX * 0.5, -2, 2);
      merged.why.push("Low-confidence center zone applied");
    }

    merged.why.push(
      `X model: sourcePrior=${sourcePriorX.toFixed(2)}, neighborhoodShift=${neighborhoodShift.toFixed(2)}, articleShift=${articleShift.total.toFixed(2)}, neighborhoodAgreement=${neighborhoodAgreement.shift.toFixed(2)}, outletPriorAdj=${outletPriorAdj.toFixed(2)}, final articleX=${merged.articleX.toFixed(2)}, confidence=${placementConfidence.label}`,
    );

    merged.why.push(
      `Article shift: semantic=${articleShift.semanticShift.toFixed(2)}, framing=${articleShift.framingShift.toFixed(2)}, language=${articleShift.languageShift.toFixed(2)}`,
    );

    // 4) NOW compute Y using Ad Fontes-ish reliability scoring
    const scored = computeReliabilityScore(merged);
    const baseY = Number.isFinite(merged.sourceBaselineY)
      ? merged.sourceBaselineY
      : 32;

    // Blend source reliability baseline with article-level evidence
    merged.y = clamp(baseY * 0.6 + scored.y * 0.4, 0, 64);
    merged.why = (merged.why || []).concat(scored.why);
    merged.why.push(
      `Y baseline=${baseY.toFixed(2)}, articleScore=${scored.y.toFixed(2)}, final y=${merged.y.toFixed(2)}`,
    );

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
      `Semantic cues: leftHits=${semantic.leftHits}, rightHits=${semantic.rightHits}, leftSupport=${semantic.leftSupport}, leftCritique=${semantic.leftCritique}, rightSupport=${semantic.rightSupport}, rightCritique=${semantic.rightCritique}, score=${semantic.score}`,
    );

    if (Array.isArray(semantic.examples) && semantic.examples.length) {
      merged.why.push(`Semantic examples: ${semantic.examples.join(" | ")}`);
    }
    if (Array.isArray(framing.reasons) && framing.reasons.length) {
      merged.why.push(`Framing signals: ${framing.reasons.join(" | ")}`);
    }
    if (
      Array.isArray(weightedNeighborhood.reasons) &&
      weightedNeighborhood.reasons.length
    ) {
      merged.why.push(
        `Weighted neighborhood: ${weightedNeighborhood.reasons.join(" | ")}`,
      );
    }
    if (
      Array.isArray(weightedNeighborhood.filteredReasons) &&
      weightedNeighborhood.filteredReasons.length
    ) {
      merged.why.push(
        `Filtered neighborhood links: ${weightedNeighborhood.filteredReasons.join(" | ")}`,
      );
    }

    if (
      Array.isArray(neighborhoodAgreement.reasons) &&
      neighborhoodAgreement.reasons.length
    ) {
      merged.why.push(
        `Neighborhood agreement: ${neighborhoodAgreement.reasons.join(" | ")}`,
      );
    }
    await chrome.storage.local.set({ lastAnalysis: merged });
    // Log analyses for clustering / trend analysis
    const record = {
      ts: Date.now(),
      url: merged.url,
      domain: merged.domain,
      title: merged.title || "",
      outboundLinks: merged.outboundLinks || merged.refs || [],
    };

    const prev = await chrome.storage.local.get({ analysisLog: [] });
    const analysisLog = Array.isArray(prev.analysisLog) ? prev.analysisLog : [];
    analysisLog.push(record);
    while (analysisLog.length > 500) analysisLog.shift();
    await chrome.storage.local.set({ analysisLog });

    return merged;
  })()
    .then((merged) => sendResponse({ ok: true, data: merged }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  // keep the message channel open for async response
  return true;
});