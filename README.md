# Fine Print

AI-powered Chrome extension that analyzes Terms of Service and Privacy Policy pages. Highlights concerning clauses and recommends tools to protect your privacy.

## Features

- **Auto-detection** - Automatically identifies TOS, Privacy Policy, and similar legal pages
- **AI analysis** - Uses your own API key (Claude or GPT) to analyze documents for concerning clauses
- **Inline highlighting** - Flags concerning text directly on the page with severity-coded highlights
- **Privacy score** - Rates each document on a 1-10 privacy scale
- **Product recommendations** - Suggests privacy tools (VPNs, ad blockers, etc.) based on specific concerns found
- **Side panel report** - Full breakdown with filtering by severity level
- **No backend** - BYOK model means your API key stays in your browser, sent only to your chosen AI provider

## Install

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `fine-print` folder
5. Click the extension icon and go to **Settings** to add your API key

## Setup

Fine Print uses a Bring Your Own Key (BYOK) model. You'll need an API key from one of:

- **Anthropic** (recommended) - Get a key at [console.anthropic.com](https://console.anthropic.com)
- **OpenAI** - Get a key at [platform.openai.com](https://platform.openai.com)

Open the extension settings and paste your key. It's stored locally in Chrome and only sent to the API provider you choose.

## How it works

1. When you visit a page that looks like a TOS or Privacy Policy, Fine Print extracts the text
2. The text is sent to your AI provider for analysis
3. The AI identifies concerning clauses, assigns severity levels, and scores the document
4. Concerns are highlighted inline on the page
5. A floating badge shows the privacy score
6. Open the side panel for a full report with recommendations

## Privacy

- No data is collected or sent to any server besides your chosen AI provider
- Your API key is stored in Chrome's local storage
- Page text is sent directly from your browser to the AI API
- No analytics, no tracking, no backend

## Project structure

```
fine-print/
├── manifest.json          # Chrome extension manifest (MV3)
├── src/
│   ├── background.js      # Service worker - handles API calls
│   ├── content.js         # Content script - page detection & highlighting
│   ├── content.css        # Highlight and badge styles
│   ├── popup.html/js/css  # Extension popup
│   ├── sidepanel.*        # Side panel with full report
│   ├── settings.*         # API key configuration page
│   └── recommendations.js # Product recommendation mappings
├── icons/                 # Extension icons (add your own)
├── LICENSE
└── README.md
```

## Verify

You can verify that the Chrome Web Store version matches the open-source code:

1. Open Fine Print settings and scroll to **Verify this build**
2. Note the **commit hash** and **file hashes**
3. Clone the repo at that commit:
   ```
   git clone https://github.com/CEA-Brad/fine-print.git
   cd fine-print
   git checkout <commit-hash>
   ```
4. Generate hashes and compare:
   ```
   shasum -a 256 manifest.json src/*.js src/*.css src/*.html
   ```

If the hashes match, you're running the exact code from this repo.

### Building from source

To package a verifiable build yourself:

```
./package.sh
```

This stamps the git commit SHA, generates file hashes, and creates a zip ready for the Chrome Web Store.

## Contributing

Contributions welcome! Some ideas:

- Add more product recommendations with affiliate links
- Support additional AI providers
- Improve page text extraction for complex layouts
- Add a history/dashboard of analyzed pages
- Localization

## License

MIT
