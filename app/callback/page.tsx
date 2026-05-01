'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { exchangeCodeForToken } from '@/lib/spotify'

export default function CallbackPage() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    const state = params.get('state')
    const storedState = localStorage.getItem('spotify_auth_state')

    if (error || !code) {
      router.replace(`/?error=${error ?? 'missing_code'}`)
      return
    }

    if (state !== storedState) {
      router.replace('/?error=state_mismatch')
      return
    }

    exchangeCodeForToken(code)
      .then(() => router.replace('/'))
      .catch((err) => router.replace(`/?error=${encodeURIComponent(err.message)}`))
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Connecting to Spotify…</p>
    </div>
  )
}
