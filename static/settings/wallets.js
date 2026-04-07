(function () {

let walletDepsPromise = null;

async function loadWalletDeps() {
  if (walletDepsPromise) return walletDepsPromise;

  walletDepsPromise = (async () => {
    if (!window.QRCodeStyling) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-wallet="qr"]');
        if (existing) return resolve();
        const s = document.createElement("script");
        s.src = "https://unpkg.com/qr-code-styling@1.6.0/lib/qr-code-styling.js";
        s.dataset.wallet = "qr";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    if (!window._WCSignClient) {
      const module = await import("https://esm.sh/@walletconnect/sign-client@2.13.3");
      window._WCSignClient = module.SignClient;
    }

    window.dispatchEvent(new Event("wc-ready"));
  })();

  return walletDepsPromise;
}


const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const PROJECT_ID = "682e6293e0b2e46d9300f58949ebb2d6";

const DEEP_LINKS = {
  metamask: u => `https://metamask.app.link/wc?uri=${encodeURIComponent(u)}`,
  trust:    u => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(u)}`,
  coinbase: u => `https://go.cb-w.com/wc?uri=${encodeURIComponent(u)}`,
  okx:      u => `okx://main/wc?uri=${encodeURIComponent(u)}`,
  bitget:   u => `bitkeep://wc?uri=${encodeURIComponent(u)}`
};

