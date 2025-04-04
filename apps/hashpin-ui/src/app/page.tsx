'use client'

import { WalletConnect } from '@/components/WalletConnect'
import { HashPinForm } from '@/components/HashPinForm'
import { HashClaimForm } from '@/components/HashVerify'
import { Component, ErrorInfo, ReactNode, useState } from 'react'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold mb-2">Something went wrong</h3>
          <p className="text-sm">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'pin' | 'claim'>('pin')
  
  return (
    <main className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Social Links */}
            <div className="flex items-center space-x-4">
              <a
                href="https://x.com/monsieurbarq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-400 transition-colors"
                title="Follow on X (Twitter)"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://github.com/rexbarq/hashpin/blob/master/hashpin-whitepaper.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-400 transition-colors"
                title="Read the Whitepaper"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                </svg>
              </a>
              <a
                href="https://github.com/rexbarq/hashpin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-400 transition-colors"
                title="View on GitHub"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.607 9.607 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48 3.97-1.32 6.833-5.054 6.833-9.458C22 6.463 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>

            {/* Right side - Wallet Connect */}
            <WalletConnect />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Title Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-green-400 bg-black">
              <span className="text-green-400 text-2xl">ǂ</span>
            </span>
            HashPin Protocol
          </h1>
          <p className="text-lg text-gray-400">
            A protocol for proving the existence and ownership of anything
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900 rounded-lg shadow-lg shadow-green-400/10 overflow-hidden border border-gray-800">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('pin')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'pin'
                  ? 'text-green-400 border-b-2 border-green-400 bg-black/30'
                  : 'text-gray-400 hover:text-green-400 hover:bg-black/20'
              }`}
            >
              Pin Hash
            </button>
            <button
              onClick={() => setActiveTab('claim')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'claim'
                  ? 'text-green-400 border-b-2 border-green-400 bg-black/30'
                  : 'text-gray-400 hover:text-green-400 hover:bg-black/20'
              }`}
            >
              Claim as NFT
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'pin' ? (
              <ErrorBoundary>
                <HashPinForm />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary>
                <HashClaimForm />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
