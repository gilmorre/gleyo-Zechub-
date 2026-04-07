import { createWeb3Modal } from '@web3modal/wagmi'
import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const projectId = '682e6293e0b2e46d9300f58949ebb2d6'
  const themeVariables = {
    '--w3m-accent': '#4285F4',
    '--w3m-color-mix': '#1e1e2f',
    '--w3m-color-mix-strength': '100',
    '--w3m-font-family': 'Roboto, sans-serif',
    '--w3m-border-width': '1px',
    '--w3m-border-color': 'pink',
    '--w3m-border-radius-master': '10px'
  };

// ✅ Proper connectors (THIS is the real fix)
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  },
  connectors: [
    injected(), // MetaMask (if installed)
    coinbaseWallet({ appName: 'Gleyo' }), // ✅ FORCE Coinbase to show
    walletConnect({ projectId }) // WalletConnect (QR + mobile wallets)
  ]
})

const modal = createWeb3Modal({
  wagmiConfig: config,
  projectId,
  chains: [mainnet],
  enableExplorer: true, 
  enableOnramp: false,
  enableAnalytics: false,
  themeVariables
})

// UI
document.body.innerHTML = ''

const btn = document.createElement('button')
btn.innerText = 'Connect Wallet'

btn.style.background = '#6d5dfc'
btn.style.color = 'white'
btn.style.border = 'none'
btn.style.padding = '14px 22px'
btn.style.borderRadius = '10px'
btn.style.cursor = 'pointer'

btn.onclick = () => modal.open()

document.body.appendChild(btn)