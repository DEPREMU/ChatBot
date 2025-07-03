from fastapi import FastAPI, Request
from pydantic import BaseModel
from llama_index.core import load_index_from_storage, Settings
from llama_index.core.storage.storage_context import StorageContext
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb
from pydantic import BaseModel
import ollama
from fastapi.responses import StreamingResponse
import time
import asyncio
import signal
import sys

ollamaLoaded = ollama.Client()
MODELO = "llama3"


def warm_up_model():
    print(f"🔥 Precargando modelo '{MODELO}'...")
    ollamaLoaded.generate(
        model=MODELO,
        prompt="Hola",
        stream=False,
        keep_alive="1h",  # Asegúrate que no se descargue
    )
    print("✅ Modelo cargado.")


warm_up_model()

app = FastAPI()


# Middleware para manejar cancelaciones
@app.middleware("http")
async def cancel_on_disconnect(request: Request, call_next):
    print(f"🌐 Incoming request: {request.method} {request.url}")
    start_time = time.time()

    try:
        print("🔄 Processing request...")

        # Check if client is still connected before processing
        client_host = request.client.host if request.client else "unknown"
        print(f"🌐 Client: {client_host}")

        response = await call_next(request)

        elapsed = time.time() - start_time
        print(f"✅ Request processed successfully in {elapsed:.2f}s")
        return response
    except asyncio.CancelledError:
        elapsed = time.time() - start_time
        print(f"🔌 Request cancelled during processing after {elapsed:.2f}s")
        raise
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Error in middleware after {elapsed:.2f}s: {str(e)}")
        raise


def get_system_prompt(lang="es"):
    return f"""You are an assistant that provides only the necessary context or summarized information based on the user's prompt. This context will be used by another AI to generate a complete response for the user. Follow these rules strictly:

Respond only with relevant context based on the user's prompt.
If the user's prompt requires factual information to form a complete response, provide only the essential, summarized information directly related to the prompt.
Do not repeat or rephrase the user's prompt.
Do not provide full answers or completions—only the context or summarized info needed to generate a complete response.
Respond only in the language specified by the user. If no language is specified, respond in Spanish.
Be concise and precise—include only what is strictly necessary.
If the user's prompt is **not related to health, medicine, drugs/pills, or the MediTime app**, politely reject the request and do not provide any context.
If the user's prompt is about **MediTime**, provide a short summary of the app's functionality, purpose, and key features.
Never include explanations or extra commentary—your response must be minimal and to the point.
If the information provided is not sufficient to answer the user's question, you can answer with your own knowledge.

Important Behavior Rule:
If the user's prompt is not related to health, medicine, pills/drugs, or the MediTime app, reject the request politely and concisely, in the language specified.

Respond only in this language: **{lang}**. If the user specifies a language, respond in the language specified by the user."""


# 1. Configurar LLM y embeddings
llm = Ollama(
    model=MODELO,
    system_prompt=get_system_prompt(lang="es"),
    request_timeout=120.0,
    base_url="http://localhost:11434",
    keep_alive=True,
    streaming=True,
)

Settings.llm = llm
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

query_engine = index.as_query_engine(similarity_top_k=3)


# 5. API
class PromptRequest(BaseModel):
    prompt: str
    lang: str = "es"


