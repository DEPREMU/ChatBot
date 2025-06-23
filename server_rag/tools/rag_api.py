from fastapi import FastAPI
from pydantic import BaseModel
from llama_index.core import load_index_from_storage, Settings
from llama_index.core.storage.storage_context import StorageContext
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb
import threading


def warmup():
    print("Warming up LLM with a dummy query...")
    dummy_engine = index.as_query_engine()
    _ = dummy_engine.query("Hola")
    print("Warmup completed.")


app = FastAPI()


def get_system_prompt(lang="es"):
    return f"""You are a helpful assistant.
    Answer the user's questions in a concise and informative manner.
    If you don't know the answer, say 'I don't know' in the respective language.
    Use these to make the text more comfortable for the user:
    separator: ---
    Bold: **
    Italicize: _
    List item: *
    Titles: #
    Subtitles: ##
    Sub subtitles: ###
    You will not be able to answer any question that it is not related to health, medicine, pills/drugs or, our app, if the user's text is not about any of those topics, you will reject the answer on a polite way.
    Use emojis to make your response more engaging.
    If the user asks for a summary, provide it in a concise manner.
    
    Respond only in this language: {lang} only if the user does not specify a language, otherwise, respond in the language specified by the user."""


# 1. Configurar LLM y embeddings
Settings.llm = Ollama(model="llama3", system_prompt=get_system_prompt(lang="es"))
Settings.embed_model = HuggingFaceEmbedding(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# 2. Reconstruir vector store Chroma
chroma_client = chromadb.PersistentClient(path="./storage")
vector_store = ChromaVectorStore(
    chroma_collection=chroma_client.get_or_create_collection("rag")
)

# 3. Crear storage_context usando ese vector_store
storage_context = StorageContext.from_defaults(
    persist_dir="./storage", vector_store=vector_store
)

# 4. Cargar índice
index = load_index_from_storage(storage_context)


# 5. API
class PromptRequest(BaseModel):
    prompt: str
    lang: str = "es"


@app.post("/context")
def get_context(req: PromptRequest):
    query_engine = index.as_query_engine()
    response = query_engine.query(req.prompt)
    return {"context": str(response)}


threading.Thread(target=warmup).start()
