import { createHmac, timingSafeEqual } from 'crypto'
import { parseDiff } from '@/lib/parseDiff'
import { reviewCode } from '@/lib/aiReview'
import { getPRFiles, postGitHubReview } from '@/lib/github'
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

  // handle app installation event — save to database
  if (event === 'installation') {
    if (payload.action === 'created') {
      await db.installation.upsert({
        where: { installationId: payload.installation.id },
        update: {},
        create: {
          installationId: payload.installation.id,
          owner: payload.installation.account.login,
        },
      })
      console.log(`✅ Installation saved for ${payload.installation.account.login}`)
    }
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
  // fetch files using installation token instead of PAT
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

  // post review using installation token
  await postGitHubReview(
    prInfo.installationId,
    prInfo.owner,
    prInfo.repo,
    prInfo.prNumber,
    prInfo.headSha,
    issues
  )

  // save review and issues to database
  const installation = await db.installation.findUnique({
    where: { installationId: prInfo.installationId },
  })

  if (installation) {
    await db.review.create({
      data: {
        installationId: installation.id,
        repo: prInfo.repo,
        prNumber: prInfo.prNumber,
        prTitle: prInfo.prTitle,
        issues: {
          create: issues.map((issue) => ({
            filename: issue.filename,
            lineNumber: issue.lineNumber,
            severity: issue.severity,
            comment: issue.comment,
          })),
        },
      },
    })
    console.log('✅ Review saved to database')
  }
}