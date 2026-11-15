#!/bin/bash
set -e

if [ ! -d "/app/backend/data/chroma" ] && [ -n "$HF_DATASET_REPO" ]; then
  echo "Downloading pre-built Chroma vector index from $HF_DATASET_REPO..."
  mkdir -p /app/backend/data
  python -c "
import os, tarfile
from huggingface_hub import hf_hub_download
archive = hf_hub_download(
    repo_id=os.environ['HF_DATASET_REPO'],
    filename='chroma_db.tar.gz',
    repo_type='dataset',
    token=os.environ.get('HF_TOKEN')
)
with tarfile.open(archive, 'r:gz') as tar:
    tar.extractall('/app/backend/data')
print('ChromaDB index extracted successfully into /app/backend/data/chroma!')
"
fi

cd /app/backend
exec uvicorn main:app --host 0.0.0.0 --port 7860