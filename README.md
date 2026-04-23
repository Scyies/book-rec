# Hybrid Book Recommendation System

Stack:
- React + Vite + Tailwind + shadcn UI frontend
- Node.js API in TypeScript
- TensorFlow.js neural reranker
- Semantic retrieval with vector indexing (Qdrant when configured, in-memory fallback otherwise)

## Project Structure

- `src/` frontend React app
- `server/` backend API and recommendation services
- `scripts/` data preparation and evaluation scripts
- `data/demo/` ready-to-run fallback dataset
- `data/processed/` output folder for Kaggle-prepared data

## Requirements

- Node.js 20+
- npm 10+

Optional for full dataset ingestion:
- Python 3.10+
- `kagglehub`

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

## API Endpoints

- `GET /api/health`
- `GET /api/books/search?q=...`
- `POST /api/recommend`

Example request:

```json
{
  "userId": "demo_user_1",
  "favoriteBookIds": ["b001", "b002", "b003"],
  "query": "dark fantasy with politics",
  "limit": 10
}
```

## Kaggle Dataset Ingestion

You can download the dataset with the same approach you shared:

```python
import kagglehub

path = kagglehub.dataset_download("arashnic/book-recommendation-dataset")
print("Path to dataset files:", path)
```

Or use the helper script:

```bash
pip install kagglehub
python scripts/download_kaggle_dataset.py
``` 

Then preprocess into `data/processed`:

```bash
npm run prepare:data
```

If you want to pass the dataset path explicitly, use the real path returned by KaggleHub (do not use a placeholder):

```bash
npm run prepare:data -- --dataset=/home/your-user/.cache/kagglehub/datasets/arashnic/book-recommendation-dataset/versions/3
```

## Evaluation

Run baseline comparison (Popularity vs Semantic vs Neural vs Hybrid):

```bash
npm run evaluate
```

Outputs:
- Precision@10
- Recall@10
- NDCG@10

## Environment Variables

Copy `.env.example` to `.env` and configure when needed.

For Qdrant cloud:
- `QDRANT_URL` 
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`

If not configured, the API runs with in-memory vectors automatically.

from qdrant_client import QdrantClient

qdrant_client = QdrantClient(
    url="QDRANT_URL", 
    api_key="QDRANT_API_KEY",
)

print(qdrant_client.get_collections())