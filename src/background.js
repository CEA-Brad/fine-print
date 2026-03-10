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
  return `You are a privacy and legal expert helping regular people understand a Terms of Service or Privacy Policy document. Your job is two-fold:

1. **Key Points** - Give the user a clear, plain-English breakdown of what this policy actually says. Cover the important stuff a normal person would want to know before agreeing. Each key point should have a topic and a 1-2 sentence explanation.

2. **Concerns** - Flag specific clauses that are problematic, unusual, or worth watching out for. These are things that go beyond standard boilerplate — anything that could meaningfully affect the user's privacy, rights, or data.

For key points, use topics like: "What they collect", "How they use your data", "Who they share it with", "Data retention", "Your rights", "Account deletion", "Policy changes", etc. Keep it to the most important 5-8 points.

For each concern, provide:
- "title" - A short title
- "severity" - One of: "high", "medium", "low"
- "category" - One of: "data-collection", "data-sharing", "data-selling", "tracking", "legal-rights", "content-license", "account-termination", "policy-changes", "security", "children-privacy"
- "quote" - The exact verbatim text from the document (1-2 sentences max)
- "explanation" - Plain-English explanation of why this matters (1-2 sentences)

Also provide:
- "summary" - A 2-3 sentence overall assessment written for a non-expert
- "score" - A privacy score from 1 (very concerning) to 10 (very privacy-friendly)

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
