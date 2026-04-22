import fs from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'csv-parse/sync';

import type { Book, Rating, User } from '../server/types';

interface CliOptions {
  datasetDir: string;
  outputDir: string;
  minUserRatings: number;
  minBookRatings: number;
  maxUsers: number;
  maxBooks: number;
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);

  const getOption = (name: string, fallback: string) => {
    const argument = args.find((entry) => entry.startsWith(`--${name}=`));
    if (!argument) {
      return fallback;
    }

    return argument.split('=')[1] ?? fallback;
  };

  const datasetDir = getOption('dataset', process.env.KAGGLE_DATASET_PATH ?? path.resolve(process.cwd(), 'data/raw/latest'));

  return {
    datasetDir,
    outputDir: getOption('output', path.resolve(process.cwd(), 'data/processed')),
    minUserRatings: Number(getOption('min-user-ratings', '5')),
    minBookRatings: Number(getOption('min-book-ratings', '5')),
    maxUsers: Number(getOption('max-users', '3000')),
    maxBooks: Number(getOption('max-books', '5000')),
  };
}

function pickValue(record: Record<string, string>, candidates: string[]) {
  for (const candidate of candidates) {
    if (record[candidate] !== undefined) {
      return record[candidate];
    }
  }
  return '';
}

async function readCsv(filePath: string) {
  const content = await fs.readFile(filePath, 'latin1');

  const parseWithDelimiter = (delimiter: string) =>
    parse(content, {
      columns: true,
      delimiter,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    }) as Array<Record<string, string>>;

  const withSemicolon = parseWithDelimiter(';');
  if (withSemicolon.length > 0) {
    return withSemicolon;
  }

  return parseWithDelimiter(',');
}

function splitRatings(ratings: Rating[]) {
  const train: Rating[] = [];
  const evaluation: Rating[] = [];

  const hash = (text: string) => {
    let value = 0;
    for (let index = 0; index < text.length; index += 1) {
      value = (value << 5) - value + text.charCodeAt(index);
      value |= 0;
    }
    return Math.abs(value);
  };

  for (const rating of ratings) {
    const bucket = hash(`${rating.user_id}:${rating.book_id}`) % 100;
    if (bucket < 80) {
      train.push(rating);
    } else {
      evaluation.push(rating);
    }
  }

  if (!evaluation.length && train.length > 5) {
    evaluation.push(...train.splice(0, Math.floor(train.length * 0.2)));
  }

  return { train, evaluation };
}

function topIdsByCount(entries: Rating[], key: 'user_id' | 'book_id', limit: number) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([id]) => id),
  );
}

