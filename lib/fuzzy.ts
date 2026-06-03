// Levenshtein distance between two strings
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// Find best match from a list of names
// Returns the match if distance is ≤ 2 (allows 1-2 typos), null otherwise
export function findBestMatch(
  input: string,
  candidates: { id: string; name: string }[]
): { id: string; name: string } | null {
  const normalInput = input.toLowerCase().trim()

  // Exact match first
  const exact = candidates.find(c => c.name.toLowerCase() === normalInput)
  if (exact) return exact

  // Fuzzy match
  let bestMatch: { id: string; name: string } | null = null
  let bestDist = Infinity

  for (const candidate of candidates) {
    const dist = levenshtein(normalInput, candidate.name.toLowerCase())
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = candidate
    }
  }

  // Only accept if distance is small enough relative to name length
  const threshold = Math.max(1, Math.min(2, Math.floor(normalInput.length / 3)))
  return bestDist <= threshold ? bestMatch : null
}

// Normalize a customer name for matching (used in debt lookup)
export function normalizeCustomerName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}