@app.get("/")
async def health_check():
    return {"status": "ok", "message": "RAG API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "model": MODELO, "timestamp": time.time()}


@app.post("/test")
async def test_endpoint(req: PromptRequest):
    print(f"🧪 Test endpoint received: {req.prompt}")
    return {"received": req.prompt, "lang": req.lang, "status": "ok"}


@app.post("/context")
async def get_context(req: PromptRequest, request: Request):
    print(f"📥 Received prompt: {req.prompt} in language: {req.lang}")
    print(f"🔍 Client info: {request.client}")
    print(f"📡 Headers: {dict(request.headers)}")

    try:
        print("🔍 Starting retrieval...")
        retriever = index.as_retriever(similarity_top_k=2)
        nodes = retriever.retrieve(req.prompt)
        textNodes = "\n".join([node.node.text for node in nodes])
        print(f"📝 Retrieved {len(nodes)} nodes")

        prompt = "\n\n".join([get_system_prompt(lang=req.lang), textNodes, req.prompt])
        print("📝 Prompt prepared")

        # Fallback si no se recuperó nada relevante sobre MediTime
        if (
            "meditime" in req.prompt.lower()
            or "app" in req.prompt.lower()
            or "aplicaci" in req.prompt.lower()
        ) and "meditime" not in textNodes.lower():
            print("⚠️ No se encontró info sobre MediTime. Usando fallback manual.")
            try:
                with open("./docs/meditime.md", "r", encoding="utf-8") as f:
                    textNodes = f.read()
            except FileNotFoundError:
                print("❌ meditime.md not found, continuing without fallback")

        print("🚀 Starting stream generator...")

    except Exception as e:
        print(f"❌ Error in setup: {str(e)}")
        return {"error": f"Setup error: {str(e)}"}

    async def stream_generator():
        ollama_task = None
        client_disconnected = False
        
        async def check_client_connection():
            """Check if client is still connected"""
            nonlocal client_disconnected
            try:
                # Try to get client info periodically
                while not client_disconnected:
                    await asyncio.sleep(1.0)  # Check every second
                    # This will throw an exception if client disconnected
                    if not hasattr(request, 'client') or not request.client:
                        print("🔌 Client connection lost")
                        client_disconnected = True
                        break
            except asyncio.CancelledError:
                print("� Client connection check cancelled")
                client_disconnected = True
            except Exception as e:
                print(f"🔌 Client connection check error: {e}")
                client_disconnected = True
        
        try:
            print("�🔄 Stream generator started")
            start_time = time.time()

            # Start client connection monitoring
            connection_task = asyncio.create_task(check_client_connection())

            # Función para ejecutar la generación de Ollama en un hilo separado
            def run_ollama_generation():
                print("🤖 Starting Ollama generation...")
                return ollamaLoaded.generate(
                    model=MODELO,
                    prompt=prompt,
                    stream=True,
                )

            # Ejecutar la generación en un executor para poder cancelarla
            loop = asyncio.get_event_loop()
            print("🔄 Submitting to executor...")
            ollama_task = loop.run_in_executor(None, run_ollama_generation)

            # Esperar la respuesta con timeout
            try:
                print("⏱️ Waiting for Ollama response...")
                response = await asyncio.wait_for(ollama_task, timeout=60.0)
                print("✅ Got response from Ollama")
            except asyncio.TimeoutError:
                print("❌ Timeout waiting for Ollama response")
                yield "[Error: Timeout waiting for response]".encode("utf-8")
                return
            finally:
                connection_task.cancel()

            print("🔄 Streaming response after", time.time() - start_time, "seconds")

            chunk_count = 0
            for i, chunk in enumerate(response):
                # Check if client disconnected
                if client_disconnected:
                    print("🔌 Client disconnected, stopping stream")
                    break
                    
                chunk_count += 1

                if i == 0:
                    print("First chunk after:", time.time() - start_time, "seconds")

                if chunk_count % 10 == 0:  # Log cada 10 chunks
                    print(f"📦 Processed {chunk_count} chunks")

                yield chunk.response.encode("utf-8")

                # Pequeña pausa para permitir verificaciones de desconexión
                await asyncio.sleep(0.001)

            print(
                f"✅ Streaming completed successfully after {time.time() - start_time} seconds, {chunk_count} chunks"
            )

        except asyncio.CancelledError:
            print("❌ Streaming cancelled - client likely disconnected")
            client_disconnected = True
            # Cancelar la tarea de Ollama si está corriendo
            if ollama_task and not ollama_task.done():
                ollama_task.cancel()
            raise
        except Exception as e:
            print(f"❌ Exception while streaming: {str(e)}")
            yield f"[Error: {str(e)}]".encode("utf-8")
        finally:
            # Cleanup
            if 'connection_task' in locals():
                connection_task.cancel()
            if ollama_task and not ollama_task.done():
                ollama_task.cancel()

    return StreamingResponse(stream_generator(), media_type="text/plain")


# Agregar manejo de señales para shutdown limpio
def signal_handler(sig, frame):
    print("\n🛑 Received shutdown signal, cleaning up...")
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting RAG API server with cancellation support...")
    print("🌐 Server will be available at:")
    print("   - http://localhost:8000")
    print("   - http://127.0.0.1:8000")
    print("🧪 Test endpoints:")
    print("   - GET  http://localhost:8000/")
    print("   - GET  http://localhost:8000/health")
    print("   - POST http://localhost:8000/test")
    print("   - POST http://localhost:8000/context")

    uvicorn.run(
        app,
        host="127.0.0.1",  # Cambiado de 0.0.0.0 a 127.0.0.1 para mejor compatibilidad local
        port=8000,
        log_level="info",
        timeout_keep_alive=30,
        timeout_graceful_shutdown=10,
        reload=False,  # Desactivar reload para evitar problemas
    )
