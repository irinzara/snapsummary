# SnapSummary RAG Architecture

## Introduction

SnapSummary has been upgraded from a simple context-stuffing application to a full Retrieval-Augmented Generation (RAG) system. This upgrade allows the system to process and answer questions about documents of any size, bypassing the previous 6000-character limitation.

## How RAG Works in SnapSummary

The RAG pipeline consists of two main phases: **Indexing** and **Retrieval**.

### 1. Indexing (Document Ingestion)

When a document or media file is uploaded, the following happens:
1. **Extraction:** Text is extracted via `pdfplumber` or `Whisper`.
2. **Chunking:** The full transcript is split into smaller, manageable pieces (chunks) using LangChain's `RecursiveCharacterTextSplitter`. 
   - *Chunk Size (~800 chars)*: Small enough to capture specific context but large enough to retain meaning.
   - *Chunk Overlap (~150 chars)*: Ensures that concepts split across chunk boundaries aren't lost.
3. **Embedding:** Each chunk is converted into a high-dimensional vector (embedding) using the `sentence-transformers/all-MiniLM-L6-v2` model. This model runs entirely locally, meaning no data is sent to external embedding APIs, ensuring privacy and eliminating API costs.
4. **Storage:** The vectors and their original text are stored in **ChromaDB**, an open-source vector database configured to persist data locally.

### 2. Retrieval (Chat)

When a user asks a question via Aira:
1. **Query Embedding:** The user's question is embedded using the exact same `MiniLM` model.
2. **Similarity Search:** ChromaDB performs a nearest-neighbor search (Cosine Similarity) to find the top `K` (default: 5) chunks in the database that are mathematically closest to the question's embedding. The search is filtered to only include chunks belonging to the current `summary_id`.
3. **Context Construction:** The retrieved chunks are concatenated into a single "context" block.
4. **LLM Generation:** The context and the user's question are sent to `Groq LLaMA 3.3` with a strict system prompt instructing it to answer *only* based on the retrieved context, preventing hallucination.

## Why Embeddings?

Embeddings map text to an array of floating-point numbers where semantic meaning is represented geometrically. This allows the system to find text that *means* the same thing as the user's query, even if they use different words (e.g., matching "How much does it cost?" with "The price is $50").

## Why ChromaDB?

ChromaDB is lightweight, runs in-process with Python, and requires no external servers. It perfectly matches the Dockerized architecture of SnapSummary while providing enterprise-grade vector search capabilities.
