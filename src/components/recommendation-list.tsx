import type { RecommendationItem } from '@/types';

interface RecommendationListProps {
  recommendations: RecommendationItem[];
  isLoading: boolean;
}

function scoreToPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ScoreBar({ label, value, main }: { label: string; value: number; main?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className={main ? 'text-black' : 'text-black/50'}>{label}</span>
        <span className={main ? 'text-black font-mono' : 'text-black/50 font-mono'}>{scoreToPercent(value)}</span>
      </div>
      <div className="h-1 bg-black/10 w-full overflow-hidden">
        <div 
          className={`h-full ${main ? 'bg-black' : 'bg-black/40'}`} 
          style={{ width: `${Math.max(2, Math.round(value * 100))}%` }} 
        />
      </div>
    </div>
  );
}

export function RecommendationList({ recommendations, isLoading }: RecommendationListProps) {
  return (
    <div className="space-y-1 animate-rise [animation-delay:300ms]">
      {isLoading &&
        Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-6 border border-black/10 animate-pulse flex flex-col gap-4">
            <div className="h-8 bg-black/5 w-1/3" />
            <div className="h-4 bg-black/5 w-1/4" />
            <div className="space-y-2 mt-4">
              <div className="h-2 bg-black/5 w-full" />
              <div className="h-2 bg-black/5 w-5/6" />
            </div>
          </div>
        ))}

      {!isLoading && !recommendations.length && (
        <div className="py-24 border border-black border-dashed flex flex-col items-center justify-center text-center px-4">
          <span className="font-heading text-4xl mb-4">No Output</span>
          <p className="text-black/50 max-w-sm">
            Select books or provide a semantic prompt, then run the pipeline to generate recommendations.
          </p>
        </div>
      )}

      {!isLoading &&
        recommendations.map((item, index) => (
          <article
            key={item.bookId}
            className="group relative grid gap-6 p-6 border-b border-black last:border-b-0 lg:grid-cols-[4rem_1fr_14rem] items-start hover:bg-black/5 transition-colors"
          >
            <div className="font-heading text-5xl text-black/20 group-hover:text-black transition-colors leading-none">
              {String(index + 1).padStart(2, '0')}
            </div>

            <div className="min-w-0 space-y-4">
              <div>
                <h3 className="text-2xl font-heading leading-tight">{item.title}</h3>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-black/50">
                  {item.author} <span className="mx-2">·</span> {item.publisher}
                  {item.year ? <><span className="mx-2">·</span> {item.year}</> : ''}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-black/80 max-w-2xl">{item.explanation}</p>
            </div>

            <div className="flex flex-col gap-6 lg:border-l lg:border-black/10 lg:pl-6">
              <div className="space-y-4">
                <ScoreBar label="Final Match" value={item.finalScore} main />
                <ScoreBar label="Semantic" value={item.semanticScore} />
                <ScoreBar label="Neural" value={item.neuralScore} />
              </div>
              
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">ID</span>
                <span className="font-mono text-xs text-black/60 truncate block" title={item.bookId}>
                  {item.bookId.slice(0, 12)}...
                </span>
              </div>
            </div>
          </article>
        ))}
    </div>
  );
}
