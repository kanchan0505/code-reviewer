import { createHmac, timingSafeEqual } from 'crypto'
import { parseDiff } from '@/lib/parseDiff'
import { reviewCode } from '@/lib/aiReview'
import { getPRFiles, postGitHubReview, getCommitFiles, postCommitComment, getInstallationToken } from '@/lib/github'
import { db } from '@/lib/db'

async function verifySignature(req, rawBody) {
  const sig = req.headers.get('x-hub-signature-256')
  if (!sig) return false
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not set')
    return false
  }
  const hmac = createHmac('sha256', secret)
  hmac.update(rawBody)
  const expected = `sha256=${hmac.digest('hex')}`
  
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req) {
  console.log('🔔 Webhook received!')

  const rawBody = await req.text()
  
  // 1.2 Verify webhook signature
  const isVerified = await verifySignature(req, rawBody)
  if (!isVerified) {
    console.error('❌ Webhook signature verification failed')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deliveryId = req.headers.get('x-github-delivery')
  
  // 2.1 Webhook deduplication
  if (deliveryId) {
    const existingReview = await db.review.findUnique({
      where: { deliveryId },
    })
    if (existingReview) {
      console.log(`♻️ Duplicate webhook detected (deliveryId: ${deliveryId}). Skipping.`)
      return new Response('OK', { status: 200 })
    }
  }

  const event = req.headers.get('x-github-event')
  const payload = JSON.parse(rawBody)

  console.log(`✅ Received GitHub event: ${event}`)

  // handle app installation event
  if (event === 'installation') {
    if (payload.action === 'created') {
      await db.installation.upsert({
        where: { installationId: payload.installation.id },
        update: { owner: payload.installation.account.login },
        create: {
          installationId: payload.installation.id,
          owner: payload.installation.account.login,
        },
      })
      console.log(`✅ Installation saved for ${payload.installation.account.login}`)
    }
    return new Response('OK', { status: 200 })
  }

  if (event === 'push') {
    if (payload.deleted) return new Response('Ignored', { status: 200 })
    if (!payload.commits?.length) return new Response('Ignored', { status: 200 })

    const pushInfo = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      branch: payload.ref.replace('refs/heads/', ''),
      commits: payload.commits,
      installationId: payload.installation.id,
    }

    await processPush(pushInfo)
    return new Response('OK', { status: 200 })
  }

  if (event !== 'pull_request') {
    return new Response('Ignored', { status: 200 })
  }

  const action = payload.action
  console.log(`PR action: ${action}`)

  if (action !== 'opened' && action !== 'synchronize') {
    return new Response('Ignored', { status: 200 })
  }

  const prInfo = {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    prNumber: payload.pull_request.number,
    prTitle: payload.pull_request.title,
    headSha: payload.pull_request.head.sha,
    installationId: payload.installation.id,
  }

  console.log('PR info:', prInfo)

  await processPR(prInfo, deliveryId)

  return new Response('OK', { status: 200 })
}

async function processPR(prInfo, deliveryId) {
  let installation = null
  try {
    // Upsert installation early so we have the installation record and its CUID
    const user = await db.user.findFirst({
      where: { username: prInfo.owner },
    })

    installation = await db.installation.upsert({
      where: { installationId: prInfo.installationId },
      update: { owner: prInfo.owner },
      create: {
        installationId: prInfo.installationId,
        owner: prInfo.owner,
        ...(user ? { userId: user.id } : {}),
      },
    })

    // 2.3 Rate limit check (Max 10 reviews per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const reviewsCount = await db.review.count({
      where: {
        installationId: installation.id,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (reviewsCount >= 10) {
      console.log(`⏸️ Rate limit reached for installation: ${installation.id}`)
      const token = await getInstallationToken(prInfo.installationId)
      await fetch(
        `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/issues/${prInfo.prNumber}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: '⏸️ ReviewBot rate limit reached (10 reviews/hour). This PR will be reviewed when the limit resets.',
          }),
        }
      )
      return
    }

    const files = await getPRFiles(
      prInfo.installationId,
      prInfo.owner,
      prInfo.repo,
      prInfo.prNumber
    )

    console.log('\n========= RAW DIFF =========\n')

    const filesForReview = []

    for (const file of files) {
      console.log(`\n--- File: ${file.filename} (${file.status}) ---`)
      console.log(file.patch ?? '(no patch — binary or deleted file)')

      const parsedLines = parseDiff(file.patch)

      if (parsedLines.length > 0) {
        filesForReview.push({
          filename: file.filename,
          parsedLines,
        })
      }
    }

    console.log('\n============================\n')

    if (filesForReview.length === 0) {
      console.log('No changed lines to review')
      return
    }

    const issues = await reviewCode(filesForReview)
    console.log('\n🔍 AI Review Issues:\n', JSON.stringify(issues, null, 2))

    await postGitHubReview(
      prInfo.installationId,
      prInfo.owner,
      prInfo.repo,
      prInfo.prNumber,
      prInfo.headSha,
      issues
    )

    // Save success review
    const review = await db.review.create({
      data: {
        installationId: installation.id,
        repo: prInfo.repo,
        prNumber: prInfo.prNumber,
        prTitle: prInfo.prTitle,
        status: 'completed',
        deliveryId,
        issues: {
          create: issues.map((issue) => ({
            filename: issue.filename,
            lineNumber: issue.lineNumber || 0,
            severity: issue.severity || 'suggestion',
            comment: issue.comment || '',
            suggestedCode: issue.suggestedCode || null,
          })),
        },
      },
    })

    console.log('✅ Review saved to database:', review.id)

  } catch (err) {
    console.error('❌ Error in processPR:', err)

    // 2.2 Save FAILED review to database
    try {
      if (installation) {
        await db.review.create({
          data: {
            installationId: installation.id,
            repo: prInfo.repo,
            prNumber: prInfo.prNumber,
            prTitle: prInfo.prTitle,
            status: 'FAILED',
            errorMessage: err.message || String(err),
            deliveryId,
          },
        })
      }
    } catch (dbErr) {
      console.error('❌ Failed to log failed review to database:', dbErr)
    }

    // Post fallback comment on GitHub PR
    try {
      const token = await getInstallationToken(prInfo.installationId)
      await fetch(
        `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/issues/${prInfo.prNumber}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: '⚠️ ReviewBot encountered an error and could not complete this review. Please check the dashboard for details.',
          }),
        }
      )
    } catch (ghErr) {
      console.error('❌ Failed to post fallback PR comment:', ghErr)
    }
  }
}

