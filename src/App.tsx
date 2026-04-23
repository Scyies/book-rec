import { startTransition, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DatabaseZap, Orbit, Sparkles } from 'lucide-react';

import { BookPicker } from '@/components/book-picker';
import { RecommendationControls } from '@/components/recommendation-controls';
import { RecommendationList } from '@/components/recommendation-list';
import { Badge } from '@/components/ui/badge';
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
    <main className="relative min-h-screen overflow-hidden bg-[#f2ebe0] text-[#101827]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.18),transparent_22%),radial-gradient(circle_at_80%_90%,rgba(245,158,11,0.16),transparent_20%)]" />
      <div className="catalog-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto flex max-w-[96rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(135deg,rgba(17,25,43,0.98),rgba(24,34,57,0.92)_46%,rgba(239,233,222,0.9)_46%,rgba(239,233,222,0.92))] shadow-[0_42px_120px_rgba(15,23,42,0.18)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.2fr)_23rem] lg:px-10">
            <div className="animate-rise [animation-delay:80ms]">
              <p className="text-xs uppercase tracking-[0.42em] text-cyan-200/70">Hybrid Recommendation Studio</p>
              <h1 className="mt-4 max-w-3xl font-heading text-6xl leading-[0.88] tracking-[0.05em] text-stone-50 sm:text-7xl">
                Editorial Search For Messy Reading Taste
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-300 sm:text-base">
                A three-part workspace: build the shelf, steer the semantic layer, then inspect bounded result cards without the layout collapsing around long metadata.
              </p>
            </div>

            <div className="grid gap-3 self-start rounded-[1.8rem] border border-white/10 bg-[#0c1324]/75 p-5 text-stone-100 backdrop-blur animate-rise [animation-delay:180ms]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Orbit className="size-4 text-cyan-200" />
                  Runtime
                </div>
                <Badge className="rounded-full bg-amber-300 px-3 py-1 text-[#0f172a]">
                  {healthQuery.data?.modelReady ? 'Ready' : 'Warming up'}
                </Badge>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-400">Books indexed</span>
                  <span className="font-semibold text-stone-50">{healthQuery.data?.data.books ?? '...'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-400">Users in demo set</span>
                  <span className="font-semibold text-stone-50">{healthQuery.data?.data.users ?? '...'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-400">Vector store</span>
                  <span className="font-semibold uppercase tracking-[0.18em] text-stone-50">
                    {healthQuery.data?.vectorStore ?? 'loading'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-[1.5rem] border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_26rem]">
          <div className="space-y-6">
            <BookPicker selectedBooks={favorites} onAddBook={addFavorite} onRemoveBook={removeFavorite} />
          </div>

          <RecommendationControls
            favoriteCount={favorites.length}
            isRunning={recommendationMutation.isPending}
            onSubmit={requestRecommendations}
          />
        </section>

        <section className="grid gap-6">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-[#756c61]">
            <div className="flex items-center gap-2">
              <DatabaseZap className="size-4 text-cyan-600" />
              Query state handled by TanStack React Query
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              Search submits manually and keeps previous results mounted
            </div>
          </div>

          <RecommendationList
            recommendations={recommendationMutation.data?.recommendations ?? []}
            isLoading={recommendationMutation.isPending}
          />
        </section>
      </div>
    </main>
  );
}
