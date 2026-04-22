export interface Book {
  book_id: string;
  title: string;
  author: string;
  publisher: string;
  year: number | null;
  metadata_text: string;
}

export interface User {
  user_id: string;
  location?: string;
  age?: number | null;
}

export interface Rating {
  user_id: string;
  book_id: string;
  rating: number;
}

export interface RecommendationRequestPayload {
  userId: string;
  favoriteBookIds: string[];
  query?: string;
  limit?: number;
}

export interface RecommendationItem {
  bookId: string;
  title: string;
  author: string;
  publisher: string;
  year: number | null;
  semanticScore: number;
  neuralScore: number;
  finalScore: number;
  explanation: string;
}

export interface SemanticCandidate {
  bookId: string;
  semanticScore: number;
}

export interface VectorRecord {
  id: string;
  vector: number[];
  payload: {
    book_id: string;
    title: string;
    author: string;
    publisher: string;
    year: number | null;
  };
}