const WALLETS = [
  {
    key: 'metamask',
    name: 'MetaMask',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: 'var(--text-main)',
    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.83 470.86"><defs><style>.a{fill:#e2761b;stroke:#e2761b}.a,.b,.c,.d,.e,.f,.g,.h,.i,.j{stroke-linecap:round;stroke-linejoin:round}.b{fill:#e4761b;stroke:#e4761b}.c{fill:#d7c1b3;stroke:#d7c1b3}.d{fill:#233447;stroke:#233447}.e{fill:#cd6116;stroke:#cd6116}.f{fill:#e4751f;stroke:#e4751f}.g{fill:#f6851b;stroke:#f6851b}.h{fill:#c0ad9e;stroke:#c0ad9e}.i{fill:#161616;stroke:#161616}.j{fill:#763d16;stroke:#763d16}</style></defs><polygon class="a" points="482.09 0.5 284.32 147.38 320.9 60.72 482.09 0.5"/><polygon class="b" points="25.54 0.5 221.72 148.77 186.93 60.72 25.54 0.5"/><polygon class="b" points="410.93 340.97 358.26 421.67 470.96 452.67 503.36 342.76 410.93 340.97"/><polygon class="b" points="4.67 342.76 36.87 452.67 149.57 421.67 96.9 340.97 4.67 342.76"/><polygon class="b" points="143.21 204.62 111.8 252.13 223.7 257.1 219.73 136.85 143.21 204.62"/><polygon class="b" points="364.42 204.62 286.91 135.46 284.32 257.1 396.03 252.13 364.42 204.62"/><polygon class="b" points="149.57 421.67 216.75 388.87 158.71 343.55 149.57 421.67"/><polygon class="b" points="290.88 388.87 358.26 421.67 348.92 343.55 290.88 388.87"/><polygon class="c" points="358.26 421.67 290.88 388.87 296.25 432.8 295.65 451.28 358.26 421.67"/><polygon class="c" points="149.57 421.67 212.18 451.28 211.78 432.8 216.75 388.87 149.57 421.67"/><polygon class="d" points="213.17 314.54 157.12 298.04 196.67 279.95 213.17 314.54"/><polygon class="d" points="294.46 314.54 310.96 279.95 350.71 298.04 294.46 314.54"/><polygon class="e" points="149.57 421.67 159.11 340.97 96.9 342.76 149.57 421.67"/><polygon class="e" points="348.72 340.97 358.26 421.67 410.93 342.76 348.72 340.97"/><polygon class="e" points="396.03 252.13 284.32 257.1 294.66 314.54 311.16 279.95 350.91 298.04 396.03 252.13"/><polygon class="e" points="157.12 298.04 196.87 279.95 213.17 314.54 223.7 257.1 111.8 252.13 157.12 298.04"/><polygon class="f" points="111.8 252.13 158.71 343.55 157.12 298.04 111.8 252.13"/><polygon class="f" points="350.91 298.04 348.92 343.55 396.03 252.13 350.91 298.04"/><polygon class="f" points="223.7 257.1 213.17 314.54 226.29 382.31 229.27 293.07 223.7 257.1"/><polygon class="f" points="284.32 257.1 278.96 292.87 281.34 382.31 294.66 314.54 284.32 257.1"/><polygon class="g" points="294.66 314.54 281.34 382.31 290.88 388.87 348.92 343.55 350.91 298.04 294.66 314.54"/><polygon class="g" points="157.12 298.04 158.71 343.55 216.75 388.87 226.29 382.31 213.17 314.54 157.12 298.04"/><polygon class="h" points="295.65 451.28 296.25 432.8 291.28 428.42 216.35 428.42 211.78 432.8 212.18 451.28 149.57 421.67 171.43 439.55 215.75 470.36 291.88 470.36 336.4 439.55 358.26 421.67 295.65 451.28"/><polygon class="i" points="290.88 388.87 281.34 382.31 226.29 382.31 216.75 388.87 211.78 432.8 216.35 428.42 291.28 428.42 296.25 432.8 290.88 388.87"/><polygon class="j" points="490.44 156.92 507.33 75.83 482.09 0.5 290.88 142.41 364.42 204.62 468.37 235.03 491.43 208.2 481.49 201.05 497.39 186.54 485.07 177 500.97 164.87 490.44 156.92"/><polygon class="j" points="0.5 75.83 17.39 156.92 6.66 164.87 22.56 177 10.44 186.54 26.34 201.05 16.4 208.2 39.26 235.03 143.21 204.62 216.75 142.41 25.54 0.5 0.5 75.83"/><polygon class="g" points="468.37 235.03 364.42 204.62 396.03 252.13 348.92 343.55 410.93 342.76 503.36 342.76 468.37 235.03"/><polygon class="g" points="143.21 204.62 39.26 235.03 4.67 342.76 96.9 342.76 158.71 343.55 111.8 252.13 143.21 204.62"/><polygon class="g" points="284.32 257.1 290.88 142.41 321.1 60.72 186.93 60.72 216.75 142.41 223.7 257.1 226.09 293.27 226.29 382.31 281.34 382.31 281.74 293.27 284.32 257.1"/></svg>`
  },
  {
    key: 'trust',
    name: 'Trust Wallet',
    descDefault: 'Mobile · by Binance',
    descMobile: 'Tap to open wallet app',
    iconBg: 'var(--text-main)',
    iconHTML: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M37.523 83.593L255.21 13.046v488.371C99.709 436.301 37.523 311.5 37.523 240.964V83.593z" fill="#0500ff"/><path d="M38.154 6.673L19.433.606v42c13.372-5.6 18.721-16.333 18.721-22.399V6.673z" fill="url(#tw2)" transform="matrix(11.62788 0 0 11.62788 29.256 6)"/><defs><linearGradient id="tw2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(107.581 17.445 10.98) scale(46.5663)"><stop offset="0" stop-color="#00f"/><stop offset=".08" stop-color="#0094ff"/><stop offset=".16" stop-color="#48ff91"/><stop offset=".42" stop-color="#0094ff"/><stop offset=".68" stop-color="#0038ff"/><stop offset="1" stop-color="#0500ff"/></linearGradient></defs></svg>`
  },
  {
    key: 'coinbase',
    name: 'Coinbase Wallet',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: '#0052ff',
    iconHTML: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><circle cx="512" cy="512" r="512" fill="#0052ff"/><path d="M516.3 361.83c60.28 0 108.1 37.18 126.26 92.47H764C742 336.09 644.47 256 517.27 256 372.82 256 260 365.65 260 512.49S370 768 517.27 768c124.35 0 223.82-80.09 245.84-199.28H642.55c-17.22 55.3-65 93.45-125.32 93.45-83.23 0-141.56-63.89-141.56-149.68.04-86.77 57.43-150.66 140.63-150.66z" fill="#fff"/></svg>`
  },
  {
    key: 'okx',
    name: 'OKX Wallet',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: 'currentColor',
    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="13.81 13.57 123.98 123.98"><path d="M40.63 42.21c0-.87.71-1.58 1.58-1.58h20.3c.87 0 1.58.71 1.58 1.58v20.3c0 .88-.71 1.59-1.58 1.59h-20.3c-.87 0-1.58-.71-1.58-1.59v-20.3zm23.46 66.7c0 .87-.71 1.58-1.58 1.58h-20.3c-.87 0-1.58-.71-1.58-1.58v-20.3c0-.88.71-1.59 1.58-1.59h20.3c.87 0 1.58.71 1.58 1.59v20.3zm21.86-21.62h-20.3c-.87 0-1.59-.71-1.59-1.59v-20.3c0-.87.71-1.59 1.59-1.59h20.3c.87 0 1.59.71 1.59 1.59v20.3c0 .87-.71 1.59-1.59 1.59zm25.05 21.62c0 .87-.71 1.58-1.59 1.58h-20.3c-.87 0-1.58-.71-1.58-1.58v-20.3c0-.88.71-1.59 1.58-1.59h20.3c.87 0 1.59.71 1.59 1.59v20.3zm0-46.41c0 .88-.71 1.59-1.59 1.59h-20.3c-.87 0-1.58-.71-1.58-1.59v-20.3c0-.87.71-1.58 1.58-1.58h20.3c.87 0 1.59.71 1.59 1.58v20.3z" fill="#FFFFFF"/></svg>`
  },
  {
    key: 'bitget',
    name: 'Bitget Wallet',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: '#022f34',
    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="transparent"/><path d="M150 110 Q140 100 155 100 L220 100 Q235 100 250 120 L300 180 Q315 200 300 220 L250 280 Q235 300 220 300 L155 300 Q140 300 150 290 L230 200 Z" fill="#1fcad3"/></svg>`
  }
];


// Add this constant near your other constants at the top
const WC_NAMESPACES = {
  requiredNamespaces: {
    eip155: {
      methods: ['personal_sign'],
      chains: ['eip155:1'],
      events: ['accountsChanged', 'chainChanged']
    }
  },
  optionalNamespaces: {
    eip155: {
      methods: ['eth_sign', 'eth_sendTransaction', 'eth_signTypedData_v4'],
      chains: [
        'eip155:1',      // Ethereum
        'eip155:56',     // BNB Chain  ← Trust Wallet users are often here
        'eip155:137',    // Polygon
        'eip155:42161',  // Arbitrum
        'eip155:10',     // Optimism
        'eip155:8453',   // Base
        'eip155:43114',  // Avalanche
      ],
      events: ['accountsChanged', 'chainChanged']
    }
  }
};

const WALLETSInit = [
  {
    key: 'metamask',
    name: 'MetaMask',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: 'var(--text-main)',
    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 507.83 470.86"><defs><style>.a{fill:#e2761b;stroke:#e2761b}.a,.b,.c,.d,.e,.f,.g,.h,.i,.j{stroke-linecap:round;stroke-linejoin:round}.b{fill:#e4761b;stroke:#e4761b}.c{fill:#d7c1b3;stroke:#d7c1b3}.d{fill:#233447;stroke:#233447}.e{fill:#cd6116;stroke:#cd6116}.f{fill:#e4751f;stroke:#e4751f}.g{fill:#f6851b;stroke:#f6851b}.h{fill:#c0ad9e;stroke:#c0ad9e}.i{fill:#161616;stroke:#161616}.j{fill:#763d16;stroke:#763d16}</style></defs><polygon class="a" points="482.09 0.5 284.32 147.38 320.9 60.72 482.09 0.5"/><polygon class="b" points="25.54 0.5 221.72 148.77 186.93 60.72 25.54 0.5"/><polygon class="b" points="410.93 340.97 358.26 421.67 470.96 452.67 503.36 342.76 410.93 340.97"/><polygon class="b" points="4.67 342.76 36.87 452.67 149.57 421.67 96.9 340.97 4.67 342.76"/><polygon class="b" points="143.21 204.62 111.8 252.13 223.7 257.1 219.73 136.85 143.21 204.62"/><polygon class="b" points="364.42 204.62 286.91 135.46 284.32 257.1 396.03 252.13 364.42 204.62"/><polygon class="b" points="149.57 421.67 216.75 388.87 158.71 343.55 149.57 421.67"/><polygon class="b" points="290.88 388.87 358.26 421.67 348.92 343.55 290.88 388.87"/><polygon class="c" points="358.26 421.67 290.88 388.87 296.25 432.8 295.65 451.28 358.26 421.67"/><polygon class="c" points="149.57 421.67 212.18 451.28 211.78 432.8 216.75 388.87 149.57 421.67"/><polygon class="d" points="213.17 314.54 157.12 298.04 196.67 279.95 213.17 314.54"/><polygon class="d" points="294.46 314.54 310.96 279.95 350.71 298.04 294.46 314.54"/><polygon class="e" points="149.57 421.67 159.11 340.97 96.9 342.76 149.57 421.67"/><polygon class="e" points="348.72 340.97 358.26 421.67 410.93 342.76 348.72 340.97"/><polygon class="e" points="396.03 252.13 284.32 257.1 294.66 314.54 311.16 279.95 350.91 298.04 396.03 252.13"/><polygon class="e" points="157.12 298.04 196.87 279.95 213.17 314.54 223.7 257.1 111.8 252.13 157.12 298.04"/><polygon class="f" points="111.8 252.13 158.71 343.55 157.12 298.04 111.8 252.13"/><polygon class="f" points="350.91 298.04 348.92 343.55 396.03 252.13 350.91 298.04"/><polygon class="f" points="223.7 257.1 213.17 314.54 226.29 382.31 229.27 293.07 223.7 257.1"/><polygon class="f" points="284.32 257.1 278.96 292.87 281.34 382.31 294.66 314.54 284.32 257.1"/><polygon class="g" points="294.66 314.54 281.34 382.31 290.88 388.87 348.92 343.55 350.91 298.04 294.66 314.54"/><polygon class="g" points="157.12 298.04 158.71 343.55 216.75 388.87 226.29 382.31 213.17 314.54 157.12 298.04"/><polygon class="h" points="295.65 451.28 296.25 432.8 291.28 428.42 216.35 428.42 211.78 432.8 212.18 451.28 149.57 421.67 171.43 439.55 215.75 470.36 291.88 470.36 336.4 439.55 358.26 421.67 295.65 451.28"/><polygon class="i" points="290.88 388.87 281.34 382.31 226.29 382.31 216.75 388.87 211.78 432.8 216.35 428.42 291.28 428.42 296.25 432.8 290.88 388.87"/><polygon class="j" points="490.44 156.92 507.33 75.83 482.09 0.5 290.88 142.41 364.42 204.62 468.37 235.03 491.43 208.2 481.49 201.05 497.39 186.54 485.07 177 500.97 164.87 490.44 156.92"/><polygon class="j" points="0.5 75.83 17.39 156.92 6.66 164.87 22.56 177 10.44 186.54 26.34 201.05 16.4 208.2 39.26 235.03 143.21 204.62 216.75 142.41 25.54 0.5 0.5 75.83"/><polygon class="g" points="468.37 235.03 364.42 204.62 396.03 252.13 348.92 343.55 410.93 342.76 503.36 342.76 468.37 235.03"/><polygon class="g" points="143.21 204.62 39.26 235.03 4.67 342.76 96.9 342.76 158.71 343.55 111.8 252.13 143.21 204.62"/><polygon class="g" points="284.32 257.1 290.88 142.41 321.1 60.72 186.93 60.72 216.75 142.41 223.7 257.1 226.09 293.27 226.29 382.31 281.34 382.31 281.74 293.27 284.32 257.1"/></svg>`
  },
  {
    key: 'trust',
    name: 'Trust Wallet',
    descDefault: 'Mobile · by Binance',
    descMobile: 'Tap to open wallet app',
    iconBg: 'var(--text-main)',
    iconHTML: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M37.523 83.593L255.21 13.046v488.371C99.709 436.301 37.523 311.5 37.523 240.964V83.593z" fill="#0500ff"/><path d="M38.154 6.673L19.433.606v42c13.372-5.6 18.721-16.333 18.721-22.399V6.673z" fill="url(#tw2)" transform="matrix(11.62788 0 0 11.62788 29.256 6)"/><defs><linearGradient id="tw2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(107.581 17.445 10.98) scale(46.5663)"><stop offset="0" stop-color="#00f"/><stop offset=".08" stop-color="#0094ff"/><stop offset=".16" stop-color="#48ff91"/><stop offset=".42" stop-color="#0094ff"/><stop offset=".68" stop-color="#0038ff"/><stop offset="1" stop-color="#0500ff"/></linearGradient></defs></svg>`
  },
  {
    key: 'coinbase',
    name: 'Coinbase Wallet',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: '#0052ff',
    iconHTML: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><circle cx="512" cy="512" r="512" fill="#0052ff"/><path d="M516.3 361.83c60.28 0 108.1 37.18 126.26 92.47H764C742 336.09 644.47 256 517.27 256 372.82 256 260 365.65 260 512.49S370 768 517.27 768c124.35 0 223.82-80.09 245.84-199.28H642.55c-17.22 55.3-65 93.45-125.32 93.45-83.23 0-141.56-63.89-141.56-149.68.04-86.77 57.43-150.66 140.63-150.66z" fill="#fff"/></svg>`
  },
  {
    key: 'okx',
    name: 'OKX Wallet',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: '#000',
    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="13.81 13.57 123.98 123.98"><path d="M40.63 42.21c0-.87.71-1.58 1.58-1.58h20.3c.87 0 1.58.71 1.58 1.58v20.3c0 .88-.71 1.59-1.58 1.59h-20.3c-.87 0-1.58-.71-1.58-1.59v-20.3zm23.46 66.7c0 .87-.71 1.58-1.58 1.58h-20.3c-.87 0-1.58-.71-1.58-1.58v-20.3c0-.88.71-1.59 1.58-1.59h20.3c.87 0 1.58.71 1.58 1.59v20.3zm21.86-21.62h-20.3c-.87 0-1.59-.71-1.59-1.59v-20.3c0-.87.71-1.59 1.59-1.59h20.3c.87 0 1.59.71 1.59 1.59v20.3c0 .87-.71 1.59-1.59 1.59zm25.05 21.62c0 .87-.71 1.58-1.59 1.58h-20.3c-.87 0-1.58-.71-1.58-1.58v-20.3c0-.88.71-1.59 1.58-1.59h20.3c.87 0 1.59.71 1.59 1.59v20.3zm0-46.41c0 .88-.71 1.59-1.59 1.59h-20.3c-.87 0-1.58-.71-1.58-1.59v-20.3c0-.87.71-1.58 1.58-1.58h20.3c.87 0 1.59.71 1.59 1.58v20.3z" fill="000"/></svg>`
  },
  {
    key: 'bitget',
    name: 'Bitget Wallet',
    descDefault: 'Browser extension or mobile',
    descMobile: 'Tap to open wallet app',
    iconBg: '#022f34',
    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="transparent"/><path d="M150 110 Q140 100 155 100 L220 100 Q235 100 250 120 L300 180 Q315 200 300 220 L250 280 Q235 300 220 300 L155 300 Q140 300 150 290 L230 200 Z" fill="#1fcad3"/></svg>`
  }
];



const injectedChecks = {
  // Only true MetaMask: isMetaMask=true but NO other wallet's signature flag
  metamask: p => !!(p.isMetaMask && !p.isCoinbaseWallet && !p.isBitKeep && !p.isBitget
                    && !p.isOKX && !p.isOKExWallet && !p.isTrust
                    && !p.isBraveWallet && !p.isRabby),

  coinbase: p => !!(p.isCoinbaseWallet),

  // OKX: check its own flags first, explicitly exclude MetaMask spoof
  okx:      p => !!(p.isOKX || p.isOKExWallet),

  // Bitget: check its own flags, explicitly exclude MetaMask spoof  
  bitget:   p => !!(p.isBitKeep || p.isBitget),

  trust:    p => !!(p.isTrust)
};

function getProvider(k) {
  if (!window.ethereum) return null;

  // Multi-provider array (e.g. MetaMask + Coinbase both installed in desktop browser)
  if (window.ethereum.providers?.length) {
    return window.ethereum.providers.find(injectedChecks[k]) || null;
  }

  // Single provider (in-app wallet browser, or only one wallet installed)
  // Extra guard: in OKX/Bitget browsers, don't match metamask
  if (k === 'metamask') {
    // In a wallet's own browser, the provider is that wallet — don't misdetect as MetaMask
    const p = window.ethereum;
    if (p.isOKX || p.isOKExWallet || p.isBitKeep || p.isBitget || p.isTrust || p.isCoinbaseWallet) {
      return null; // It's a spoofing wallet, not real MetaMask
    }
  }

  return injectedChecks[k](window.ethereum) ? window.ethereum : null;
}

function detectWallets() {
  const detected = new Set();
  WALLETS.forEach(w => { if (getProvider(w.key)) detected.add(w.key); });
  return detected;
}




const WALLET_SVG_FOR_QR = {
  metamask:  WALLETS.find(w => w.key === 'metamask').iconHTML,
  trust:     WALLETS.find(w => w.key === 'trust').iconHTML,
  coinbase:  WALLETS.find(w => w.key === 'coinbase').iconHTML,
  okx:       WALLETS.find(w => w.key === 'okx').iconHTML,
  bitget:    WALLETS.find(w => w.key === 'bitget').iconHTML,
  universal: `<svg fill="none" viewBox="0 0 480 332" width="50" height="50" xmlns="http://www.w3.org/2000/svg"><path d="m126.613 93.9842c62.622-61.3123 164.152-61.3123 226.775 0l7.536 7.3788c3.131 3.066 3.131 8.036 0 11.102l-25.781 25.242c-1.566 1.533-4.104 1.533-5.67 0l-10.371-10.154c-43.687-42.7734-114.517-42.7734-158.204 0l-11.107 10.874c-1.565 1.533-4.103 1.533-5.669 0l-25.781-25.242c-3.132-3.066-3.132-8.036 0-11.102zm280.093 52.2038 22.946 22.465c3.131 3.066 3.131 8.036 0 11.102l-103.463 101.301c-3.131 3.065-8.208 3.065-11.339 0l-73.432-71.896c-.783-.767-2.052-.767-2.835 0l-73.43 71.896c-3.131 3.065-8.208 3.065-11.339 0l-103.4657-101.302c-3.1311-3.066-3.1311-8.036 0-11.102l22.9456-22.466c3.1311-3.065 8.2077-3.065 11.3388 0l73.4333 71.897c.782.767 2.051.767 2.834 0l73.429-71.897c3.131-3.065 8.208-3.065 11.339 0l73.433 71.897c.783.767 2.052.767 2.835 0l73.431-71.895c3.132-3.066 8.208-3.066 11.339 0z" fill="#3B99FC"/></svg>`
};


const WALLET_SVG_FOR_QR_INIT = {
  metamask:  WALLETSInit.find(w => w.key === 'metamask').iconHTML,
  trust:     WALLETSInit.find(w => w.key === 'trust').iconHTML,
  coinbase:  WALLETSInit.find(w => w.key === 'coinbase').iconHTML,
  okx:       WALLETSInit.find(w => w.key === 'okx').iconHTML,
  bitget:    WALLETSInit.find(w => w.key === 'bitget').iconHTML,
  universal: `<svg fill="none" viewBox="0 0 480 332" width="50" height="50" xmlns="http://www.w3.org/2000/svg"><path d="m126.613 93.9842c62.622-61.3123 164.152-61.3123 226.775 0l7.536 7.3788c3.131 3.066 3.131 8.036 0 11.102l-25.781 25.242c-1.566 1.533-4.104 1.533-5.67 0l-10.371-10.154c-43.687-42.7734-114.517-42.7734-158.204 0l-11.107 10.874c-1.565 1.533-4.103 1.533-5.669 0l-25.781-25.242c-3.132-3.066-3.132-8.036 0-11.102zm280.093 52.2038 22.946 22.465c3.131 3.066 3.131 8.036 0 11.102l-103.463 101.301c-3.131 3.065-8.208 3.065-11.339 0l-73.432-71.896c-.783-.767-2.052-.767-2.835 0l-73.43 71.896c-3.131 3.065-8.208 3.065-11.339 0l-103.4657-101.302c-3.1311-3.066-3.1311-8.036 0-11.102l22.9456-22.466c3.1311-3.065 8.2077-3.065 11.3388 0l73.4333 71.897c.782.767 2.051.767 2.834 0l73.429-71.897c3.131-3.065 8.208-3.065 11.339 0l73.433 71.897c.783.767 2.052.767 2.835 0l73.431-71.895c3.132-3.066 8.208-3.066 11.339 0z" fill="#3B99FC"/></svg>`
};


const WALLET_BG = {
  metamask:  'var(--text-main)',
  trust:     'var(--text-main)',
  coinbase:  '#0052ff',
  okx:       '#000000',
  bitget:    '#022f34',
  universal: 'var(--text-main)'
};

function buildWalletList() {
  const detectedKeys = detectWallets();
  const container = document.getElementById('wallet-list-container');
  container.innerHTML = '';

  const detected = WALLETS.filter(w => detectedKeys.has(w.key));
  const others   = WALLETS.filter(w => !detectedKeys.has(w.key));

  if (detected.length > 0) {
    const lbl = document.createElement('div');
    lbl.className = 'section-label';
    lbl.textContent = 'Detected';
    container.appendChild(lbl);

    detected.forEach(w => container.appendChild(makeWalletItem(w, true)));

    if (others.length > 0) {
      const div = document.createElement('div');
      div.className = 'divider';
      container.appendChild(div);
      const lbl2 = document.createElement('div');
      lbl2.className = 'section-label';
      lbl2.textContent = 'Other wallets';
      container.appendChild(lbl2);
    }
  }

  others.forEach(w => container.appendChild(makeWalletItem(w, false)));

  const div2 = document.createElement('div');
  div2.className = 'divider';
  container.appendChild(div2);

  const qrRow = document.createElement('div');
  qrRow.className = 'wallet-item qr-row';
  qrRow.onclick = showUniversalQR;
  qrRow.innerHTML = `
    <div class="w-icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <rect x="3" y="3" width="7" height="7" rx="1.2" stroke="#818cf8" stroke-width="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.2" stroke="#818cf8" stroke-width="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.2" stroke="#818cf8" stroke-width="1.5"/>
        <rect x="5" y="5" width="3" height="3" rx=".4" fill="#818cf8"/>
        <rect x="16" y="5" width="3" height="3" rx=".4" fill="#818cf8"/>
        <rect x="5" y="16" width="3" height="3" rx=".4" fill="#818cf8"/>
        <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="w-info">
      <div class="w-name" style="color:var(--accent2)">Scan QR Code <span class="w-tag">ANY WALLET</span></div>
      <div class="w-desc">Works with any WalletConnect app</div>
    </div>
    <span class="w-arrow" style="color:var(--accent2)">›</span>
  `;
  container.appendChild(qrRow);
}

function makeWalletItem(w, isDetected) {
  const item = document.createElement('div');
  item.className = 'wallet-item' + (isDetected ? ' detected' : '');
  item.onclick = () => pick(w.name, w.key);

  const desc = isMobile ? w.descMobile : (isDetected ? 'Ready to connect' : w.descDefault);
  const tag  = isDetected ? `<span class="w-tag detected-tag">DETECTED</span>` : '';

  item.innerHTML = `
    <div class="w-icon" style="background-color:${w.iconBg}; border-color: ${w.iconBg}">
      ${w.iconHTML}
    </div>
    <div class="w-info">
      <div class="w-name">${w.name}${tag}</div>
      <div class="w-desc">${desc}</div>
    </div>
    <span class="w-arrow">›</span>
  `;
  return item;
}

let signClient = null, session = null, pendingUri = null, pendingWalletKey = null;

// Add this new helper:
async function resetAndInitWC() {
  // Disconnect any lingering session silently
  if (session && signClient) {
    signClient.disconnect({
      topic: session.topic,
      reason: { code: 6000, message: 'Reset' }
    }).catch(() => {});
  }
  session = null;
  signClient = null;   // force fresh init
  await initWC();
}

// Replace initWC with this:
async function initWC() {
  // Always create a fresh client — reusing stale ones causes silent timeout bugs
  for (let i = 0; i < 60; i++) {
    if (window._WCSignClient) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!window._WCSignClient) throw new Error('WC not loaded');
  signClient = await window._WCSignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: "Gleyo",
      description: "Secure wallet connection",
      url: window.location.origin || "https://gleyo.app",
      icons: ["https://gleyo.app/static/my_logo.png"]
    }
  });
}

const IsloadingInit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="20" height="20"><radialGradient id="a11" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="currentColor" stop-opacity="0"></stop><stop offset=".2" stop-color="currentColor" stop-opacity=".3"></stop><stop offset=".4" stop-color="currentColor" stop-opacity=".6"></stop><stop offset=".7" stop-color="currentColor" stop-opacity=".9"></stop><stop offset="1" stop-color="currentColor"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a11)" stroke-width="20" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="0;360" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="currentColor" stroke-width="20" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>`;

async function openModal() {
  const btn = document.getElementById('connect-btn');
  btn.innerHTML = IsloadingInit;
  try {
    await loadWalletDeps();
  } catch (e) {
    btn.innerHTML = "Connect Wallet";
    return;
  }
  btn.innerHTML = "Connect Wallet";
  buildWalletList();
  document.getElementById('modal-overlay').classList.add('open');
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  showView('view-list');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
}

const sheet = document.getElementById("sheet");
let startY = 0, currentY = 0, isDragging = false;

sheet.addEventListener("touchstart", (e) => {
  if (!e.target.closest(".sheet-handle, .sheet-head")) return;
  startY = e.touches[0].clientY; isDragging = true; sheet.style.transition = "none";
}, { passive: true });

sheet.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  currentY = e.touches[0].clientY;
  let delta = currentY - startY; if (delta < 0) delta = 0;
  e.preventDefault(); sheet.style.transform = `translateY(${delta}px)`;
}, { passive: false });

