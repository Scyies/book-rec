import fs from 'node:fs/promises';
import path from 'node:path';

import type { Book, Rating, User } from '../types';

interface DataRepositoryOptions {
  primaryDirectory: string;
  fallbackDirectory: string;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

function metadataFromBook(book: Partial<Book>) {
  const parts = [book.title, book.author, book.publisher, book.year?.toString()]
    .filter((entry): entry is string => Boolean(entry && entry.trim()))
    .map((entry) => entry.trim());

  return parts.join(' | ');
}

export class DataRepository {
  private readonly primaryDirectory: string;
  private readonly fallbackDirectory: string;
  private books: Book[] = [];
  private users: User[] = [];
  private ratings: Rating[] = [];
  private bookById = new Map<string, Book>();
  private averageRatingByBookId = new Map<string, number>();

  constructor(options: DataRepositoryOptions) {
    this.primaryDirectory = options.primaryDirectory;
    this.fallbackDirectory = options.fallbackDirectory;
  }

  private async directoryHasCoreFiles(directory: string) {
    const files = ['books.json', 'users.json', 'ratings.json'].map((fileName) => path.join(directory, fileName));

    const checks = await Promise.all(files.map((filePath) => fs.access(filePath).then(() => true).catch(() => false)));
    return checks.every(Boolean);
  }

  private async resolveDirectory() {
    if (await this.directoryHasCoreFiles(this.primaryDirectory)) {
      return this.primaryDirectory;
    }

    if (await this.directoryHasCoreFiles(this.fallbackDirectory)) {
      return this.fallbackDirectory;
    }

    throw new Error(
      `No valid dataset found. Expected books/users/ratings json files in ${this.primaryDirectory} or ${this.fallbackDirectory}.`,
    );
  }

  async load() {
    const directory = await this.resolveDirectory();

    const [books, users, ratings] = await Promise.all([
      readJsonFile<Book[]>(path.join(directory, 'books.json')),
      readJsonFile<User[]>(path.join(directory, 'users.json')),
      readJsonFile<Rating[]>(path.join(directory, 'ratings.json')),
    ]);

    this.books = books.map((book) => ({
      ...book,
      metadata_text: book.metadata_text?.trim() ? book.metadata_text : metadataFromBook(book),
    }));
    this.users = users;
    this.ratings = ratings;

    this.bookById = new Map(this.books.map((book) => [book.book_id, book]));
    this.averageRatingByBookId = this.computeAverageRatings(this.ratings);

    return {
      books: this.books.length,
      users: this.users.length,
      ratings: this.ratings.length,
      directory,
    };
  }

  getBooks() {
    return this.books;
  }

  getUsers() {
    return this.users;
  }

  getRatings() {
    return this.ratings;
  }

  getBookById(bookId: string) {
    return this.bookById.get(bookId);
  }

  getAverageRating(bookId: string) {
    return this.averageRatingByBookId.get(bookId) ?? 0;
  }

  searchBooks(query: string, limit = 20) {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return this.getPopularBooks(limit);
    }

    const terms = normalized.split(/\s+/).filter(Boolean);

    return this.books
      .map((book) => {
        const haystack = `${book.title} ${book.author} ${book.publisher} ${book.metadata_text}`.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        const startsWith = book.title.toLowerCase().startsWith(normalized) ? 1 : 0;

        return { book, score: score + startsWith };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.book);
  }

  getPopularBooks(limit: number, excludedBookIds = new Set<string>()) {
    return this.books
      .filter((book) => !excludedBookIds.has(book.book_id))
      .map((book) => ({
        book,
        score: this.averageRatingByBookId.get(book.book_id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.book);
  }

  private computeAverageRatings(ratings: Rating[]) {
    const totals = new Map<string, { total: number; count: number }>();

    for (const rating of ratings) {
      const current = totals.get(rating.book_id) ?? { total: 0, count: 0 };
      totals.set(rating.book_id, {
        total: current.total + rating.rating,
        count: current.count + 1,
      });
    }

    const averageMap = new Map<string, number>();
    for (const [bookId, aggregate] of totals) {
      averageMap.set(bookId, aggregate.total / aggregate.count);
    }

    return averageMap;
  }
}
