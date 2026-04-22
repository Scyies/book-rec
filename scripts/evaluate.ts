import '@tensorflow/tfjs-node';
import { appConfig } from '../server/config';
import { DataRepository } from '../server/services/data-repository';
import { HybridRecommender } from '../server/services/hybrid-recommender';
import { NeuralRecommender } from '../server/services/neural-recommender';
import { SemanticRetriever } from '../server/services/semantic-retriever';
import { InMemoryVectorStore } from '../server/services/vector-store';
import type { Rating } from '../server/types';

function precisionAtK(recommendations: string[], relevant: Set<string>, k: number) {
  const top = recommendations.slice(0, k);
  const hits = top.filter((bookId) => relevant.has(bookId)).length;
  return hits / k;
}

function recallAtK(recommendations: string[], relevant: Set<string>, k: number) {
  if (!relevant.size) {
    return 0;
  }

  const top = recommendations.slice(0, k);
  const hits = top.filter((bookId) => relevant.has(bookId)).length;
  return hits / relevant.size;
}

function ndcgAtK(recommendations: string[], relevant: Set<string>, k: number) {
  const top = recommendations.slice(0, k);
  let dcg = 0;

  for (let index = 0; index < top.length; index += 1) {
    if (relevant.has(top[index])) {
      dcg += 1 / Math.log2(index + 2);
    }
  }

  const idealHits = Math.min(k, relevant.size);
  let idcg = 0;
  for (let index = 0; index < idealHits; index += 1) {
    idcg += 1 / Math.log2(index + 2);
  }

  if (idcg === 0) {
    return 0;
  }

  return dcg / idcg;
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function splitFavoritesAndRelevant(ratings: Rating[]) {
  const byUser = new Map<string, Rating[]>();

  for (const rating of ratings) {
    const list = byUser.get(rating.user_id) ?? [];
    list.push(rating);
    byUser.set(rating.user_id, list);
  }

  const favoritesByUser = new Map<string, string[]>();
  const relevantByUser = new Map<string, Set<string>>();

  for (const [userId, userRatings] of byUser) {
    const sorted = [...userRatings].sort((left, right) => right.rating - left.rating);
    const favorites = sorted.slice(0, 3).map((rating) => rating.book_id);
    const relevant = new Set(sorted.slice(3, 8).filter((rating) => rating.rating >= 7).map((rating) => rating.book_id));

    if (favorites.length && relevant.size) {
      favoritesByUser.set(userId, favorites);
      relevantByUser.set(userId, relevant);
    }
  }

  return {
    favoritesByUser,
    relevantByUser,
  };
}

async function main() {
  const topK = 10;
  const dataRepository = new DataRepository({
    primaryDirectory: appConfig.dataDir,
    fallbackDirectory: appConfig.fallbackDataDir,
  });

  await dataRepository.load();

  const semanticRetriever = new SemanticRetriever(new InMemoryVectorStore(), appConfig.vectorDim);
  await semanticRetriever.indexBooks(dataRepository.getBooks());

  const neuralRecommender = new NeuralRecommender();
  await neuralRecommender.train(dataRepository.getRatings());

  const hybridRecommender = new HybridRecommender(dataRepository, semanticRetriever, neuralRecommender, {
    alpha: appConfig.hybridAlpha,
    beta: appConfig.hybridBeta,
  });

  const { favoritesByUser, relevantByUser } = splitFavoritesAndRelevant(dataRepository.getRatings());
  const userIds = [...favoritesByUser.keys()].filter((userId) => relevantByUser.has(userId));

  const popularitySortedBooks = dataRepository
    .getPopularBooks(dataRepository.getBooks().length)
    .map((book) => book.book_id);

  const metrics = {
    popularity: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
    semantic: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
    neural: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
    hybrid: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
  };

  for (const userId of userIds) {
    const favorites = favoritesByUser.get(userId) ?? [];
    const relevant = relevantByUser.get(userId) ?? new Set<string>();
    const excluded = new Set(favorites);

    const popularity = popularitySortedBooks.filter((bookId) => !excluded.has(bookId)).slice(0, topK);

    const semantic = (await semanticRetriever.findCandidates({
      favoriteBookIds: favorites,
      query: undefined,
      limit: topK,
    })).map((entry) => entry.bookId);

    const unseenBooks = dataRepository
      .getBooks()
      .map((book) => book.book_id)
      .filter((bookId) => !excluded.has(bookId));

    const neuralScores = await neuralRecommender.scoreBooks(userId, unseenBooks);
    const neural = unseenBooks
      .map((bookId) => ({
        bookId,
        score: neuralScores.get(bookId) ?? 0,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map((entry) => entry.bookId);

    const hybrid = (await hybridRecommender.recommend({
      userId,
      favoriteBookIds: favorites,
      query: undefined,
      limit: topK,
    })).map((entry) => entry.bookId);

    const bundles = [
      ['popularity', popularity],
      ['semantic', semantic],
      ['neural', neural],
      ['hybrid', hybrid],
    ] as const;

    for (const [name, recommendations] of bundles) {
      metrics[name].precision.push(precisionAtK(recommendations, relevant, topK));
      metrics[name].recall.push(recallAtK(recommendations, relevant, topK));
      metrics[name].ndcg.push(ndcgAtK(recommendations, relevant, topK));
    }
  }

  console.log('Evaluation dataset users:', userIds.length);
  console.log('');
  console.log('Model\t\tPrecision@10\tRecall@10\tNDCG@10');
  console.log('--------------------------------------------------------');

  for (const [name, values] of Object.entries(metrics)) {
    const row = [
      name.padEnd(10, ' '),
      average(values.precision).toFixed(4).padEnd(11, ' '),
      average(values.recall).toFixed(4).padEnd(9, ' '),
      average(values.ndcg).toFixed(4),
    ].join('\t');

    console.log(row);
  }
}

main().catch((error) => {
  console.error('[evaluate] Failed:', error);
  process.exitCode = 1;
});