sheet.addEventListener("touchend", () => {
  if (!isDragging) return; isDragging = false;
  sheet.style.transition = "transform .3s ease";
  if (currentY - startY > 120) { closeModal(); sheet.style.transform = ""; }
  else sheet.style.transform = "translateY(0)";
});

function overlayClick(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }
function backToList() { showView('view-list'); }
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showErr(msg) {
  const b = document.getElementById('err-bar');
  b.textContent = msg; b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 6000);
}
function setLogo(key) {
  const el = document.getElementById('conn-logo-bg');
  const w = WALLETS.find(w => w.key === key);
  el.innerHTML = w ? w.iconHTML : WALLET_SVG_FOR_QR.universal;
  el.style.background = WALLET_BG[key] || 'var(--text-main)';
}

async function pick(name, key) {
  const p = getProvider(key);
  if (p) return connectInjected(p, name, key);
  return connectViaWC(name, key);
}

async function connectInjected(provider, name, key) {
  setLogo(key);
  document.getElementById('conn-name').textContent = name;
  document.getElementById('conn-status').textContent = 'Approve in your wallet extension…';
  showView('view-connecting');
  try {
    const accs = await provider.request({ method: 'eth_requestAccounts' });
    await signInjected(provider, accs[0], name);
  } catch (e) {
    showView('view-list');
    showErr('Connection rejected.');
  }
}

