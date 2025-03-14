'use client'

import { Providers } from "./providers"
import { useEffect } from "react"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // Log when the client-side code is running
  useEffect(() => {
    console.log('Web3 client initialized')
  }, [])

  return <Providers>{children}</Providers>
} 