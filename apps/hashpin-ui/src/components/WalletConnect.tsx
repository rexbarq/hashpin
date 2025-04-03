'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useState, useEffect } from 'react'
import { useWeb3Modal } from '@web3modal/wagmi/react'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useWeb3Modal()
  const [mounted, setMounted] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('💳 WalletConnect Component:', {
      isConnected,
      address: address || 'none',
      hasError
    })
  }, [isConnected, address, hasError])

  // Handle disconnect with error handling
  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      console.log('🔌 Disconnecting wallet...')
      await disconnect()
      
      // Clear any stored connection state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wagmi.connected')
        localStorage.removeItem('wagmi.wallet')
        localStorage.removeItem('wc@2:core:0.3//keychain')
        localStorage.removeItem('wc@2:client:0.3//session')
      }
      
      // Force reload to clear any cached state
      window.location.reload()
    } catch (error) {
      console.error('Error disconnecting:', error)
      setHasError(true)
    } finally {
      setIsDisconnecting(false)
    }
  }

  // Handle connect with error recovery
  const handleConnect = async () => {
    try {
      setHasError(false)
      console.log('🔗 Opening Web3Modal...')
      
      // Clear any stale connection state before connecting
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wagmi.connected')
        localStorage.removeItem('wagmi.wallet')
        localStorage.removeItem('wc@2:core:0.3//keychain')
        localStorage.removeItem('wc@2:client:0.3//session')
      }
      
      await open()
    } catch (error) {
      console.error('Error connecting:', error)
      setHasError(true)
    }
  }

  // Don't render anything until mounted to prevent hydration errors
  if (!mounted) {
    return (
      <button
        disabled
        className="px-4 py-2 text-sm font-medium text-white bg-gray-400 rounded-md"
      >
        Loading...
      </button>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleConnect}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Connect Wallet
      </button>
      {hasError && (
        <p className="text-sm text-red-600">
          Error connecting. Please try again.
        </p>
      )}
    </div>
  )
} 