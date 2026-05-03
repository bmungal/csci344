function showRoute(route) {
  const dash = document.getElementById("route-dashboard");
  const set = document.getElementById("route-settings");

  dash.classList.toggle("hidden", route !== "dashboard");
  set.classList.toggle("hidden", route !== "settings");

  document.querySelectorAll(".sideItem[data-route]").forEach((btn) => {
    btn.classList.toggle("sideActive", btn.dataset.route === route);
  });
}

/* ---------- Layout helpers ---------- */
 
const DEFAULT_CARD_ORDER = [
  "overall",
  "signals",
  "breakdown",
  "chart",
];
const DEFAULT_CARD_VISIBILITY = {
  overall: true,
  signals: true,
  breakdown: true,
  chart: true,
};

function getDashboardCards() {
  return Array.from(document.querySelectorAll(".dashboardCard"));
}

function applyCardOrder(order) {
  const grid = document.getElementById("dashboardGrid");
  if (!grid) return;

  const cardMap = new Map(
    getDashboardCards().map((card) => [card.dataset.cardId, card]),
  );

  order.forEach((id) => {
    const card = cardMap.get(id);
    if (card) grid.appendChild(card);
  });
}

function getCurrentCardOrder() {
  return getDashboardCards().map((card) => card.dataset.cardId);
}

function applyCardVisibility(visibility) {
  getDashboardCards().forEach((card) => {
    const id = card.dataset.cardId;
    const visible = visibility[id] !== false;
    card.classList.toggle("cardHidden", !visible);
  });

  document.querySelectorAll("[data-toggle-card]").forEach((input) => {
    const id = input.dataset.toggleCard;
    input.checked = visibility[id] !== false;
  });
}

function getCardVisibilityState() {
  const visibility = {};
  document.querySelectorAll("[data-toggle-card]").forEach((input) => {
    visibility[input.dataset.toggleCard] = input.checked;
  });
  return visibility;
}

async function saveDashboardLayout(slotName) {
  const order = getCurrentCardOrder();
  const visibility = getCardVisibilityState();

  await chrome.storage.local.set({
    [slotName]: { order, visibility },
  });

  const status = document.getElementById("layoutStatus");
  if (status) status.textContent = `Saved current dashboard to ${slotName}.`;
}

async function loadDashboardLayout(slotName) {
  const saved = await chrome.storage.local.get({
    [slotName]: null,
  });

  const layout = saved[slotName];
  if (!layout) {
    const status = document.getElementById("layoutStatus");
    if (status) status.textContent = `No saved layout found in ${slotName}.`;
    return;
  }

  applyCardOrder(layout.order || DEFAULT_CARD_ORDER);
  applyCardVisibility(layout.visibility || DEFAULT_CARD_VISIBILITY);

  const status = document.getElementById("layoutStatus");
  if (status) status.textContent = `Loaded dashboard layout from ${slotName}.`;
}

async function resetDashboardLayout() {
  applyCardOrder(DEFAULT_CARD_ORDER);
  applyCardVisibility(DEFAULT_CARD_VISIBILITY);

  const status = document.getElementById("layoutStatus");
  if (status) status.textContent = "Dashboard reset to default layout.";
}

function setupDragAndDrop() {
  const cards = getDashboardCards();
  const grid = document.getElementById("dashboardGrid");
  if (!grid) return;

  let dragged = null;

  cards.forEach((card) => {
    card.addEventListener("dragstart", () => {
      dragged = card;
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      dragged = null;
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragged || dragged === card) return;

      const rect = card.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      const parent = card.parentNode;

      if (before) {
        parent.insertBefore(dragged, card);
      } else {
        parent.insertBefore(dragged, card.nextSibling);
      }
    });
  });
}

async function loadUiPreferences() {
  const saved = await chrome.storage.local.get({
    dashboardLayout1: null,
    dashboardLayout2: null,
    dashboardTheme: "light",
    dashboardCardVisibility: DEFAULT_CARD_VISIBILITY,
  });

  applyCardVisibility(saved.dashboardCardVisibility || DEFAULT_CARD_VISIBILITY);

  document.body.classList.toggle("darkMode", saved.dashboardTheme === "dark");

  const darkToggle = document.getElementById("setDarkMode");
  if (darkToggle) darkToggle.checked = saved.dashboardTheme === "dark";
}

