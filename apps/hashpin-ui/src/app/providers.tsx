'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider, createConfig, type Config } from 'wagmi'
import { hardhat, sepolia, Chain } from 'wagmi/chains'
import { http } from 'viem'
import { walletConnect, injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
const isDevelopment = process.env.NODE_ENV === 'development'

// Add early debug logging for environment variables
console.log('🔑 Environment Check:', {
  projectId,
  isDevelopment,
  nodeEnv: process.env.NODE_ENV,
  hasProjectId: Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)
})

const metadata = {
  name: 'Hashpin Protocol',
  description: 'Pin cryptographic hashes to the blockchain',
  url: isDevelopment ? 'http://localhost:3000' : 'https://hashpin-ui.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const megaethTestnet = {
  id: 6342,
  name: 'MegaETH Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://carrot.megaeth.com/rpc'] },
    public: { http: ['https://carrot.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaExplorer', url: 'https://www.megaexplorer.xyz' },
  },
  testnet: true,
} as const satisfies Chain

// Configure chains based on environment
const defaultChains = isDevelopment 
  ? [hardhat, megaethTestnet, sepolia] 
  : [megaethTestnet, hardhat, sepolia]

// Configure chains & providers with better connection handling
const config = createConfig({
  chains: defaultChains,
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
    [megaethTestnet.id]: http('https://carrot.megaeth.com/rpc'),
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      metadata,
      showQrModal: true,
    })
  ],
})

// Add debug logging
console.log('🌐 Network Configuration:', {
  chains: defaultChains.map(c => ({ id: c.id, name: c.name })),
  defaultChain: isDevelopment ? 'hardhat' : 'megaethTestnet',
  currentEnv: isDevelopment ? 'development' : 'production',
  projectId: projectId ? 'set' : 'not set',
  connectors: config.connectors.map(c => c.name)
})

const queryClient = new QueryClient()

// Create Web3Modal with the correct default chain
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  defaultChain: isDevelopment ? hardhat : megaethTestnet,
  themeMode: 'light',
  themeVariables: {
    '--w3m-font-family': 'Inter, sans-serif',
  },
})

// Add debug logging for Web3Modal initialization
console.log('🔌 Web3Modal Configuration:', {
  defaultChain: isDevelopment ? 'hardhat' : 'megaethTestnet',
  chainId: isDevelopment ? hardhat.id : megaethTestnet.id,
  projectId: projectId ? 'set' : 'not set',
  mode: 'light'
})

// Export providers with the correct chain order
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Clear any stale connection requests on mount
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wagmi.connected')
      localStorage.removeItem('wagmi.wallet')
      localStorage.removeItem('wc@2:core:0.3//keychain')
      localStorage.removeItem('wc@2:client:0.3//session')
      console.log('📱 Providers mounted, cleared stale connections')
    }
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 