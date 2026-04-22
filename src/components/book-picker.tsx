import { Search, X } from 'lucide-react';

import type { BookSummary } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BookPickerProps {
  availableBooks: BookSummary[];
  selectedBooks: BookSummary[];
  query: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onAddBook: (book: BookSummary) => void;
  onRemoveBook: (bookId: string) => void;
}

function isSelected(selectedBooks: BookSummary[], bookId: string) {
  return selectedBooks.some((book) => book.bookId === bookId);
}

export function BookPicker({
  availableBooks,
  selectedBooks,
  query,
  isSearching,
  onQueryChange,
  onAddBook,
  onRemoveBook,
}: BookPickerProps) {
  return (
    <Card className="border-stone-300/70 bg-stone-100/95 shadow-glow">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="font-heading text-3xl tracking-wide text-stone-900">Select Favorites</CardTitle>
        <CardDescription className="text-sm text-stone-700">
          Choose books you already like. These books seed the semantic candidate retrieval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-stone-500" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by title or author"
            className="h-11 rounded-lg border-stone-300 bg-white pl-9"
          />
        </div>

        <div className="rounded-lg border border-stone-300 bg-white/80">
          <ScrollArea className="h-60">
            <ul className="divide-y divide-stone-200">
              {availableBooks.map((book) => {
                const selected = isSelected(selectedBooks, book.bookId);
                return (
                  <li key={book.bookId} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900">{book.title}</p>
                      <p className="truncate text-xs text-stone-600">{book.author}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={selected ? 'secondary' : 'default'}
                      disabled={selected}
                      onClick={() => onAddBook(book)}
                      className="shrink-0"
                    >
                      {selected ? 'Added' : 'Add'}
                    </Button>
                  </li>
                );
              })}
              {!availableBooks.length && (
                <li className="p-4 text-sm text-stone-500">{isSearching ? 'Searching catalog...' : 'No books found.'}</li>
              )}
            </ul>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-600">Selected books</p>
          <div className="flex min-h-10 flex-wrap gap-2">
            {selectedBooks.map((book) => (
              <Badge key={book.bookId} className="gap-1 bg-stone-900 text-stone-100">
                <span className="max-w-44 truncate">{book.title}</span>
                <button
                  type="button"
                  onClick={() => onRemoveBook(book.bookId)}
                  aria-label={`Remove ${book.title}`}
                  className="rounded-full p-0.5 hover:bg-stone-700"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {!selectedBooks.length && <p className="text-sm text-stone-500">No favorites selected yet.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