async function signInjected(provider, address, name) {
  document.getElementById('sign-name').textContent = name;

  // ✅ FIX: getNonce error is now caught and surfaced properly
  let nonce;
  try {
    nonce = await getNonce(address);
  } catch (e) {
    showView('view-list');
    showErr('Failed to get nonce. Please try again.');
    return;
  }

  const msg = `Welcome to Gleyo\n\nSign this message to verify your wallet.\n\nNonce: ${nonce}\nTime: ${new Date().toISOString()}`;
  document.getElementById('sign-preview').textContent = msg;
  showView('view-sign');
  try {
    const sig = await provider.request({ method: 'personal_sign', params: [msg, address] });
    onConnected(name, address, sig, msg);
  } catch (e) {
    showView('view-list');
    showErr('Signature rejected.');
  }
}

async function connectViaWC(name, key) {
  setLogo(key);
  document.getElementById('conn-name').textContent = name;
  document.getElementById('conn-status').textContent = 'Initialising WalletConnect…';
  showView('view-connecting');

  try { await resetAndInitWC(); }   // ← reset, not just init
  catch (e) { showView('view-list'); showErr('Could not load WalletConnect.'); return; }

  document.getElementById('conn-status').textContent = 'Generating connection…';
  try {
    const { uri, approval } = await signClient.connect(WC_NAMESPACES);
    if (!uri) { showView('view-list'); showErr('Failed to get URI.'); return; }
    pendingUri = uri; pendingWalletKey = key;
    await renderQRView(uri, name, key);

    // Add a timeout so it doesn't hang forever
    const approvalWithTimeout = Promise.race([
      approval(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 120000))
    ]);

    approvalWithTimeout.then(async sess => {
      session = sess;
      const accounts = sess.namespaces.eip155?.accounts || [];
      if (!accounts.length) {
        showView('view-list');
        showErr('No accounts returned from wallet.');
        return;
      }
      const addr = accounts[0].split(':')[2];
      try {
        await signWC(addr, name);
      } catch (e) {
        showView('view-list');
        showErr('Signing failed: ' + (e.message || 'Unknown error'));
      }
    }).catch((e) => {
      showView('view-list');
      showErr(e?.message === 'timeout' ? 'Connection timed out. Please try again.' : 'Session rejected.');
    });

  } catch (e) {
    showView('view-list');
    showErr('WalletConnect error: ' + (e.message || 'Unknown'));
  }
}

