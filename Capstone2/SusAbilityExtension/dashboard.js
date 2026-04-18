function showRoute(route) {
  const dash = document.getElementById("route-dashboard");
  const set = document.getElementById("route-settings");

  dash.classList.toggle("hidden", route !== "dashboard");
  set.classList.toggle("hidden", route !== "settings");

  document.querySelectorAll(".sideItem").forEach((btn) => {
    btn.classList.toggle("sideActive", btn.dataset.route === route);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("susability");

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sourceRatings")) {
        const store = db.createObjectStore("sourceRatings", {
          keyPath: "domain",
        });
        store.createIndex("bucket", "bucket", { unique: false });
        store.createIndex("x", "x", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function applyBaselineY(rows) {
  // Default baseline (neutral; ideology ≠ reliability)
  const DEFAULT_Y = 40;

  // (0–64 scale)
  const OVERRIDES = {
    "reuters.com": 58,
    "apnews.com": 58,
    "bbc.com": 54,
    "npr.org": 50,
    "washingtonpost.com": 50,
    "nytimes.com": 50,
    "wsj.com": 50,

    "bloomberg.com": 48,
    "axios.com": 46,
    "propublica.org": 52,

    "cnn.com": 42,
    "foxnews.com": 40,
    "msnbc.com": 40,

    "thehill.com": 42,
    "forbes.com": 40,
    "marketwatch.com": 40,
    "newsweek.com": 38,

    "realclearpolitics.com": 34,

    "dailymail.co.uk": 24,
    "nypost.com": 28,
    "theepochtimes.com": 20,
    "zerohedge.com": 18,
    "breitbart.com": 18,
    "oann.com": 16,
    "newsmax.com": 20,
    "dailywire.com": 22,
    "dailycaller.com": 22,
    "thefederalist.com": 22,
  };

  return rows.map((r) => ({
    ...r,
    baselineY:
      typeof r.baselineY === "number"
        ? r.baselineY
        : (OVERRIDES[r.domain] ?? DEFAULT_Y),
  }));
}

async function getAllSeedPoints() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sourceRatings", "readonly");
    const store = tx.objectStore("sourceRatings");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function seedIfEmpty() {
  const existing = await getAllSeedPoints();
  if (existing.length > 0) return;

  const seedUrl = chrome.runtime.getURL("seed_sources.json");
 let rows = await (await fetch(seedUrl)).json();
 rows = applyBaselineY(rows);

  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("sourceRatings", "readwrite");
    const store = tx.objectStore("sourceRatings");
    rows.forEach((r) => store.put(r));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// reseed database for changes (editing phase)
async function forceReseedDb() {
  const seedUrl =
    chrome.runtime.getURL("seed_sources.json") + `?t=${Date.now()}`;
  let rows = await (await fetch(seedUrl, { cache: "no-store" })).json();

  // Keep this so missing baselineY still gets a value
  rows = applyBaselineY(rows);

  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("sourceRatings", "readwrite");
    const store = tx.objectStore("sourceRatings");

    store.clear();
    rows.forEach((r) => store.put(r));

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });

  return rows.length;
}

async function clearDbOnly() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("sourceRatings", "readwrite");
    tx.objectStore("sourceRatings").clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function updateDbStatus(message = "") {
  const el = document.getElementById("dbStatus");
  if (!el) return;

  try {
    const points = await getAllSeedPoints();
    el.textContent = message
      ? `${message} (Domains in DB: ${points.length})`
      : `Domains in DB: ${points.length}`;
  } catch (e) {
    el.textContent = `DB status error: ${String(e)}`;
  }
}

// helps MBFC labels match more reliably
function mbfcBiasToBucketX(biasLabel = "") {
  const s = String(biasLabel).toLowerCase().trim();

  if (!s) return { bucket: "unknown", x: 0 };

  if (s.includes("extreme left") || s === "left" || s.includes("left bias"))
    return { bucket: "left", x: -2 };
  if (
    s.includes("left-center") ||
    s.includes("left center") ||
    s.includes("left-center bias")
  )
    return { bucket: "lean_left", x: -1 };
  if (
    s.includes("right-center") ||
    s.includes("right center") ||
    s.includes("right-center bias")
  )
    return { bucket: "lean_right", x: 1 };
  if (
    s.includes("least biased") ||
    s === "center" ||
    s === "centrist" ||
    s.includes("center bias")
  )
    return { bucket: "center", x: 0 };
  if (s.includes("extreme right") || s === "right" || s.includes("right bias"))
    return { bucket: "right", x: 2 };

  return { bucket: "unknown", x: 0 };
}

function mbfcFactualToBaselineY(factualLabel = "", credibilityLabel = "") {
  // Map MBFC factual reporting category -> 0..64 baseline
  const f = String(factualLabel).toLowerCase();
  let y;

  if (f.includes("very high")) y = 56;
  else if (f.includes("high")) y = 48;
  else if (f.includes("mostly factual")) y = 40;
  else if (f.includes("mixed")) y = 32;
  else if (f.includes("low")) y = 20;
  else if (f.includes("very low")) y = 12;
  else y = 32; // unknown -> mid

  // small adjustment using credibility
  const c = String(credibilityLabel).toLowerCase();
  if (c.includes("high")) y += 4;
  else if (c.includes("low")) y -= 4;

  return clamp(y, 0, 64);
}

function makeUnionFind(items) {
  const parent = new Map();
  const rank = new Map();
  for (const it of items) {
    parent.set(it, it);
    rank.set(it, 0);
  }

  const find = (x) => {
    let p = parent.get(x);
    if (p === x) return x;
    p = find(p);
    parent.set(x, p);
    return p;
  };

  const union = (a, b) => {
    const ra = find(a),
      rb = find(b);
    if (ra === rb) return;
    const rka = rank.get(ra) || 0;
    const rkb = rank.get(rb) || 0;
    if (rka < rkb) parent.set(ra, rb);
    else if (rkb < rka) parent.set(rb, ra);
    else {
      parent.set(rb, ra);
      rank.set(ra, rka + 1);
    }
  };

  return { find, union, parent };
}

async function computeClustersFromLog(seedsByDomain) {
  const saved = await chrome.storage.local.get({ analysisLog: [] });
  const log = Array.isArray(saved.analysisLog) ? saved.analysisLog : [];

  const domFromLink = (href) => {
    try {
      return resolveSeedDomain(new URL(href).hostname, seedsByDomain);
    } catch {
      return "";
    }
  };

  // Only include domains that actually appear in the log graph
  const active = new Set();
  const edges = [];

  for (const rec of log) {
    const a =
      resolveSeedDomain(rec.domain || "", seedsByDomain) ||
      collapseDomain(rec.domain || "");
    if (!a) continue;
    active.add(a);

    const links = rec.outboundLinks || rec.refs || [];
    for (const href of links) {
      const b = domFromLink(href);
      if (!b || !seedsByDomain[b]) continue;
      if (a === b) continue;

      active.add(b);
      edges.push([a, b]);
    }
  }

  // If we don't have enough activity, return "no clusters"
  if (active.size === 0) {
    return { clusterCount: 0, clusterIds: new Map() };
  }

  const uf = makeUnionFind(active);
  for (const [a, b] of edges) uf.union(a, b);

  const clusterIds = new Map();
  const idByRoot = new Map();
  let nextId = 1;

  for (const d of active) {
    const root = uf.find(d);
    if (!idByRoot.has(root)) idByRoot.set(root, nextId++);
    clusterIds.set(d, idByRoot.get(root));
  }

  return {
    clusterCount: idByRoot.size,
    clusterIds,
  };
}


async function mbfcFetchDump(apiKey) {
  const url =
    "https://media-bias-fact-check-ratings-api2.p.rapidapi.com/fetch-data";
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "media-bias-fact-check-ratings-api2.p.rapidapi.com",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MBFC fetch failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  return await res.json();
}

function normalizeHost(host) {
  return (host || "").replace(/^www\./, "").toLowerCase();
}

function collapseDomain(host) {
  host = normalizeHost(host);
  const ALIASES = {
    "ms.now": "msnbc.com",
    "fxn.ws": "foxnews.com",
    "nyti.ms": "nytimes.com",
    "wapo.st": "washingtonpost.com",
    "n.pr": "npr.org",
    "bbc.in": "bbc.com",
    "gu.com": "theguardian.com",
  };
  if (ALIASES[host]) return ALIASES[host];

  const parts = host.split(".");
  if (parts.length <= 2) return host;

  const commonSecondLevelTlds = new Set(["co.uk", "com.au", "co.jp"]);
  const tail3 = parts.slice(-3).join(".");
  const tail2 = parts.slice(-2).join(".");
  if (commonSecondLevelTlds.has(tail2) && parts.length >= 3) return tail3;

  return tail2;
}

function resolveSeedDomain(host, seedsByDomain) {
  const raw = normalizeHost(host);
  const collapsed = collapseDomain(raw);
  const candidates = [raw, collapsed].filter(Boolean);
  for (const c of candidates) {
    if (seedsByDomain[c]) return c;
  }
  return "";
}

function domainFromUrlAny(u) {
  try {
    return collapseDomain(new URL(u).hostname);
  } catch {
    return "";
  }
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

function coerceMbfcRows(payload) {
  if (!payload) return [];

  // already an array
  if (Array.isArray(payload)) return payload;

  // common wrappers
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.sources)) return payload.sources;
  if (Array.isArray(payload.ratings)) return payload.ratings;

  // nested wrappers (very common)
  if (payload.data && Array.isArray(payload.data.data))
    return payload.data.data;
  if (payload.data && Array.isArray(payload.data.sources))
    return payload.data.sources;
  if (payload.data && Array.isArray(payload.data.ratings))
    return payload.data.ratings;

  // last resort: first array property found
  if (typeof payload === "object") {
    const maybe = Object.values(payload).find((v) => Array.isArray(v));
    if (Array.isArray(maybe)) return maybe;
  }
  return [];
}

async function seedFromMbfc(apiKey) {
  const statusEl = document.getElementById("mbfcStatus");
  statusEl && (statusEl.textContent = "Fetching MBFC…");

  const payload = await mbfcFetchDump(apiKey);
  const rows = coerceMbfcRows(payload);
  console.log(
    "MBFC payload keys:",
    payload && typeof payload === "object" ? Object.keys(payload) : payload
  );
  console.log("MBFC rows length:", rows.length);
  console.log("MBFC first row sample:", rows[0]);
  if (!rows.length) {
    throw new Error(
      "MBFC returned no rows (parser mismatch). DB was NOT overwritten."
    );
  }

  // Convert MBFC rows -> my seed row format
  const out = [];
  for (const r of rows) {
    const sourceUrl = pickFirst(r, [
      "source_url",
      "Source URL",
      "sourceUrl",
      "SourceUrl",
      "url",
      "URL",
      "website",
      "Website",
      "link",
      "Link"
    ]);
    let domain = sourceUrl
      ? domainFromUrlAny(sourceUrl)
      : normalizeHost(pickFirst(r, ["domain", "Domain"]) || "");
    if (!domain) {
      const rawDomain = pickFirst(r, [
        "domain",
        "Domain",
        "source_domain",
        "source",
        "Source",
        "site",
        "Site",
        "hostname",
        "host",
        "Host",
      ]);
      domain = normalizeHost(String(rawDomain || ""));
    }
    if (!domain) continue;

    const label =
      pickFirst(r, [
        "name",
        "Name",
        "source",
        "Source",
        "publisher",
        "Publisher",
      ]) || domain;

  const bias =
    pickFirst(r, [
      "bias",
      "Bias",
      "bias_rating",
      "Bias Rating",
      "biasRating",
      "BiasRating",
    ]) || "unknown";
    const factual =
      pickFirst(r, [
        "factual_reporting",
        "Factual Reporting",
        "factualReporting",
        "FactualReporting",
        "factual",
        "Factual",
      ]) || "";
    const credibility =
      pickFirst(r, [
        "credibility",
        "Credibility",
        "credibility_rating",
        "Credibility Rating",
        "credibilityRating",
        "CredibilityRating",
      ]) || "";

    const { bucket, x } = mbfcBiasToBucketX(bias);
    const baselineY = mbfcFactualToBaselineY(factual, credibility);

    out.push({
      domain,
      label,
      bucket,
      x,
      baselineY,

      // keep raw labels for debugging
      mbfc_bias: bias,
      mbfc_factual: factual,
      mbfc_credibility: credibility,
    });
  }

  // Overwrite IndexedDB
  if (out.length === 0) {
    throw new Error(
      "MBFC import produced 0 usable domains (field mismatch). DB was NOT overwritten."
    );
  }
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("sourceRatings", "readwrite");
    const store = tx.objectStore("sourceRatings");
    
    store.clear();
    out.forEach((row) => store.put(row));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  await updateDbStatus("MBFC import complete");
  statusEl &&
    (statusEl.textContent = `Imported ${out.length} domains from MBFC.`);
  return out.length;
}


//

function hashToJitter(str, range = 1) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000; // 0..1
  return (r - 0.5) * 2 * range; // -range..range
}

// jitter helpers

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

// prevents things from being drawn outside of the graph
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clusterColor(clusterId) {
  const palette = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];
  if (clusterId == null) return "rgba(0,0,0,0.10)";
  return palette[Math.abs(clusterId) % palette.length];
}

