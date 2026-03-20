// reliability.js starts the scoring for the y axis
// before an LLM (not sure yet)

export function computeReliabilityScore(signals) {
    // return 0-64 to match chart scale
    // signals: title, author, date, https, pageType
    // citationCount, references, hasOutboundLinks etc.

    let score = 0;
    const reasons = [];

      // Sourcing quality (0–40)
  if (signals.author) { score += 8; reasons.push("+8 author listed"); }
  else reasons.push("+0: no author");

  if (signals.date) { score += 6; reasons.push("+6 date listed"); }
  else reasons.push("+0: no date");

  if (signals.hasOutboundLinks) { score += 8; reasons.push("+8 outbound links to sources"); }
  else reasons.push("+0: no outbound links");

  // citations/references: treat as evidence for science or heavily sourced news
  const refsCount = Array.isArray(signals.references) ? signals.references.length : 0;
  if (refsCount >= 10) { score += 12; reasons.push("+12: strong references (10+)"); }
  else if (refsCount >= 3) { score += 8; reasons.push("+8: some references (3–9)"); }
  else if (refsCount > 0) { score += 4; reasons.push("+4: minimal references (1–2)"); }
  else reasons.push("+0: no references detected");

  // Factuality / page integrity (0–24)
  if (signals.https) { score += 4; reasons.push("+4: HTTPS"); }
  else reasons.push("-4: no HTTPS");

  // If you have DOI & reputable publisher (science), add value
  if (signals.doi) { score += 6; reasons.push("+6: DOI present"); }

  // number cap
  score = Math.min(score, 60);

  // ---- Content type adjustment (-20 to +4) ----
  const type = (signals.pageType || "").toLowerCase();
  const isOpinion = type.includes("opinion");
  if (isOpinion) { score -= 10; reasons.push("-10: opinion content"); }
  else reasons.push("+0: not opinion");

  // Final from 0–64
  score = Math.max(0, Math.min(64, score));

  return { y: score, reasons };
}
