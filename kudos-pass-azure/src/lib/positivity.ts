const bannedPhrases = [
  'stupid',
  'idiot',
  'dumb',
  'trash',
  'hate you',
];

export function checkPositivity(text: string): { ok: boolean; hint?: string } {
  const lowered = text.toLowerCase();
  for (const phrase of bannedPhrases) {
    if (lowered.includes(phrase)) {
      return { ok: false, hint: 'Please keep it kind and constructive. Try rephrasing positively.' };
    }
  }
  // Heuristic: too many negatives
  const negatives = ['not', "isn\'t", "wasn\'t", 'never', 'no'];
  const negativeCount = negatives.reduce((acc, n) => acc + (lowered.split(n).length - 1), 0);
  if (negativeCount > 3) {
    return { ok: false, hint: 'Focus on what you appreciate about the teammate.' };
  }
  return { ok: true };
}

