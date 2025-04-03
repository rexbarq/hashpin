'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider, createConfig } from 'wagmi'
import { hardhat, sepolia, Chain } from 'wagmi/chains'
import { http } from 'viem'
import { walletConnect, injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
const isDevelopment = process.env.NODE_ENV === 'development'

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

const chains = [megaethTestnet, hardhat, sepolia] as const

// Configure chains & providers
const config = createConfig({
  chains,
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
      showQrModal: true
    })
  ],
})

// Add debug logging
console.log('🌐 Network Configuration:', {
  chains: chains.map(c => ({ id: c.id, name: c.name })),
  defaultChain: isDevelopment ? 'hardhat' : 'megaethTestnet',
  currentEnv: isDevelopment ? 'development' : 'production'
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

// Export providers with the correct chain order to ensure MegaETH is default in production
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={{
      ...config,
      chains: isDevelopment ? [hardhat, megaethTestnet, sepolia] : [megaethTestnet, hardhat, sepolia]
    }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 