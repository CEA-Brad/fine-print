// Fine Print - Content Script

(function () {
  'use strict';

  const TOS_SIGNALS = [
    /terms\s+(of\s+)?(service|use|conditions)/i,
    /privacy\s+policy/i,
    /cookie\s+policy/i,
    /data\s+(processing|protection)\s+(agreement|policy)/i,
    /acceptable\s+use\s+policy/i,
    /end\s+user\s+license\s+agreement/i,
    /eula/i,
    /legal\s+(terms|notice)/i,
  ];

  let analysisState = 'idle'; // idle | detecting | analyzing | done | error

  function isExtensionValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function detectTOSPage() {
    const title = document.title.toLowerCase();
    const url = window.location.href.toLowerCase();
    const h1 = document.querySelector('h1')?.textContent || '';

    const textToCheck = `${title} ${url} ${h1}`;
    return TOS_SIGNALS.some((pattern) => pattern.test(textToCheck));
  }

  function extractPageText() {
    // Clone the body so we can strip non-visible elements without affecting the page
    const clone = document.body.cloneNode(true);

    // Remove elements that don't contain readable content
    const junkSelectors = 'script, style, noscript, svg, img, video, audio, canvas, iframe, template, [hidden], [aria-hidden="true"]';
    clone.querySelectorAll(junkSelectors).forEach((el) => el.remove());

    // Also remove nav/header/footer if there's a main content area
    const mainContent = clone.querySelector('article, main, [role="main"]');
    if (mainContent && mainContent.textContent.trim().length > 500) {
      return cleanText(mainContent.textContent);
    }

    // Try other content selectors
    const selectors = ['.content', '#content', '.post-content', '.policy-content', '.legal-content'];
    for (const selector of selectors) {
      const el = clone.querySelector(selector);
      if (el && el.textContent.trim().length > 500) {
        return cleanText(el.textContent);
      }
    }

    return cleanText(clone.textContent);
  }

  function cleanText(text) {
    return text
      .replace(/\s+/g, ' ')    // collapse whitespace
      .replace(/\n{3,}/g, '\n\n') // collapse blank lines
      .trim();
  }

  function highlightConcerns(concerns) {
    if (!concerns || concerns.length === 0) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const concern of concerns) {
      if (!concern.quote) continue;

      // Normalize the quote for matching
      const quoteNormalized = concern.quote.replace(/\s+/g, ' ').trim();
      if (quoteNormalized.length < 10) continue;

      // Search through text nodes for this quote
      const searchWords = quoteNormalized.split(' ').slice(0, 8).join(' ');

      for (const node of textNodes) {
        const nodeText = node.textContent.replace(/\s+/g, ' ');
        const matchIndex = nodeText.toLowerCase().indexOf(searchWords.toLowerCase());

        if (matchIndex !== -1) {
          try {
            const range = document.createRange();
            // Find the actual position in the original text
            let actualIndex = 0;
            let normalizedCount = 0;
            const origText = node.textContent;

            // Map normalized index back to original
            for (let i = 0; i < origText.length && normalizedCount < matchIndex; i++) {
              if (origText[i] === ' ' || origText[i] === '\n' || origText[i] === '\t') {
                if (i > 0 && (origText[i - 1] === ' ' || origText[i - 1] === '\n' || origText[i - 1] === '\t')) {
                  continue;
                }
              }
              normalizedCount++;
              actualIndex = i + 1;
            }

            range.setStart(node, actualIndex);

            // Find end position
            const endNormalized = matchIndex + Math.min(quoteNormalized.length, nodeText.length - matchIndex);
            let endActual = actualIndex;
            let endNormalizedCount = normalizedCount;
            for (let i = actualIndex; i < origText.length && endNormalizedCount < endNormalized; i++) {
              if (origText[i] === ' ' || origText[i] === '\n' || origText[i] === '\t') {
                if (i > 0 && (origText[i - 1] === ' ' || origText[i - 1] === '\n' || origText[i - 1] === '\t')) {
                  continue;
                }
              }
              endNormalizedCount++;
              endActual = i + 1;
            }

            range.setEnd(node, Math.min(endActual, origText.length));

            const highlight = document.createElement('mark');
            highlight.className = `fine-print-highlight fine-print-${concern.severity}`;
            highlight.dataset.concernTitle = concern.title;
            highlight.dataset.concernExplanation = concern.explanation;
            highlight.title = `${concern.title}: ${concern.explanation}`;
            range.surroundContents(highlight);
          } catch {
            // Range manipulation can fail on complex DOM - skip silently
          }
          break; // Only highlight first occurrence
        }
      }
    }
  }

  function injectFloatingBadge(result) {
    const existing = document.getElementById('fine-print-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'fine-print-badge';

    const count = result.concerns?.length || 0;
    const scoreColor =
      result.score >= 7 ? '#27ae60' : result.score >= 4 ? '#f39c12' : '#e74c3c';

    badge.innerHTML = `
      <div class="fine-print-badge-inner">
        <div class="fine-print-badge-score" style="background:${scoreColor}">${result.score}/10</div>
        <div class="fine-print-badge-text">
          <strong>Fine Print</strong>
          <span>${count} concern${count !== 1 ? 's' : ''} found</span>
        </div>
        <button class="fine-print-badge-expand" title="View details">&#9654;</button>
      </div>
    `;

    badge.querySelector('.fine-print-badge-expand').addEventListener('click', () => {
      if (!isExtensionValid()) return;
      chrome.runtime.sendMessage({ type: 'openSidePanel' });
    });

    // Make badge draggable
    let isDragging = false;
    let offsetX, offsetY;
    badge.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      offsetX = e.clientX - badge.getBoundingClientRect().left;
      offsetY = e.clientY - badge.getBoundingClientRect().top;
      badge.style.transition = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      badge.style.right = 'auto';
      badge.style.bottom = 'auto';
      badge.style.left = e.clientX - offsetX + 'px';
      badge.style.top = e.clientY - offsetY + 'px';
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      badge.style.transition = '';
    });

    document.body.appendChild(badge);
  }

  function injectLoadingBadge() {
    const existing = document.getElementById('fine-print-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'fine-print-badge';
    badge.innerHTML = `
      <div class="fine-print-badge-inner">
        <div class="fine-print-badge-spinner"></div>
        <div class="fine-print-badge-text">
          <strong>Fine Print</strong>
          <span>Analyzing document...</span>
        </div>
      </div>
    `;
    document.body.appendChild(badge);
  }

  async function run() {
    if (!detectTOSPage()) return;
    if (!isExtensionValid()) return;

    analysisState = 'detecting';

    // Check for cached results first
    const cachedResult = await chrome.runtime.sendMessage({
      type: 'getResults',
      url: window.location.href,
    });

    if (cachedResult) {
      analysisState = 'done';
      highlightConcerns(cachedResult.concerns);
      injectFloatingBadge(cachedResult);
      return;
    }

    // Check if API key is configured
    const { apiKey } = await chrome.storage.local.get(['apiKey']);
    if (!apiKey) {
      // Show a subtle indicator that this page could be analyzed
      const badge = document.createElement('div');
      badge.id = 'fine-print-badge';
      badge.innerHTML = `
        <div class="fine-print-badge-inner">
          <div class="fine-print-badge-score" style="background:#95a5a6">?</div>
          <div class="fine-print-badge-text">
            <strong>Fine Print</strong>
            <span>TOS detected - <a href="#" id="fine-print-setup">Set up API key</a></span>
          </div>
        </div>
      `;
      document.body.appendChild(badge);
      badge.querySelector('#fine-print-setup')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (isExtensionValid()) chrome.runtime.openOptionsPage();
      });
      return;
    }

    analysisState = 'analyzing';
    injectLoadingBadge();

    try {
      const text = extractPageText();
      const result = await chrome.runtime.sendMessage({
        type: 'analyze',
        text,
        url: window.location.href,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      analysisState = 'done';
      highlightConcerns(result.concerns);
      injectFloatingBadge(result);
    } catch (err) {
      analysisState = 'error';
      const badge = document.getElementById('fine-print-badge');
      if (badge) {
        badge.innerHTML = `
          <div class="fine-print-badge-inner">
            <div class="fine-print-badge-score" style="background:#e74c3c">!</div>
            <div class="fine-print-badge-text">
              <strong>Fine Print</strong>
              <span>Error: ${err.message}</span>
            </div>
          </div>
        `;
      }
    }
  }

  // Listen for manual trigger from popup
  if (!isExtensionValid()) return;
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'manualAnalyze') {
      analysisState = 'idle'; // Reset state
      run();
    }
  });

  run();
})();
