export function parseDiff(patch) {
  if (!patch) return []

  const lines = patch.split("\n")
  const result = []

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
      result.push({
        lineNumber: fileLineNumber,
        diffPosition,
        content: line.slice(1),
      })
      continue
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue
    }

    fileLineNumber++
  }

  return result
}