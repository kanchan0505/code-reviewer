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

  if (!session) {
    redirect('/login')
  }

  if (!session.user?.githubId) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { githubId: session.user.githubId },
  })

  if (!user) {
    redirect('/login')
  }

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

  const installUrl =
    'https://github.com/apps/my-ai-reviewer-dev/installations/new'

  if (installations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="font-semibold">ReviewBot</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm text-foreground font-medium"
              >
                PR Reviews
              </Link>
              <Link
                href="/dashboard/commits"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Commits
              </Link>
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {session.user.name}
                </span>
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

        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <span className="text-6xl mb-6 block">🤖</span>
            <h1 className="text-2xl font-semibold mb-3">One last step</h1>
            <p className="text-muted-foreground mb-2 leading-relaxed">
              Hey {session.user.name?.split(' ')[0]} — install ReviewBot on
              your GitHub repos to start getting automated AI code reviews on
              every PR.
            </p>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Takes 30 seconds. You choose exactly which repos to enable.
            </p>

            <InstallButton installUrl={installUrl} />

            <div className="mt-12 grid grid-cols-3 gap-4 text-left">
              {[
                {
                  step: '01',
                  title: 'Connect repos',
                  desc: 'Choose which repos ReviewBot can access',
                },
                {
                  step: '02',
                  title: 'Open a PR',
                  desc: 'Push a branch and open a pull request',
                },
                {
                  step: '03',
                  title: 'Get reviewed',
                  desc: 'AI comments appear on your code instantly',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <span className="text-xs font-mono text-muted-foreground mb-2 block">
                    {item.step}
                  </span>
                  <p className="text-sm font-medium mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold">ReviewBot</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-foreground font-medium"
            >
              PR Reviews
            </Link>
            <Link
              href="/dashboard/commits"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Commits
            </Link>
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
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
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          All your automated code reviews in one place
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Total Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{allReviews.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Issues Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalIssues}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Bugs Caught
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalBugs}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Reviews</h2>
          <Link
            href={installUrl}
            target="_blank"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 rounded-lg"
          >
            + Add more repos
          </Link>
        </div>

        {allReviews.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No reviews yet — open a PR on one of your connected repos to get
              started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allReviews.map((review) => {
              const bugs = review.issues.filter(
                (i) => i.severity === 'bug'
              ).length
              const warnings = review.issues.filter(
                (i) => i.severity === 'warning'
              ).length
              const suggestions = review.issues.filter(
                (i) => i.severity === 'suggestion'
              ).length

              return (
                <Card key={review.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-sm">
                        {review.repo}{' '}
                        <span className="text-muted-foreground">
                          #{review.prNumber}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {review.prTitle}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {bugs > 0 && (
                        <Badge variant="destructive">
                          🐛 {bugs} {bugs === 1 ? 'bug' : 'bugs'}
                        </Badge>
                      )}
                      {warnings > 0 && (
                        <Badge variant="outline">
                          ⚠️ {warnings}{' '}
                          {warnings === 1 ? 'warning' : 'warnings'}
                        </Badge>
                      )}
                      {suggestions > 0 && (
                        <Badge variant="secondary">
                          💡 {suggestions}{' '}
                          {suggestions === 1 ? 'suggestion' : 'suggestions'}
                        </Badge>
                      )}
                      {review.issues.length === 0 && (
                        <Badge
                          variant="outline"
                          className="text-green-500 border-green-500/30"
                        >
                          ✅ Clean
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}