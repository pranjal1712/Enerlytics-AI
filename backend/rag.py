import os
import uuid
import db
import gc
from qdrant_client.http import models
import openai
import groq
from rotator import execute_with_rotation, groq_rotator

# Heavy AI Model State
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        print("🚀 [LAZY LOAD] Loading SentenceTransformer (all-MiniLM-L6-v2)...")
        from sentence_transformers import SentenceTransformer
        # Force CPU device to avoid "meta tensor" errors on certain Windows environments
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        print("✅ [LAZY LOAD] Embedding Model Ready.")
    return _embedding_model

class TokenOptimizer:
    @staticmethod
    def trim_chunks(chunks, max_tokens=2000):
        # A simple approximation: 1 token ~ 4 chars
        current_tokens = 0
        trimmed = []
        for c in chunks:
            tokens = len(c) // 4
            if current_tokens + tokens > max_tokens:
                break
            trimmed.append(c)
            current_tokens += tokens
        return trimmed

# Stage 1 Validation (Fast Keywords) remains here for pre-filtering
def validate_domain_keywords(text: str) -> bool:
    """Stage 1: Domain Keyword Match (Requires at least 1 unique keyword)"""
    energy_keywords = {
        'solar', 'wind', 'renewable', 'electricity', 'grid', 'photovoltaic', 
        'turbine', 'battery', 'voltage', 'current', 'thermal', 'hydroelectric',
        'nuclear', 'consumption', 'generation', 'sustainability', 'biomass',
        'substation', 'distribution', 'megawatt', 'kilowatt', 'energy', 
        'analysis', 'market', 'power', 'report', 'supply', 'demand', 'infrastructure',
        'net-zero', 'decarbonization', 'esg', 'photovoltaics', 'inverter', 'anode', 
        'cathode', 'lithium', 'electric vehicle', 'smart meter', 'renewables',
        'hydrogen', 'fusion', 'geothermal', 'petroleum', 'methane'
    }
    text_lower = text.lower()
    found_keywords = {kw for kw in energy_keywords if kw in text_lower}
    return len(found_keywords) >= 1

# AI Stage 2 is now handled by EnergyAnalysisAgent in agents.py

def extract_text_from_pdf(file_path):
    import fitz # Lazy load PyMuPDF
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_docx(file_path):
    import docx # Lazy load python-docx
    doc = docx.Document(file_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

def chunk_text(text):
    from langchain.text_splitter import RecursiveCharacterTextSplitter # Lazy load splitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=50
    )
    return splitter.split_text(text)

def get_minilm_embedding(text):
    model = get_embedding_model()
    return model.encode(text).tolist()

def ingest_document(file_path, user_id, document_name):
    try:
        if document_name.lower().endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        elif document_name.lower().endswith(('.docx', '.doc')):
            text = extract_text_from_docx(file_path)
        else:
            raise ValueError("Unsupported file format. Please upload PDF or DOCX.")
            
        chunks = chunk_text(text)
        
        if len(chunks) == 0:
            print("ϵ Error: No text chunks found in document. Is it a scanned PDF?")
            return
        
        idx = "energy-minilm"
        # Ensure Payload Indexes exist
        try:
            db.qdrant_client_instance.create_payload_index(
                collection_name=idx,
                field_name="user_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            db.qdrant_client_instance.create_payload_index(
                collection_name=idx,
                field_name="doc_name",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass

        for i, chunk in enumerate(chunks):
            # Using high-performance local model (All-MiniLM-L6-v2) - Completely Free
            vector = get_minilm_embedding(chunk)
            index_name = "energy-minilm"
            
            # Upsert to Qdrant (Local Collection)
            upsert_res = db.qdrant_client_instance.upsert(
                collection_name=index_name,
                points=[
                    models.PointStruct(
                        id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}_{document_name}_{i}")),
                        vector=vector,
                        payload={"text": chunk, "user_id": user_id, "doc_name": document_name}
                    )
                ]
            )
            if not upsert_res:
                 print(f"⚠️ Chunk {i} upsert returned no response. Check Qdrant status.")
        
        print(f"✅ Document {document_name} ingested successfully.")
        
        # Explicitly free memory after heavy PDF processing
        gc.collect()
        return True
    except Exception as e:
        print(f"❌ Ingestion Error: {e}")
    finally:
        # AUTO-CLEANUP: Always remove the temp file to save disk space
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🧹 Auto-Cleanup: Removed temporary file {document_name}")

