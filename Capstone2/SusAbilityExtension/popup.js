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
const viewDashboard = $("viewDashboard");
const viewSettings = $("viewSettings");

// --- settings controls ---
const toggleUseApis = $("toggleUseApis");
const toggleShowRefs = $("toggleShowRefs");
const maxRefsEl = $("maxRefs");

navDashboard.addEventListener("click", () => showView("dashboard"));
navSettings.addEventListener("click", () => showView("settings"));

async function loadSettings() {
  const defaults = { useApis: true, showRefs: true, maxRefs: 10 };
  const saved = await chrome.storage.sync.get(defaults);

  if (toggleUseApis) toggleUseApis.checked = !!saved.useApis;
  if (toggleShowRefs) toggleShowRefs.checked = !!saved.showRefs;
  if (maxRefsEl) maxRefsEl.value = String(saved.maxRefs ?? 10);
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

function scoreSignals(data) {
  let score = 50;
  const breakdown = [];

  // Score Metadata
  // Maybe removed?
  // Definitely redone
  if (data.author) {
    score += 10;
    breakdown.push("+10 Author present");
  } else {
    breakdown.push("0 Author not detected");
  }

  if (data.date) {
    score += 10;
    breakdown.push("+10 Publish date present");
  } else {
    breakdown.push("0 Publish date not detected");
  }

  if (data.title) {
    score += 5;
    breakdown.push("+5 Title present");
  } else {
    breakdown.push("0 Title not detected");
  }

  // Score Citations
  const c = Array.isArray(data.outboundLinks) ? data.outboundLinks.length : 0;
  if (c >= 3) {
    score += 15;
    breakdown.push(`+15 ${c} outbound citations found`);
  } else if (c >= 1) {
    score += 8;
    breakdown.push(`+8 ${c} outbound citation (s) found`);
  } else {
    score -= 15;
    breakdown.push("-15 No outbound citations found");
  }

  // Score HTTPS
  if (data.https) {
    score += 5;
    breakdown.push("+5 HTTPS enabled");
  } else {
    score += 0;
    breakdown.push("+0 HTTP NOT HTTPS");
  }

  // Score Domain
  try {
    const host = new URL(data.url).hostname.toLowerCase();
    if (host.endsWith(".gov") || host.endsWith(".edu")) {
      score += 5;
      breakdown.push("+5 .gov/ .edu domain (Positive Advisory)");
    } else {
      breakdown.push("0 Domain type neutral: Neutral Advisory ");
    }
  } catch {
    breakdown.push("No Domain found");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, breakdown };
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
    a.textContent = href;
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
    ["Title", data.title || "Cannot find title."],
    ["Author", data.author || "Cannot find author."],
    ["Publisher", data.publisher || "Cannot find publisher."],
    ["Date", data.date || "Cannot find date."],
    ["URL", data.url || "Cannot find URL."],
    ["Page Type", data.pageType || "Unknown"],
    [
      "Fields of Study",
      Array.isArray(data.fieldsOfStudy) && data.fieldsOfStudy.length
        ? data.fieldsOfStudy.join(", ")
        : "Not available.",
    ],
    ["DOI", data.doi || "No DOI found."],
    [
      "Citation Count",
      typeof data.citationCount === "number"
        ? String(data.citationCount)
        : "Not available.",
    ],
    ["API Used", data.apiUsed ? "Yes" : "No"],
    ["HTTPS", data.https ? "Yes" : "No"],
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
      const scoreObj = scoreSignals({ ...data, outboundLinks: outbound });

      const finalRefs = settings.showRefs
        ? outbound.slice(0, settings.maxRefs)
        : [];

      setStatus("Page Analysis Complete.");
      if (resultsEl) resultsEl.classList.remove("hidden");

      renderResults(scoreObj, finalRefs);

      // END OF ANALYZE CALLBACK — put extra settings
      // (example: save, navigate, update dashboard badge, etc.)

      const signalLines = Array.from(
        document.querySelectorAll("#signalsList li"),
      ).map((li) => li.textContent);

      chrome.storage.local.set({
        lastAnalysis: {
          url: data.url || "",
          score: scoreObj.score,
          advisory: "Neutral",
          signals: signalLines,
          breakdown: scoreObj.breakdown,
          refs: finalRefs,
        },
      });
    });
  });
}
// Action when btn Generate citation is clicked
if (citeBtn) {
  citeBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab?.url || "(unknown url)";

    setStatus(`Citation clicked. This will show citations: ${url}`);
  });
}

// Action when help link is clicked
if (helpLink) {
  helpLink.addEventListener("click", () => {
    // Show a message for now
    // Come back and write docs page or extension help page
    setStatus("Help: This will show a help page");
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

// //