function secondaryJitter(str, range = 1) {
  const n = (str || "").length;
  return ((n % 7) - 3) * (range / 3); // roughly -range..+range
}


// Map bucket x (-2..2) to an Ad-Fontes-like scale (-42..42)
function bucketToBiasX(bucketX) {
  const n = Number(bucketX);

  // If it's a real number (including fractional), map linearly:
  // -2..2 -> -30..30 
  if (Number.isFinite(n)) {
    return clamp(n, -2, 2) * 15;
  }

  // Fallback for string labels if any slip through
  const map = {
    "-2": -30,
    "-1": -15,
    0: 0,
    1: 15,
    2: 30,
  };
  return map[String(bucketX)] ?? 0;
}

function drawChart(canvas, points, userPoint, clusterInfo = null, outboundTop = [], seedsByDomain = null) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;

  // Ad Fontes-like x range (what I based my graph design on)
  const xMin = -42,
    xMax = 42;
  // Keep y scale 0–64
  const yMin = 0,
    yMax = 64;

  // Padding: extra top room for top labels
  const leftPad = 85,
    rightPad = 20,
    topPad = 55,
    bottomPad = 40;
  const plotW = W - leftPad - rightPad;
  const plotH = H - topPad - bottomPad;

  // drawing the chart 
  const px = (x) => leftPad + ((x - xMin) / (xMax - xMin)) * plotW;
  // const py = (y) => topPad + (1 - (y - yMin) / (yMax - yMin)) * plotH;
  const py = (y) => {
    // normalize to 0..1
    const t = clamp((y - yMin) / (yMax - yMin), 0, 1);

    // gamma curve > 1 stretches mid/lower differences visually
    // try 1.6–2.2
    const GAMMA = 1.8;
    const curved = Math.pow(t, 1 / GAMMA);

    return topPad + (1 - curved) * plotH;
  };

  // Background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // Grid lines (Y) + y labels
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.font = "12px Arial";
  ctx.fillStyle = "#333";

  for (let y = 0; y <= 64; y += 8) {
    const yy = py(y);
    ctx.beginPath();
    ctx.moveTo(leftPad, yy);
    ctx.lineTo(W - rightPad, yy);
    ctx.stroke();
    ctx.fillText(String(y), 10, yy + 4);
  }

  //  Axes
  ctx.strokeStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(leftPad, topPad);
  ctx.lineTo(leftPad, H - bottomPad);
  ctx.lineTo(W - rightPad, H - bottomPad);
  ctx.stroke();

  // Vertical dividers at category boundaries
  // Using bias x positions: -30, -15, 0, 15, 30
  // boundaries halfway: -22.5, -7.5, 7.5, 22.5
  const dividers = [-22.5, -7.5, 7.5, 22.5];
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  dividers.forEach((d) => {
    const xx = px(d);
    ctx.beginPath();
    ctx.moveTo(xx, topPad);
    ctx.lineTo(xx, H - bottomPad);
    ctx.stroke();
  });

  // Top labels: Political Leaning + category labels
  ctx.fillStyle = "#111";
  ctx.font = "13px Arial";
  ctx.fillText("Political Leaning", leftPad + plotW / 2 - 55, 12);

  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";
  const topLabels = [
    { x: -30, t: "Left" },
    { x: -15, t: "Lean Left" },
    { x: 0, t: "Center" },
    { x: 15, t: "Lean Right" },
    { x: 30, t: "Right" },
  ];
  topLabels.forEach((l) => ctx.fillText(l.t, px(l.x) - 22, 38));

  // X numeric ticks
  ctx.fillStyle = "#666";
  ctx.font = "11px Arial";
  [-42, -30, -15, 0, 15, 30, 42].forEach((v) => {
    ctx.fillText(String(v), px(v) - 8, H - 12);
  });

  // Y axis label
  ctx.save();
  ctx.translate(25, topPad + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";
  ctx.fillText("Reliability / News Value", -50, 50);
  ctx.restore();
 
  // Anchors - data points on the graph
  // replaced with colored clusters
  // ctx.fillStyle = "rgba(0,0,0,0.20)";

  // limit data points for better graph resolution
  const MAX_ANCHORS = 3000; // tune: 1500–4000
  const keepRate = Math.min(1, MAX_ANCHORS / Math.max(1, points.length));

  points.forEach((p) => {
    // deterministic sampling so it doesn't change every refresh
    if (p.domain && hash01(p.domain) > keepRate) return;

    const baseY = typeof p.baselineY === "number" ? p.baselineY : 40;

    // Map bucket x to continuous bias scale
    const xBase = bucketToBiasX(p.x);

    // stable jitter for better spread/shape
    const jitterX = p.domain
      ? hashToJitter(p.domain, 8.0) + secondaryJitter(p.domain, 4.0)
      : 0;
    const jitterY = p.domain
      ? hashToJitter(p.domain, 3.5) + secondaryJitter(p.domain, 2.5)
      : 0;

    const x = clamp(xBase + jitterX, xMin, xMax);
    const y = clamp(baseY + jitterY, yMin, yMax);
    const cid = clusterInfo?.clusterIds?.get(p.domain);
    ctx.fillStyle = cid == null ? "rgba(0,0,0,0.10)" : clusterColor(cid);
    ctx.beginPath();
    ctx.arc(px(x), py(y), 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // ----- User point -----
  if (userPoint) {
    const r = 6;

    const uxBase = bucketToBiasX(userPoint.x);
    const ux = clamp(px(uxBase), leftPad + r, W - rightPad - r);
    const uy = clamp(py(userPoint.y), topPad + r, H - bottomPad - r);

    // Draw “connections” from You -> top outbound domains (only if we have the list)
    if (Array.isArray(outboundTop) && outboundTop.length) {
      // Build quick lookup for anchor positions by domain (use SAME mapping as anchors)
      const anchorPos = new Map();
      for (const p of points) {
        if (!p.domain) continue;

        const xBase = bucketToBiasX(p.x);
        const baseY = typeof p.baselineY === "number" ? p.baselineY : 32;

        // IMPORTANT: include the same jitter used for anchors so lines land on dots
        const jitterX = p.domain
          ? hashToJitter(p.domain, 8.0) + secondaryJitter(p.domain, 4.0)
          : 0;
        const jitterY = p.domain
          ? hashToJitter(p.domain, 3.5) + secondaryJitter(p.domain, 2.5)
          : 0;

        const ax = clamp(xBase + jitterX, xMin, xMax);
        const ay = clamp(baseY + jitterY, yMin, yMax);

        anchorPos.set(p.domain, { x: px(ax), y: py(ay) });
      }

      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;

      for (const d of outboundTop) {
        const pos = anchorPos.get(d);
        if (!pos) continue;
        ctx.beginPath();
        ctx.moveTo(ux, uy);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }

    // Draw the “You” dot last so it sits on top
    ctx.fillStyle = "#ff0066";
    ctx.beginPath();
    ctx.arc(ux, uy, r, 0, Math.PI * 2);
    ctx.fill();

    // outline for contrast
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#111";
    ctx.font = "12px Arial";
    ctx.fillText(
      "You",
      clamp(ux + 10, leftPad + 4, W - rightPad - 40),
      clamp(uy + 4, topPad + 12, H - bottomPad - 6),
    );
  }
}

async function loadSettingsIntoDashboard() {
  const defaults = { useApis: true, showRefs: true, maxRefs: 10 };
  const saved = await chrome.storage.sync.get(defaults);

  document.getElementById("setUseApis").checked = !!saved.useApis;
  document.getElementById("setShowRefs").checked = !!saved.showRefs;
  document.getElementById("setMaxRefs").value = String(saved.maxRefs ?? 10);
}

function hookSettingsSave() {
  const useApis = document.getElementById("setUseApis");
  const showRefs = document.getElementById("setShowRefs");
  const maxRefs = document.getElementById("setMaxRefs");

  const save = () =>
    chrome.storage.sync.set({
      useApis: useApis.checked,
      showRefs: showRefs.checked,
      maxRefs: Number(maxRefs.value || 10),
    });

  useApis.addEventListener("change", save);
  showRefs.addEventListener("change", save);
  maxRefs.addEventListener("change", save);
}

// button logic for reseeding
document.getElementById("btnReseedDb")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnReseedDb");
  try {
    btn.disabled = true;
    await updateDbStatus("Reseeding…");
    const inserted = await forceReseedDb();
    await updateDbStatus(`Reseed complete. Loaded ${inserted} rows`);
    await loadLastResults(); // redraw chart anchors immediately
  } catch (e) {
    await updateDbStatus(`Reseed failed: ${String(e)}`);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("btnClearDb")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnClearDb");
  try {
    btn.disabled = true;
    await clearDbOnly();
    await updateDbStatus("DB cleared");
    await loadLastResults();
  } catch (e) {
    await updateDbStatus(`Clear failed: ${String(e)}`);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("btnFetchMbfc")?.addEventListener("click", async () => {
  const keyInput = document.getElementById("mbfcApiKey");
  const statusEl = document.getElementById("mbfcStatus");
  const btn = document.getElementById("btnFetchMbfc");

  const apiKey = (keyInput?.value || "").trim();
  if (!apiKey) {
    statusEl && (statusEl.textContent = "Paste your RapidAPI key first.");
    return;
  }

  try {
    btn.disabled = true;
    statusEl && (statusEl.textContent = "Importing MBFC data…");
    await chrome.storage.local.set({ mbfcApiKey: apiKey });
    const n = await seedFromMbfc(apiKey);
    statusEl && (statusEl.textContent = `Imported ${n} MBFC domains.`);
    await loadLastResults();
  } catch (e) {
    statusEl && (statusEl.textContent = `MBFC import failed: ${String(e)}`);
  } finally {
    btn.disabled = false;
  }
});
// Show DB count on load
updateDbStatus();

// helper function that allows userpoint to be associated with a bucket. if political or not, it will be sorted as it is displayed
function bucketFromX(x) {
  if (!Number.isFinite(x)) return "unknown";
  if (x <= -1.5) return "left";
  if (x <= -0.5) return "lean_left";
  if (x < 0.5) return "center";
  if (x < 1.5) return "lean_right";
  return "right";
}

function prettyBucket(b) {
  const map = {
    left: "Left",
    lean_left: "Lean Left",
    center: "Center",
    lean_right: "Lean Right",
    right: "Right",
    unknown: "Unknown",
  };
  return map[b] || "Unknown";
}

async function loadLastResults() {
  //dashboard testing
  // console.log("[Dashboard] loading lastAnalysis…");
  // 1) Always load/draw seeded anchors
  const canvas = document.getElementById("biasChart");
  if (!canvas) return;
  const seeds = await getAllSeedPoints();
  const seedsByDomain = {};
  for (const s of seeds) seedsByDomain[s.domain] = s;

  const clusterInfo = await computeClustersFromLog(seedsByDomain);

  // Draw anchors first (no user dot yet)
  drawChart(canvas, seeds, null, clusterInfo);

  // 2) Read lastAnalysis
  // Previously had save issue, this merges both versions for full data
  const saved = await chrome.storage.local.get({
    lastAnalysis: null,
    lastPopupAnalysis: null,
  });

  const base = saved.lastAnalysis || {};
  const popup = saved.lastPopupAnalysis || {};

  // Merge so existing UI continues to work
  const data = { ...popup, ...base };

  const outboundLinks = data.outboundLinks || data.refs || [];
  const outboundDomains = outboundLinks
    .map((u) => {
      try {
        return resolveSeedDomain(new URL(u).hostname, seedsByDomain);
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  const outboundTop = outboundDomains.slice(0, 10);

  // ensure url is present
  data.url = data.url || popup.url || base.url || "";
  // please work
  //console.log("[Dashboard] lastAnalysis:", data);
  // console.log("[Dashboard] lastAnalysis snapshot:", {
  //   url: data?.url,
  //   domain: data?.domain,
  //   bucket: data?.bucket,
  //   x: data?.x,
  //   y: data?.y,
  // });

  // If no analysis yet, still show how many anchors we have

  if (!data.url) {
    document.getElementById("chartSummary").textContent =
      `Loaded ${seeds.length} seeded domains. Run Analyze Page to place your article.`;
    return;
  }
  // if (!data) {
  //   document.getElementById("chartSummary").textContent =
  //     `Loaded ${seeds.length} seeded domains. Run Analyze Page to place your article.`;
  //   return;
  // }

  // 3) Populate the existing dashboard fields
  document.getElementById("dashScore").textContent = String(data.score ?? "--");
  document.getElementById("dashUrl").textContent = data.url || "Unknown URL";
  document.getElementById("dashAdvisory").textContent =
    data.advisory || "Neutral";

  const sig = document.getElementById("dashSignals");
  sig.innerHTML = "";
  (data.signals || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    sig.appendChild(li);
  });

  const bd = document.getElementById("dashBreakdown");
  bd.innerHTML = "";
  (data.breakdown || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    bd.appendChild(li);
  });

  const refs = document.getElementById("dashRefs");
  refs.innerHTML = "";
  (data.refs || []).forEach((href) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = href;
    li.appendChild(a);
    refs.appendChild(li);
  });

  // 4) Draw user point (force numeric in case x/y were stored as strings)

  const xBucket = Number(data.x);
  const xArticle = Number(data.articleX);
  const normalizedCurrentDomain = data.domain
    ? resolveSeedDomain(data.domain, seedsByDomain) ||
      collapseDomain(data.domain)
    : "";

  const dbSeed = normalizedCurrentDomain
    ? seedsByDomain[normalizedCurrentDomain]
    : null;
  const dbX = Number(dbSeed?.x);
  const dbY = Number(dbSeed?.baselineY);

  const x = Number.isFinite(xArticle)
    ? xArticle
    : Number.isFinite(xBucket)
      ? xBucket
      : Number.isFinite(dbX)
        ? dbX
        : 0;

  let y = Number(data.y);

  // fallback y if missing (so “You” still shows)
  if (!Number.isFinite(y) && Number.isFinite(dbY)) y = dbY;
  if (!Number.isFinite(y)) y = 32;
  // if (!Number.isFinite(x)) x = 0;

  const userPoint = { x, y };
  // const userPoint = Number.isFinite(x) ? { x, y } : { x: 0, y };
  //const userPoint = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;

  const derivedBucket = bucketFromX(x);

  // if domain baseline exists, use it; otherwise use derived bucket from userPoint
  const bucketLabel =
    data.bucket && data.bucket !== "unknown"
      ? prettyBucket(data.bucket)
      : prettyBucket(derivedBucket);

  drawChart(canvas, seeds, userPoint, clusterInfo, outboundTop, seedsByDomain);

  // Political category = bucket
  // Anchor = datapoints
  // Political Category: ${data.bucket || "unknown"}
 
  document.getElementById("chartSummary").textContent =
    `Current domain: ${data.domain || "unknown"} | Political Category: ${bucketLabel} | X-axis: ${x} | Y-axis: ${y} | Baseline data points: ${seeds.length} | Clusters: ${clusterInfo.clusterCount} | Rated outbound: ${outboundTop.length}`;

  const whyList = document.getElementById("whyList");
  whyList.innerHTML = "";
  (data.why || []).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    whyList.appendChild(li);
  });
}



document.querySelectorAll(".sideItem").forEach((btn) => {
  btn.addEventListener("click", () => showRoute(btn.dataset.route));
});

// route from URL hash (#settings)
const hash = (location.hash || "").replace("#", "");
showRoute(hash === "settings" ? "settings" : "dashboard");

loadSettingsIntoDashboard();
hookSettingsSave();


  //make sure dashboard reloads with every new search
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.lastAnalysis || changes.lastPopupAnalysis) {
    loadLastResults();
  }
});

(async () => {
  await seedIfEmpty();
  (async () => {
    const saved = await chrome.storage.local.get({ mbfcApiKey: "" });
    const keyInput = document.getElementById("mbfcApiKey");
    if (keyInput && saved.mbfcApiKey) keyInput.value = saved.mbfcApiKey;
  })();
  await loadLastResults();
})();