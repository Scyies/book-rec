import { useDeferredValue, useState } from 'react';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface RecommendationControlsProps {
  favoriteCount: number;
  isRunning: boolean;
  onSubmit: (payload: { query: string; limit: number }) => void;
}

const LIMIT_OPTIONS = [6, 10, 14, 18];

export function RecommendationControls({ favoriteCount, isRunning, onSubmit }: RecommendationControlsProps) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const deferredQuery = useDeferredValue(query);

  const hasAnySignal = favoriteCount > 0 || deferredQuery.trim().length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      query: query.trim(),
      limit,
    });
  }

  return (
    <Card className="border-white/10 bg-[#11192b]/90 text-stone-100 shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur">
      <CardHeader className="border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Control Deck</p>
        <CardTitle className="font-heading text-4xl leading-none tracking-[0.06em] text-stone-50">
          Shape The Retrieval
        </CardTitle>
        <CardDescription className="max-w-sm text-sm text-stone-300">
          Recommendations run only when you ask for them. Search and ranking stay intentional instead of firing on every edit.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-sm text-stone-200">
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-400">Selected books</span>
            <span className="font-semibold text-stone-50">{favoriteCount}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-400">Theme prompt</span>
            <span className="max-w-[14rem] truncate text-right text-stone-50">
              {deferredQuery.trim() || 'Not set'}
            </span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="semantic-query" className="flex items-center gap-2 text-sm font-semibold text-stone-100">
              <Sparkles className="size-4 text-amber-300" />
              Theme prompt
            </label>
            <Textarea
              id="semantic-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Dark fantasy with political fracture, morally gray characters, and a collapsing empire."
              className="min-h-40 rounded-[1.5rem] border-white/10 bg-[#0b1020] text-stone-100 placeholder:text-stone-500"
            />
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Use this for cold start or to steer the semantic layer.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-100">
              <SlidersHorizontal className="size-4 text-cyan-200" />
              Result volume
            </div>
            <div className="grid grid-cols-4 gap-2">
              {LIMIT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLimit(option)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    limit === option
                      ? 'border-amber-300 bg-amber-300 text-[#0d1426]'
                      : 'border-white/10 bg-white/5 text-stone-200 hover:border-cyan-200/50 hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isRunning || !hasAnySignal}
            className="h-12 w-full rounded-full bg-amber-300 text-base font-semibold text-[#0d1426] hover:bg-amber-200 disabled:bg-stone-500"
          >
            {isRunning ? 'Ranking candidates...' : 'Run Hybrid Recommendation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
