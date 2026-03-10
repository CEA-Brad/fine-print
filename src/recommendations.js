// Fine Print - Product Recommendations
// Fetched remotely from config endpoint, with local fallback

const CONFIG_URL = 'https://cea-brad.github.io/fine-print-config/recommendations.json';
const CACHE_KEY = 'recommendations_cache';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Minimal fallback in case remote fetch fails and there's no cache
const FALLBACK = {};

let recommendationsData = null;

async function loadRecommendations() {
  if (recommendationsData) return recommendationsData;

  // Check cache first
  const cached = await chrome.storage.local.get([CACHE_KEY, `${CACHE_KEY}_ts`]);
  if (cached[CACHE_KEY] && cached[`${CACHE_KEY}_ts`] && Date.now() - cached[`${CACHE_KEY}_ts`] < CACHE_TTL) {
    recommendationsData = cached[CACHE_KEY];
    return recommendationsData;
  }

  // Fetch fresh data
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-cache' });
    if (res.ok) {
      recommendationsData = await res.json();
      chrome.storage.local.set({
        [CACHE_KEY]: recommendationsData,
        [`${CACHE_KEY}_ts`]: Date.now(),
      });
      return recommendationsData;
    }
  } catch {
    // Network error — fall through to cache or fallback
  }

  // Use stale cache if available
  if (cached[CACHE_KEY]) {
    recommendationsData = cached[CACHE_KEY];
    return recommendationsData;
  }

  recommendationsData = FALLBACK;
  return recommendationsData;
}

async function getRecommendations(concerns) {
  if (!concerns || concerns.length === 0) return [];

  const data = await loadRecommendations();
  const categories = [...new Set(concerns.map((c) => c.category))];
  const seen = new Set();
  const results = [];

  for (const category of categories) {
    const recs = data[category] || [];
    for (const rec of recs) {
      if (!seen.has(rec.name)) {
        seen.add(rec.name);
        results.push({ ...rec, forCategory: category });
      }
    }
  }

  return results;
}

if (typeof window !== 'undefined') {
  window.FinePrintRecommendations = { getRecommendations, loadRecommendations };
}
