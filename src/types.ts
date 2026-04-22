export interface BookSummary {
  bookId: string;
  title: string;
  author: string;
  publisher: string;
  year: number | null;
}

export interface RecommendationItem extends BookSummary {
  semanticScore: number;
  neuralScore: number;
  finalScore: number;
  explanation: string;
}

export interface HealthResponse {
  status: 'ok';
  modelReady: boolean;
  data: {
    books: number;
    users: number;
    ratings: number;
  };
  vectorStore: string;
}
