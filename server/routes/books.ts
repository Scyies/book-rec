import { Router } from 'express';

import type { ServiceContainer } from '../container';

export function createBooksRouter(services: ServiceContainer) {
  const router = Router();

  router.get('/search', (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q : '';
    const books = services.dataRepository.searchBooks(query, 25).map((book) => ({
      bookId: book.book_id,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      year: book.year,
    }));

    response.json({ books });
  });

  return router;
}
