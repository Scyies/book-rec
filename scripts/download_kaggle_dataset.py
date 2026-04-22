import argparse
from pathlib import Path

import kagglehub


def main() -> None:
    parser = argparse.ArgumentParser(description="Download the Kaggle Book Recommendation dataset")
    parser.add_argument(
        "--dataset",
        default="arashnic/book-recommendation-dataset",
        help="Kaggle dataset slug",
    )
    parser.add_argument(
        "--link",
        default="data/raw/latest",
        help="Optional symlink path to keep a stable local pointer",
    )
    args = parser.parse_args()

    dataset_path = Path(kagglehub.dataset_download(args.dataset)).resolve()
    print(f"Downloaded dataset to: {dataset_path}")

    link_path = Path(args.link)
    link_path.parent.mkdir(parents=True, exist_ok=True)

    if link_path.exists() or link_path.is_symlink():
        link_path.unlink()

    link_path.symlink_to(dataset_path)
    print(f"Created symlink: {link_path} -> {dataset_path}")


if __name__ == "__main__":
    main()
