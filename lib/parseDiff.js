export function parseDiff(patch) {
  // if no patch exists (binary file, deleted file) return empty
  if (!patch) return []

  const lines = patch.split('\n')
  const result = []

  let diffPosition = 0
  let fileLineNumber = 0

  for (const line of lines) {
    // hunk header line — looks like @@ -1,3 +1,4 @@
    if (line.startsWith('@@')) {
      diffPosition++

      // extract the starting line number from the + side
      // @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/)
      fileLineNumber = match ? parseInt(match[1]) - 1 : 0
      continue
    }

    // added line — this is what we care about
    if (line.startsWith('+') && !line.startsWith('+++')) {
      diffPosition++
      fileLineNumber++
      result.push({
        lineNumber: fileLineNumber,
        diffPosition: diffPosition,
        content: line.slice(1), // remove the leading + character
      })
      continue
    }

    // removed line — skip but track position
    if (line.startsWith('-') && !line.startsWith('---')) {
      diffPosition++
      continue
    }

    // unchanged context line
    diffPosition++
    fileLineNumber++
  }

  return result
}