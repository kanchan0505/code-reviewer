'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function CommitCard({ review, owner, installationId }) {
  const [fixStatus, setFixStatus] = useState({}) // format: { [issueId]: 'idle' | 'loading' | 'success' | 'error' }

  const bugs = review.issues.filter(i => i.severity === 'bug').length
  const warnings = review.issues.filter(i => i.severity === 'warning').length
  const suggestions = review.issues.filter(i => i.severity === 'suggestion').length

  const handleApplyFix = async (issue) => {
    setFixStatus(prev => ({ ...prev, [issue.id]: 'loading' }))
    try {
      const res = await fetch('/api/apply-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo: review.repo,
          branch: review.branch,
          filename: issue.filename,
          lineNumber: issue.lineNumber,
          suggestedCode: issue.suggestedCode,
          installationId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to apply fix')
      }

      setFixStatus(prev => ({ ...prev, [issue.id]: 'success' }))
    } catch (err) {
      console.error(err)
      setFixStatus(prev => ({ ...prev, [issue.id]: 'error' }))
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <a
                href={`https://github.com/${owner}/${review.repo}/commit/${review.commitSha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-primary bg-muted px-2 py-0.5 rounded hover:underline"
              >
                {review.commitSha}
              </a>
              <span className="text-xs text-muted-foreground font-medium">
                {review.repo}
              </span>
              <span className="text-xs text-muted-foreground">
                · {review.branch}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">
              {review.commitMessage}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {review.formattedDate}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {bugs > 0 && (
              <Badge variant="destructive">
                🐛 {bugs} {bugs === 1 ? 'bug' : 'bugs'}
              </Badge>
            )}
            {warnings > 0 && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/5">
                ⚠️ {warnings} {warnings === 1 ? 'warning' : 'warnings'}
              </Badge>
            )}
            {suggestions > 0 && (
              <Badge variant="secondary">
                💡 {suggestions} {suggestions === 1 ? 'suggestion' : 'suggestions'}
              </Badge>
            )}
            {review.issues.length === 0 && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                ✅ Clean
              </Badge>
            )}
          </div>
        </div>

        {review.issues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {review.issues.map((issue) => {
              const status = fixStatus[issue.id] || 'idle'

              return (
                <div key={issue.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {issue.severity === 'bug' ? '🐛' : issue.severity === 'warning' ? '⚠️' : '💡'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {issue.filename}:{issue.lineNumber}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                          issue.severity === 'bug' 
                            ? 'text-red-500 bg-red-500/10' 
                            : issue.severity === 'warning' 
                              ? 'text-amber-500 bg-amber-500/10' 
                              : 'text-blue-500 bg-blue-500/10'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1.5 break-words font-medium">{issue.comment}</p>
                      {issue.suggestedCode && (
                        <div className="mt-2 text-xs font-mono bg-background border border-border rounded p-2 overflow-x-auto text-muted-foreground">
                          <div className="text-[10px] text-muted-foreground/60 uppercase font-semibold mb-1">Suggested Fix:</div>
                          <code className="text-emerald-500 font-semibold">{issue.suggestedCode}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  {issue.suggestedCode && (
                    <div className="flex-shrink-0 self-end sm:self-start">
                      {status === 'idle' && (
                        <button
                          onClick={() => handleApplyFix(issue)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                          Apply fix
                        </button>
                      )}

                      {status === 'loading' && (
                        <button
                          disabled
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-muted text-muted-foreground cursor-not-allowed border border-border"
                        >
                          <svg className="animate-spin h-3.5 w-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Applying...
                        </button>
                      )}

                      {status === 'success' && (
                        <button
                          disabled
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed"
                        >
                          Applied ✓
                        </button>
                      )}

                      {status === 'error' && (
                        <button
                          onClick={() => handleApplyFix(issue)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          Failed — try again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
