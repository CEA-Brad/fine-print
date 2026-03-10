// Fine Print - Side Panel Script

const emptyState = document.getElementById('empty');
const loadingState = document.getElementById('loading');
const reportEl = document.getElementById('report');

let currentFilter = 'all';
let currentResult = null;

async function loadResults() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const result = await chrome.runtime.sendMessage({
    type: 'getResults',
    url: tab.url,
  });

  if (result) {
    currentResult = result;
    renderReport(result);
  }
}

async function renderReport(result) {
  emptyState.style.display = 'none';
  loadingState.style.display = 'none';
  reportEl.style.display = 'block';

  // Score
  const scoreRing = document.getElementById('score-ring');
  const scoreValue = document.getElementById('score-value');
  scoreValue.textContent = `${result.score}/10`;

  const color = result.score >= 7 ? '#27ae60' : result.score >= 4 ? '#f39c12' : '#e74c3c';
  scoreRing.style.background = `conic-gradient(${color} ${result.score * 10}%, rgba(255,255,255,0.08) 0)`;

  document.getElementById('score-summary').textContent = result.summary || '';

  // Key points
  renderKeyPoints(result.keyPoints || []);

  // Concern count
  const count = result.concerns?.length || 0;
  document.getElementById('concerns-count').textContent = count;

  // Render concerns
  renderConcerns(result.concerns || []);

  // Render recommendations
  if (window.FinePrintRecommendations) {
    const recs = await window.FinePrintRecommendations.getRecommendations(result.concerns || []);
    renderRecommendations(recs);
  }
}

function renderKeyPoints(keyPoints) {
  const list = document.getElementById('key-points-list');
  list.innerHTML = '';

  if (keyPoints.length === 0) return;

  for (const point of keyPoints) {
    const item = document.createElement('div');
    item.className = 'key-point-item';
    item.innerHTML = `
      <div class="key-point-topic">${escapeHtml(point.topic)}</div>
      <div class="key-point-detail">${escapeHtml(point.detail)}</div>
    `;
    list.appendChild(item);
  }
}

function renderConcerns(concerns) {
  const list = document.getElementById('concerns-list');
  list.innerHTML = '';

  const filtered =
    currentFilter === 'all'
      ? concerns
      : concerns.filter((c) => c.severity === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:#666;font-size:13px;text-align:center;padding:20px">No concerns at this severity level.</p>';
    return;
  }

  // Sort: high first, then medium, then low
  const order = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

  for (const concern of filtered) {
    const card = document.createElement('div');
    card.className = `concern-card ${concern.severity}`;
    card.innerHTML = `
      <div class="concern-header">
        <span class="concern-title">${escapeHtml(concern.title)}</span>
        <span class="severity-tag ${concern.severity}">${concern.severity}</span>
      </div>
      ${concern.quote ? `<div class="concern-quote">"${escapeHtml(concern.quote)}"</div>` : ''}
      <div class="concern-explanation">${escapeHtml(concern.explanation)}</div>
    `;
    list.appendChild(card);
  }
}

function renderRecommendations(recs) {
  const list = document.getElementById('recommendations-list');
  list.innerHTML = '';

  if (recs.length === 0) {
    list.innerHTML = '<p style="color:#666;font-size:13px;text-align:center;padding:20px">No specific recommendations for this document.</p>';
    return;
  }

  for (const rec of recs) {
    const card = document.createElement('a');
    card.className = 'rec-card';
    card.href = rec.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.innerHTML = `
      <div class="rec-icon">${rec.icon}</div>
      <div class="rec-info">
        <div class="rec-name">${escapeHtml(rec.name)}</div>
        <div class="rec-desc">${escapeHtml(rec.description)}</div>
      </div>
      <span class="rec-tag">${escapeHtml(rec.tag)}</span>
      <span class="rec-arrow">&#8250;</span>
    `;
    list.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    if (currentResult) renderConcerns(currentResult.concerns || []);
  });
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(() => {
  loadResults();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    loadResults();
  }
});

// Initial load
loadResults();
