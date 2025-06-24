# tools/index_documents.py
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core.storage.storage_context import StorageContext
import chromadb

documents = SimpleDirectoryReader("./docs").load_data()
embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

print(f"Loaded {len(documents)} documents.")
chroma_client = chromadb.PersistentClient(path="./storage")
vector_store = ChromaVectorStore(
    chroma_collection=chroma_client.get_or_create_collection("rag")
)

print("Creating vector store index...")
storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(
    documents, storage_context=storage_context, embed_model=embed_model
)
print("Index created successfully.")

print("Persisting index to storage...")
index.storage_context.persist()