def retrieve_and_rerank(query: str, user_id: str, doc_name: str = None):
    # Vectorize query using Local Model
    query_vector = get_minilm_embedding(query)
    
    must_conditions = [
        models.FieldCondition(
            key="user_id",
            match=models.MatchValue(value=user_id)
        )
    ]
    if doc_name:
        must_conditions.append(
            models.FieldCondition(
                key="doc_name",
                match=models.MatchValue(value=doc_name)
            )
        )
        
    # Search the Local Collection (energy-minilm)
    try:
        res = db.qdrant_client_instance.search(
            collection_name="energy-minilm",
            query_vector=query_vector,
            query_filter=models.Filter(must=must_conditions),
            limit=10
        )
    except Exception as e:
        print(f"❌ Search failed: {e}")
        res = []
        
    # Return structured metadata including scores and source filenames
    detailed_chunks = [
        {
            "text": hit.payload['text'],
            "doc_name": hit.payload.get('doc_name', 'Unknown'),
            "score": round(hit.score, 3)
        }
        for hit in res[:6]
    ]

    return detailed_chunks

def generate_response(query: str, chunks: list, user_id: str, session_id: str = None):
    # Extract just the text for the LLM context with safety check for empty list
    text_list = [c['text'] for c in chunks] if (chunks and isinstance(chunks[0], dict)) else chunks
    context_text = "\n---\n".join(text_list)
    
    # Use secure user-scoped session_id for history (Prevents IDOR)
    history_key = f"chat_history:{user_id}:{session_id}" if session_id else f"chat_history:{user_id}"
    history_raw = db.redis_client.get(history_key)
    
    history = ""
    if history_raw:
        try:
            import json
            if isinstance(history_raw, bytes):
                history_raw = history_raw.decode('utf-8')
            h_list = json.loads(history_raw)
            # Safe extraction of history list
            if not isinstance(h_list, list):
                h_list = []
            
            # Format as a clean string for LLM context window with safety checks
            # LIMIT: Only use the last 15 messages to prevent context overflow and reduce latency
            history_lines = []
            for m in h_list[-15:]:
                role = str(m.get('role', 'unknown')).upper()
                content = str(m.get('content', ''))
                history_lines.append(f"{role}: {content}")
            history = "\n".join(history_lines)
        except Exception as e:
            print(f"⚠️ History Parse Error: {e}")
            history = "Previous history recovery failed."
    else:
        history = "No previous history."
    
    def _call(api_key):
        client = groq.Groq(api_key=api_key)
        
        system_prompt = (
            "You are a professional Energy Domain AI Assistant. "
            "Your task is to answer the user's question ONLY using the provided context and history below.\n\n"
            "STRICT RULES:\n"
            "1. If the answer is not explicitly present in the context, briefly explain that the provided documents "
            "do not contain specific information about this topic. Be professional.\n"
            "2. NEVER use outside knowledge to answer if the context is missing info.\n"
            "3. Do not repeat the same phrase multiple times.\n\n"
            f"RELEVANT DOCUMENT CONTEXT:\n{context_text if context_text else 'No relevant documents found.'}\n\n"
            f"RECENT HISTORY:\n{history}"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        return client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            stream=True
        )
        
    try:
        response = execute_with_rotation(groq_rotator, _call)
        return response
    except Exception as e:
        return str(e)

def delete_vector_data(user_id: str, doc_names: list[str]):
    """Removes all points from Qdrant for specific documents belonging to a user."""
    if not doc_names or not db.qdrant_client_instance:
        return
        
    try:
        from qdrant_client import models
        index_name = "energy-minilm"
        
        # Multiple documents delete in one call
        db.qdrant_client_instance.delete(
            collection_name=index_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                        models.FieldCondition(key="doc_name", match=models.MatchAny(any=doc_names))
                    ]
                )
            )
        )
        print(f"✅ Vector Cleanup: Purged {len(doc_names)} technical reports from Qdrant.")
    except Exception as e:
        print(f"❌ Vector Purge Failed: {e}")
