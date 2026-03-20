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
//

function hashToJitter(str, range = 1) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000; // 0..1
  return (r - 0.5) * 2 * range; // -range..range
}

// prevents things from being drawn outside of the graph
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}


function secondaryJitter(str, range = 1) {
  const n = (str || "").length;
  return ((n % 7) - 3) * (range / 3); // roughly -range..+range
}


// Map bucket x (-2..2) to an Ad-Fontes-like scale (-42..42)
function bucketToBiasX(bucketX) {
  const map = {
    "-2": -30, // Left
    "-1": -15, // Lean Left
    0: 0, // Center
    1: 15, // Lean Right
    2: 30, // Right
  };
  return map[String(bucketX)] ?? 0;
}

function drawChart(canvas, points, userPoint) {
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

  const px = (x) => leftPad + ((x - xMin) / (xMax - xMin)) * plotW;
  const py = (y) => topPad + (1 - (y - yMin) / (yMax - yMin)) * plotH;

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
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  points.forEach((p) => {
    const baseY = typeof p.baselineY === "number" ? p.baselineY : 40;

    // Map bucket x to continuous bias scale
    const xBase = bucketToBiasX(p.x);

    // stable jitter for better spread/ shape
    const jitterX = p.domain
      ? hashToJitter(p.domain, 8.0) + secondaryJitter(p.domain, 4.0)
      : 0;
    const jitterY = p.domain
      ? hashToJitter(p.domain, 3.0) + secondaryJitter(p.domain, 2.0)
      : 0;

    const x = clamp(xBase + jitterX, xMin, xMax);
    const y = clamp(baseY + jitterY, yMin, yMax);

    ctx.beginPath();
    ctx.arc(px(x), py(y), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // ----- User point -----
  if (userPoint) {
    const r = 6;

    const uxBase = bucketToBiasX(userPoint.x);
    const ux = clamp(px(uxBase), leftPad + r, W - rightPad - r);
    const uy = clamp(py(userPoint.y), topPad + r, H - bottomPad - r);

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
      clamp(uy + 4, topPad + 12, H - bottomPad - 6)
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
  const seeds = await getAllSeedPoints();

  // Draw anchors first (no user dot yet)
  drawChart(canvas, seeds, null);

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

  const x = Number.isFinite(xArticle)
    ? xArticle
    : Number.isFinite(xBucket)
      ? xBucket
      : 0;

  let y = Number(data.y);

  //testing
  // fallback y if missing (so “You” still shows)
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

  drawChart(canvas, seeds, userPoint);

  // Political category = bucket
  // Anchor = datapoints
  // Political Category: ${data.bucket || "unknown"}
 document.getElementById("chartSummary").textContent =
   `Current domain: ${data.domain || "unknown"} | Political Category: ${bucketLabel} | X-axis: ${x} | Y-axis: ${y} | Baseline data points: ${seeds.length}`;

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
  await loadLastResults();
})();