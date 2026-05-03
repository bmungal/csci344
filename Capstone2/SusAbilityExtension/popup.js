function $(id) {
  return document.getElementById(id);
}

// create button variables for each button / link
const analyzeBtn = $("analyzeBtn");
const citeBtn = $("citeBtn");
const helpLink = $("helpLink");
const statusEl = $("status");

// popup sections
const resultsEl = $("results");
const citationViewEl = $("citationView");

// citation view controls
const backToResultsBtn = $("backToResultsBtn");
const copyApaBtn = $("copyApaBtn");
const copyMlaBtn = $("copyMlaBtn");
const apaCitationEl = $("apaCitation");
const mlaCitationEl = $("mlaCitation");

// --- navigation ---
const navDashboard = $("navDashboard");
const navSettings = $("navSettings");

// --- settings controls ---
const toggleUseApis = $("toggleUseApis");
const toggleShowRefs = $("toggleShowRefs");
const maxRefsEl = $("maxRefs");

let lastGeneratedCitations = {
  apa: "",
  mla: "",
};

async function loadSettings() {
  const defaults = { useApis: true, showRefs: true, maxRefs: 10 };
  const saved = await chrome.storage.sync.get(defaults);

  if (toggleUseApis) toggleUseApis.checked = !!saved.useApis;
  if (toggleShowRefs) toggleShowRefs.checked = !!saved.showRefs;
  if (maxRefsEl) maxRefsEl.value = String(saved.maxRefs ?? 10);
}

// Load initial "how to" prompt on the first open of the extension.
async function maybeShowOnboarding() {
  const modal = document.getElementById("onboardingModal");
  const ok = document.getElementById("onboardingOk");
  if (!modal || !ok) return;

  modal.classList.remove("hidden");

  ok.addEventListener(
    "click",
    () => {
      modal.classList.add("hidden");
    },
    { once: true },
  );
}

function saveSettings() {
  // If the settings UI is not on this page, do nothing.
  if (!toggleUseApis || !toggleShowRefs || !maxRefsEl) return;

  const settings = {
    useApis: toggleUseApis.checked,
    showRefs: toggleShowRefs.checked,
    maxRefs: Number(maxRefsEl.value || 10),
  };
  chrome.storage.sync.set(settings);
}

if (toggleUseApis) toggleUseApis.addEventListener("change", saveSettings);
if (toggleShowRefs) toggleShowRefs.addEventListener("change", saveSettings);
if (maxRefsEl) maxRefsEl.addEventListener("change", saveSettings);

loadSettings();

// status line helper
function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

// show or hide the simple progress box
function showProgress(show) {
  const box = document.getElementById("progressBox");
  if (!box) return;
  box.classList.toggle("hidden", !show);
}

// clear progress state before a new run
function resetProgress() {
  document.querySelectorAll("#progressList li").forEach((li) => {
    li.classList.remove("active", "done");
  });
}

// highlight the current step and mark earlier ones as finished
function setProgress(stepKey) {
  const order = ["extract", "source", "links", "metadata", "score", "save"];
  const currentIndex = order.indexOf(stepKey);

  document.querySelectorAll("#progressList li").forEach((li) => {
    const idx = order.indexOf(li.dataset.step);
    li.classList.remove("active", "done");

    if (idx < currentIndex) li.classList.add("done");
    else if (idx === currentIndex) li.classList.add("active");
  });
}

// switch back to the normal analysis summary
function showResultsView() {
  if (resultsEl) resultsEl.classList.remove("hidden");
  if (citationViewEl) citationViewEl.classList.add("hidden");
}

// switch to the citation view only
function showCitationView() {
  if (resultsEl) resultsEl.classList.add("hidden");
  if (citationViewEl) citationViewEl.classList.remove("hidden");
}

// popup summary uses the official score and advisory from the service worker
// so the popup and dashboard stay in sync.
function summarizeAnalysisForUser(data) {
  const breakdown = [];

  const reliability = Number(data.y);
  const politicalX = Number.isFinite(Number(data.articleX))
    ? Number(data.articleX)
    : Number(data.x);

  const weightedNeighborhood = data.weightedNeighborhood || {};
  const linkReviewUsed = data.linkReview?.used || weightedNeighborhood.usedDetails || [];
  const linkReviewIgnored = data.linkReview?.ignored || weightedNeighborhood.ignoredDetails || [];

  const usedCount = linkReviewUsed.filter((item) => item.contributed !== false).length;
  const ignoredCount = linkReviewIgnored.length;

  if (Number.isFinite(reliability)) {
    breakdown.push(`Reliability score: ${Math.round(reliability)} / 64`);
  }

  if (Number.isFinite(politicalX)) {
    breakdown.push(`Political placement value: ${politicalX.toFixed(2)}`);
  }

  breakdown.push(`${usedCount} linked sources contributed to placement.`);
  breakdown.push(`${ignoredCount} links were ignored during source review.`);

  if (data.pageType) {
    breakdown.push(`Page type: ${data.pageType}`);
  }

  return {
    score:
      typeof data.score === "number"
        ? Math.round(data.score)
        : 50,
    advisory: data.advisory || "Mixed signals",
    breakdown,
    politicalX,
    reliability,
  };
}

