import '@tensorflow/tfjs-node';
import * as tf from '@tensorflow/tfjs';

import type { Rating } from '../types';

const DEFAULT_SCORE = 0.5;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeRating(rawRating: number) {
  if (rawRating <= 1) {
    return clamp(rawRating, 0, 1);
  }

  return clamp(rawRating / 10, 0, 1);
}

interface TrainingOptions {
  epochs?: number;
  batchSize?: number;
}

export class NeuralRecommender {
  private model: tf.LayersModel | null = null;
  private userIndex = new Map<string, number>();
  private bookIndex = new Map<string, number>();
  private averageBookScore = new Map<string, number>();
  private globalScore = DEFAULT_SCORE;
  private ready = false;

  isReady() {
    return this.ready;
  }

  async train(ratings: Rating[], options: TrainingOptions = {}) {
    this.ready = false;

    if (!ratings.length) {
      this.model = null;
      this.ready = true;
      return;
    }

    const uniqueUsers = [...new Set(ratings.map((rating) => rating.user_id))];
    const uniqueBooks = [...new Set(ratings.map((rating) => rating.book_id))];

    this.userIndex = new Map(uniqueUsers.map((userId, index) => [userId, index + 1]));
    this.bookIndex = new Map(uniqueBooks.map((bookId, index) => [bookId, index + 1]));

    this.updateFallbackScores(ratings);

    const userIndices = ratings.map((rating) => this.userIndex.get(rating.user_id) ?? 0);
    const bookIndices = ratings.map((rating) => this.bookIndex.get(rating.book_id) ?? 0);
    const labels = ratings.map((rating) => normalizeRating(rating.rating));

    const userTensor = tf.tensor2d(userIndices, [userIndices.length, 1], 'int32');
    const bookTensor = tf.tensor2d(bookIndices, [bookIndices.length, 1], 'int32');
    const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

    const nextModel = this.buildModel(uniqueUsers.length + 1, uniqueBooks.length + 1);

    try {
      await nextModel.fit([userTensor, bookTensor], labelTensor, {
        epochs: options.epochs ?? 14,
        batchSize: options.batchSize ?? 128,
        shuffle: true,
        validationSplit: Math.min(0.2, ratings.length > 100 ? 0.2 : 0),
        verbose: 0,
      });

      this.model?.dispose();
      this.model = nextModel;
      this.ready = true;
    } finally {
      userTensor.dispose();
      bookTensor.dispose();
      labelTensor.dispose();
    }
  }

  async scoreBooks(userId: string, bookIds: string[]) {
    const scores = new Map<string, number>();

    if (!bookIds.length) {
      return scores;
    }

    const userToken = this.userIndex.get(userId);
    if (!this.model || userToken === undefined) {
      for (const bookId of bookIds) {
        scores.set(bookId, this.averageBookScore.get(bookId) ?? this.globalScore);
      }
      return scores;
    }

    const knownBookIds: string[] = [];
    const knownBookTokens: number[] = [];

    for (const bookId of bookIds) {
      const token = this.bookIndex.get(bookId);
      if (token === undefined) {
        scores.set(bookId, this.averageBookScore.get(bookId) ?? this.globalScore);
        continue;
      }

      knownBookIds.push(bookId);
      knownBookTokens.push(token);
    }

    if (!knownBookIds.length) {
      return scores;
    }

    const usersTensor = tf.tensor2d(new Array(knownBookTokens.length).fill(userToken), [knownBookTokens.length, 1], 'int32');
    const booksTensor = tf.tensor2d(knownBookTokens, [knownBookTokens.length, 1], 'int32');

    const predictions = this.model.predict([usersTensor, booksTensor]) as tf.Tensor;
    const values = Array.from(await predictions.data());

    predictions.dispose();
    usersTensor.dispose();
    booksTensor.dispose();

    for (let index = 0; index < knownBookIds.length; index += 1) {
      scores.set(knownBookIds[index], clamp(values[index] ?? DEFAULT_SCORE, 0, 1));
    }

    return scores;
  }

  private buildModel(userCardinality: number, bookCardinality: number) {
    const userInput = tf.input({ shape: [1], dtype: 'int32', name: 'user_id' });
    const bookInput = tf.input({ shape: [1], dtype: 'int32', name: 'book_id' });

    const userEmbedding = tf.layers.embedding({
      inputDim: userCardinality,
      outputDim: 32,
      embeddingsInitializer: 'glorotUniform',
    }).apply(userInput) as tf.SymbolicTensor;

    const bookEmbedding = tf.layers.embedding({
      inputDim: bookCardinality,
      outputDim: 32,
      embeddingsInitializer: 'glorotUniform',
    }).apply(bookInput) as tf.SymbolicTensor;

    const merged = tf.layers.concatenate().apply([
      tf.layers.flatten().apply(userEmbedding) as tf.SymbolicTensor,
      tf.layers.flatten().apply(bookEmbedding) as tf.SymbolicTensor,
    ]) as tf.SymbolicTensor;

    const dense1 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(merged) as tf.SymbolicTensor;
    const dense2 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(dense1) as tf.SymbolicTensor;
    const output = tf.layers.dense({ units: 1, activation: 'sigmoid' }).apply(dense2) as tf.SymbolicTensor;

    const model = tf.model({ inputs: [userInput, bookInput], outputs: output });
    model.compile({ optimizer: tf.train.adam(0.003), loss: 'meanSquaredError' });

    return model;
  }

  private updateFallbackScores(ratings: Rating[]) {
    const sumByBook = new Map<string, { total: number; count: number }>();
    let globalTotal = 0;

    for (const rating of ratings) {
      const normalized = normalizeRating(rating.rating);
      globalTotal += normalized;

      const current = sumByBook.get(rating.book_id) ?? { total: 0, count: 0 };
      sumByBook.set(rating.book_id, {
        total: current.total + normalized,
        count: current.count + 1,
      });
    }

    this.globalScore = ratings.length ? globalTotal / ratings.length : DEFAULT_SCORE;

    this.averageBookScore = new Map(
      [...sumByBook.entries()].map(([bookId, aggregate]) => [bookId, aggregate.total / aggregate.count]),
    );
  }
}
