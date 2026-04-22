import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecommendationItem } from '@/types';

interface RecommendationListProps {
  recommendations: RecommendationItem[];
}

function scoreToPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  return (
    <Card className="border-stone-300/70 bg-stone-100/95 shadow-glow">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-3xl tracking-wide text-stone-900">Hybrid Results</CardTitle>
        <CardDescription className="text-sm text-stone-700">
          Final score combines semantic retrieval and TensorFlow.js neural ranking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!recommendations.length && (
          <p className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
            Recommendations will appear here after you run a request.
          </p>
        )}

        <div className="space-y-3">
          {recommendations.map((item) => (
            <article key={item.bookId} className="rounded-xl border border-stone-300 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{item.title}</h3>
                  <p className="text-sm text-stone-600">
                    {item.author} · {item.publisher}
                    {item.year ? ` · ${item.year}` : ''}
                  </p>
                </div>
                <Badge className="bg-amber-600 text-stone-950">Final {scoreToPercent(item.finalScore)}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="bg-stone-200 text-stone-800">
                  Semantic {scoreToPercent(item.semanticScore)}
                </Badge>
                <Badge variant="secondary" className="bg-stone-200 text-stone-800">
                  Neural {scoreToPercent(item.neuralScore)}
                </Badge>
              </div>

              <p className="mt-3 text-sm text-stone-700">{item.explanation}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
