import '@tensorflow/tfjs-node';
import { appConfig } from '../server/config';
import { DataRepository } from '../server/services/data-repository';
import { HybridRecommender } from '../server/services/hybrid-recommender';
import { NeuralRecommender } from '../server/services/neural-recommender';
import { SemanticRetriever } from '../server/services/semantic-retriever';
import { InMemoryVectorStore } from '../server/services/vector-store';
import type { Rating } from '../server/types';

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function logPhase(message: string) {
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${now}] ${message}`);
}

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
  const runStartedAt = Date.now();
  const topK = 10;
  logPhase('[1/4] Loading dataset...');
  const dataRepository = new DataRepository({
    primaryDirectory: appConfig.dataDir,
    fallbackDirectory: appConfig.fallbackDataDir,
  });

  await dataRepository.load();
  logPhase(
    `[1/4] Loaded ${dataRepository.getBooks().length} books, ${dataRepository.getUsers().length} users, ${dataRepository.getRatings().length} ratings.`,
  );

  logPhase('[2/4] Building semantic index...');
  const semanticRetriever = new SemanticRetriever(new InMemoryVectorStore(), appConfig.vectorDim);
  await semanticRetriever.indexBooks(dataRepository.getBooks());
  logPhase('[2/4] Semantic index ready.');

  logPhase('[3/4] Training neural recommender...');
  const trainingStartedAt = Date.now();
  const neuralRecommender = new NeuralRecommender();
  const totalEpochs = 14;
  await neuralRecommender.train(dataRepository.getRatings(), {
    epochs: totalEpochs,
    onEpochEnd: ({ epoch, totalEpochs: epochs, loss, validationLoss }) => {
      const elapsed = Date.now() - trainingStartedAt;
      const epochDuration = elapsed / epoch;
      const eta = epochDuration * (epochs - epoch);
      console.log(
        `[train] epoch ${epoch}/${epochs} loss=${loss?.toFixed(5) ?? 'n/a'} val_loss=${validationLoss?.toFixed(5) ?? 'n/a'} elapsed=${formatDuration(elapsed)} eta=${formatDuration(eta)}`,
      );
    },
  });
  logPhase(`[3/4] Neural model ready in ${formatDuration(Date.now() - trainingStartedAt)}.`);

  const hybridRecommender = new HybridRecommender(dataRepository, semanticRetriever, neuralRecommender, {
    alpha: appConfig.hybridAlpha,
    beta: appConfig.hybridBeta,
  });

  const { favoritesByUser, relevantByUser } = splitFavoritesAndRelevant(dataRepository.getRatings());
  const userIds = [...favoritesByUser.keys()].filter((userId) => relevantByUser.has(userId));
  logPhase(`[4/4] Evaluating baselines for ${userIds.length} users...`);
  const evaluationStartedAt = Date.now();

  const popularitySortedBooks = dataRepository
    .getPopularBooks(dataRepository.getBooks().length)
    .map((book) => book.book_id);

  const metrics = {
    popularity: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
    semantic: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
    neural: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
    hybrid: { precision: [] as number[], recall: [] as number[], ndcg: [] as number[] },
  };

  for (let userIndex = 0; userIndex < userIds.length; userIndex += 1) {
    const userId = userIds[userIndex];
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

    const processed = userIndex + 1;
    if (processed === 1 || processed === userIds.length || processed % 50 === 0) {
      const elapsed = Date.now() - evaluationStartedAt;
      const perUser = elapsed / processed;
      const eta = perUser * (userIds.length - processed);
      const percent = ((processed / userIds.length) * 100).toFixed(1);

      console.log(
        `[eval] ${processed}/${userIds.length} users (${percent}%) elapsed=${formatDuration(elapsed)} eta=${formatDuration(eta)}`,
      );
    }
  }

  logPhase(`Evaluation finished in ${formatDuration(Date.now() - runStartedAt)}.`);
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
