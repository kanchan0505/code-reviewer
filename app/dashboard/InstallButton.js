'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function InstallButton({ installUrl }) {
  const router = useRouter()

  const handleClick = () => {
    // poll for installation every 3 seconds after they click
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)

    // stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  return (
    <div className="w-full">
      <a
        href={installUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity mb-4 text-center"
      >
        Connect your GitHub repos →
      </a>
      <p className="text-xs text-muted-foreground text-center">
        After installing, this page will update automatically.{' '}
        <button
          onClick={() => router.refresh()}
          className="underline hover:text-foreground transition-colors"
        >
          Refresh manually
        </button>
      </p>
    </div>
  )
}