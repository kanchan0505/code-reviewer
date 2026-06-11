import { createHmac, timingSafeEqual } from 'crypto'
import { parseDiff } from '@/lib/parseDiff'
import { reviewCode } from '@/lib/aiReview'
import { getPRFiles, postGitHubReview, getCommitFiles, postCommitComment } from '@/lib/github'
import { db } from '@/lib/db'

export async function POST(req) {
  console.log('🔔 Webhook received!')

  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  const expected =
    'sha256=' +
    createHmac('sha256', secret).update(rawBody).digest('hex')

  let signaturesMatch
  try {
    signaturesMatch = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    signaturesMatch = false
  }

  if (!signaturesMatch) {
    console.error('❌ Invalid webhook signature')
    return new Response('Unauthorized', { status: 401 })
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

  await processPR(prInfo)

  return new Response('OK', { status: 200 })
}

async function processPR(prInfo) {
  try {
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

    // always upsert installation — creates it if missing, updates if exists
    console.log('💾 Saving to database...')
    
    const user = await db.user.findFirst({
  where: { username: prInfo.owner },
})

   const installation = await db.installation.upsert({
  where: { installationId: prInfo.installationId },
  update: { owner: prInfo.owner },
  create: {
    installationId: prInfo.installationId,
    owner: prInfo.owner,
    // link to user if they exist in our database
    ...(user ? { userId: user.id } : {}),
  },
})

    console.log('✅ Installation upserted:', installation.id)

    const review = await db.review.create({
      data: {
        installationId: installation.id,
        repo: prInfo.repo,
        prNumber: prInfo.prNumber,
        prTitle: prInfo.prTitle,
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
    // log the full error so we can see exactly what's failing
    console.error('❌ Error in processPR:', err)
  }
}


async function processPush(pushInfo) {
  try {
    // only review latest commit to avoid spam
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

    // build a summary comment to post on the commit
    let commentBody = `## 🤖 AI Commit Review\n\n`

    if (issues.length === 0) {
      commentBody += `✅ No issues found. Clean commit!`
    } else {
      const bugs = issues.filter(i => i.severity === 'bug')
      const warnings = issues.filter(i => i.severity === 'warning')
      const suggestions = issues.filter(i => i.severity === 'suggestion')

      commentBody += `Found **${issues.length}** issue${issues.length > 1 ? 's' : ''}:\n\n`

      if (bugs.length > 0) {
        commentBody += `### 🐛 Bugs (${bugs.length})\n`
        bugs.forEach(i => {
          commentBody += `- **${i.filename}** line ${i.lineNumber}: ${i.comment}\n`
        })
        commentBody += '\n'
      }

      if (warnings.length > 0) {
        commentBody += `### ⚠️ Warnings (${warnings.length})\n`
        warnings.forEach(i => {
          commentBody += `- **${i.filename}** line ${i.lineNumber}: ${i.comment}\n`
        })
        commentBody += '\n'
      }

      if (suggestions.length > 0) {
        commentBody += `### 💡 Suggestions (${suggestions.length})\n`
        suggestions.forEach(i => {
          commentBody += `- **${i.filename}** line ${i.lineNumber}: ${i.comment}\n`
        })
      }
    }

    // post as a single commit comment
    await postCommitComment(
      pushInfo.installationId,
      pushInfo.owner,
      pushInfo.repo,
      commit.id,
      commentBody
    )

    // save to database
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
          create: issues.map(issue => ({
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