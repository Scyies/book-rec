import { startTransition, useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpenText, Plus, Search, X } from 'lucide-react';

import { searchBooks } from '@/lib/api';
import type { BookSummary } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BookPickerProps {
  selectedBooks: BookSummary[];
  onAddBook: (book: BookSummary) => void;
  onRemoveBook: (bookId: string) => void;
}

function selectedBookIds(books: BookSummary[]) {
  return new Set(books.map((book) => book.bookId));
}

export function BookPicker({ selectedBooks, onAddBook, onRemoveBook }: BookPickerProps) {
  const [draftQuery, setDraftQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const deferredDraftQuery = useDeferredValue(draftQuery);

  const searchQuery = useQuery({
    queryKey: ['books-search', submittedQuery],
    queryFn: ({ signal }) => searchBooks(submittedQuery, signal),
    select: (response) => response.books,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60_000,
  });

  const selectedIds = selectedBookIds(selectedBooks);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      setSubmittedQuery(draftQuery.trim());
    });
  }

  return (
    <Card className="overflow-hidden border-[#1d2741]/60 bg-[#f2ede4]/90 shadow-[0_32px_90px_rgba(15,23,42,0.18)]">
      <CardHeader className="border-b border-[#d6cfc2] pb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-[#6a6259]">Library Explorer</p>
        <CardTitle className="font-heading text-5xl leading-none tracking-[0.04em] text-[#111827]">
          Build A Taste Profile
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm text-[#5d5447]">
          Search is submit-driven. Typing stays local, the catalog request runs only when you commit it, and the shelf stays scroll-bounded.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_20rem]">
        <section className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7a7268]" />
              <Input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search by title, author, or leave empty for the popular shelf"
                className="h-12 rounded-full border-[#c8bead] bg-white pl-11 text-[#111827] placeholder:text-[#8a8176]"
              />
            </div>
            <Button type="submit" className="h-12 rounded-full bg-[#11192b] px-6 text-stone-100 hover:bg-[#18233b]">
              Search Catalog
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#7a7268]">
            <Badge variant="outline" className="rounded-full border-[#cabfae] bg-white/70 px-3 py-1 text-[#4c4438]">
              Active query
            </Badge>
            <span className="truncate">{submittedQuery || 'Popular shelf'}</span>
            {deferredDraftQuery !== submittedQuery && deferredDraftQuery.trim().length > 0 && (
              <span className="rounded-full bg-[#ece5d8] px-3 py-1 tracking-[0.16em] text-[#7a7268]">
                Staged: {deferredDraftQuery}
              </span>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-[#d6cfc2] bg-white/80">
            <ScrollArea className="h-[28rem]">
              <div className="grid gap-3 p-4 [content-visibility:auto]">
                {searchQuery.data?.map((book) => {
                  const selected = selectedIds.has(book.bookId);

                  return (
                    <article
                      key={book.bookId}
                      className="grid min-w-0 gap-3 rounded-[1.35rem] border border-[#e4dbcf] bg-[#faf7f1] p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <h3 className="line-clamp-2 text-base font-semibold leading-tight text-[#121826]">{book.title}</h3>
                          {book.year && (
                            <span className="shrink-0 rounded-full bg-[#ece5d8] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#62584b]">
                              {book.year}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-[#4f4a42]">{book.author}</p>
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-[#847a6d]">{book.publisher}</p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={selected}
                        onClick={() => startTransition(() => onAddBook(book))}
                        className="h-10 self-start rounded-full bg-[#11192b] px-4 text-stone-100 hover:bg-[#18233b] disabled:bg-[#b8b0a4] disabled:text-white"
                      >
                        <Plus className="size-4" />
                        {selected ? 'On shelf' : 'Add'}
                      </Button>
                    </article>
                  );
                })}

                {!searchQuery.isLoading && !searchQuery.data?.length && (
                  <div className="rounded-[1.5rem] border border-dashed border-[#d6cfc2] bg-[#f7f2ea] p-6 text-sm text-[#6b6257]">
                    No books matched that search. Try a shorter query or clear it for the popular shelf.
                  </div>
                )}

                {searchQuery.isLoading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-[1.35rem] border border-[#e4dbcf] bg-gradient-to-r from-[#f6f0e6] via-[#ede5d7] to-[#f6f0e6]"
                    />
                  ))}
              </div>
            </ScrollArea>
          </div>
        </section>

        <aside className="rounded-[1.75rem] border border-[#d6cfc2] bg-[#11192b] p-4 text-stone-100">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Favorites Shelf</p>
              <h3 className="font-heading text-3xl tracking-[0.05em] text-stone-50">Curated Inputs</h3>
            </div>
            <Badge className="rounded-full bg-amber-300 px-3 py-1 text-[#0f172a]">{selectedBooks.length}</Badge>
          </div>

          <ScrollArea className="mt-4 h-[28rem]">
            <div className="space-y-3 pr-3">
              {selectedBooks.map((book) => (
                <article key={book.bookId} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-stone-50">{book.title}</p>
                    <p className="truncate text-xs uppercase tracking-[0.18em] text-stone-400">{book.author}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startTransition(() => onRemoveBook(book.bookId))}
                    aria-label={`Remove ${book.title}`}
                    className="rounded-full border border-white/10 p-2 text-stone-300 transition hover:border-amber-300 hover:text-amber-300"
                  >
                    <X className="size-4" />
                  </button>
                </article>
              ))}

              {!selectedBooks.length && (
                <div className="flex h-48 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 px-4 text-center">
                  <BookOpenText className="mb-3 size-8 text-cyan-200/70" />
                  <p className="text-sm font-medium text-stone-200">Nothing selected yet.</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-stone-500">
                    Add a few books to give the hybrid model signal.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </CardContent>
    </Card>
  );
}
