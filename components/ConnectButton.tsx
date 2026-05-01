'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { buildAuthUrl } from '@/lib/spotify'

export default function ConnectButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const url = await buildAuthUrl()
      window.location.href = url
    } catch (err) {
      console.error('Spotify auth error:', err)
      alert(`Failed to start auth: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      size="lg"
      className="px-10 py-6 text-base font-semibold rounded-2xl"
    >
      {loading ? 'Redirecting…' : 'Connect to Spotify'}
    </Button>
  )
}