function filterSparseRatings(ratings: Rating[], minUserRatings: number, minBookRatings: number) {
  let filtered = ratings;
  let previousLength = -1;

  while (filtered.length !== previousLength) {
    previousLength = filtered.length;

    const userCounts = new Map<string, number>();
    const bookCounts = new Map<string, number>();

    for (const rating of filtered) {
      userCounts.set(rating.user_id, (userCounts.get(rating.user_id) ?? 0) + 1);
      bookCounts.set(rating.book_id, (bookCounts.get(rating.book_id) ?? 0) + 1);
    }

    filtered = filtered.filter((rating) => {
      return (userCounts.get(rating.user_id) ?? 0) >= minUserRatings && (bookCounts.get(rating.book_id) ?? 0) >= minBookRatings;
    });
  }

  return filtered;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function metadataText(parts: Array<string | number | null | undefined>) {
  return parts
    .map((entry) => `${entry ?? ''}`.trim())
    .filter(Boolean)
    .join(' | ');
}

async function main() {
  const options = parseCliOptions();

  const booksPathCandidates = ['BX-Books.csv', 'Books.csv'];
  const ratingsPathCandidates = ['BX-Book-Ratings.csv', 'Ratings.csv'];
  const usersPathCandidates = ['BX-Users.csv', 'Users.csv'];

  const resolveDatasetFile = async (candidates: string[]) => {
    for (const candidate of candidates) {
      const filePath = path.join(options.datasetDir, candidate);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // no-op
      }
    }

    throw new Error(`Missing dataset file. Tried: ${candidates.join(', ')} in ${options.datasetDir}`);
  };

  const [booksCsvPath, ratingsCsvPath, usersCsvPath] = await Promise.all([
    resolveDatasetFile(booksPathCandidates),
    resolveDatasetFile(ratingsPathCandidates),
    resolveDatasetFile(usersPathCandidates),
  ]);

  const [bookRows, ratingRows, userRows] = await Promise.all([
    readCsv(booksCsvPath),
    readCsv(ratingsCsvPath),
    readCsv(usersCsvPath),
  ]);

  const booksById = new Map<string, Book>();
  for (const row of bookRows) {
    const bookId = pickValue(row, ['ISBN', 'isbn']).trim();
    const title = pickValue(row, ['Book-Title', 'title']).trim();
    const author = pickValue(row, ['Book-Author', 'author']).trim();
    const publisher = pickValue(row, ['Publisher', 'publisher']).trim();
    const yearRaw = pickValue(row, ['Year-Of-Publication', 'year']).trim();
    const yearNumber = toNumber(yearRaw);

    if (!bookId || !title || !author) {
      continue;
    }

    const metadata = metadataText([title, author, publisher, yearNumber]);

    booksById.set(bookId, {
      book_id: bookId,
      title,
      author,
      publisher,
      year: yearNumber,
      metadata_text: metadata,
    });
  }

  const usersById = new Map<string, User>();
  for (const row of userRows) {
    const userId = pickValue(row, ['User-ID', 'user_id']).trim();
    if (!userId) {
      continue;
    }

    usersById.set(userId, {
      user_id: userId,
      location: pickValue(row, ['Location', 'location']).trim(),
      age: toNumber(pickValue(row, ['Age', 'age']).trim()),
    });
  }

  const rawRatings: Rating[] = [];
  for (const row of ratingRows) {
    const userId = pickValue(row, ['User-ID', 'user_id']).trim();
    const bookId = pickValue(row, ['ISBN', 'book_id']).trim();
    const ratingValue = Number(pickValue(row, ['Book-Rating', 'rating']).trim());

    if (!userId || !bookId || !Number.isFinite(ratingValue)) {
      continue;
    }

    if (ratingValue <= 0) {
      continue;
    }

    if (!booksById.has(bookId)) {
      continue;
    }

    rawRatings.push({
      user_id: userId,
      book_id: bookId,
      rating: ratingValue,
    });
  }

  const sparsityFiltered = filterSparseRatings(rawRatings, options.minUserRatings, options.minBookRatings);

  const selectedUsers = topIdsByCount(sparsityFiltered, 'user_id', options.maxUsers);
  const selectedBooks = topIdsByCount(sparsityFiltered, 'book_id', options.maxBooks);

  const ratings = sparsityFiltered.filter((rating) => selectedUsers.has(rating.user_id) && selectedBooks.has(rating.book_id));

  const books = [...selectedBooks].map((bookId) => booksById.get(bookId)).filter((book): book is Book => Boolean(book));
  const users = [...selectedUsers].map((userId) => usersById.get(userId) ?? { user_id: userId });

  const splits = splitRatings(ratings);

  await fs.mkdir(options.outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(options.outputDir, 'books.json'), JSON.stringify(books, null, 2)),
    fs.writeFile(path.join(options.outputDir, 'users.json'), JSON.stringify(users, null, 2)),
    fs.writeFile(path.join(options.outputDir, 'ratings.json'), JSON.stringify(ratings, null, 2)),
    fs.writeFile(path.join(options.outputDir, 'ratings.train.json'), JSON.stringify(splits.train, null, 2)),
    fs.writeFile(path.join(options.outputDir, 'ratings.eval.json'), JSON.stringify(splits.evaluation, null, 2)),
  ]);

  console.log('[prepare:data] Dataset prepared');
  console.log(`Books: ${books.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Ratings: ${ratings.length}`);
  console.log(`Train split: ${splits.train.length}`);
  console.log(`Eval split: ${splits.evaluation.length}`);
  console.log(`Output: ${options.outputDir}`);
}

main().catch((error) => {
  console.error('[prepare:data] Failed:', error);
  process.exitCode = 1;
});
