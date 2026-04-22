function hashToken(token: string, modulo: number) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % modulo;
}

function tokenize(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []).slice(0, 512);
}

function l2Normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

export function averageVectors(vectors: number[][], dimensions: number) {
  if (!vectors.length) {
    return new Array(dimensions).fill(0);
  }

  const sum = new Array(dimensions).fill(0);
  for (const vector of vectors) {
    for (let index = 0; index < dimensions; index += 1) {
      sum[index] += vector[index] ?? 0;
    }
  }

  return l2Normalize(sum.map((value) => value / vectors.length));
}

export class HashedTfidfVectorizer {
  private readonly dimensions: number;
  private idf = new Array<number>();
  private fitted = false;

  constructor(dimensions: number) {
    this.dimensions = dimensions;
    this.idf = new Array(dimensions).fill(1);
  }

  fit(texts: string[]) {
    const documentFrequency = new Array<number>(this.dimensions).fill(0);

    for (const text of texts) {
      const touched = new Set<number>();
      for (const token of tokenize(text)) {
        touched.add(hashToken(token, this.dimensions));
      }

      for (const bucket of touched) {
        documentFrequency[bucket] += 1;
      }
    }

    const documentCount = Math.max(texts.length, 1);
    this.idf = documentFrequency.map((frequency) => Math.log((1 + documentCount) / (1 + frequency)) + 1);
    this.fitted = true;
  }

  vectorize(text: string) {
    if (!this.fitted) {
      throw new Error('Vectorizer must be fitted before calling vectorize().');
    }

    const frequencies = new Array<number>(this.dimensions).fill(0);
    const tokens = tokenize(text);

    for (const token of tokens) {
      const bucket = hashToken(token, this.dimensions);
      frequencies[bucket] += 1;
    }

    const maxFrequency = Math.max(...frequencies, 1);
    const weighted = frequencies.map((value, index) => (value / maxFrequency) * this.idf[index]);

    return l2Normalize(weighted);
  }
}
