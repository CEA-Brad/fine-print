// Fine Print - Product Recommendations
// Affiliate links should be configured per deployment

const RECOMMENDATIONS = {
  'data-collection': [
    {
      name: 'Mullvad VPN',
      description: 'Privacy-first VPN with no logging. Hides your IP and encrypts traffic.',
      url: 'https://mullvad.net',
      icon: '🛡️',
      tag: 'VPN',
    },
    {
      name: 'uBlock Origin',
      description: 'Open-source ad and tracker blocker for your browser.',
      url: 'https://ublockorigin.com',
      icon: '🚫',
      tag: 'Ad Blocker',
    },
  ],
  'data-sharing': [
    {
      name: 'NordVPN',
      description: 'Trusted VPN to keep your browsing private from data brokers.',
      url: 'https://nordvpn.com',
      icon: '🔒',
      tag: 'VPN',
    },
    {
      name: 'Privacy Badger',
      description: 'EFF-built tool that automatically blocks invisible trackers.',
      url: 'https://privacybadger.org',
      icon: '🦡',
      tag: 'Tracker Blocker',
    },
  ],
  'data-selling': [
    {
      name: 'ExpressVPN',
      description: 'High-speed VPN that prevents third-party data harvesting.',
      url: 'https://expressvpn.com',
      icon: '⚡',
      tag: 'VPN',
    },
    {
      name: 'DeleteMe',
      description: 'Remove your personal info from data broker sites.',
      url: 'https://joindeleteme.com',
      icon: '🗑️',
      tag: 'Data Removal',
    },
  ],
  tracking: [
    {
      name: 'Brave Browser',
      description: 'Privacy-focused browser with built-in ad and tracker blocking.',
      url: 'https://brave.com',
      icon: '🦁',
      tag: 'Browser',
    },
    {
      name: 'DuckDuckGo',
      description: 'Private search engine that doesn\'t track your searches.',
      url: 'https://duckduckgo.com',
      icon: '🔍',
      tag: 'Search Engine',
    },
  ],
  'legal-rights': [
    {
      name: 'EFF Membership',
      description: 'Support the Electronic Frontier Foundation fighting for digital rights.',
      url: 'https://eff.org/join',
      icon: '⚖️',
      tag: 'Advocacy',
    },
  ],
  'content-license': [
    {
      name: 'Backblaze',
      description: 'Secure cloud backup - keep control of your content.',
      url: 'https://backblaze.com',
      icon: '☁️',
      tag: 'Backup',
    },
  ],
  'account-termination': [
    {
      name: 'Backblaze',
      description: 'Automatic backups so you never lose data if an account is terminated.',
      url: 'https://backblaze.com',
      icon: '☁️',
      tag: 'Backup',
    },
  ],
  'policy-changes': [
    {
      name: 'Visualping',
      description: 'Monitor web pages for changes - get alerted when TOS change.',
      url: 'https://visualping.io',
      icon: '👁️',
      tag: 'Monitoring',
    },
  ],
  security: [
    {
      name: '1Password',
      description: 'Secure password manager to protect all your accounts.',
      url: 'https://1password.com',
      icon: '🔑',
      tag: 'Password Manager',
    },
    {
      name: 'Authy',
      description: 'Two-factor authentication app for an extra layer of security.',
      url: 'https://authy.com',
      icon: '📱',
      tag: '2FA',
    },
  ],
  'children-privacy': [
    {
      name: 'Bark',
      description: 'Parental monitoring to keep kids safe online.',
      url: 'https://bark.us',
      icon: '👨‍👩‍👧',
      tag: 'Parental Controls',
    },
  ],
};

function getRecommendations(concerns) {
  if (!concerns || concerns.length === 0) return [];

  const categories = [...new Set(concerns.map((c) => c.category))];
  const seen = new Set();
  const results = [];

  for (const category of categories) {
    const recs = RECOMMENDATIONS[category] || [];
    for (const rec of recs) {
      if (!seen.has(rec.name)) {
        seen.add(rec.name);
        results.push({ ...rec, forCategory: category });
      }
    }
  }

  return results;
}

// Export for use in sidepanel and popup
if (typeof window !== 'undefined') {
  window.FinePrintRecommendations = { getRecommendations, RECOMMENDATIONS };
}
