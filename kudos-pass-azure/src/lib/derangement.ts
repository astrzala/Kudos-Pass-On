export type Pair = { from: string; to: string };

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDerangement(participantIds: string[], usedPairs: Set<string>): Pair[] {
  const n = participantIds.length;
  if (n < 2) return [];

  const authors = [...participantIds];
  const targets = [...participantIds];

  for (let attempt = 0; attempt < 200; attempt++) {
    shuffle(targets);
    let valid = true;
    for (let i = 0; i < n; i++) {
      const from = authors[i];
      const to = targets[i];
      if (from === to) { valid = false; break; }
      if (usedPairs.has(`${from}->${to}`)) { valid = false; break; }
    }
    if (valid) {
      return authors.map((from, i) => ({ from, to: targets[i] }));
    }
  }

  // Fallback allow repeats if exhausted: standard derangement ignoring usedPairs
  for (let attempt = 0; attempt < 200; attempt++) {
    shuffle(targets);
    let valid = true;
    for (let i = 0; i < n; i++) {
      if (authors[i] === targets[i]) { valid = false; break; }
    }
    if (valid) return authors.map((from, i) => ({ from, to: targets[i] }));
  }

  // If still not possible (e.g., n=1), return empty
  return [];
}

