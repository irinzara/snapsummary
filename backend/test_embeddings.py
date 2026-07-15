import os
import django
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snapsummary.settings')
django.setup()

from summaries.models import Summary, DocumentChunk
from summaries.ai.embeddings import generate_embeddings
from summaries.ai.vector_store import store_chunks
from summaries.ai.retriever import retrieve_context

print("--- Starting Smoke Test ---")

# 1. Create a dummy summary
summary = Summary.objects.create(
    original_filename="smoke_test.txt",
    file="uploads/smoke_test.txt",
    file_size=100,
    file_type="text"
)
print(f"Created dummy summary ID: {summary.id}")

# 2. Embed a sample text
sample_texts = [
    "SnapSummary is an amazing tool to quickly summarize documents.",
    "PostgreSQL with pgvector provides incredibly fast and scalable vector similarity search.",
    "The sky is blue and the grass is green."
]
print("Generating embeddings for sample texts...")
embeddings = generate_embeddings(sample_texts)
print(f"Generated {len(embeddings)} embeddings. First embedding length: {len(embeddings[0])}")

# 3. Store chunks
print("Storing chunks in pgvector...")
store_chunks(summary.id, "smoke_test.txt", sample_texts, embeddings)
print("Chunks stored successfully!")

# 4. Retrieve context
query = "Tell me about Postgres similarity search."
print(f"\nRetrieving context for query: '{query}'")
results = retrieve_context(query, summary.id, top_k=1)

print("\n--- Retrieval Results ---")
for r in results:
    print(f"- {r}")

print("\n--- Smoke Test Completed ---")

# Clean up
summary.delete()
