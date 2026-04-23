import { startTransition, useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';

import { searchBooks } from '@/lib/api';
import type { BookSummary } from '@/types';

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
    <div className="space-y-8 animate-rise [animation-delay:150ms]">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-4xl">Catalog</h2>
        <p className="text-black/60 text-sm max-w-lg">
          Search the index to build your reference shelf. Selections guide the neural pipeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-black/40 group-focus-within:text-black transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          placeholder="Search author, title, or topic..."
          className="w-full bg-transparent border border-black h-14 pl-12 pr-32 text-lg focus:outline-none focus:ring-1 focus:ring-black placeholder:text-black/30 rounded-none transition-shadow"
        />
        <button
          type="submit"
          className="absolute inset-y-1 right-1 bg-black text-white px-6 text-sm font-bold uppercase tracking-wider hover:bg-black/80 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Search Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">
              {submittedQuery ? 'Search Results' : 'Popular'}
            </span>
            {deferredDraftQuery !== submittedQuery && deferredDraftQuery.trim().length > 0 && (
              <span className="text-xs bg-black text-white px-2 py-0.5 font-medium">Unsaved</span>
            )}
          </div>
          
          <div className="h-[400px] overflow-y-auto pr-4 space-y-4 scrollbar-hide">
            {searchQuery.data?.map((book) => {
              const selected = selectedIds.has(book.bookId);

              return (
                <div key={book.bookId} className="group flex items-start justify-between gap-4 py-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xl leading-tight truncate group-hover:underline underline-offset-4">
                      {book.title}
                    </h3>
                    <p className="text-sm text-black/60 truncate mt-1">
                      {book.author} <span className="mx-2 text-black/20">|</span> {book.publisher}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={selected}
                    onClick={() => startTransition(() => onAddBook(book))}
                    className={`shrink-0 w-8 h-8 flex items-center justify-center border transition-all ${
                      selected 
                        ? 'border-black/20 text-black/20 bg-transparent' 
                        : 'border-black text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {!searchQuery.isLoading && !searchQuery.data?.length && (
              <div className="py-12 text-center text-black/50 text-sm">
                No matching volumes found.
              </div>
            )}

            {searchQuery.isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-2 animate-pulse flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-black/5 w-3/4" />
                  <div className="h-4 bg-black/5 w-1/2" />
                </div>
                <div className="w-8 h-8 bg-black/5" />
              </div>
            ))}
          </div>
        </div>

        {/* Selected Shelf */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Shelf</span>
            <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
              {selectedBooks.length}
            </span>
          </div>

          <div className="h-[400px] overflow-y-auto pr-4 space-y-3 scrollbar-hide">
            {selectedBooks.map((book) => (
              <div key={book.bookId} className="flex items-center gap-3 bg-black/5 p-3 group">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{book.title}</p>
                  <p className="text-xs text-black/50 uppercase tracking-wider truncate mt-0.5">{book.author}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startTransition(() => onRemoveBook(book.bookId))}
                  className="shrink-0 p-1.5 text-black/40 hover:text-black hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {!selectedBooks.length && (
              <div className="py-12 border border-dashed border-black/20 text-center flex flex-col items-center gap-2">
                <span className="text-sm text-black/50">Empty Shelf</span>
                <span className="text-xs uppercase tracking-widest text-black/30">Select volumes to begin</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