// render the main analysis view
function renderResults(scoreObj, links) {
  const scoreEl = document.getElementById("scoreValue");
  const breakdownEl = document.getElementById("breakdownList");
  const refsEl = document.getElementById("refsList");

  if (!resultsEl || !scoreEl || !breakdownEl || !refsEl) {
    setStatus("UI error: missing results containers in popup.html");
    return;
  }

  showResultsView();

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

    let label = href;
    try {
      const u = new URL(href);
      label = u.hostname.replace(/^www\./, "");
    } catch {}

    a.textContent = label;
    a.title = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    li.appendChild(a);
    refsEl.appendChild(li);
  }
}

// render the signal rows shown in the popup
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
        ? `${Math.round(Number(data.y))} / 64`
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

// Fill the citation view with the current page's citation formats.
function renderCitationView(apa, mla) {
  lastGeneratedCitations = { apa, mla };

  if (apaCitationEl) apaCitationEl.textContent = apa;
  if (mlaCitationEl) mlaCitationEl.textContent = mla;

  showCitationView();
}

async function copyTextWithStatus(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`${label} copied to clipboard.`);
  } catch {
    setStatus(`Could not copy ${label.toLowerCase()} automatically.`);
  }
}

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    setStatus("Starting analysis...");
    showProgress(true);
    resetProgress();
    setProgress("extract");

    if (resultsEl) resultsEl.classList.add("hidden");
    if (citationViewEl) citationViewEl.classList.add("hidden");

    const settings = await chrome.storage.sync.get({
      useApis: true,
      showRefs: true,
      maxRefs: 10,
    });

    setStatus("Reading page content...");

    // These timed steps make the popup feel clearer while the background work runs.
    const progressTimers = [
      setTimeout(() => {
        setProgress("source");
        setStatus("Checking source database...");
      }, 200),
      setTimeout(() => {
        setProgress("links");
        setStatus("Reviewing linked sources...");
      }, 450),
      setTimeout(() => {
        setProgress("metadata");
        setStatus(
          settings.useApis
            ? "Filling missing metadata..."
            : "Skipping metadata fallback...",
        );
      }, 700),
      setTimeout(() => {
        setProgress("score");
        setStatus("Scoring results...");
      }, 950),
    ];

    chrome.runtime.sendMessage({ type: "API_CALLS", settings }, (resp) => {
      progressTimers.forEach((id) => clearTimeout(id));

      if (chrome.runtime.lastError) {
        showProgress(false);
        setStatus("Service worker error: " + chrome.runtime.lastError.message);
        return;
      }
      if (!resp?.ok) {
        showProgress(false);
        setStatus("Analysis failed: " + (resp?.error || "Unknown error"));
        return;
      }

      const data = resp.data || {};

      if (data.error) {
        showProgress(false);
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

      setProgress("save");
      setStatus("Saving results...");

      renderResults(scoreObj, finalRefs);

      const signalLines = Array.from(
        document.querySelectorAll("#signalsList li"),
      ).map((li) => li.textContent);

      chrome.storage.local.set(
        {
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
        },
        () => {
          document.querySelectorAll("#progressList li").forEach((li) =>
            li.classList.add("done"),
          );
          setStatus("Page analysis complete.");
        },
      );
    });
  });
}

// Create a separate citation view instead of mixing citation text into the breakdown list.
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

    renderCitationView(apa, mla);
    setStatus("Citation formats are ready.");
  });
}

if (copyApaBtn) {
  copyApaBtn.addEventListener("click", async () => {
    if (!lastGeneratedCitations.apa) return;
    await copyTextWithStatus(lastGeneratedCitations.apa, "APA citation");
  });
}

if (copyMlaBtn) {
  copyMlaBtn.addEventListener("click", async () => {
    if (!lastGeneratedCitations.mla) return;
    await copyTextWithStatus(lastGeneratedCitations.mla, "MLA citation");
  });
}

if (backToResultsBtn) {
  backToResultsBtn.addEventListener("click", () => {
    showResultsView();
    setStatus("Back to analysis summary.");
  });
}

if (helpLink) {
  helpLink.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("help.html"),
    });
  });
}

if (navDashboard) {
  navDashboard.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("dashboard.html#dashboard"),
    });
  });
}

if (navSettings) {
  navSettings.addEventListener("click", () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("dashboard.html#settings"),
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  maybeShowOnboarding();
});
