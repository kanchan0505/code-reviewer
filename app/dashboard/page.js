import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { InstallButton } from './InstallButton'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (!session.user?.githubId) redirect('/login')

  const user = await db.user.findUnique({
    where: { githubId: session.user.githubId },
  })

  if (!user) redirect('/login')

  // link any unlinked installations that match this user's github username
  await db.installation.updateMany({
    where: {
      owner: {
        equals: user.username,
        mode: 'insensitive',
      },
      userId: null,
    },
    data: { userId: user.id },
  })

  const installations = await db.installation.findMany({
    where: {
      owner: {
        equals: user.username,
        mode: 'insensitive',
      },
    },
    include: {
      reviews: {
        include: { issues: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const allReviews = installations.flatMap((i) => i.reviews)
  const totalIssues = allReviews.flatMap((r) => r.issues).length
  const totalBugs = allReviews
    .flatMap((r) => r.issues)
    .filter((i) => i.severity === 'bug').length

  const installUrl = 'https://github.com/apps/my-ai-reviewer-dev/installations/new'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans antialiased relative overflow-hidden">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
      />

      {/* Top Nav */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-bold tracking-tight text-white">ReviewBot</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-white"
            >
              PR Reviews
            </Link>
            <Link
              href="/dashboard/commits"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Commits
            </Link>
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="w-8 h-8 rounded-full border border-slate-800"
                />
              )}
              <span className="text-sm text-slate-300 font-medium hidden sm:inline">
                {session.user.name}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-slate-400 hover:text-white transition-colors border border-slate-800 px-3 py-1 rounded-lg hover:bg-slate-900"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-6 py-10 relative z-10 space-y-10 flex-1">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">PR Reviews</h1>
            <p className="text-sm text-slate-400">All your automated pull request reviews in one workspace</p>
          </div>
          <Link
            href={installUrl}
            target="_blank"
            className="self-start sm:self-auto bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            + Add repositories
          </Link>
        </div>

        {installations.length === 0 ? (
          /* "One last step" empty state when no connected installations found */
          <div className="flex flex-col items-center justify-center py-20 px-6 max-w-lg mx-auto text-center border border-dashed border-slate-800 bg-slate-900/30 rounded-2xl space-y-6">
            <span className="text-6xl">🤖</span>
            <h2 className="text-2xl font-bold text-white">One last step</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Hey {session.user.name?.split(' ')[0]} — install ReviewBot on your GitHub repos to start getting automated AI reviews on every PR.
            </p>
            <InstallButton installUrl={installUrl} />
          </div>
        ) : (
          <>
            {/* Stats Row (4 Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: 'Total Reviews', value: allReviews.length, icon: '📋', color: 'text-white' },
                { title: 'Issues Found', value: totalIssues, icon: '⚠️', color: 'text-amber-400' },
                { title: 'Bugs Caught', value: totalBugs, icon: '🐛', color: 'text-rose-500' },
                { title: 'Repos Connected', value: installations.length, icon: '📦', color: 'text-blue-400' },
              ].map((card) => (
                <Card key={card.title} className="bg-slate-900/50 border-slate-800/80">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {card.title}
                    </CardTitle>
                    <span className="text-base">{card.icon}</span>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-extrabold ${card.color}`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State when installations exist but no reviews have run */}
            {allReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center border border-slate-800/60 bg-slate-900/10 rounded-2xl space-y-4">
                <svg className="w-16 h-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-bold text-white">No reviews yet</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Open a pull request on one of your connected repositories to trigger your first automated AI code review.
                </p>
                <div className="pt-2">
                  <Link
                    href={installUrl}
                    target="_blank"
                    className="border border-slate-800 bg-slate-900 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg hover:text-white hover:bg-slate-850 transition-colors"
                  >
                    View installations
                  </Link>
                </div>
              </div>
            ) : (
              /* Reviews Table */
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-300">Recent PR Reviews</h2>
                <div className="border border-slate-800/80 bg-slate-900/20 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                          <th className="py-3 px-4">Repository</th>
                          <th className="py-3 px-4">Pull Request</th>
                          <th className="py-3 px-4 text-center">Files Changed</th>
                          <th className="py-3 px-4 text-center">Issues</th>
                          <th className="py-3 px-4 text-center">Bugs</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {allReviews.map((review) => {
                          const filesCount = new Set(review.issues.map((i) => i.filename)).size
                          const bugsCount = review.issues.filter((i) => i.severity === 'bug').length
                          
                          let statusBadge = (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                              Completed
                            </span>
                          )
                          if (review.status === 'FAILED') {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/10">
                                Failed
                              </span>
                            )
                          } else if (review.status === 'pending') {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/10">
                                Pending
                              </span>
                            )
                          }

                          return (
                            <tr key={review.id} className="hover:bg-slate-900/30 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-300">{review.repo}</td>
                              <td className="py-3.5 px-4">
                                <Link
                                  href={`/review/${review.id}`}
                                  className="text-white hover:underline font-medium block max-w-xs truncate"
                                >
                                  #{review.prNumber} {review.prTitle}
                                </Link>
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-400">{filesCount || 0}</td>
                              <td className="py-3.5 px-4 text-center text-amber-400 font-semibold">
                                {review.issues.length}
                              </td>
                              <td className="py-3.5 px-4 text-center text-rose-500 font-semibold">{bugsCount}</td>
                              <td className="py-3.5 px-4">{statusBadge}</td>
                              <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Connected Repos Panel */}
            <div className="space-y-4 pt-6">
              <h2 className="text-base font-bold text-slate-300">Connected Repositories</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {installations.map((inst) => (
                  <div key={inst.id} className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700 uppercase">
                        {inst.owner.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white truncate max-w-[150px]">{inst.owner}</div>
                        <div className="text-[10px] text-slate-500 font-mono">App Inst ID: {inst.installationId}</div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] font-semibold uppercase tracking-wider">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950 mt-auto relative z-10 text-center">
        <p className="text-xs text-slate-500">
          ReviewBot Code Review Dashboard. Powered by Next.js and Groq.
        </p>
      </footer>
    </div>
  )
}