function hookLayoutControls() {
  document
    .getElementById("btnSaveLayout1")
    ?.addEventListener("click", async () => {
      await chrome.storage.local.set({
        dashboardCardVisibility: getCardVisibilityState(),
      });
      await saveDashboardLayout("dashboardLayout1");
    });

  document
    .getElementById("btnLoadLayout1")
    ?.addEventListener("click", async () => {
      await loadDashboardLayout("dashboardLayout1");
    });

  document
    .getElementById("btnSaveLayout2")
    ?.addEventListener("click", async () => {
      await chrome.storage.local.set({
        dashboardCardVisibility: getCardVisibilityState(),
      });
      await saveDashboardLayout("dashboardLayout2");
    });

  document
    .getElementById("btnLoadLayout2")
    ?.addEventListener("click", async () => {
      await loadDashboardLayout("dashboardLayout2");
    });

  document
    .getElementById("btnResetLayout")
    ?.addEventListener("click", async () => {
      await resetDashboardLayout();
    });

  document.querySelectorAll("[data-toggle-card]").forEach((input) => {
    input.addEventListener("change", async () => {
      const visibility = getCardVisibilityState();
      applyCardVisibility(visibility);
      await chrome.storage.local.set({ dashboardCardVisibility: visibility });
    });
  });

  document
    .getElementById("setDarkMode")
    ?.addEventListener("change", async (e) => {
      const isDark = e.target.checked;
      document.body.classList.toggle("darkMode", isDark);
      await chrome.storage.local.set({
        dashboardTheme: isDark ? "dark" : "light",
      });
    });
}

// explanation of results to user

function simplifyWhyLine(line) {
  if (line.startsWith("Source prior fallback")) {
    return "Starting position used a known outlet fallback because the source database match was weak.";
  }

  if (line.startsWith("Source prior")) {
    return line.replace(
      /Source prior:?/i,
      "Starting position from source database:",
    );
  }

  if (line.startsWith("Weighted neighborhood")) {
    return line
      .replace(/Weighted neighborhood:?/i, "Linked-source pattern:")
      .replace(/avgX=/i, "average placement=")
      .replace(/rated=/i, "rated sources=");
  }

  if (line.startsWith("Filtered neighborhood links")) {
    return "Some links were ignored because they were same-site, same-family, social, login, support, or other non-editorial links.";
  }

  if (line.startsWith("Neighborhood agreement")) {
    return line.replace(
      /Neighborhood agreement:?/i,
      "How well the linked sources agree:",
    );
  }

  if (line.startsWith("Article shift")) {
    return line
      .replace(/Article shift:?/i, "Article wording shift:")
      .replace(/semantic=/i, "topic cues=")
      .replace(/framing=/i, "story angle=")
      .replace(/language=/i, "tone and wording=");
  }

  if (line.startsWith("X model")) {
    return "Final political placement was calculated from the source starting point, linked-source pattern, and article wording.";
  }

  if (line.startsWith("Y baseline")) {
     return "Reliability score starts with the source's database baseline, then adjusts using sourcing quality (linked sources, known/rated sources, and source diversity) and article-level reporting signals such as author, date, publisher, opinion labels, references, DOI, and wording/framing cues.";
  }

  return line;
}
 

/* ---------- DB / seed logic ---------- */

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
  const DEFAULT_Y = 40;

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

async function forceReseedDb() {
  const seedUrl =
    chrome.runtime.getURL("seed_sources.json") + `?t=${Date.now()}`;
  let rows = await (await fetch(seedUrl, { cache: "no-store" })).json();

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
  const f = String(factualLabel).toLowerCase();
  let y;

  if (f.includes("very high")) y = 56;
  else if (f.includes("high")) y = 48;
  else if (f.includes("mostly factual")) y = 40;
  else if (f.includes("mixed")) y = 32;
  else if (f.includes("low")) y = 20;
  else if (f.includes("very low")) y = 12;
  else y = 32;

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

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.sources)) return payload.sources;
  if (Array.isArray(payload.ratings)) return payload.ratings;

  if (payload.data && Array.isArray(payload.data.data))
    return payload.data.data;
  if (payload.data && Array.isArray(payload.data.sources))
    return payload.data.sources;
  if (payload.data && Array.isArray(payload.data.ratings))
    return payload.data.ratings;

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

  if (!rows.length) {
    throw new Error(
      "MBFC returned no rows (parser mismatch). DB was NOT overwritten.",
    );
  }

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
      "Link",
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
      mbfc_bias: bias,
      mbfc_factual: factual,
      mbfc_credibility: credibility,
    });
  }

  if (out.length === 0) {
    throw new Error(
      "MBFC import produced 0 usable domains (field mismatch). DB was NOT overwritten.",
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

/* ---------- Chart helpers ---------- */

function hashToJitter(str, range = 1) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000;
  return (r - 0.5) * 2 * range;
}

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

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
  return ((n % 7) - 3) * (range / 3);
}

