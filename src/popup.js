// Fine Print - Popup Script

const states = {
  'no-key': document.getElementById('no-key'),
  'not-tos': document.getElementById('not-tos'),
  analyzing: document.getElementById('analyzing'),
  results: document.getElementById('results'),
  error: document.getElementById('error'),
};

function showState(name) {
  Object.values(states).forEach((el) => (el.style.display = 'none'));
  if (states[name]) states[name].style.display = 'block';
}

async function init() {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);

  if (!apiKey) {
    showState('no-key');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showState('not-tos');
    return;
  }

  // Check for cached results
  const result = await chrome.runtime.sendMessage({
    type: 'getResults',
    url: tab.url,
  });

  if (result) {
    renderResults(result);
  } else {
    showState('not-tos');
  }
}

function renderResults(result) {
  showState('results');

  const scoreBadge = document.getElementById('score-badge');
  scoreBadge.textContent = `${result.score}/10`;
  scoreBadge.style.background =
    result.score >= 7 ? '#27ae60' : result.score >= 4 ? '#f39c12' : '#e74c3c';

  const count = result.concerns?.length || 0;
  document.getElementById('concern-count').textContent =
    `${count} concern${count !== 1 ? 's' : ''} found`;

  document.getElementById('summary').textContent = result.summary || '';

  const preview = document.getElementById('concerns-preview');
  preview.innerHTML = '';
  if (result.concerns) {
    // Show up to 5 concern pills
    result.concerns.slice(0, 5).forEach((c) => {
      const pill = document.createElement('span');
      pill.className = `concern-pill ${c.severity}`;
      pill.textContent = c.title;
      preview.appendChild(pill);
    });
    if (result.concerns.length > 5) {
      const more = document.createElement('span');
      more.className = 'concern-pill low';
      more.textContent = `+${result.concerns.length - 5} more`;
      preview.appendChild(more);
    }
  }
}

// Event listeners
document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('footer-settings').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById('force-analyze').addEventListener('click', async () => {
  showState('analyzing');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'manualAnalyze' });

  // Poll for results
  const poll = setInterval(async () => {
    const result = await chrome.runtime.sendMessage({
      type: 'getResults',
      url: tab.url,
    });
    if (result) {
      clearInterval(poll);
      renderResults(result);
    }
  }, 2000);

  // Timeout after 60s
  setTimeout(() => {
    clearInterval(poll);
    if (states.analyzing.style.display !== 'none') {
      document.getElementById('error-msg').textContent = 'Analysis timed out. Try again.';
      showState('error');
    }
  }, 60000);
});

document.getElementById('open-details').addEventListener('click', () => {
  chrome.sidePanel.open({});
  window.close();
});

document.getElementById('retry').addEventListener('click', () => {
  init();
});

init();
