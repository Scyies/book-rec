import { ScrollArea } from '@/components/ui/scroll-area';
import type { RecommendationItem } from '@/types';

interface RecommendationListProps {
  recommendations: RecommendationItem[];
  isLoading: boolean;
}

function scoreToPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-stone-500">
        <span>{label}</span>
        <span>{scoreToPercent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ebe5dc]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(6, Math.round(value * 100))}%` }} />
      </div>
    </div>
  );
}

export function RecommendationList({ recommendations, isLoading }: RecommendationListProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#d5d7df]/60 bg-white/75 shadow-[0_34px_120px_rgba(17,24,39,0.12)] backdrop-blur">
      <div className="grid gap-6 border-b border-[#e7e2d7] bg-[linear-gradient(120deg,rgba(239,233,222,0.96),rgba(232,239,248,0.82))] p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#6d655b]">Recommendation Feed</p>
          <h2 className="font-heading text-5xl leading-none tracking-[0.05em] text-[#101827]">Hybrid Results Board</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#5c554b]">
            Each card is height-bounded and scroll-safe. Long titles clamp, metadata stays in frame, and the result rail always keeps its own viewport.
          </p>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-white/60 bg-white/60 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6d655b]">Visible recommendations</span>
            <span className="font-semibold text-[#101827]">{recommendations.length}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6d655b]">Layout behavior</span>
            <span className="font-semibold text-[#101827]">Clamped + scrollable</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6d655b]">Pipeline</span>
            <span className="font-semibold text-[#101827]">Semantic + neural</span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[min(68vh,52rem)]">
        <div className="grid gap-4 p-6 [content-visibility:auto]">
          {isLoading &&
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-[1.75rem] border border-[#e4ded2] bg-gradient-to-r from-[#f6f1e9] via-[#ece7de] to-[#f6f1e9]"
              />
            ))}

          {!isLoading && !recommendations.length && (
            <div className="grid place-items-center rounded-[1.75rem] border border-dashed border-[#d2c7b7] bg-[#f9f5ee] px-6 py-20 text-center">
              <div className="max-w-md">
                <p className="text-xs uppercase tracking-[0.35em] text-[#8a8075]">Awaiting request</p>
                <h3 className="mt-3 font-heading text-4xl tracking-[0.05em] text-[#111827]">No cards yet</h3>
                <p className="mt-4 text-sm text-[#665d52]">
                  Choose favorites, optionally add a thematic prompt, then run the hybrid ranking flow.
                </p>
              </div>
            </div>
          )}

          {!isLoading &&
            recommendations.map((item, index) => (
              <article
                key={item.bookId}
                className="grid min-w-0 gap-5 rounded-[1.9rem] border border-[#e7dece] bg-[linear-gradient(145deg,#fffdf9,#f5f0e7)] p-5 lg:grid-cols-[minmax(0,1fr)_14rem]"
              >
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#11192b] text-sm font-semibold text-stone-50">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-2xl font-semibold leading-tight text-[#101827]">{item.title}</h3>
                      <p className="mt-2 truncate text-sm uppercase tracking-[0.18em] text-[#6e665b]">
                        {item.author} · {item.publisher}
                        {item.year ? ` · ${item.year}` : ''}
                      </p>
                    </div>
                  </div>

                  <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#544d44]">{item.explanation}</p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <ScoreBar label="Final" value={item.finalScore} tone="bg-[#11192b]" />
                    <ScoreBar label="Semantic" value={item.semanticScore} tone="bg-cyan-500" />
                    <ScoreBar label="Neural" value={item.neuralScore} tone="bg-amber-400" />
                  </div>
                </div>

                <aside className="grid gap-3 rounded-[1.5rem] border border-[#e6dccd] bg-white/70 p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a8075]">Book ID</p>
                    <p className="mt-2 break-all font-mono text-xs text-[#111827]">{item.bookId}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a8075]">Fit summary</p>
                    <p className="mt-2 text-sm font-semibold text-[#111827]">{scoreToPercent(item.finalScore)} likely match</p>
                  </div>
                </aside>
              </article>
            ))}
        </div>
      </ScrollArea>
    </section>
  );
}
