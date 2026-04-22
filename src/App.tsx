import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import { recommendBooks, fetchHealth, searchBooks } from '@/lib/api';
import { BookPicker } from '@/components/book-picker';
import { RecommendationList } from '@/components/recommendation-list';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { BookSummary, HealthResponse, RecommendationItem } from '@/types';

function clampLimit(value: number) {
  return Math.min(20, Math.max(5, value));
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [favorites, setFavorites] = useState<BookSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableBooks, setAvailableBooks] = useState<BookSummary[]>([]);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchHealth()
      .then((result) => {
        if (active) {
          setHealth(result);
        }
      })
      .catch((error: Error) => {
        if (active) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let active = true;
      setIsSearchingBooks(true);
      searchBooks(searchTerm)
        .then((result) => {
          if (active) {
            setAvailableBooks(result.books);
          }
        })
        .catch((error: Error) => {
          if (active) {
            setErrorMessage(error.message);
          }
        })
        .finally(() => {
          if (active) {
            setIsSearchingBooks(false);
          }
        });

      return () => {
        active = false;
      };
    }, 180);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const canSubmit = useMemo(() => !isLoadingResults && health?.modelReady, [health?.modelReady, isLoadingResults]);

  function addFavorite(book: BookSummary) {
    setFavorites((current) => {
      if (current.some((item) => item.bookId === book.bookId)) {
        return current;
      }
      return [...current, book];
    });
  }

  function removeFavorite(bookId: string) {
    setFavorites((current) => current.filter((book) => book.bookId !== bookId));
  }

  async function handleRecommend() {
    try {
      setErrorMessage(null);
      setIsLoadingResults(true);

      const response = await recommendBooks({
        userId: 'demo_user_1',
        favoriteBookIds: favorites.map((book) => book.bookId),
        query: semanticQuery.trim() || undefined,
        limit: clampLimit(limit),
      });

      setRecommendations(response.recommendations);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown recommendation error');
    } finally {
      setIsLoadingResults(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-12 pt-10 text-foreground sm:px-8">
      <div className="book-grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(245,198,59,0.22),transparent_40%),radial-gradient(circle_at_80%_8%,rgba(96,165,250,0.2),transparent_36%)]" />

      <div className="relative mx-auto max-w-6xl space-y-8">
        <header className="rounded-2xl border border-stone-300/80 bg-stone-100/90 p-6 shadow-glow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Hybrid Recommendation System</p>
              <h1 className="font-heading text-6xl leading-[0.9] text-stone-900 sm:text-7xl">Book Rec Lab</h1>
              <p className="mt-3 max-w-2xl text-sm text-stone-700 sm:text-base">
                Semantic retrieval + TensorFlow.js neural ranking + transparent explanations for a live AI demo.
              </p>
            </div>
            <div className="rounded-xl border border-stone-300 bg-white/80 px-4 py-3 text-sm">
              <p className="font-semibold text-stone-800">Model status</p>
              <p className="text-stone-600">{health?.modelReady ? 'Ready' : 'Training'}</p>
              <p className="mt-2 text-xs text-stone-500">Vector store: {health?.vectorStore ?? 'loading...'}</p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-6">
            <BookPicker
              availableBooks={availableBooks}
              selectedBooks={favorites}
              query={searchTerm}
              isSearching={isSearchingBooks}
              onQueryChange={setSearchTerm}
              onAddBook={addFavorite}
              onRemoveBook={removeFavorite}
            />

            <div className="rounded-xl border border-stone-300 bg-stone-100/95 p-5 shadow-glow">
              <label htmlFor="semantic-query" className="font-heading text-2xl tracking-wide text-stone-900">
                Optional Theme Query
              </label>
              <Textarea
                id="semantic-query"
                value={semanticQuery}
                onChange={(event) => setSemanticQuery(event.target.value)}
                placeholder="I want a dark fantasy with political intrigue and morally gray characters."
                className="mt-2 min-h-24 border-stone-300 bg-white"
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label htmlFor="limit" className="text-sm text-stone-700">
                  Limit
                </label>
                <input
                  id="limit"
                  type="range"
                  min={5}
                  max={20}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="h-2 w-36 cursor-pointer appearance-none rounded-full bg-stone-300"
                />
                <span className="rounded bg-stone-900 px-2 py-1 text-xs font-semibold text-stone-100">{limit}</span>

                <Button
                  type="button"
                  className="ml-auto bg-stone-900 text-stone-100 hover:bg-stone-800"
                  onClick={handleRecommend}
                  disabled={!canSubmit}
                >
                  {isLoadingResults ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {isLoadingResults ? 'Scoring...' : 'Get Recommendations'}
                </Button>
              </div>
            </div>
          </div>

          <RecommendationList recommendations={recommendations} />
        </section>
      </div>
    </main>
  );
}
