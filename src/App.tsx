import { startTransition, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Database, Zap, BookOpen } from 'lucide-react';

import { BookPicker } from '@/components/book-picker';
import { RecommendationControls } from '@/components/recommendation-controls';
import { RecommendationList } from '@/components/recommendation-list';
import { fetchHealth, recommendBooks } from '@/lib/api';
import type { BookSummary } from '@/types';

export default function App() {
  const [favorites, setFavorites] = useState<BookSummary[]>([]);

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 60_000,
  });

  const recommendationMutation = useMutation({
    mutationFn: recommendBooks,
  });

  function addFavorite(book: BookSummary) {
    startTransition(() => {
      setFavorites((current) => {
        if (current.some((item) => item.bookId === book.bookId)) {
          return current;
        }
        return [...current, book];
      });
    });
  }

  function removeFavorite(bookId: string) {
    startTransition(() => {
      setFavorites((current) => current.filter((book) => book.bookId !== bookId));
    });
  }

  function requestRecommendations(payload: { query: string; limit: number }) {
    recommendationMutation.mutate({
      userId: 'demo_user_1',
      favoriteBookIds: favorites.map((book) => book.bookId),
      query: payload.query || undefined,
      limit: payload.limit,
    });
  }

  const errorMessage =
    (healthQuery.error instanceof Error && healthQuery.error.message) ||
    (recommendationMutation.error instanceof Error && recommendationMutation.error.message) ||
    null;

  return (
    <main className="min-h-screen bg-white text-black selection:bg-black selection:text-white pb-24">
      {/* Header */}
      <header className="border-b border-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="animate-rise">
            <p className="font-body text-xs font-bold uppercase tracking-widest text-black/50 mb-4">
              Hybrid Recommendation Engine
            </p>
            <h1 className="font-heading text-6xl sm:text-7xl lg:text-8xl font-light tracking-tight leading-none">
              Editorial<br />Reading Taste.
            </h1>
          </div>
          
          <div className="animate-rise [animation-delay:100ms] flex flex-col gap-4 max-w-xs w-full text-sm font-medium">
            <p className="text-black/60 leading-relaxed pb-4 border-b border-black/10">
              Select books, set a mood, and let the dual semantic-neural pipeline curate your next read.
            </p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Database className="w-4 h-4" /> System</span>
              <span className="bg-black text-white px-2 py-0.5 text-xs font-bold tracking-wider uppercase">
                {healthQuery.data?.modelReady ? 'Online' : 'Booting'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/50">Indexed</span>
              <span className="font-mono">{healthQuery.data?.data.books ?? '...'} vol</span>
            </div>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
          <div className="border border-black bg-black text-white px-4 py-3 text-sm font-medium flex items-center justify-between">
            <span>{errorMessage}</span>
            <span className="uppercase text-xs tracking-widest border border-white/20 px-2 py-1">Error</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 grid gap-12 lg:grid-cols-[1fr_300px]">
        {/* Left Column */}
        <section className="space-y-12">
          <BookPicker selectedBooks={favorites} onAddBook={addFavorite} onRemoveBook={removeFavorite} />
          
          <div className="pt-12 border-t border-black">
            <div className="flex items-center gap-4 mb-8">
              <BookOpen className="w-6 h-6" />
              <h2 className="font-heading text-4xl">Results</h2>
            </div>
            <RecommendationList
              recommendations={recommendationMutation.data?.recommendations ?? []}
              isLoading={recommendationMutation.isPending}
            />
          </div>
        </section>

        {/* Right Column / Sidebar */}
        <aside className="lg:border-l lg:border-black lg:pl-12 h-fit sticky top-12">
          <RecommendationControls
            favoriteCount={favorites.length}
            isRunning={recommendationMutation.isPending}
            onSubmit={requestRecommendations}
          />
        </aside>
      </div>
    </main>
  );
}
