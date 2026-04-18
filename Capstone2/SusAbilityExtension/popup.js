function $(id) {
  return document.getElementById(id);
}

// create button variables for each button/ link
const analyzeBtn = $("analyzeBtn");
const citeBtn = $("citeBtn");
const helpLink = $("helpLink");
const statusEl = $("status");
//const resultEl = document.getElementById("result");

// --- navigation ---
const navDashboard = $("navDashboard");
const navSettings = $("navSettings");

// --- settings controls ---
const toggleUseApis = $("toggleUseApis");
const toggleShowRefs = $("toggleShowRefs");
const maxRefsEl = $("maxRefs");


async function loadSettings() {
  const defaults = { useApis: true, showRefs: true, maxRefs: 10 };
  const saved = await chrome.storage.sync.get(defaults);

  if (toggleUseApis) toggleUseApis.checked = !!saved.useApis;
  if (toggleShowRefs) toggleShowRefs.checked = !!saved.showRefs;
  if (maxRefsEl) maxRefsEl.value = String(saved.maxRefs ?? 10);
}

// Load initial "how to" prompt on the first open of the extension
async function maybeShowOnboarding() {
  const modal = document.getElementById("onboardingModal");
  const ok = document.getElementById("onboardingOk");
  if (!modal || !ok) return;

  // show once per popup open
  modal.classList.remove("hidden");

  ok.addEventListener("click", () => {
    modal.classList.add("hidden");
  }, { once: true });
}

function saveSettings() {
  // If the settings UI isn't on this page, do nothing
  if (!toggleUseApis || !toggleShowRefs || !maxRefsEl) return;

  const settings = {
    useApis: toggleUseApis.checked,
    showRefs: toggleShowRefs.checked,
    maxRefs: Number(maxRefsEl.value || 10),
  };
  chrome.storage.sync.set(settings);
}

// Only attach listeners if those controls exist on THIS html file
if (toggleUseApis) toggleUseApis.addEventListener("change", saveSettings);
if (toggleShowRefs) toggleShowRefs.addEventListener("change", saveSettings);
if (maxRefsEl) maxRefsEl.addEventListener("change", saveSettings);

// Safe to call; it checks for nulls now
loadSettings();

// function that sets the status message
function setStatus(message) {
  statusEl.textContent = message;
}

function summarizeAnalysisForUser(data) {
  const breakdown = [];

  const reliability = Number(data.y);
  const politicalX = Number.isFinite(Number(data.articleX))
    ? Number(data.articleX)
    : Number(data.x);

  const outboundCounts = data.outboundSkew?.counts || {};
  const ratedOutbound =
    (outboundCounts.left || 0) +
    (outboundCounts.lean_left || 0) +
    (outboundCounts.center || 0) +
    (outboundCounts.lean_right || 0) +
    (outboundCounts.right || 0);

  const unknownOutbound = outboundCounts.unknown || 0;
  const totalOutbound = ratedOutbound + unknownOutbound;

  let score = 50;

  if (Number.isFinite(reliability)) {
    score += (reliability - 32) * 0.8;
    breakdown.push(
      `Reliability contributed ${Math.round((reliability - 32) * 0.8)} points`,
    );
  }

  if (ratedOutbound >= 5) {
    score += 10;
    breakdown.push("+10 strong linked-source evidence");
  } else if (ratedOutbound >= 2) {
    score += 5;
    breakdown.push("+5 some linked-source evidence");
  } else {
    breakdown.push("+0 limited linked-source evidence");
  }

  if (totalOutbound >= 5 && unknownOutbound / totalOutbound >= 0.7) {
    score -= 8;
    breakdown.push("-8 most linked sources are unknown/unrated");
  } else if (totalOutbound >= 5 && unknownOutbound / totalOutbound >= 0.5) {
    score -= 4;
    breakdown.push("-4 many linked sources are unknown/unrated");
  }

  if (typeof data.sourceBaselineY === "number") {
    score += 6;
    breakdown.push("+6 matched a known source baseline");
  }

  if (
    data.pageType &&
    String(data.pageType).toLowerCase().includes("opinion")
  ) {
    score -= 6;
    breakdown.push("-6 opinion-style content");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let advisory = "Mixed signals";
  if (score >= 75) advisory = "Higher confidence";
  else if (score >= 60) advisory = "Moderate confidence";
  else if (score >= 40) advisory = "Use caution";
  else advisory = "Low confidence";

  return {
    score,
    advisory,
    breakdown,
    politicalX,
    reliability,
  };
}

// renderResults
function renderResults(scoreObj, links) {
  const resultsEl = document.getElementById("results");
  const scoreEl = document.getElementById("scoreValue");
  const breakdownEl = document.getElementById("breakdownList");
  const refsEl = document.getElementById("refsList");

  if (!resultsEl || !scoreEl || !breakdownEl || !refsEl) {
    setStatus("UI error: missing results containers in popup.html");
    return;
  }

  resultsEl.classList.remove("hidden");

  scoreEl.textContent = String(scoreObj.score);

  breakdownEl.innerHTML = "";
  for (const line of scoreObj.breakdown) {
    const li = document.createElement("li");
    li.textContent = line;
    breakdownEl.appendChild(li);
  }

  refsEl.innerHTML = "";
  for (const href of links) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = href;
    //a.textContent = href;
    //vertical scroll for popup
    let label = href;
    try {
      const u = new URL(href);
      label = u.hostname.replace(/^www\./, "");
    } catch {}
    a.textContent = label;
    a.title = href; // full URL on hover
    a.target = "_blank";
    a.rel = "noreferrer";
    li.appendChild(a);
    refsEl.appendChild(li);
  }
}

