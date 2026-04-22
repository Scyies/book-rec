import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { DataRepository } from './data-repository';
import { HybridRecommender } from './hybrid-recommender';
import { NeuralRecommender } from './neural-recommender';
import { SemanticRetriever } from './semantic-retriever';
import { InMemoryVectorStore } from './vector-store';

let hybridRecommender: HybridRecommender;

beforeAll(async () => {
  const repository = new DataRepository({
    primaryDirectory: path.resolve(process.cwd(), 'data/processed'),
    fallbackDirectory: path.resolve(process.cwd(), 'data/demo'),
  });

  await repository.load();

  const semanticRetriever = new SemanticRetriever(new InMemoryVectorStore(), 128);
  await semanticRetriever.indexBooks(repository.getBooks());

  const neuralRecommender = new NeuralRecommender();
  await neuralRecommender.train(repository.getRatings(), { epochs: 4 });

  hybridRecommender = new HybridRecommender(repository, semanticRetriever, neuralRecommender, {
    alpha: 0.6,
    beta: 0.4,
  });
}, 20_000);

describe('HybridRecommender', () => {
  it('returns ranked recommendations without selected favorites', async () => {
    const favorites = ['b001', 'b002', 'b003'];

    const recommendations = await hybridRecommender.recommend({
      userId: 'u001',
      favoriteBookIds: favorites,
      query: 'dark fantasy politics',
      limit: 8,
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(8);

    for (const recommendation of recommendations) {
      expect(favorites).not.toContain(recommendation.bookId);
      expect(recommendation.finalScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.finalScore).toBeLessThanOrEqual(1);
      expect(recommendation.explanation.length).toBeGreaterThan(4);
    }
  });
});
