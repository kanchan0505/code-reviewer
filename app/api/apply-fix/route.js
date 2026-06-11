import { NextResponse } from 'next/server'
import { getInstallationToken } from '@/lib/github'

export async function POST(req) {
  try {
    const { owner, repo, branch, filename, lineNumber, suggestedCode, installationId } = await req.json()

    if (!owner || !repo || !branch || !filename || !lineNumber || !installationId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log(`Applying fix to ${owner}/${repo} on branch ${branch} for ${filename} at line ${lineNumber}`)

    const token = await getInstallationToken(installationId)

    // 1. Fetch current file content and SHA
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filename)}?ref=${encodeURIComponent(branch)}`
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!getRes.ok) {
      const errorText = await getRes.text()
      console.error(`Failed to fetch file content: ${errorText}`)
      return NextResponse.json({ error: `Failed to fetch file content from GitHub: ${errorText}` }, { status: getRes.status })
    }

    const fileData = await getRes.json()
    const currentSha = fileData.sha
    const contentBase64 = fileData.content || ''
    
    // Decode base64
    const content = Buffer.from(contentBase64, 'base64').toString('utf8')
    const lines = content.split(/\r?\n/)

    const lineIdx = lineNumber - 1
    if (lineIdx < 0 || lineIdx >= lines.length) {
      return NextResponse.json({ error: `Invalid line number: ${lineNumber}. File has ${lines.length} lines.` }, { status: 400 })
    }

    // 2. Replace the specific line
    lines[lineIdx] = suggestedCode

    const updatedContent = lines.join('\n')
    const updatedContentBase64 = Buffer.from(updatedContent, 'utf8').toString('base64')

    // 3. Commit the change back
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filename)}`
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `fix: apply AI suggestion for line ${lineNumber} in ${filename}`,
        content: updatedContentBase64,
        sha: currentSha,
        branch: branch,
      }),
    })

    if (!putRes.ok) {
      const errorText = await putRes.text()
      console.error(`Failed to write file content: ${errorText}`)
      return NextResponse.json({ error: `Failed to write file back to GitHub: ${errorText}` }, { status: putRes.status })
    }

    const putData = await putRes.json()
    return NextResponse.json({ success: true, commit: putData.commit })
  } catch (error) {
    console.error('Error applying fix:', error)
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 })
  }
}
