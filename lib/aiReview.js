import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function getLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    js: 'JavaScript',
    jsx: 'JavaScript React (JSX)',
    ts: 'TypeScript',
    tsx: 'TypeScript React (TSX)',
    vue: 'Vue.js',
    svelte: 'Svelte',
    py: 'Python',
    rb: 'Ruby',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    md: 'Markdown',
    sh: 'Shell Script',
    yml: 'YAML',
    yaml: 'YAML'
  }
  return map[ext] || 'Unknown'
}

export async function reviewCode(files) {
  const prompt = buildPrompt(files)

  console.log('🤖 Sending code to AI for review...')

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
  })

  const text = response.choices[0].message.content
  console.log('📝 Raw AI response:', text)

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const rawIssues = JSON.parse(cleaned)

    // Map the new structured JSON format to our DB model structure
    const mappedIssues = rawIssues.map((issue) => {
      return {
        filename: issue.file || issue.filename || '',
        lineNumber: Number(issue.line || issue.lineNumber || 0),
        severity: issue.severity || 'suggestion',
        comment: issue.message || issue.comment || '',
        suggestedCode: issue.suggestion || issue.suggestedCode || null,
      }
    })

    // map diffPosition back onto each issue using lineNumber
    const issuesWithPosition = mappedIssues.map((issue) => {
      const file = files.find((f) => f.filename === issue.filename)
      if (!file) return issue

      const matchedLine = file.parsedLines.find(
        (l) => l.lineNumber === issue.lineNumber
      )

      return {
        ...issue,
        diffPosition: matchedLine ? matchedLine.diffPosition : null,
      }
    })

    return issuesWithPosition
  } catch (err) {
    console.error('Failed to parse AI response as JSON:', err)
    return []
  }
}

function buildPrompt(files) {
  let prompt = `You are an expert code reviewer. Analyze the provided code diff and return ONLY a valid JSON array. No prose, no markdown, no explanation outside the JSON.

Each item in the array must have:
- "file": the filename
- "line": the line number (integer) of the issue in the new file
- "severity": one of "bug", "warning", or "suggestion"
- "message": a concise description of the issue (max 120 chars)
- "suggestion": a concrete fix or improved code snippet (max 200 chars)

Focus on: bugs, logic errors, security vulnerabilities (hardcoded secrets, SQL injection, XSS, eval usage), missing error handling, duplicate variables, and code smells. Skip style-only issues.

Return an empty array [] if there are nothing significant to flag.

Here are the changed files and lines to review:
`

  for (const file of files) {
    const lang = getLanguage(file.filename)
    prompt += `\n--- File: ${file.filename} (Language: ${lang}) ---\n`
    prompt += `Lines to review (marked with '+' for added lines, ' ' for context lines):\n`

    for (const line of file.parsedLines) {
      const marker = line.type === 'added' ? '+' : ' '
      prompt += `Line ${line.lineNumber}: ${marker}${line.content}\n`
    }
  }

  return prompt
}