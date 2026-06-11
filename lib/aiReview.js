import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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
    temperature: 0.3,
  })

  const text = response.choices[0].message.content
  console.log('📝 Raw AI response:', text)

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const issues = JSON.parse(cleaned)

    // map diffPosition back onto each issue using lineNumber
    const issuesWithPosition = issues.map((issue) => {
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
  let prompt = `You are a senior code reviewer. Review the following code changes from a pull request.

For each issue you find, respond ONLY with a JSON array in this exact format, nothing else:
[
  {
    "filename": "the file name",
    "lineNumber": the line number as a number,
    "severity": "bug" or "warning" or "suggestion",
    "comment": "your review comment here",
    "suggestedCode": "the exact corrected single line of code, or null if you cannot suggest a fix"
  }
]

If you find no issues, respond with an empty array: []

Do not include any explanation outside the JSON. Only return the JSON array.

Here are the changed lines to review:
`

  for (const file of files) {
    prompt += `\nFile: ${file.filename}\n`
    prompt += `Changed lines:\n`

    for (const line of file.parsedLines) {
      prompt += `Line ${line.lineNumber}: ${line.content}\n`
    }
  }

  return prompt
}