async function showUniversalQR() {
  setLogo('universal');
  document.getElementById('conn-name').textContent = 'WalletConnect';
  document.getElementById('conn-status').textContent = 'Generating QR code…';
  showView('view-connecting');

  try { await resetAndInitWC(); }   // ← reset, not just init
  catch (e) { showView('view-list'); showErr('Could not load WalletConnect.'); return; }

  try {
    const { uri, approval } = await signClient.connect(WC_NAMESPACES);
    if (!uri) { showView('view-list'); showErr('Failed.'); return; }
    pendingUri = uri; pendingWalletKey = null;
    await renderQRView(uri, 'any wallet', null);

    const approvalWithTimeout = Promise.race([
      approval(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 120000))
    ]);

    approvalWithTimeout.then(async sess => {
      session = sess;
      const accounts = sess.namespaces.eip155?.accounts || [];
      if (!accounts.length) {
        showView('view-list');
        showErr('No accounts returned from wallet.');
        return;
      }
      const addr = accounts[0].split(':')[2];
      try {
        await signWC(addr, 'WalletConnect');   // ✅ fixed: was `name` (undefined)
      } catch (e) {
        showView('view-list');
        showErr('Signing failed: ' + (e.message || 'Unknown error'));
      }
    }).catch((e) => {
      showView('view-list');
      showErr(e?.message === 'timeout' ? 'Connection timed out. Please try again.' : 'Session timed out.');
    });

  } catch (e) {
    showView('view-list');
    showErr('Error: ' + (e.message || 'Unknown'));
  }
}