function bucketToBiasX(bucketX) {
  const n = Number(bucketX);

  if (Number.isFinite(n)) {
    return clamp(n, -2, 2) * 15;
  }

  const map = {
    "-2": -30,
    "-1": -15,
    0: 0,
    1: 15,
    2: 30,
  };
  return map[String(bucketX)] ?? 0;
}

function drawChart(
  canvas,
  points,
  userPoint,
  clusterInfo = null,
  outboundTop = [],
  seedsByDomain = null,
) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;

  const xMin = -42,
    xMax = 42;
  const yMin = 0,
    yMax = 64;

  const leftPad = 85,
    rightPad = 20,
    topPad = 55,
    bottomPad = 40;
  const plotW = W - leftPad - rightPad;
  const plotH = H - topPad - bottomPad;

  const px = (x) => leftPad + ((x - xMin) / (xMax - xMin)) * plotW;
  const py = (y) => {
    const t = clamp((y - yMin) / (yMax - yMin), 0, 1);
    const GAMMA = 1.8;
    const curved = Math.pow(t, 1 / GAMMA);
    return topPad + (1 - curved) * plotH;
  };

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

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

  ctx.strokeStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(leftPad, topPad);
  ctx.lineTo(leftPad, H - bottomPad);
  ctx.lineTo(W - rightPad, H - bottomPad);
  ctx.stroke();

  const dividers = [-22.5, -7.5, 7.5, 22.5];
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  dividers.forEach((d) => {
    const xx = px(d);
    ctx.beginPath();
    ctx.moveTo(xx, topPad);
    ctx.lineTo(xx, H - bottomPad);
    ctx.stroke();
  });

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

  ctx.fillStyle = "#666";
  ctx.font = "11px Arial";
  [-42, -30, -15, 0, 15, 30, 42].forEach((v) => {
    ctx.fillText(String(v), px(v) - 8, H - 12);
  });

  ctx.save();
  ctx.translate(25, topPad + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";
  ctx.fillText("Reliability / News Value", -50, 50);
  ctx.restore();

  const MAX_ANCHORS = 3000;
  const keepRate = Math.min(1, MAX_ANCHORS / Math.max(1, points.length));

  points.forEach((p) => {
    if (p.domain && hash01(p.domain) > keepRate) return;

    const baseY = typeof p.baselineY === "number" ? p.baselineY : 40;
    const xBase = bucketToBiasX(p.x);

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

  if (userPoint) {
    const r = 6;

    const uxBase = bucketToBiasX(userPoint.x);
    const ux = clamp(px(uxBase), leftPad + r, W - rightPad - r);
    const uy = clamp(py(userPoint.y), topPad + r, H - bottomPad - r);

    if (Array.isArray(outboundTop) && outboundTop.length) {
      const anchorPos = new Map();
      for (const p of points) {
        if (!p.domain) continue;

        const xBase = bucketToBiasX(p.x);
        const baseY = typeof p.baselineY === "number" ? p.baselineY : 32;

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

    ctx.fillStyle = "#ff0066";
    ctx.beginPath();
    ctx.arc(ux, uy, r, 0, Math.PI * 2);
    ctx.fill();

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

/* ---------- Settings ---------- */

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

document.getElementById("btnReseedDb")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnReseedDb");
  try {
    btn.disabled = true;
    await updateDbStatus("Reseeding…");
    const inserted = await forceReseedDb();
    await updateDbStatus(`Reseed complete. Loaded ${inserted} rows`);
    await loadLastResults();
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

updateDbStatus();

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

function extractWhyLine(prefixes, why = []) {
  return (
    why.find((line) => prefixes.some((prefix) => line.startsWith(prefix))) || ""
  );
}
function formatSigned(value, digits = 2) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}

function explainPlacementDriver(xModel = {}) {
  const parts = [
    {
      key: "sourcePriorX",
      label: "Database starting point",
      value: Math.abs(Number(xModel.sourcePriorX || 0)),
    },
    {
      key: "neighborhoodShift",
      label: "Linked-source pull",
      value: Math.abs(Number(xModel.neighborhoodShift || 0)),
    },
    {
      key: "articleShiftTotal",
      label: "Article wording shift",
      value: Math.abs(Number(xModel.articleShiftTotal || 0)),
    },
    {
      key: "neighborhoodAgreementShift",
      label: "Agreement adjustment",
      value: Math.abs(Number(xModel.neighborhoodAgreementShift || 0)),
    },
    {
      key: "outletPriorAdjustment",
      label: "Tie-break adjustment",
      value: Math.abs(Number(xModel.outletPriorAdjustment || 0)),
    },
  ].sort((a, b) => b.value - a.value);

  return parts[0]?.value > 0 ? parts[0].label : "No strong placement driver";
}


function summarizeWhyForDashboard(data) {
  const why = Array.isArray(data.why) ? data.why : [];
  const used =
    data.linkReview?.used || data.weightedNeighborhood?.usedDetails || [];
  const ignored =
    data.linkReview?.ignored || data.weightedNeighborhood?.ignoredDetails || [];

  const xModel = data.xModel || {};
  const sourceStart = Number(
    xModel.sourcePriorX ?? (typeof data.x === "number" ? data.x : 0),
  );
  const sourceStartLabel = formatPlacementLabel(bucketFromX(sourceStart));

  const neighborhoodX = Number(
    xModel.neighborhoodX ?? data.weightedNeighborhood?.avgX ?? 0,
  );
  const pullLabel = formatPlacementLabel(bucketFromX(neighborhoodX));

  const finalX = Number(
    xModel.finalArticleX ?? data.articleX ?? data.x ?? 0,
  );
  const finalLabel = formatPlacementLabel(bucketFromX(finalX));

  const semanticShift = Number(
    xModel.semanticShift ?? data.articleShift?.semanticShift ?? 0,
  );
  const framingShift = Number(
    xModel.framingShift ?? data.articleShift?.framingShift ?? 0,
  );
  const languageShift = Number(
    xModel.languageShift ?? data.articleShift?.languageShift ?? 0,
  );

  const reliabilityLine =
    extractWhyLine(["Y baseline", "Reliability calculation"], why) || "";

  return {
    start: `Database starting point: ${sourceStartLabel} (${sourceStart.toFixed(2)}).`,

    neighborhood: used.length
      ? `${used.length} linked sources contributed. Their combined pull was ${pullLabel} (${neighborhoodX.toFixed(2)}).`
      : "No rated linked-source pattern was available.",

    articleShift: `Topic cues=${formatSigned(semanticShift)}, story angle=${formatSigned(framingShift)}, tone and wording=${formatSigned(languageShift)}.`,

    reliability: reliabilityLine
      ? simplifyWhyLine(reliabilityLine)
      : "Reliability score starts with the source's database baseline, then adjusts using sourcing quality and article-level reporting signals.",

    filtered: ignored.length
      ? `${ignored.length} links were ignored because they were same-site, same-family, social, login, support, or other non-editorial links.`
      : "No links were filtered out.",

    driver: `Main placement driver: ${explainPlacementDriver(xModel)}.`,
    final: `Final placement: ${finalLabel} (${finalX.toFixed(2)}).`,
  };
}

function renderWhySummary(data) {
  const whySummary = document.getElementById("whySummary");
  if (!whySummary) return;

  const summary = summarizeWhyForDashboard(data);

  whySummary.innerHTML = `
    <div class="summaryRow">
      <span class="summaryLabel">Database starting point</span>
      <span class="summaryValue">${summary.start}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Linked-source pull</span>
      <span class="summaryValue">${summary.neighborhood}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Article wording shift</span>
      <span class="summaryValue">${summary.articleShift}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Main placement driver</span>
      <span class="summaryValue">${summary.driver}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Final placement</span>
      <span class="summaryValue">${summary.final}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Reliability explanation</span>
      <span class="summaryValue">${summary.reliability}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Ignored links</span>
      <span class="summaryValue">${summary.filtered}</span>
    </div>
  `;
}

function summarizeReliabilityModel(data) {
  const yModel = data.yModel || {};
  const reasons = Array.isArray(yModel.reliabilityReasons)
    ? yModel.reliabilityReasons
    : [];

  const positive = reasons.filter((line) => String(line).startsWith("+"));
  const negative = reasons.filter((line) => String(line).startsWith("-"));

  return {
    baseline:
      typeof yModel.sourceBaselineY === "number"
        ? `${Math.round(yModel.sourceBaselineY)} / 64`
        : "Not available",
    articleScore:
      typeof yModel.articleReliabilityScore === "number"
        ? `${Math.round(yModel.articleReliabilityScore)} / 64`
        : "Not available",
    blend: yModel.usedSourceBaselineBlend || "60/40",
    finalY:
      typeof yModel.finalY === "number"
        ? `${Math.round(yModel.finalY)} / 64`
        : typeof data.y === "number"
          ? `${Math.round(data.y)} / 64`
          : "Not available",
    overall:
      typeof yModel.overallScore100 === "number"
        ? `${Math.round(yModel.overallScore100)} / 100`
        : typeof data.score === "number"
          ? `${Math.round(data.score)} / 100`
          : "Not available",
    positive,
    negative,
  };
}

function renderReliabilitySummary(data) {
  const el = document.getElementById("dashBreakdown");
  if (!el) return;

  const ySummary = summarizeReliabilityModel(data);
  const placement = formatPlacementLabel(data.bucket);
  const placementValue =
    typeof data.articleX === "number"
      ? data.articleX.toFixed(2)
      : typeof data.x === "number"
        ? data.x.toFixed(2)
        : "Not available";

  const positiveReasons = ySummary.positive.length
    ? ySummary.positive.slice(0, 4)
    : ["No strong positive reliability signals were recorded."];

  const negativeReasons = ySummary.negative.length
    ? ySummary.negative.slice(0, 4)
    : ["No strong reliability penalties were recorded."];

  el.innerHTML = `
    <li><strong>Overall score:</strong> ${ySummary.overall}</li>
    <li><strong>Political placement:</strong> ${placement}</li>
    <li><strong>Placement value:</strong> ${placementValue}</li>
    <li><strong>Source reliability baseline:</strong> ${ySummary.baseline}</li>
    <li><strong>Article evidence score:</strong> ${ySummary.articleScore}</li>
    <li><strong>Blend used:</strong> ${ySummary.blend} (source baseline / article evidence)</li>
    <li><strong>Final reliability score:</strong> ${ySummary.finalY}</li>
    <li><strong>Main positive y-signals:</strong> ${positiveReasons.join("; ")}</li>
    <li><strong>Main negative y-signals:</strong> ${negativeReasons.join("; ")}</li>
  `;
}

function formatArticleDate(value) {
  if (!value) return "Not found";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function yesNoUnknown(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

function renderArticleDetails(data) {
  const sig = document.getElementById("dashSignals");
  if (!sig) return;

  const title = data.title || data.articleTitle || "Not found";

  const source = data.domain || "Unknown";

  const author = data.author || "Not found";

  const publishDate = formatArticleDate(
    data.date || data.publishDate || data.publishedAt,
  );

  const publisher = data.publisher || "Not found";

  const pageType = data.pageType || "General article";

  const secureConnection = data.url
    ? yesNoUnknown(String(data.url).startsWith("https://"))
    : "Unknown";

  const doi = data.doi || "None found";

  const citationCount =
    typeof data.citationCount === "number"
      ? String(data.citationCount)
      : "Not available";

  sig.innerHTML = `
    <li><strong>Title:</strong> ${title}</li>
    <li><strong>Source:</strong> ${source}</li>
    <li><strong>Author:</strong> ${author}</li>
    <li><strong>Publish date:</strong> ${publishDate}</li>
    <li><strong>Publisher:</strong> ${publisher}</li>
    <li><strong>Page type:</strong> ${pageType}</li>
    <li><strong>Secure connection:</strong> ${secureConnection}</li>
    <li><strong>DOI:</strong> ${doi}</li>
    <li><strong>Citation count:</strong> ${citationCount}</li>
  `;
}

function formatPlacementLabel(bucket) {
  switch (String(bucket || "").toLowerCase()) {
    case "left":
      return "Left";
    case "lean_left":
      return "Lean Left";
    case "center":
      return "Center";
    case "lean_right":
      return "Lean Right";
    case "right":
      return "Right";
    default:
      return "Unknown";
  }
}

function formatConfidenceLabel(confidence) {
  const label = String(confidence?.label || "").toLowerCase();
  if (!label) return "Not available";
  if (label === "high") return "High";
  if (label === "medium") return "Medium";
  if (label === "low") return "Low";
  return label;
}

function renderScoreBreakdown(data) {
  // Keep this function name so the rest of the dashboard still works.
  // The content focuses on explaining the y-axis in plain language.
  renderReliabilitySummary(data);
}

function friendlyLinkType(type) {
  switch (String(type || "").toLowerCase()) {
    case "editorial_or_institutional":
      return "Editorial / institutional";
    case "low_value_reference":
      return "Low-value reference";
    case "non_editorial":
      return "Non-editorial";
    case "self_or_same_family":
      return "Same site / family";
    case "invalid":
      return "Invalid link";
    default:
      return type || "Unknown";
  }
}

function friendlyIgnoredReason(reason) {
  switch (String(reason || "").toLowerCase()) {
    case "self_or_same_family":
      return "Same site or same media family";
    case "non_editorial":
      return "Non-editorial link";
    case "invalid":
      return "Invalid link";
    default:
      return reason || "Ignored";
  }
}

function safeLinkFromDomain(domain) {
  const d = String(domain || "").trim();
  if (!d || d === "Unknown" || d === "[invalid]") return "";
  return `https://${d}`;
}

function renderDomainLink(domain) {
  const href = safeLinkFromDomain(domain);
  const label = domain || "Unknown";

  if (!href) return label;

  return `
    <a href="${href}" target="_blank" rel="noreferrer" title="${href}">
      ${label}
    </a>
  `;
}

function renderLinkedSources(data) {
  const usedEl = document.getElementById("dashRefsUsed");
  const ignoredEl = document.getElementById("dashRefsIgnored");
  if (!usedEl || !ignoredEl) return;

  // Only show sources here that actually influenced placement.
  const used = (
    data.linkReview?.used || data.weightedNeighborhood?.usedDetails || []
  ).filter((item) => item.contributed !== false);

  const ignored =
    data.linkReview?.ignored || data.weightedNeighborhood?.ignoredDetails || [];

  if (!used.length) {
    usedEl.innerHTML = `<div class="sourceEmpty">No linked sources contributed to placement for this page.</div>`;
  } else {
    usedEl.innerHTML = `
      <div class="sourceRow sourceHead">
        <div>Source</div>
        <div>Placement</div>
        <div>X value</div>
        <div>Weight</div>
        <div>Type / count</div>
      </div>
      ${used
        .map(
          (item) => `
            <div class="sourceRow">
              <div>${renderDomainLink(item.domain)}</div>
              <div>${formatPlacementLabel(item.bucket)}</div>
              <div>${Number(item.x || 0).toFixed(2)}</div>
              <div>${Number(item.weight || 0).toFixed(2)}</div>
              <div>${friendlyLinkType(item.type)}${item.occurrences > 1 ? ` (${item.occurrences}x)` : ""}</div>
            </div>
          `,
        )
        .join("")}
    `;
  }

  if (!ignored.length) {
    ignoredEl.innerHTML = `<div class="sourceEmpty">No ignored links were recorded for this page.</div>`;
  } else {
    ignoredEl.innerHTML = `
      <div class="sourceRow sourceHead" style="grid-template-columns: 1.5fr 1.5fr;">
        <div>Source</div>
        <div>Reason ignored</div>
      </div>
      ${ignored
        .map(
          (item) => `
            <div class="sourceRow" style="grid-template-columns: 1.5fr 1.5fr;">
              <div>${renderDomainLink(item.domain)}</div>
              <div>${friendlyIgnoredReason(item.reason)}${item.occurrences > 1 ? ` (${item.occurrences}x)` : ""}</div>
            </div>
          `,
        )
        .join("")}
    `;
  }
}

function hookSourceDetailsToggle() {
  const btn = document.getElementById("toggleSourceDetails");
  const panel = document.getElementById("sourceDetailsPanel");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const isHidden = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !isHidden);
    btn.textContent = isHidden ? "Hide source details" : "Show source details";
  });
}

/* ---------- Rendering Results ---------- */

async function loadLastResults() {
  const canvas = document.getElementById("biasChart");
  if (!canvas) return;

  const seeds = await getAllSeedPoints();
  const seedsByDomain = {};
  for (const s of seeds) seedsByDomain[s.domain] = s;

  const clusterInfo = await computeClustersFromLog(seedsByDomain);

  drawChart(canvas, seeds, null, clusterInfo);

  const saved = await chrome.storage.local.get({
    lastAnalysis: null,
    lastPopupAnalysis: null,
  });

  const base = saved.lastAnalysis || {};
  const popup = saved.lastPopupAnalysis || {};

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

  data.url = data.url || popup.url || base.url || "";

  if (!data.url) {
    document.getElementById("chartSummary").innerHTML = `
      <div class="summaryRow">
        <span class="summaryLabel">Current source</span>
        <span class="summaryValue">No page analyzed yet.</span>
      </div>
      <div class="summaryRow">
        <span class="summaryLabel">Political placement</span>
        <span class="summaryValue">Run Analyze Page to place this article.</span>
      </div>
      <div class="summaryRow">
        <span class="summaryLabel">Reliability score</span>
        <span class="summaryValue">--</span>
      </div>
      <div class="summaryRow">
        <span class="summaryLabel">Rated linked sources shown</span>
        <span class="summaryValue">0</span>
      </div>
      <div class="summaryRow">
        <span class="summaryLabel">Seeded comparison sources</span>
        <span class="summaryValue">${seeds.length}</span>
      </div>
`;
    return;
  }

  document.getElementById("dashScore").textContent = String(data.score ?? "--");
  document.getElementById("dashUrl").textContent = data.url || "Unknown URL";
  document.getElementById("dashAdvisory").textContent =
    data.advisory || "Neutral";

  renderArticleDetails(data);
  renderScoreBreakdown(data);
  renderLinkedSources(data);
  

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
  if (!Number.isFinite(y) && Number.isFinite(dbY)) y = dbY;
  if (!Number.isFinite(y)) y = 32;

  const userPoint = { x, y };
  const derivedBucket = bucketFromX(x);

  const bucketLabel =
    data.bucket && data.bucket !== "unknown"
      ? prettyBucket(data.bucket)
      : prettyBucket(derivedBucket);

  drawChart(canvas, seeds, userPoint, clusterInfo, outboundTop, seedsByDomain);

  document.getElementById("chartSummary").innerHTML = `
    <div class="summaryRow">
      <span class="summaryLabel">Current source</span>
      <span class="summaryValue">${data.domain || "Unknown"}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Political placement</span>
      <span class="summaryValue">${bucketLabel} (${x.toFixed(2)})</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Reliability score</span>
      <span class="summaryValue">${Math.round(y)} / 64</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Rated linked sources shown</span>
      <span class="summaryValue">${outboundTop.length}</span>
    </div>
    <div class="summaryRow">
      <span class="summaryLabel">Seeded comparison sources</span>
      <span class="summaryValue">${seeds.length}</span>
    </div>
`;
  
  renderWhySummary(data);
}

/* ---------- Startup ---------- */

document.querySelectorAll(".sideItem[data-route]").forEach((btn) => {
  btn.addEventListener("click", () => showRoute(btn.dataset.route));
});

const hash = (location.hash || "").replace("#", "");
showRoute(hash === "settings" ? "settings" : "dashboard");

loadSettingsIntoDashboard();
hookSettingsSave();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.lastAnalysis || changes.lastPopupAnalysis) {
    loadLastResults();
  }
});

(async () => {
  await seedIfEmpty();

  const saved = await chrome.storage.local.get({ mbfcApiKey: "" });
  const keyInput = document.getElementById("mbfcApiKey");
  if (keyInput && saved.mbfcApiKey) keyInput.value = saved.mbfcApiKey;

  await loadUiPreferences();
  setupDragAndDrop();
  hookLayoutControls();
  hookSourceDetailsToggle();
  await loadLastResults();
})();
