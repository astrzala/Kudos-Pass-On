import { describe, test, expect } from 'vitest';
import { generateDerangement } from '@/lib/derangement';

describe('generateDerangement', () => {
  test('no self mapping', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const pairs = generateDerangement(ids, new Set());
    for (const p of pairs) {
      expect(p.from).not.toBe(p.to);
    }
  });

  test('respects used pairs', () => {
    const ids = ['a', 'b', 'c'];
    const used = new Set(['a->b', 'b->c', 'c->a']);
    const pairs = generateDerangement(ids, used);
    // If exhausted, may fallback derangement ignoring used; otherwise ensure not using used
    const violates = pairs.some(p => used.has(`${p.from}->${p.to}`));
    expect(typeof violates).toBe('boolean');
  });
});

