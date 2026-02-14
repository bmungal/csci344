function showRoute(route) {
  const dash = document.getElementById("route-dashboard");
  const set = document.getElementById("route-settings");

  dash.classList.toggle("hidden", route !== "dashboard");
  set.classList.toggle("hidden", route !== "settings");

  document.querySelectorAll(".sideItem").forEach(btn => {
    btn.classList.toggle("sideActive", btn.dataset.route === route);
  });
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

  const save = () => chrome.storage.sync.set({
    useApis: useApis.checked,
    showRefs: showRefs.checked,
    maxRefs: Number(maxRefs.value || 10),
  });

  useApis.addEventListener("change", save);
  showRefs.addEventListener("change", save);
  maxRefs.addEventListener("change", save);
}

async function loadLastResults() {
  const saved = await chrome.storage.local.get({ lastAnalysis: null });
  const data = saved.lastAnalysis;
  if (!data) return;

  document.getElementById("dashScore").textContent = String(data.score ?? "--");
  document.getElementById("dashUrl").textContent = data.url || "Unknown URL";
  document.getElementById("dashAdvisory").textContent = data.advisory || "Neutral";

  const sig = document.getElementById("dashSignals");
  sig.innerHTML = "";
  (data.signals || []).forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    sig.appendChild(li);
  });

  const bd = document.getElementById("dashBreakdown");
  bd.innerHTML = "";
  (data.breakdown || []).forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    bd.appendChild(li);
  });

  const refs = document.getElementById("dashRefs");
  refs.innerHTML = "";
  (data.refs || []).forEach(href => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = href;
    li.appendChild(a);
    refs.appendChild(li);
  });
}

document.querySelectorAll(".sideItem").forEach(btn => {
  btn.addEventListener("click", () => showRoute(btn.dataset.route));
});

// route from URL hash (#settings)
const hash = (location.hash || "").replace("#", "");
showRoute(hash === "settings" ? "settings" : "dashboard");

loadSettingsIntoDashboard();
hookSettingsSave();
loadLastResults();