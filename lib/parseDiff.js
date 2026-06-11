export function parseDiff(patch) {
  if (!patch) return []

  const lines = patch.split("\n")
  const allNewLines = []

  let diffPosition = 0
  let fileLineNumber = 0

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/)
      fileLineNumber = match ? parseInt(match[1]) - 1 : 0
      continue
    }

    diffPosition++

    if (line.startsWith("+") && !line.startsWith("+++")) {
      fileLineNumber++
      allNewLines.push({
        lineNumber: fileLineNumber,
        diffPosition,
        content: line.slice(1),
        type: 'added'
      })
      continue
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue
    }

    fileLineNumber++
    const content = line.startsWith(" ") ? line.slice(1) : line
    allNewLines.push({
      lineNumber: fileLineNumber,
      diffPosition,
      content: content,
      type: 'context'
    })
  }

  const addedLineNumbers = allNewLines.filter(l => l.type === 'added').map(l => l.lineNumber)
  
  return allNewLines.filter(line => {
    return addedLineNumbers.some(addedNum => Math.abs(line.lineNumber - addedNum) <= 8)
  })
}