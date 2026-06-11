import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function ReviewDetailPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')

  const { id } = await params

  const review = await db.review.findUnique({
    where: { id },
    include: {
      issues: true,
      installation: true,
    },
  })

  if (!review) {
    notFound()
  }

  // Group issues by file
  const groupedIssues = {}
  review.issues.forEach((issue) => {
    if (!groupedIssues[issue.filename]) {
      groupedIssues[issue.filename] = []
    }
    groupedIssues[issue.filename].push(issue)
  })

  const files = Object.keys(groupedIssues)

  // Status indicators
  let statusBadge = (
    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 text-xs py-1 px-3">
      Completed
    </Badge>
  )

  if (review.status === 'FAILED') {
    statusBadge = (
      <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 text-xs py-1 px-3">
        Failed
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans antialiased relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />

      {/* Top Nav */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-bold tracking-tight text-white">ReviewBot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors border border-slate-850 px-3 py-1.5 rounded-lg bg-slate-900/40"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-6 py-10 relative z-10 space-y-8 flex-1">
        
        {/* Review Metadata Header */}
        <div className="border border-slate-800/85 bg-slate-900/20 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{review.repo}</span>
              <h1 className="text-2xl font-extrabold text-white">
                PR #{review.prNumber}: {review.prTitle}
              </h1>
            </div>
            <div className="self-start sm:self-auto flex items-center gap-2">
              {statusBadge}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <div>
              <span className="text-slate-500">Date: </span>
              {new Date(review.createdAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>
              <span className="text-slate-500">Total Issues: </span>
              <span className="text-white font-semibold">{review.issues.length}</span>
            </div>
            <div>
              <span className="text-slate-500">GitHub: </span>
              <a
                href={`https://github.com/${review.installation.owner}/${review.repo}/pull/${review.prNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                View Pull Request &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Error message block if FAILED */}
        {review.status === 'FAILED' && (
          <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <span>⚠️</span> Failed Review Log
            </div>
            <p className="text-xs text-rose-300 font-mono whitespace-pre-wrap leading-relaxed">
              {review.errorMessage || 'No failure log information captured.'}
            </p>
          </div>
        )}

        {/* List of Grouped Issues */}
        {files.length === 0 ? (
          <div className="text-center py-12 border border-slate-800/80 bg-slate-900/10 rounded-2xl">
            <p className="text-slate-400 text-sm">No review issues were flagged in this pull request. Clear code! ✅</p>
          </div>
        ) : (
          <div className="space-y-8">
            {files.map((filename) => (
              <div key={filename} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-sm font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    {filename}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({groupedIssues[filename].length} {groupedIssues[filename].length === 1 ? 'issue' : 'issues'})
                  </span>
                </div>

                <div className="space-y-4">
                  {groupedIssues[filename].map((issue) => {
                    let severityLabel = (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/10">
                        💡 Suggestion
                      </span>
                    )
                    if (issue.severity === 'bug') {
                      severityLabel = (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/10">
                          🐛 Bug
                        </span>
                      )
                    } else if (issue.severity === 'warning') {
                      severityLabel = (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/10">
                          ⚠️ Warning
                        </span>
                      )
                    }

                    return (
                      <Card key={issue.id} className="bg-slate-900/40 border-slate-800/80 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-400">
                              Line: <strong className="text-white">{issue.lineNumber}</strong>
                            </span>
                            {severityLabel}
                          </div>
                          
                          <p className="text-slate-200 text-sm font-medium leading-relaxed">
                            {issue.comment}
                          </p>

                          {issue.suggestedCode && (
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed">
                              <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Suggested Fix:</div>
                              <code>{issue.suggestedCode}</code>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950 mt-auto relative z-10 text-center">
        <p className="text-xs text-slate-500">
          ReviewBot Details. Powered by Next.js and Groq.
        </p>
      </footer>
    </div>
  )
}
