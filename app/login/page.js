'use client'

import { signIn } from 'next-auth/react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans antialiased relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 w-full max-w-sm text-center relative z-10 space-y-6">
        <div className="space-y-2">
          <span className="text-5xl block">🤖</span>
          <h1 className="text-2xl font-extrabold tracking-tight">Sign in to ReviewBot</h1>
          <p className="text-xs text-slate-400">
            Connect your GitHub account to get started
          </p>
        </div>
        
        <button
          onClick={() => signIn('github', { callbackUrl })}
          className="w-full bg-white text-slate-950 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2.5 shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}