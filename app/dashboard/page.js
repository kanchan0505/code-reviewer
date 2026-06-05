import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  console.log('Session:', JSON.stringify(session, null, 2))

  if (!session) {
    redirect('/login')
  }

  if (!session.user?.githubId) {
    console.error('No githubId in session')
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { githubId: session.user.githubId },
  })

  console.log('User from db:', user)

  if (!user) {
    redirect('/login')
  }

  // link any unlinked installations that match this user's github username
  await db.installation.updateMany({
    where: {
      owner: user.username,
      userId: null,
    },
    data: { userId: user.id },
  })

  // now fetch all installations for this user
  const installations = await db.installation.findMany({
    where: { owner: user.username },
    include: {
      reviews: {
        include: { issues: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  console.log('Installations found:', installations.length)

  const allReviews = installations.flatMap((i) => i.reviews)
  const totalIssues = allReviews.flatMap((r) => r.issues).length
  const totalBugs = allReviews
    .flatMap((r) => r.issues)
    .filter((i) => i.severity === 'bug').length

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold">ReviewBot</span>
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

        <h2 className="text-base font-semibold mb-4">Recent Reviews</h2>

        {allReviews.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              No reviews yet. Open a PR on an installed repo to get started.
            </p>
            <a
              href="https://github.com/apps/my-ai-reviewer-dev/installations/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Install on your repos →
            </a>
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