async function processPush(pushInfo) {
  try {
    const commit = pushInfo.commits[pushInfo.commits.length - 1]

    console.log(`📦 Reviewing commit: ${commit.id.slice(0, 7)} — ${commit.message}`)

    const files = await getCommitFiles(
      pushInfo.installationId,
      pushInfo.owner,
      pushInfo.repo,
      commit.id
    )

    const filesForReview = []

    for (const file of files) {
      if (!file.patch || file.status === 'removed') continue

      const parsedLines = parseDiff(file.patch)
      if (parsedLines.length > 0) {
        filesForReview.push({
          filename: file.filename,
          parsedLines,
        })
      }
    }

    if (filesForReview.length === 0) {
      console.log('No changed lines to review')
      return
    }

    const issues = await reviewCode(filesForReview)
    console.log(`🔍 Found ${issues.length} issues in commit`)

    let commentBody = `## 🤖 AI Commit Review\n\n`

    if (issues.length === 0) {
      commentBody += `✅ No issues found. Clean commit!`
    } else {
      const bugs = issues.filter((i) => i.severity === 'bug')
      const warnings = issues.filter((i) => i.severity === 'warning')
      const suggestions = issues.filter((i) => i.severity === 'suggestion')

      commentBody += `Found **${issues.length}** issue${issues.length > 1 ? 's' : ''}:\n\n`

      if (bugs.length > 0) {
        commentBody += `### 🐛 Bugs (${bugs.length})\n`
        bugs.forEach((i) => {
          commentBody += `- **${i.filename}** line ${i.lineNumber}: ${i.comment}\n`
        })
        commentBody += '\n'
      }

      if (warnings.length > 0) {
        commentBody += `### ⚠️ Warnings (${warnings.length})\n`
        warnings.forEach((i) => {
          commentBody += `- **${i.filename}** line ${i.lineNumber}: ${i.comment}\n`
        })
        commentBody += '\n'
      }

      if (suggestions.length > 0) {
        commentBody += `### 💡 Suggestions (${suggestions.length})\n`
        suggestions.forEach((i) => {
          commentBody += `- **${i.filename}** line ${i.lineNumber}: ${i.comment}\n`
        })
      }
    }

    await postCommitComment(
      pushInfo.installationId,
      pushInfo.owner,
      pushInfo.repo,
      commit.id,
      commentBody
    )

    const installation = await db.installation.upsert({
      where: { installationId: pushInfo.installationId },
      update: { owner: pushInfo.owner },
      create: {
        installationId: pushInfo.installationId,
        owner: pushInfo.owner,
      },
    })

    await db.commitReview.create({
      data: {
        installationId: installation.id,
        repo: pushInfo.repo,
        branch: pushInfo.branch,
        commitSha: commit.id.slice(0, 7),
        commitMessage: commit.message,
        issues: {
          create: issues.map((issue) => ({
            filename: issue.filename,
            lineNumber: issue.lineNumber || 0,
            severity: issue.severity || 'suggestion',
            comment: issue.comment || '',
            suggestedCode: issue.suggestedCode || null,
          })),
        },
      },
    })

    console.log('✅ Commit review saved')

  } catch (err) {
    console.error('❌ Error in processPush:', err)
  }
}