import { Router } from 'express';
import { z } from 'zod';

import type { ServiceContainer } from '../container';

const recommendationSchema = z.object({
  userId: z.string().min(1),
  favoriteBookIds: z.array(z.string()).default([]),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export function createRecommendRouter(services: ServiceContainer) {
  const router = Router();

  router.post('/', async (request, response) => {
    const parsedBody = recommendationSchema.safeParse(request.body);

    if (!parsedBody.success) {
      response.status(400).json({
        error: 'Invalid request payload',
        issues: parsedBody.error.issues,
      });
      return;
    }

    try {
      const recommendations = await services.hybridRecommender.recommend(parsedBody.data);
      response.json({ recommendations });
    } catch (error) {
      response.status(500).json({
        error: 'Failed to compute recommendations',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
