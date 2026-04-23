import type { BookSummary, HealthResponse, RecommendationItem } from '@/types';

const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth(signal?: AbortSignal) {
  return request<HealthResponse>('/health', { signal });
}

export async function searchBooks(query: string, signal?: AbortSignal) {
  const q = new URLSearchParams({ q: query }).toString();
  return request<{ books: BookSummary[] }>(`/books/search?${q}`, { signal });
}

export async function recommendBooks(payload: {
  userId: string;
  favoriteBookIds: string[];
  query?: string;
  limit?: number;
}) {
  return request<{ recommendations: RecommendationItem[] }>('/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