// renderSignals
function renderSignals(data) {
  const signalsList = document.getElementById("signalsList");
  if (!signalsList) return;

  const rows = [
    ["Title", data.title || "Not found"],
    ["Author", data.author || "Not found"],
    ["Publisher", data.publisher || "Not found"],
    ["Date", data.date || "Not found"],
    ["Page type", data.pageType || "Unknown"],
    [
      "Political starting point",
      data.bucket ? String(data.bucket).replace("_", " ") : "Unknown",
    ],
    [
      "Final political placement",
      Number.isFinite(Number(data.articleX))
        ? String(data.articleX)
        : "Not available",
    ],
    [
      "Reliability score",
      Number.isFinite(Number(data.y))
        ? String(Math.round(Number(data.y)))
        : "Not available",
    ],
    [
      "Known linked sources",
      data.outboundSkew
        ? String(
            (data.outboundSkew.counts.left || 0) +
              (data.outboundSkew.counts.lean_left || 0) +
              (data.outboundSkew.counts.center || 0) +
              (data.outboundSkew.counts.lean_right || 0) +
              (data.outboundSkew.counts.right || 0),
          )
        : "Not available",
    ],
    [
      "Unknown linked sources",
      data.outboundSkew
        ? String(data.outboundSkew.counts.unknown || 0)
        : "Not available",
    ],
    [
      "Linked source pattern",
      data.outboundSkew && Number.isFinite(Number(data.outboundSkew.avgX))
        ? Number(data.outboundSkew.avgX).toFixed(2)
        : "Not available",
    ],
    ["DOI", data.doi || "None"],
    [
      "References detected",
      typeof data.referenceCount === "number"
        ? String(data.referenceCount)
        : "Not available",
    ],
    [
      "Cited by",
      typeof data.citedByCount === "number"
        ? String(data.citedByCount)
        : "Not available",
    ],
    ["Secure connection", data.https ? "Yes" : "No"],
  ];

  signalsList.innerHTML = "";
  for (const [label, value] of rows) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${label}:</strong> ${value}`;
    signalsList.appendChild(li);
  }
}

// //Event Listeners

// // Action when btn Analyze page is clicked
// // await chrome.tabs.query returns the tab that is currently
// // selected and only looks on current browser window
// // sends message to listener -> display error or data found
if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    setStatus("Extracting page signals...");

    const resultsEl = document.getElementById("results");
    if (resultsEl) resultsEl.classList.add("hidden");

    const settings = await chrome.storage.sync.get({
      useApis: true,
      showRefs: true,
      maxRefs: 10,
    });

    chrome.runtime.sendMessage({ type: "API_CALLS", settings }, (resp) => {
      if (chrome.runtime.lastError) {
        setStatus("Service worker error: " + chrome.runtime.lastError.message);
        return;
      }
      if (!resp?.ok) {
        setStatus("Analysis failed: " + (resp?.error || "Unknown error"));
        return;
      }

      const data = resp.data || {};

      // shows what the error payload is
      if (data.error) {
        setStatus("Content script error: " + data.error);
        return;
      }

      renderSignals(data);

      const outbound = Array.isArray(data.outboundLinks)
        ? data.outboundLinks
        : [];
      const scoreObj = summarizeAnalysisForUser(data);

      const finalRefs = settings.showRefs
        ? outbound.slice(0, settings.maxRefs)
        : [];

      setStatus("Page Analysis Complete.");
      if (resultsEl) resultsEl.classList.remove("hidden");

      renderResults(scoreObj, finalRefs);

      // END OF ANALYZE CALLBACK — put extra settings
      // (example: save, navigate, update dashboard badge, etc.) ??

      const signalLines = Array.from(
        document.querySelectorAll("#signalsList li"),
      ).map((li) => li.textContent);

     chrome.storage.local.set({
       lastPopupAnalysis: {
         url: data.url || "",
         domain: data.domain || "",
         bucket: data.bucket || "unknown",
         x: data.x,
         articleX: data.articleX,
         y: data.y,
         outboundLinks: outbound,
         score: scoreObj.score,
         advisory: scoreObj.advisory,
         signals: signalLines,
         breakdown: scoreObj.breakdown,
         refs: finalRefs,
       },
     });
    });
  });
}

// Action when btn Generate citation is clicked
// uses stored signals to create an apa/ mla citation, copies to clipboard
function formatCitationAPA(data) {
  const author = data.author || "Unknown author";
  const date = data.date ? `(${data.date}).` : "(n.d.).";
  const title = data.title || "Untitled page";
  const publisher = data.publisher || "Unknown publisher";
  const url = data.url || "";

  return `${author} ${date} ${title}. ${publisher}. ${url}`
    .replace(/\s+/g, " ")
    .trim();
}

function formatCitationMLA(data) {
  const author = data.author || "Unknown author";
  const title = data.title || "Untitled page";
  const publisher = data.publisher || "Unknown publisher";
  const date = data.date || "n.d.";
  const url = data.url || "";

  return `${author}. "${title}." ${publisher}, ${date}, ${url}`
    .replace(/\s+/g, " ")
    .trim();
}

if (citeBtn) {
  citeBtn.addEventListener("click", async () => {
    const saved = await chrome.storage.local.get({
      lastAnalysis: null,
      lastPopupAnalysis: null,
    });

    const data = {
      ...(saved.lastPopupAnalysis || {}),
      ...(saved.lastAnalysis || {}),
    };

    if (!data.url && !data.title) {
      setStatus("Run Analyze Page before generating a citation.");
      return;
    }

    const apa = formatCitationAPA(data);
    const mla = formatCitationMLA(data);

    const citationText = `APA:\n${apa}\n\nMLA:\n${mla}`;

    try {
      await navigator.clipboard.writeText(citationText);
      setStatus("Citation copied to clipboard.");
    } catch {
      setStatus("Could not copy citation automatically.");
    }

    const resultsEl = document.getElementById("results");
    if (resultsEl) resultsEl.classList.remove("hidden");

    const breakdownEl = document.getElementById("breakdownList");
    if (breakdownEl) {
      breakdownEl.innerHTML = "";
      ["Citation formats generated:", `APA: ${apa}`, `MLA: ${mla}`].forEach(
        (line) => {
          const li = document.createElement("li");
          li.textContent = line;
          breakdownEl.appendChild(li);
        },
      );
    }
  });
}

// Action when help link is clicked
if (helpLink) {
  helpLink.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("help.html"),
    });
  });
}

// Action to open dashboard
if (navDashboard) {
  navDashboard.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("dashboard.html#dashboard"),
    });
  });
}

// Action to open Settings in dashboard
if (navSettings) {
  navSettings.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("dashboard.html#settings"),
    });
  });
}

// //

// start up prompt on launch 
document.addEventListener("DOMContentLoaded", () => {
  maybeShowOnboarding(); // show immediately on open
});

