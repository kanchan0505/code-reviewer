import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import CommitCard from './CommitCard'

export default async function CommitsPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (!session.user?.githubId) redirect('/login')

  const user = await db.user.findUnique({
    where: { githubId: session.user.githubId },
  })

  if (!user) redirect('/login')

  const installations = await db.installation.findMany({
    where: {
      owner: { equals: user.username, mode: 'insensitive' },
    },
  })

  const commitReviews = await db.commitReview.findMany({
    where: {
      installationId: { in: installations.map(i => i.id) },
    },
    include: {
      issues: true,
      installation: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const totalCommits = commitReviews.length
  const totalIssues = commitReviews.flatMap(r => r.issues).length
  const totalBugs = commitReviews.flatMap(r => r.issues).filter(i => i.severity === 'bug').length

  // Group by repository name
  const groupedRepos = {}
  commitReviews.forEach((review) => {
    const repoName = review.repo
    if (!groupedRepos[repoName]) {
      groupedRepos[repoName] = {
        name: repoName,
        owner: review.installation.owner,
        installationId: review.installation.installationId,
        reviews: [],
        stats: {
          commits: 0,
          bugs: 0,
          warnings: 0,
          suggestions: 0,
          totalIssues: 0,
        },
      }
    }
    const formattedReview = {
      ...review,
      formattedDate: new Date(review.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    groupedRepos[repoName].reviews.push(formattedReview)
    groupedRepos[repoName].stats.commits += 1
    groupedRepos[repoName].stats.totalIssues += review.issues.length
    review.issues.forEach((issue) => {
      if (issue.severity === 'bug') groupedRepos[repoName].stats.bugs += 1
      else if (issue.severity === 'warning') groupedRepos[repoName].stats.warnings += 1
      else if (issue.severity === 'suggestion') groupedRepos[repoName].stats.suggestions += 1
    })
  })

  const repos = Object.values(groupedRepos)

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold">ReviewBot</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              PR Reviews
            </Link>
            <Link
              href="/dashboard/commits"
              className="text-sm text-foreground font-semibold"
            >
              Commits
            </Link>
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="w-8 h-8 rounded-full border border-border"
                />
              )}
              <Link
                href="/api/auth/signout"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Commit Reviews</h1>
            <p className="text-muted-foreground text-sm">
              AI reviews every commit you push across all your repos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card className="border border-border/60 bg-card/30 backdrop-blur">
            <CardContent className="pt-6 pb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Commits Reviewed</p>
              <p className="text-3xl font-bold">{totalCommits}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/30 backdrop-blur">
            <CardContent className="pt-6 pb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Issues Found</p>
              <p className="text-3xl font-bold text-amber-500">{totalIssues}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/30 backdrop-blur">
            <CardContent className="pt-6 pb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bugs Caught</p>
              <p className="text-3xl font-bold text-red-500">{totalBugs}</p>
            </CardContent>
          </Card>
        </div>

        {repos.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card/20">
            <p className="text-muted-foreground text-sm mb-2 font-medium">
              No commit reviews yet.
            </p>
            <p className="text-muted-foreground text-xs max-w-md mx-auto">
              Push any code change to a repo where ReviewBot is installed — it will automatically review your commit.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {repos.map((repo) => (
              <section key={repo.name} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground font-normal">/</span>
                      {repo.name}
                      <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {repo.stats.totalIssues} {repo.stats.totalIssues === 1 ? 'issue' : 'issues'}
                      </span>
                    </h2>
                  </div>

                  {/* Summary Stats Row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="bg-muted px-2 py-1 rounded">
                      <strong className="text-foreground">{repo.stats.commits}</strong> commits
                    </span>
                    {repo.stats.bugs > 0 && (
                      <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded font-semibold border border-red-500/10">
                        🐛 {repo.stats.bugs} bug{repo.stats.bugs === 1 ? '' : 's'}
                      </span>
                    )}
                    {repo.stats.warnings > 0 && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-1 rounded font-semibold border border-amber-500/10">
                        ⚠️ {repo.stats.warnings} warning{repo.stats.warnings === 1 ? '' : 's'}
                      </span>
                    )}
                    {repo.stats.suggestions > 0 && (
                      <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-semibold border border-blue-500/10">
                        💡 {repo.stats.suggestions} suggestion{repo.stats.suggestions === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {repo.reviews.map((review) => (
                    <CommitCard
                      key={review.id}
                      review={review}
                      owner={repo.owner}
                      installationId={repo.installationId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}