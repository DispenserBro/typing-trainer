export function buildSprintWordCount(duration: number, baseWordCount: number) {
  return Math.max(baseWordCount * 4, Math.ceil((duration / 15) * baseWordCount * 4));
}

export function buildChallengeWordCount(baseWordCount: number, multiplier: number) {
  return Math.max(baseWordCount + 4, Math.ceil(baseWordCount * multiplier));
}
