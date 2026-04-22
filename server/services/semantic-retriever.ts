import { HashedTfidfVectorizer, averageVectors } from '../ml/hashed-vectorizer';
import type { Book, SemanticCandidate, VectorRecord } from '../types';
import type { VectorStore } from './vector-store';

interface SemanticQueryInput {
  favoriteBookIds: string[];
  query?: string;
  limit: number;
}

export class SemanticRetriever {
  private readonly vectorizer: HashedTfidfVectorizer;
  private readonly vectorStore: VectorStore;
  private readonly dimensions: number;
  private vectorsByBookId = new Map<string, number[]>();

  constructor(vectorStore: VectorStore, dimensions: number) {
    this.vectorStore = vectorStore;
    this.dimensions = dimensions;
    this.vectorizer = new HashedTfidfVectorizer(dimensions);
  }

  async indexBooks(books: Book[]) {
    this.vectorizer.fit(books.map((book) => book.metadata_text));

    const records: VectorRecord[] = books.map((book) => {
      const vector = this.vectorizer.vectorize(book.metadata_text);
      this.vectorsByBookId.set(book.book_id, vector);

      return {
        id: book.book_id,
        vector,
        payload: {
          book_id: book.book_id,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          year: book.year,
        },
      };
    });

    await this.vectorStore.upsert(records);
  }

  getVector(bookId: string) {
    return this.vectorsByBookId.get(bookId);
  }

  getVectorStoreKind() {
    return this.vectorStore.kind;
  }

  async findCandidates(input: SemanticQueryInput) {
    const excludedBookIds = new Set(input.favoriteBookIds);
    const queryVector = this.buildQueryVector(input.favoriteBookIds, input.query);

    if (!queryVector) {
      return [];
    }

    return this.vectorStore.search(queryVector, input.limit, excludedBookIds);
  }

  private buildQueryVector(favoriteBookIds: string[], query?: string) {
    const vectors: number[][] = [];

    for (const bookId of favoriteBookIds) {
      const vector = this.getVector(bookId);
      if (vector) {
        vectors.push(vector);
      }
    }

    if (query?.trim()) {
      vectors.push(this.vectorizer.vectorize(query));
    }

    if (!vectors.length) {
      return null;
    }

    return averageVectors(vectors, this.dimensions);
  }

  semanticScoreByBook(candidates: SemanticCandidate[]) {
    return new Map(candidates.map((candidate) => [candidate.bookId, candidate.semanticScore]));
  }
}
