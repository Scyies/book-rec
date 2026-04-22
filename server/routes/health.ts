import { Router } from 'express';

import type { ServiceContainer } from '../container';

export function createHealthRouter(services: ServiceContainer) {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json({
      status: 'ok',
      modelReady: services.neuralRecommender.isReady(),
      data: {
        books: services.dataRepository.getBooks().length,
        users: services.dataRepository.getUsers().length,
        ratings: services.dataRepository.getRatings().length,
      },
      vectorStore: services.vectorStoreKind,
      datasetDirectory: services.datasetDirectory,
    });
  });

  return router;
}
