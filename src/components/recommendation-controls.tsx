import { useDeferredValue, useState } from 'react';
import { Sparkles, Settings2 } from 'lucide-react';

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
    <div className="animate-rise [animation-delay:200ms]">
      <div className="mb-8">
        <h2 className="font-heading text-3xl">Parameters</h2>
        <p className="text-black/60 text-sm mt-1">Shape the retrieval</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-px bg-black">
          <div className="bg-white p-4">
            <span className="block text-xs uppercase tracking-widest text-black/50 mb-1">Inputs</span>
            <span className="font-mono text-xl">{favoriteCount}</span>
          </div>
          <div className="bg-white p-4">
            <span className="block text-xs uppercase tracking-widest text-black/50 mb-1">Theme</span>
            <span className="text-sm font-medium truncate block">
              {deferredQuery.trim() ? 'Active' : 'None'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label htmlFor="semantic-query" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              Semantic Prompt
            </label>
            <textarea
              id="semantic-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Dark fantasy with political fracture, morally gray characters..."
              className="w-full min-h-[160px] p-4 bg-black/5 border-none resize-none focus:outline-none focus:ring-1 focus:ring-black placeholder:text-black/30 font-medium text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
              <Settings2 className="w-4 h-4" />
              Volume
            </div>
            <div className="flex gap-2">
              {LIMIT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLimit(option)}
                  className={`flex-1 py-3 text-sm font-mono font-bold transition-colors ${
                    limit === option
                      ? 'bg-black text-white'
                      : 'bg-black/5 text-black hover:bg-black/10'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isRunning || !hasAnySignal}
            className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest disabled:bg-black/20 disabled:text-black/40 hover:bg-black/80 transition-colors"
          >
            {isRunning ? 'Processing...' : 'Run Pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
}
