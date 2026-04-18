SusAbility Chrome Extension
Author: Brian Mungal
Date: 1/20/26
Capstone II

** TO ENSURE EXTENSION WORKS ********************************
PLEASE DO THIS 
1. Go to chrome://extensions
2. Turn on developer mode
3. Click load unpacked
4. Select the SusAbility (what you named the folder)
5. Pin SusAbility
6. Click on the icon
**************************************************************


## Project overview

SusAbility is a Chrome extension that helps users evaluate an article using:

- political placement on an x-axis
- reliability / news value on a y-axis
- source baseline matching from a local ratings database
- linked-source analysis from outbound article links
- article-level language, semantic, and framing signals
- explainable signal traces shown in the popup and dashboard

The extension is meant to support critical reading, not replace human judgment.

---
## Research inspiration

This project is informed by research from the University of Pennsylvania’s
Computational Social Science Lab, including:

- PennMAP (Penn Media Accountability Project)
- Media Bias Detector

These projects focus on media transparency, article-level bias, framing, and
real-time media analysis.

## Core features

### Analyze Page
Runs the current article analysis and returns:

- political starting point
- final political placement
- reliability score
- linked-source evidence
- metadata and references
- explainable scoring breakdown

### Generate Citation
Builds citation text from analyzed article metadata and currently supports:

- APA
- MLA

The generated citation text is copied to the clipboard.

### Help page
Provides a simple explanation of:

- what the extension does
- what the x-axis and y-axis mean
- what the major signals mean
- what the buttons do

### Dashboard
Opens the larger chart-based view of the analysis, including:

- political bias and reliability chart
- source clusters
- linked-source evidence
- extended analysis details

---

## How the analysis works

### X-axis: political placement
The extension first tries to match the current source to a known source in the local database.

If a source match is found, that provides a political starting point.

If no direct source match is found, the extension looks at outbound links and compares them to already-rated sources.

The article is then adjusted using:

- linked-source pattern
- semantic issue cues
- framing signals
- language intensity / rhetoric cues

### Y-axis: reliability / news value
The extension starts with a source reliability baseline when available, then blends in article-level evidence such as:

- strength of linked-source evidence
- number of known vs unknown linked sources
- sourcing diversity
- metadata presence
- opinion indicators
- article wording and attribution patterns
- framing signals
- scholarly references / DOI data when available

---

## Main files

- `manifest.json` — extension configuration
- `popup.html` — popup UI
- `popup.css` — popup styles
- `popup.js` — popup actions, summary score, citation generation
- `dashboard.html` — dashboard UI
- `dashboard.js` — chart rendering, settings, clusters, dashboard display
- `service_worker.js` — main analysis pipeline and scoring logic
- `content.js` — extracts page-level signals from the current article
- `db.js` — IndexedDB helpers
- `seed_sources.json` — initial source baseline data
- `help.html` — built-in help page
- `README.md` — project notes

---

## Current direction

The project is focused on improving:

- political-bias placement accuracy
- reliability scoring accuracy
- explainable user-facing signals
- dashboard clarity and customization
- onboarding and help flow
- citation support

---

## Important note

SusAbility should be used as a guide for review and comparison.  
Scores and placements are explainable estimates, not absolute truth.