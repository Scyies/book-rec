import cors from 'cors';
import express from 'express';

import { appConfig } from './config';
import type { ServiceContainer } from './container';
import { createBooksRouter } from './routes/books';
import { createHealthRouter } from './routes/health';
import { createRecommendRouter } from './routes/recommend';
import { DataRepository } from './services/data-repository';
import { HybridRecommender } from './services/hybrid-recommender';
import { NeuralRecommender } from './services/neural-recommender';
import { SemanticRetriever } from './services/semantic-retriever';
import { InMemoryVectorStore, QdrantVectorStore } from './services/vector-store';

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const dataRepository = new DataRepository({
    primaryDirectory: appConfig.dataDir,
    fallbackDirectory: appConfig.fallbackDataDir,
  });

  const loadResult = await dataRepository.load();

  const vectorStore = appConfig.qdrantUrl
    ? new QdrantVectorStore({
      url: appConfig.qdrantUrl,
      apiKey: appConfig.qdrantApiKey,
      collectionName: appConfig.qdrantCollection,
      vectorSize: appConfig.vectorDim,
    })
    : new InMemoryVectorStore();

  const semanticRetriever = new SemanticRetriever(vectorStore, appConfig.vectorDim);
  await semanticRetriever.indexBooks(dataRepository.getBooks());

  const neuralRecommender = new NeuralRecommender();
  try {
    await neuralRecommender.train(dataRepository.getRatings());
  } catch (error) {
    console.error('[startup] neural model training failed, falling back to priors:', error);
  }

  const hybridRecommender = new HybridRecommender(dataRepository, semanticRetriever, neuralRecommender, {
    alpha: appConfig.hybridAlpha,
    beta: appConfig.hybridBeta,
  });

  const services: ServiceContainer = {
    dataRepository,
    semanticRetriever,
    neuralRecommender,
    hybridRecommender,
    datasetDirectory: loadResult.directory,
    vectorStoreKind: semanticRetriever.getVectorStoreKind(),
  };

  app.use('/api/health', createHealthRouter(services));
  app.use('/api/books', createBooksRouter(services));
  app.use('/api/recommend', createRecommendRouter(services));

  return { app, services };
}
