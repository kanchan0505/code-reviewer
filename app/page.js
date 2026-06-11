import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export default async function Home() {
  const session = await getServerSession(authOptions)
  const isLoggedIn = !!session

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans antialiased relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />

      {/* Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-bold tracking-tight text-white">ReviewBot</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              How it works
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm bg-white text-slate-950 px-4 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                >
                  Dashboard
                </Link>
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-8 h-8 rounded-full border border-slate-850"
                  />
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-white text-slate-950 px-4 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Get started
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Powered by Llama 3.3 70B via Groq
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
            AI code reviews,<br />
            <span className="bg-gradient-to-r from-slate-400 via-slate-200 to-white bg-clip-text text-transparent">
              automatically on every PR
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
            ReviewBot reviews your pull requests instantly — catching bugs, security vulnerabilities, and code smells on the line before they hit production.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-white text-slate-950 px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors shadow-lg shadow-white/5"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-white text-slate-950 px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors shadow-lg shadow-white/5"
              >
                Install on GitHub →
              </Link>
            )}
            <Link
              href="#how-it-works"
              className="border border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* Hero Code Visual Mockup */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-blue-500/5 font-mono text-xs overflow-hidden leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/80">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-[10px] text-slate-500 ml-2">diff --git a/index.js b/index.js</span>
          </div>
          <div className="space-y-1">
            <div className="text-slate-500">@@ -12,4 +12,5 @@</div>
            <div className="bg-red-950/30 text-red-400 px-2 py-0.5 rounded-sm">- const key = "12345-secret";</div>
            <div className="bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded-sm">+ const key = process.env.API_KEY;</div>
            <div className="text-slate-500">  console.log("Initialized client");</div>
          </div>
          <div className="mt-4 bg-slate-950 border border-slate-800/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <span className="font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded text-[10px]">🐛 BUG</span>
              <span className="text-[10px] text-slate-500">ReviewBot commented line 12</span>
            </div>
            <p className="text-slate-300 font-medium">Hardcoded API key exposed in source code.</p>
            <div className="text-emerald-400 font-semibold bg-emerald-400/5 border border-emerald-400/10 rounded px-2 py-1 text-[10px]">
              💡 Suggestion: Move this to an environment variable: process.env.API_KEY
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats Bar */}
      <section className="border-y border-slate-900 bg-slate-950/60 backdrop-blur py-5 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Powered by Llama 3.3 70B</span>
          <span className="hidden sm:inline text-slate-800">•</span>
          <span>Built on GitHub Apps</span>
          <span className="hidden md:inline text-slate-800">•</span>
          <span>Inline PR comments</span>
          <span className="hidden sm:inline text-slate-800">•</span>
          <span>Free to get started</span>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24 relative z-10 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">How it works</h2>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            Setup is immediate. Three steps to automated line-level AI reviews.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Subtle connecting line */}
          <div className="absolute top-8 left-0 right-0 h-[1px] bg-slate-800 hidden md:block z-0" />
          
          {[
            {
              step: '01',
              title: 'Install the GitHub App',
              description: 'One click to install ReviewBot on any repository. No configuration files, no YAML required.',
            },
            {
              step: '02',
              title: 'Open a pull request',
              description: 'Every time you open or update a PR, ReviewBot automatically reviews the changed lines.',
            },
            {
              step: '03',
              title: 'Get inline reviews',
              description: 'Review comments appear directly on your lines of code — categorizing bugs, warnings, and suggestions.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 relative z-10 space-y-4 hover:border-slate-700 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white font-mono text-xs font-bold border border-slate-700">
                {item.step}
              </span>
              <h3 className="font-bold text-white text-base">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-950 py-24 border-t border-slate-900 relative z-10">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white">Features</h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              All the tools required to ship error-free code at lightspeed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔍',
                title: 'Line-level comments',
                description: 'Comments show up inline on the specific line where the issue was found.',
              },
              {
                icon: '⚡',
                title: 'Instant reviews',
                description: 'Reviews finish in under 3 seconds. Zero waiting queues or slow pipelines.',
              },
              {
                icon: '🔐',
                title: 'Security scanning',
                description: 'Detects hardcoded secrets, SQL injection, eval() usage, and XSS risks.',
              },
              {
                icon: '📊',
                title: 'Review dashboard',
                description: 'Monitor all reviews, issues caught, and repository stats in one place.',
              },
              {
                icon: '🛡️',
                title: 'GitHub App Integration',
                description: 'Fully native integration utilizing Github App tokens. No config files.',
              },
              {
                icon: '💡',
                title: 'Structured Severity',
                description: 'Issues are categorized by severity levels: Bug, Warning, or Suggestion.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-colors flex gap-4"
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center relative z-10 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Ready to ship better code?
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          Install ReviewBot on your repositories in 60 seconds. Free to get started.
        </p>
        <div className="pt-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="bg-white text-slate-950 px-8 py-3.5 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-white text-slate-950 px-8 py-3.5 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              Install on GitHub →
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 bg-slate-950 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <span className="text-sm font-bold text-white">ReviewBot</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} ReviewBot. Built with Next.js and Groq.
          </p>
        </div>
      </footer>
    </div>
  )
}