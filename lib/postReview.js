export async function postReview(prInfo, issues) {
  const token = process.env.GITHUB_PAT

  // if no issues found, post a simple approval comment
  if (issues.length === 0) {
    await fetch(
      `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.prNumber}/reviews`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_id: prInfo.headSha,
          event: 'APPROVE',
          body: '✅ AI Review: No issues found. Looks good!',
        }),
      }
    )
    console.log('✅ Posted approval — no issues found')
    return
  }

  // map issues to github review comments format
  // only include issues that have a valid diffPosition
  const comments = issues
    .filter((issue) => issue.diffPosition)
    .map((issue) => ({
      path: issue.filename,
      position: issue.diffPosition,
      body: formatComment(issue),
    }))

  // post all comments in one single API call as a review
  const res = await fetch(
    `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.prNumber}/reviews`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commit_id: prInfo.headSha,
        event: 'COMMENT',
        body: `## 🤖 AI Code Review\n\nFound **${issues.length}** issue${issues.length > 1 ? 's' : ''} in this PR.`,
        comments,
      }),
    }
  )

  if (!res.ok) {
    const error = await res.text()
    console.error('Failed to post review:', res.status, error)
    return
  }

  console.log(`✅ Posted review with ${comments.length} inline comments`)
}

function formatComment(issue) {
  const emoji = {
    bug: '🐛',
    warning: '⚠️',
    suggestion: '💡',
  }

  return `${emoji[issue.severity] || '💬'} **${issue.severity.toUpperCase()}**\n\n${issue.comment}`
}