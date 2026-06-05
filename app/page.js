import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* navbar */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold text-foreground">ReviewBot</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/api/auth/signin"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Powered by Llama 3.3 70B
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground mb-6 leading-tight">
          AI code reviews,
          <br />
          <span className="text-muted-foreground">automatically on every PR</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          ReviewBot reviews your pull requests instantly — catching bugs,
          security issues, and code smells before they reach production.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/api/auth/signin"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Install on GitHub →
          </Link>
          <Link
            href="#how-it-works"
            className="text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* social proof */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Catches issues like
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              '🐛 Hardcoded secrets',
              '⚠️ Security vulnerabilities',
              '💡 Code smells',
              '🐛 Logic errors',
              '⚠️ Duplicate variables',
              '💡 Missing error handling',
            ].map((item) => (
              <span
                key={item}
                className="text-sm bg-background border border-border px-3 py-1.5 rounded-full text-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-semibold text-center mb-4">
          How it works
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-md mx-auto">
          Three steps from install to your first automated review
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Install the GitHub App',
              description:
                'One click to install ReviewBot on any of your repos. No config files, no YAML, no setup.',
            },
            {
              step: '02',
              title: 'Open a pull request',
              description:
                'Every time a PR is opened or updated, ReviewBot automatically reviews the changed lines.',
            },
            {
              step: '03',
              title: 'Get inline comments',
              description:
                'Issues appear as inline comments on the exact lines — bugs, security risks, and suggestions.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-card border border-border rounded-xl p-6"
            >
              <span className="text-xs font-mono text-muted-foreground mb-4 block">
                {item.step}
              </span>
              <h3 className="font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section
        id="features"
        className="bg-muted/30 border-y border-border py-24"
      >
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-center mb-4">Features</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-md mx-auto">
            Everything you need for automated code quality
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: '🔍',
                title: 'Line-level comments',
                description:
                  'Comments appear on the exact line with the issue, just like a human reviewer.',
              },
              {
                icon: '⚡',
                title: 'Instant reviews',
                description:
                  'Reviews complete in under 3 seconds. No waiting, no queues.',
              },
              {
                icon: '🔐',
                title: 'Security scanning',
                description:
                  'Catches hardcoded secrets, SQL injection risks, eval() usage, and more.',
              },
              {
                icon: '📊',
                title: 'Review dashboard',
                description:
                  'See all your reviews, issues found, and bugs caught across all repos.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-xl p-6 flex gap-4"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold mb-4">
          Ready to ship better code?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Install ReviewBot on your repos in 60 seconds. Free to get started.
        </p>
        <Link
          href="/api/auth/signin"
          className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Install on GitHub →
        </Link>
      </section>

      {/* footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <span className="text-sm font-medium">ReviewBot</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built with Next.js and Groq
          </p>
        </div>
      </footer>
    </div>
  )
}