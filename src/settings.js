// Fine Print - Settings Script

const form = document.getElementById('settings-form');
const apiKeyInput = document.getElementById('api-key');
const modelInput = document.getElementById('model-id');
const toggleBtn = document.getElementById('toggle-key');
const saveStatus = document.getElementById('save-status');
const modelHint = document.getElementById('model-hint');

const defaults = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4',
};

// Load saved settings
chrome.storage.local.get(['apiProvider', 'apiKey', 'modelId'], (data) => {
  if (data.apiProvider) {
    document.querySelector(`input[name="provider"][value="${data.apiProvider}"]`).checked = true;
  }
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
  if (data.modelId) {
    modelInput.value = data.modelId;
  }
  updateModelHint();
});

// Toggle key visibility
toggleBtn.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

// Update model hint when provider changes
document.querySelectorAll('input[name="provider"]').forEach((radio) => {
  radio.addEventListener('change', updateModelHint);
});

function updateModelHint() {
  const provider = document.querySelector('input[name="provider"]:checked').value;
  modelHint.textContent = `Default: ${defaults[provider]}`;
}

// Load build verification info
(async function loadBuildInfo() {
  try {
    const url = chrome.runtime.getURL('src/build-info.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error('Not found');
    const info = await res.json();

    document.getElementById('verify-loading').style.display = 'none';
    document.getElementById('verify-info').style.display = 'block';

    document.getElementById('verify-version').textContent = info.version;

    const commitLink = document.getElementById('verify-commit');
    commitLink.textContent = info.commitShort;
    commitLink.href = `${info.repoUrl}/commit/${info.commit}`;

    document.getElementById('verify-built-at').textContent = info.builtAt;

    const hashLines = Object.entries(info.fileHashes)
      .map(([file, hash]) => `${hash}  ${file}`)
      .join('\n');
    document.getElementById('verify-hashes').textContent = hashLines;
  } catch {
    document.getElementById('verify-loading').style.display = 'none';
    document.getElementById('verify-missing').style.display = 'block';
  }
})();

// Save settings
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const provider = document.querySelector('input[name="provider"]:checked').value;
  const apiKey = apiKeyInput.value.trim();
  const modelId = modelInput.value.trim();

  if (!apiKey) {
    saveStatus.textContent = 'Please enter an API key.';
    saveStatus.style.color = '#e74c3c';
    return;
  }

  chrome.storage.local.set(
    {
      apiProvider: provider,
      apiKey,
      modelId: modelId || '',
    },
    () => {
      saveStatus.textContent = 'Settings saved!';
      saveStatus.style.color = '#27ae60';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 3000);
    }
  );
});
