// Fine Print - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['apiProvider', 'apiKey'], (result) => {
    if (!result.apiKey) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    }
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'analyze') {
    analyzeText(message.text, message.url)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'getResults') {
    chrome.storage.session.get([`results:${message.url}`], (data) => {
      sendResponse(data[`results:${message.url}`] || null);
    });
    return true;
  }

  if (message.type === 'openSidePanel') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    return false;
  }
});

// Badge update when settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.apiKey) {
    if (changes.apiKey.newValue) {
      chrome.action.setBadgeText({ text: '' });
    } else {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    }
  }
});

async function analyzeText(text, url) {
  const { apiProvider, apiKey, modelId } = await chrome.storage.local.get([
    'apiProvider',
    'apiKey',
    'modelId',
  ]);

  if (!apiKey) {
    throw new Error('No API key configured. Open Fine Print settings to add your key.');
  }

  // Truncate very long documents to stay within context limits
  const maxChars = 60000;
  const truncated = text.length > maxChars ? text.slice(0, maxChars) + '\n\n[Document truncated]' : text;

  const prompt = buildPrompt(truncated);
  let result;

  if (apiProvider === 'openai') {
    result = await callOpenAI(apiKey, modelId || 'gpt-5.4', prompt);
  } else {
    result = await callClaude(apiKey, modelId || 'claude-sonnet-4-6', prompt);
  }

  // Cache results
  chrome.storage.session.set({ [`results:${url}`]: result });

  // Update badge with concern count
  const totalConcerns = result.concerns?.length || 0;
  if (totalConcerns > 0) {
    const tabs = await chrome.tabs.query({ url });
    for (const tab of tabs) {
      chrome.action.setBadgeText({ text: String(totalConcerns), tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: result.concerns.some((c) => c.severity === 'high') ? '#e74c3c' : '#f39c12',
        tabId: tab.id,
      });
    }
  }

  return result;
}

function buildPrompt(text) {
  return `You are a privacy expert helping normal people understand a Terms of Service or Privacy Policy. Be concise — users want the gist, not a legal brief.

BREVITY IS CRITICAL. Every field should be as short as possible.

Produce two things:

1. **Key Points** — What does this policy actually say? 4-6 bullet points max. Each "detail" must be ONE short sentence (under 20 words).

2. **Concerns** — What's unusual, aggressive, or worth worrying about? Only flag things that go beyond standard boilerplate. Each "explanation" must be ONE short sentence (under 20 words). Keep the "quote" to the shortest meaningful excerpt.

Also provide:
- "summary" — 2 sentences max. Plain English, no jargon.
- "score" — Privacy score from 1 (terrible) to 10 (great)

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "score": 5,
  "keyPoints": [
    {
      "topic": "What they collect",
      "detail": "..."
    }
  ],
  "concerns": [
    {
      "title": "...",
      "severity": "high|medium|low",
      "category": "...",
      "quote": "...",
      "explanation": "..."
    }
  ]
}

Document to analyze:
${text}`;
}

async function callClaude(apiKey, model, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.content[0].text;
  return parseJSON(content);
}

async function callOpenAI(apiKey, model, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  return parseJSON(content);
}

function parseJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}
