import type { Book, RecommendationItem, RecommendationRequestPayload } from '../types';
import { DataRepository } from './data-repository';
import { NeuralRecommender } from './neural-recommender';
import { SemanticRetriever } from './semantic-retriever';

interface HybridRecommenderOptions {
  alpha: number;
  beta: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export class HybridRecommender {
  private readonly dataRepository: DataRepository;
  private readonly semanticRetriever: SemanticRetriever;
  private readonly neuralRecommender: NeuralRecommender;
  private readonly alpha: number;
  private readonly beta: number;

  constructor(
    dataRepository: DataRepository,
    semanticRetriever: SemanticRetriever,
    neuralRecommender: NeuralRecommender,
    options: HybridRecommenderOptions,
  ) {
    this.dataRepository = dataRepository;
    this.semanticRetriever = semanticRetriever;
    this.neuralRecommender = neuralRecommender;

    const total = options.alpha + options.beta;
    this.alpha = total === 0 ? 0.6 : options.alpha / total;
    this.beta = total === 0 ? 0.4 : options.beta / total;
  }

  async recommend(request: RecommendationRequestPayload): Promise<RecommendationItem[]> {
    const favoriteBookIds = [...new Set(request.favoriteBookIds)].filter((bookId) => this.dataRepository.getBookById(bookId));
    const limit = clamp(request.limit ?? 10, 1, 20);
    const candidateLimit = Math.max(limit * 8, 60);

    const semanticCandidates = await this.semanticRetriever.findCandidates({
      favoriteBookIds,
      query: request.query,
      limit: candidateLimit,
    });

    const semanticScores = this.semanticRetriever.semanticScoreByBook(semanticCandidates);

    const excludedBookIds = new Set(favoriteBookIds);
    const candidateBookIds = this.buildCandidateSet(
      semanticCandidates.map((entry) => entry.bookId),
      this.dataRepository.getPopularBooks(candidateLimit, excludedBookIds).map((book) => book.book_id),
      candidateLimit,
    );

    const neuralScores = await this.neuralRecommender.scoreBooks(request.userId, candidateBookIds);

    const ranked = candidateBookIds
      .map((bookId) => {
        const book = this.dataRepository.getBookById(bookId);
        if (!book) {
          return null;
        }

        const semanticScore = semanticScores.get(bookId) ?? this.normalizePopularityFallback(book);
        const neuralScore = neuralScores.get(bookId) ?? this.normalizePopularityFallback(book);
        const finalScore = this.alpha * neuralScore + this.beta * semanticScore;

        return {
          book,
          semanticScore,
          neuralScore,
          finalScore,
        };
      })
      .filter((entry): entry is { book: Book; semanticScore: number; neuralScore: number; finalScore: number } => Boolean(entry))
      .sort((left, right) => right.finalScore - left.finalScore)
      .slice(0, limit)
      .map((entry) => ({
        bookId: entry.book.book_id,
        title: entry.book.title,
        author: entry.book.author,
        publisher: entry.book.publisher,
        year: entry.book.year,
        semanticScore: clamp(entry.semanticScore, 0, 1),
        neuralScore: clamp(entry.neuralScore, 0, 1),
        finalScore: clamp(entry.finalScore, 0, 1),
        explanation: this.buildExplanation({
          hasFavorites: favoriteBookIds.length > 0,
          hasQuery: Boolean(request.query?.trim()),
          neuralScore: entry.neuralScore,
        }),
      }));

    return ranked;
  }

  private normalizePopularityFallback(book: Book) {
    const averageRating = this.dataRepository.getAverageRating(book.book_id);
    if (averageRating <= 1) {
      return clamp(averageRating, 0, 1);
    }
    return clamp(averageRating / 10, 0, 1);
  }

  private buildCandidateSet(primary: string[], backup: string[], limit: number) {
    const merged = new Set<string>();

    for (const bookId of primary) {
      merged.add(bookId);
      if (merged.size >= limit) {
        return [...merged];
      }
    }

    for (const bookId of backup) {
      merged.add(bookId);
      if (merged.size >= limit) {
        return [...merged];
      }
    }

    return [...merged];
  }

  private buildExplanation(input: { hasFavorites: boolean; hasQuery: boolean; neuralScore: number }) {
    const reasons: string[] = [];

    if (input.hasFavorites) {
      reasons.push('Similar to books you selected');
    }

    if (input.hasQuery) {
      reasons.push('Matches your query theme');
    }

    if (input.neuralScore >= 0.65) {
      reasons.push('Predicted strong fit from user behavior patterns');
    }

    if (!reasons.length) {
      reasons.push('Popular among readers with similar tastes');
    }

    return `${reasons.join('. ')}.`;
  }
}
