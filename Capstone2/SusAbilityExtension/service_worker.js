// runs in the background so the extension runs efficiently 
// can run offline

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
    citationCount: !local?.citationCount,
  };
}

// fetchJson is a helper function to catch errors
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}



// API calls
async function findWithAPIs(url, need) {
  const out = {};
  const needsAnything =
    need.title ||
    need.author ||
    need.date ||
    need.publisher ||
    need.doi ||
    need.pageType;

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
    // Fields you want back (kept small for speed)
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
  const doi = out.doi; // from Crossref
  if (doi) {
    try {
      const s2 = await semanticScholarLookupByDOI(doi);

      // Use S2 data mostly for graph stuff; also can fill metadata if missing
      if (need.title && !out.title && s2.title) out.title = s2.title;
      if (need.author && !out.author && s2.author) out.author = s2.author;
      if (need.date && !out.date && s2.date) out.date = s2.date;

      // Graph-related signals
      if (need.citationCount && typeof s2.citationCount === "number")
        out.citationCount = s2.citationCount;
      if (Array.isArray(s2.references)) out.references = s2.references; // list of referenced papers (ids/DOIs)
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
      const r = await rapidApiLookup(url); // YOU customize this for your chosen endpoint

      if (stillMissingTitle && r.title) out.title = r.title;
      if (stillMissingAuthor && r.author) out.author = r.author;
      if (stillMissingDate && r.date) out.date = r.date;

      // optional if your endpoint provides it
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

  // Return in the shape your code expects
  return {
    title: data?.title || "",
    author: data?.author || "",
    date: data?.published || data?.date || "",
    publisher: data?.siteName || data?.publisher || "",
    pageType: data?.type || data?.pageType || "",
    text: data?.text || "",
  };
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
    const apiData = await findWithAPIs(pageUrl, need);

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
    };

    return merged;
  })()
    .then((merged) => sendResponse({ ok: true, data: merged }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  // keep the message channel open for async response
  return true;
});