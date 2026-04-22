import { describe, expect, it } from 'vitest';

import { HashedTfidfVectorizer } from './hashed-vectorizer';

describe('HashedTfidfVectorizer', () => {
  it('generates higher similarity for related texts', () => {
    const vectorizer = new HashedTfidfVectorizer(128);
    vectorizer.fit([
      'dark fantasy politics betrayal',
      'space opera fleets stars',
      'romance small town winter',
    ]);

    const anchor = vectorizer.vectorize('dark fantasy kingdom politics');
    const related = vectorizer.vectorize('grim fantasy betrayal and politics');
    const distant = vectorizer.vectorize('spaceship orbit colony logistics');

    const dot = (left: number[], right: number[]) => left.reduce((sum, value, index) => sum + value * right[index], 0);

    expect(dot(anchor, related)).toBeGreaterThan(dot(anchor, distant));
  });
});