async function svgToPngDataUrl(svgString, size = 120) {
  return new Promise((resolve) => {

    // 1. Inject explicit width/height into the SVG root element
    //    iOS Safari needs these — viewBox alone is not enough
    let svg = svgString.trim();
    svg = svg.replace(/<svg([^>]*)>/, (match, attrs) => {
      // Remove any existing width/height first, then add explicit ones
      const cleaned = attrs.replace(/\s*(width|height)="[^"]*"/g, '');
      return `<svg${cleaned} width="${size}" height="${size}">`;
    });

    // 2. For MetaMask's SVG: convert <style> class rules to inline styles
    //    iOS Safari strips <style> blocks from SVGs rendered in canvas
    if (svg.includes('<style>') && svg.includes('.a{') ) {
      // Extract rules from the <style> block
      const styleMatch = svg.match(/<style>([\s\S]*?)<\/style>/);
      if (styleMatch) {
        const styleText = styleMatch[1];
        // Parse class → style map
        const classMap = {};
        const ruleRe = /\.(\w+)\{([^}]+)\}/g;
        let m;
        while ((m = ruleRe.exec(styleText)) !== null) {
          // Convert stroke-linecap etc. to inline-safe format
          classMap[m[1]] = m[2].replace(/stroke-linecap:[^;]+;?/g, '')
                                .replace(/stroke-linejoin:[^;]+;?/g, '');
        }
        // Remove the <style> block
        svg = svg.replace(/<style>[\s\S]*?<\/style>/, '');
        // Replace class="x" with style="..."
        svg = svg.replace(/class="([^"]+)"/g, (match, cls) => {
          const style = classMap[cls] || '';
          return style ? `style="${style}"` : '';
        });
      }
    }

    // 3. Use base64 data URI instead of blob URL — works reliably on all iOS versions
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    const dataUrl = `data:image/svg+xml;base64,${encoded}`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // 4. Wrap in try/catch — iOS may still throw a security error on drawImage
      try {
        ctx.drawImage(img, 0, 0, size, size);
        const result = canvas.toDataURL('image/png');
        // 5. Detect blank canvas (all transparent) — means iOS silently failed
        //    A blank PNG is 68–72 bytes when base64'd; real content is much larger
        if (result.length < 200) {
          resolve(null);
        } else {
          resolve(result);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function renderQRView(uri, walletName, walletKey) {
  document.getElementById('qr-title').textContent = walletKey ? `Connect with ${walletName}` : 'Scan with any wallet';
  document.getElementById('qr-desc').textContent  = walletKey ? `Open ${walletName} and scan this code` : 'Open any WalletConnect wallet and scan';
  const canvasWrap = document.querySelector(".qr-wrap");
  canvasWrap.innerHTML = "";

  try {
    const size = 240, dpr = window.devicePixelRatio || 1;
    const svgString = walletKey ? WALLET_SVG_FOR_QR_INIT[walletKey] : WALLET_SVG_FOR_QR_INIT.universal;

    // Convert SVG → PNG data URL first (fixes iOS/Safari canvas restrictions)
    const pngDataUrl = await svgToPngDataUrl(svgString, 120);

    const qr = new QRCodeStyling({
      width: size * dpr, height: size * dpr, type: "canvas", data: uri,
      qrOptions: { errorCorrectionLevel: "H" },
      dotsOptions: { color: "#000", type: "rounded" },
      backgroundOptions: { color: "transparent" },
      ...(pngDataUrl ? {
        image: pngDataUrl,
        imageOptions: { imageSize: 0.20, margin: 6 }
      } : {}),
      cornersSquareOptions: { type: "extra-rounded", color: "#000" },
      cornersDotOptions: { type: "dot", color: "#000" }
    });
    qr.append(canvasWrap);
    const canvas = canvasWrap.querySelector("canvas");
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
  } catch (e) {
    const canvas = document.createElement("canvas");
    canvas.width = 220; canvas.height = 220;
    canvasWrap.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 220, 220);
  }

  document.getElementById('qr-uri-text').textContent = uri.slice(0, 90) + '…';
  const dlBtn = document.getElementById('deep-link-btn');
  if (isMobile && walletKey && DEEP_LINKS[walletKey]) {
    dlBtn.style.display = 'block'; dlBtn.textContent = `Open in ${walletName}`;
  } else dlBtn.style.display = 'none';
  showView('view-qr');
}

function openDeepLink() {
  if (!pendingUri || !pendingWalletKey) return;
  const fn = DEEP_LINKS[pendingWalletKey];
  if (fn) window.open(fn(pendingUri), '_blank');
}

async function signWC(address, name) {
  const signNameEl = document.getElementById('sign-name');
  if (signNameEl) signNameEl.textContent = name;

  const nonce = await getNonce(address);
  const msg = `Welcome to Gleyo\n\nSign this message to verify your wallet.\n\nNonce: ${nonce}\nTime: ${new Date().toISOString()}`;

  const signPreviewEl = document.getElementById('sign-preview');
  if (signPreviewEl) signPreviewEl.textContent = msg;

  showView('view-sign');

  // Derive the actual chainId from the session (Trust Wallet may be on BSC, not mainnet)
  const accounts = session.namespaces.eip155?.accounts || [];
  const firstAccount = accounts[0] || 'eip155:1:0x0000000000000000000000000000000000000000';
  const parts = firstAccount.split(':');
  const chainId = `eip155:${parts[1]}`; // e.g. "eip155:56" if on BSC

  let sig;
  try {
    sig = await signClient.request({
      topic: session.topic,
      chainId,  // ← use actual chain, not hardcoded eip155:1
      request: { method: 'personal_sign', params: [msg, address] }
    });
  } catch (e) {
    showView('view-list');
    showErr('Signature rejected.');
    throw e;
  }

  onConnected(name, address, sig, msg);
}

function onConnected(name, address, sig, message) {

  const walletLbl = document.getElementById('conn-wallet-lbl');
  if (walletLbl) walletLbl.textContent = name;

  const addrEl = document.getElementById('conn-addr');
  if (addrEl) {
    addrEl.textContent = address.slice(0, 6) + '...' + address.slice(-4);
  }

  const statusEl = document.getElementById('conn-status');
  if (statusEl) statusEl.innerHTML = '<span class="status-dot"></span>Active';

  const sigStatus = document.getElementById('conn-sig-status');
  if (sigStatus) {
    sigStatus.textContent = "✓ Verified";
    sigStatus.style.color = "var(--green)";
  }

  const sigEl = document.getElementById('sig-display');
  if (sigEl) {
    sigEl.textContent = sig.slice(0, 12) + "..." + sig.slice(-8);
    sigEl.classList.remove('hidden');
  }

  const discBtn = document.getElementById('disc-btn');
  if (discBtn) discBtn.classList.remove('hidden');

  document.getElementById('state-nc').classList.remove('active');
  document.getElementById('state-c').classList.add('active');

  sendWalletToBackend(name, address, sig, message);
  closeModal();
}


function onDisconnectUI() {

  const statusEl = document.getElementById('conn-status');
  if (statusEl) statusEl.innerHTML = '<span class="status-dot"></span>Disconnected';

  const sigStatus = document.getElementById('conn-sig-status');
  if (sigStatus) {
    sigStatus.textContent = "Not verified";
    sigStatus.style.color = "#999";
  }

  const sigEl = document.getElementById('sig-display');
  if (sigEl) sigEl.classList.add('hidden');

  const discBtn = document.getElementById('disc-btn');
  if (discBtn) discBtn.classList.add('hidden');

  document.getElementById('state-c').classList.remove('active');
  document.getElementById('state-nc').classList.add('active');
}



async function disconnect() {
  try {
    const res = await fetch("/api/wallet/disconnect", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRFToken": csrfToken }
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to disconnect");
      return;
    }

    // 🔌 Kill WalletConnect session (if any)
    if (session && signClient) {
      signClient.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: 'User disconnected' }
      }).catch(() => {});
    }

    session = null;

    // ✅ USE YOUR UI RESET FUNCTION
    onDisconnectUI();

  } catch (e) {
    alert("Network error");
  }
}



// ✅ FIX: credentials moved to top-level (was wrongly inside headers), throws on failure
async function getNonce(address) {
  const res = await fetch("/api/wallet/nonce", {
    method: "POST",
    credentials: "include",   // ✅ was inside headers before — now correct
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken
    },
    body: JSON.stringify({ address })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to get nonce");  // ✅ throw instead of silently returning undefined
  }
  return data.nonce;
}

async function sendWalletToBackend(name, address, signature, message) {
  try {
    const res = await fetch("/api/wallet/connect", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
      },
      body: JSON.stringify({ address, signature, message, wallet_name: name })
    });
    const data = await res.json();
    if (!res.ok) { console.error(data); alert(data.error || "Failed to save wallet"); }
  } catch (e) {
    console.error(e);
    alert("Network error");
  }
}

window.openModal      = openModal;
window.closeModal     = closeModal;
window.overlayClick   = overlayClick;
window.backToList     = backToList;
window.pick           = pick;
window.showUniversalQR = showUniversalQR;
window.openDeepLink   = openDeepLink;
window.disconnect     = disconnect;
})();
