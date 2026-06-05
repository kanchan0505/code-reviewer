import { createHmac, timingSafeEqual } from 'crypto'
import { parseDiff } from '@/lib/parseDiff'
import { reviewCode } from '@/lib/aiReview'
import { postReview } from '@/lib/postReview'

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

  await fetchPRDiff(prInfo)

  return new Response('OK', { status: 200 })
}

async function fetchPRDiff(prInfo) {
  const token = process.env.GITHUB_PAT

  const res = await fetch(
    `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/pulls/${prInfo.prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!res.ok) {
    console.error('Failed to fetch PR files:', res.status, await res.text())
    return
  }

  const files = await res.json()

  console.log('\n========= RAW DIFF =========\n')

  const filesForReview = []

  for (const file of files) {
    console.log(`\n--- File: ${file.filename} (${file.status}) ---`)
    console.log(file.patch ?? '(no patch — binary or deleted file)')

    const parsedLines = parseDiff(file.patch)
    console.log(`Parsed ${file.filename}:`, parsedLines)

    if (parsedLines.length > 0) {
      filesForReview.push({
        filename: file.filename,
        parsedLines,
      })
    }
  }

  console.log('\n============================\n')

  if (filesForReview.length > 0) {
    const issues = await reviewCode(filesForReview)
    console.log('\n🔍 AI Review Issues:\n', JSON.stringify(issues, null, 2))
    await postReview(prInfo, issues)
  } else {
    console.log('No changed lines to review')
  }
}