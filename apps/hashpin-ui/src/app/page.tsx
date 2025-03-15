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
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
              <span className="text-blue-700 dark:text-blue-300">ǂ</span>
            </span>
            Hashpin Protocol
          </h1>
          <WalletConnect />
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('pin')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'pin'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Pin Hash
            </button>
            <button
              onClick={() => setActiveTab('claim')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'claim'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
