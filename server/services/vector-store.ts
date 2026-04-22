import { QdrantClient } from '@qdrant/js-client-rest';

import type { SemanticCandidate, VectorRecord } from '../types';

function cosineSimilarity(left: number[], right: number[]) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;

    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export interface VectorStore {
  readonly kind: string;
  upsert(records: VectorRecord[]): Promise<void>;
  search(vector: number[], limit: number, excludedBookIds: Set<string>): Promise<SemanticCandidate[]>;
}

export class InMemoryVectorStore implements VectorStore {
  readonly kind = 'in-memory';
  private recordsById = new Map<string, VectorRecord>();

  async upsert(records: VectorRecord[]) {
    for (const record of records) {
      this.recordsById.set(record.id, record);
    }
  }

  async search(vector: number[], limit: number, excludedBookIds: Set<string>) {
    const results: SemanticCandidate[] = [];

    for (const [bookId, record] of this.recordsById.entries()) {
      if (excludedBookIds.has(bookId)) {
        continue;
      }

      results.push({
        bookId,
        semanticScore: Math.max(0, cosineSimilarity(vector, record.vector)),
      });
    }

    return results.sort((a, b) => b.semanticScore - a.semanticScore).slice(0, limit);
  }
}

export class QdrantVectorStore implements VectorStore {
  readonly kind = 'qdrant';
  private readonly client: QdrantClient;
  private readonly collectionName: string;
  private readonly vectorSize: number;

  constructor(options: { url: string; apiKey?: string; collectionName: string; vectorSize: number }) {
    this.client = new QdrantClient({
      url: options.url,
      apiKey: options.apiKey,
    });
    this.collectionName = options.collectionName;
    this.vectorSize = options.vectorSize;
  }

  async ensureCollection() {
    try {
      await this.client.getCollection(this.collectionName);
    } catch {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
    }
  }

  async upsert(records: VectorRecord[]) {
    await this.ensureCollection();
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: records.map((record) => ({
        id: record.id,
        vector: record.vector,
        payload: record.payload,
      })),
    });
  }

  async search(vector: number[], limit: number, excludedBookIds: Set<string>) {
    await this.ensureCollection();
    const searchResult = await this.client.search(this.collectionName, {
      vector,
      limit: limit + excludedBookIds.size,
      with_payload: true,
    });

    return searchResult
      .map((entry) => {
        const bookId = String(entry.id);
        return {
          bookId,
          semanticScore: typeof entry.score === 'number' ? entry.score : 0,
        };
      })
      .filter((entry) => !excludedBookIds.has(entry.bookId))
      .slice(0, limit);
  }
}
