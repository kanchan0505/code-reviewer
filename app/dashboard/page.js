import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function Dashboard() {
  const session = await getServerSession()

  if (!session) {
    redirect('/api/auth/signin')
  }

  const user = await db.user.findUnique({
    where: { githubId: session.user.githubId },
    include: {
      installations: {
        include: {
          reviews: {
            include: { issues: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      },
    },
  })

  const allReviews = user?.installations.flatMap((i) => i.reviews) ?? []
  const totalIssues = allReviews.flatMap((r) => r.issues).length
  const bugs = allReviews.flatMap((r) => r.issues).filter((i) => i.severity === 'bug').length

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Welcome back, {session.user.name}
        </p>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{allReviews.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Issues Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalIssues}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Bugs Caught</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{bugs}</p>
            </CardContent>
          </Card>
        </div>

        {/* recent reviews */}
        <h2 className="text-xl font-semibold mb-4">Recent Reviews</h2>
        <div className="flex flex-col gap-3">
          {allReviews.length === 0 && (
            <p className="text-muted-foreground">
              No reviews yet. Open a PR on an installed repo to get started.
            </p>
          )}
          {allReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{review.repo} #{review.prNumber}</p>
                  <p className="text-sm text-muted-foreground">{review.prTitle}</p>
                </div>
                <div className="flex gap-2">
                  {review.issues.filter((i) => i.severity === 'bug').length > 0 && (
                    <Badge variant="destructive">
                      🐛 {review.issues.filter((i) => i.severity === 'bug').length} bugs
                    </Badge>
                  )}
                  {review.issues.filter((i) => i.severity === 'warning').length > 0 && (
                    <Badge variant="outline">
                      ⚠️ {review.issues.filter((i) => i.severity === 'warning').length} warnings
                    </Badge>
                  )}
                  {review.issues.length === 0 && (
                    <Badge variant="outline" className="text-green-500">
                      ✅ Clean
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}