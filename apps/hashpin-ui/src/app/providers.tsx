'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider, createConfig } from 'wagmi'
import { hardhat, sepolia } from 'wagmi/chains'
import { http } from 'viem'
import { walletConnect, injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

const metadata = {
  name: 'Hashpin Protocol',
  description: 'Pin cryptographic hashes to the blockchain',
  url: 'http://localhost:3000',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [hardhat, sepolia] as const

// Configure chains & providers
const config = createConfig({
  chains,
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata,
      showQrModal: true
    })
  ],
})

const queryClient = new QueryClient()

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  defaultChain: hardhat,
  themeMode: 'light',
  themeVariables: {
    '--w3m-font-family': 'Inter, sans-serif',
  },
  includeWalletIds: undefined,
  excludeWalletIds: undefined,
  featuredWalletIds: undefined,
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 