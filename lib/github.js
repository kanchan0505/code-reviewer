import jwt from 'jsonwebtoken'

// generates a JWT token to authenticate as your GitHub App
function generateAppToken() {
  const privateKey = Buffer.from(
    process.env.GITHUB_APP_PRIVATE_KEY_BASE64,
    'base64'
  ).toString('utf8')

  return jwt.sign(
    {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 540,
      iss: process.env.GITHUB_APP_ID,
    },
    privateKey,
    { algorithm: 'RS256' }
  )
}

// exchanges the app JWT for an installation-specific token
export async function getInstallationToken(installationId) {
  const appToken = generateAppToken()

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to get installation token: ${await res.text()}`)
  }

  const data = await res.json()
  return data.token
}

// fetch PR files using installation token
export async function getPRFiles(installationId, owner, repo, prNumber) {
  const token = await getInstallationToken(installationId)

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch PR files: ${await res.text()}`)
  }

  return res.json()
}

// post review using installation token
export async function postGitHubReview(installationId, owner, repo, prNumber, headSha, issues) {
  const token = await getInstallationToken(installationId)

  if (issues.length === 0) {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_id: headSha,
          event: 'APPROVE',
          body: '✅ AI Review: No issues found. Looks good!',
        }),
      }
    )
    return
  }

  const comments = issues
    .filter((issue) => issue.diffPosition)
    .map((issue) => ({
      path: issue.filename,
      position: issue.diffPosition,
      body: formatComment(issue),
    }))

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commit_id: headSha,
        event: 'COMMENT',
        body: `## 🤖 AI Code Review\n\nFound **${issues.length}** issue${issues.length > 1 ? 's' : ''} in this PR.`,
        comments,
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to post review: ${await res.text()}`)
  }
}

function formatComment(issue) {
  const emoji = { bug: '🐛', warning: '⚠️', suggestion: '💡' }
  const label = { bug: 'BUG', warning: 'WARNING', suggestion: 'SUGGESTION' }
  const e = emoji[issue.severity] || '💬'
  const l = label[issue.severity] || issue.severity.toUpperCase()
  
  let body = `**${e} [${l}]** ${issue.comment}\n`
  
  if (issue.suggestedCode) {
    body += `\n💡 *Suggestion:* \`${issue.suggestedCode}\`\n`
  }
  
  body += `\n---\n*ReviewBot by [ReviewBot App](https://code-reviewer-delta-seven.vercel.app)*`
  return body
}

export async function getCommitFiles(installationId, owner, repo, commitSha) {
  const token = await getInstallationToken(installationId)

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!res.ok) throw new Error(`Failed to fetch commit: ${await res.text()}`)

  const data = await res.json()
  return data.files ?? []
}

export async function postCommitComment(installationId, owner, repo, commitSha, body) {
  const token = await getInstallationToken(installationId)

  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    }
  )
}