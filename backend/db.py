import redis
from qdrant_client import QdrantClient
from qdrant_client.http import models
import os
import uuid
import json
from datetime import datetime, timedelta

import fakeredis
# Check for Cloud Redis URL (e.g. Upstash) or fallback to local/fakeredis
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    print(f"[INFO] Connecting to Cloud Redis...")
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
else:
    print("[WARNING] No REDIS_URL found. Using In-Memory Fakeredis (Data will be lost on restart).")
    redis_client = redis.StrictRedis(host='localhost', port=6379, db=0, decode_responses=True)

qdrant_client_instance = None 

# GLOBAL RETENTION POLICY: 20 Days (1,728,000 seconds)
RETENTION_SECONDS = 1728000

def init_qdrant():
    global qdrant_client_instance
    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")
    
    # Fast Initialization - Don't block for full collection scan yet
    try:
        if url and api_key:
            print(f"[ASYNC] Initializing Qdrant Cloud Client...")
            qdrant_client_instance = QdrantClient(url=url, api_key=api_key, timeout=5)
        else:
            raise ValueError("Qdrant credentials missing")
    except Exception as e:
        print(f"[WARNING] [FALLBACK] Qdrant Cloud failed ({e}). Using Local In-Memory.")
        qdrant_client_instance = QdrantClient(":memory:")
    
    return qdrant_client_instance

def ensure_collections():
    """Background task to ensure collections exist without blocking startup"""
    global qdrant_client_instance
    if not qdrant_client_instance:
        return
        
    indexes = ["energy-openai", "energy-minilm"]
    try:
        print("🔍 Checking collections...")
        existing_response = qdrant_client_instance.get_collections()
        existing = [c.name for c in existing_response.collections]
        
        for idx in indexes:
            dim = 1536 if "openai" in idx else 384
            if idx not in existing:
                print(f"💎 Creating Collection: {idx}")
                qdrant_client_instance.create_collection(
                    collection_name=idx,
                    vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE)
                )
        print("[SUCCESS] Collections Verified.")
    except Exception as e:
        print(f"⚠️ Collection check failed: {e}")

def cache_get(key: str):
    return redis_client.get(key)

def cache_set(key: str, value: str, ttl_hours: int = 24):
    redis_client.setex(key, timedelta(hours=ttl_hours), value)
    
def rate_limit_check(user_id: str, limit: int = 15, period_hours: int = 4):
    key = f"rate_limit:{user_id}"
    current = redis_client.get(key)
    if current and int(current) >= limit:
        return False
    
    pipe = redis_client.pipeline()
    pipe.incr(key)
    if not current:
        pipe.expire(key, timedelta(hours=period_hours))
    pipe.execute()
    return True

# --- SESSION MANAGEMENT ---
def create_session(user_id: str, title: str = "New Analysis", doc_ids: list = None):
    session_id = str(uuid.uuid4())
    session_data = {
        "id": session_id,
        "title": title,
        "created_at": str(datetime.now()),
        "doc_ids": doc_ids or []
    }
    # Add to set of user sessions
    redis_client.sadd(f"user_sessions:{user_id}", session_id)
    # Store session metadata with TTL (Scoped to user)
    redis_client.setex(f"session_meta:{user_id}:{session_id}", RETENTION_SECONDS, json.dumps(session_data))
    
    # If there are docs, map them to this session with TTL
    if doc_ids:
        for doc_id in doc_ids:
            redis_client.setex(f"doc_session:{doc_id}", RETENTION_SECONDS, session_id)
            
    return session_data

def get_user_sessions(user_id: str):
    session_ids = redis_client.smembers(f"user_sessions:{user_id}")
    sessions = []
    for sid in session_ids:
        meta = redis_client.get(f"session_meta:{user_id}:{sid}")
        if meta:
            sessions.append(json.loads(meta))
    # Sort by creation time (desc)
    sessions.sort(key=lambda x: x['created_at'], reverse=True)
    return sessions[:15]

def update_session_title(user_id: str, session_id: str, title: str):
    key = f"session_meta:{user_id}:{session_id}"
    meta = redis_client.get(key)
    if meta:
        data = json.loads(meta)
        data["title"] = title
        redis_client.setex(key, RETENTION_SECONDS, json.dumps(data))
        return True
    return False

def delete_session(user_id: str, session_id: str):
    # Get associated docs before deleting metadata (Using scoped key)
    meta = redis_client.get(f"session_meta:{user_id}:{session_id}")
    doc_names = []
    if meta:
        data = json.loads(meta)
        doc_ids = data.get("doc_ids", [])
        for doc_id in doc_ids:
            # Get filename before deleting doc metadata
            doc_str = redis_client.hget(f"user_docs:{user_id}", doc_id)
            if doc_str:
                doc_obj = json.loads(doc_str)
                name = doc_obj.get("name")
                if name: doc_names.append(name)
            
            # Remove from user_docs hash map
            redis_client.hdel(f"user_docs:{user_id}", doc_id)
            # Remove the session mapping
            redis_client.delete(f"doc_session:{doc_id}")
            
    redis_client.srem(f"user_sessions:{user_id}", session_id)
    redis_client.delete(f"session_meta:{user_id}:{session_id}")
    redis_client.delete(f"chat_history:{user_id}:{session_id}")
    return doc_names

# --- DOCUMENT REGISTRY ---
def register_document(user_id: str, filename: str, doc_id: str = None):
    if not doc_id:
        doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "name": filename,
        "uploaded_at": str(datetime.now()),
        "user_id": user_id
    }
    # Store doc metadata
    redis_client.hset(f"user_docs:{user_id}", doc_id, json.dumps(doc_data))
    # SET EXPIRY TRIGGER KEY
    redis_client.setex(f"doc_ttl:{doc_id}", RETENTION_SECONDS, "1")
    return doc_data

def get_user_documents(user_id: str):
    docs_raw = redis_client.hgetall(f"user_docs:{user_id}")
    docs = []
    for doc_id, data_str in docs_raw.items():
        # AUTO-CLEANUP CHECK: If TTL key is gone, document has expired
        if not redis_client.exists(f"doc_ttl:{doc_id}"):
            # Document expired -> Deep Cleanup
            doc_obj = json.loads(data_str)
            doc_name = doc_obj.get("name")
            linked_sid = redis_client.get(f"doc_session:{doc_id}")
            
            # Wipe Vector Data
            if doc_name:
                try:
                    from rag import delete_vector_data
                    delete_vector_data(user_id, [doc_name])
                except Exception: pass
            
            # Wipe Redis Artifacts
            redis_client.hdel(f"user_docs:{user_id}", doc_id)
            if linked_sid:
                delete_session(user_id, linked_sid)
            continue
            
        doc = json.loads(data_str)
        # Check if mapped to a session
        doc["linked_session_id"] = redis_client.get(f"doc_session:{doc_id}")
        docs.append(doc)
    # Sort by upload time
    docs.sort(key=lambda x: x['uploaded_at'], reverse=True)
    return docs

def user_has_documents(user_id: str):
    """Checks if the user has at least one chunk indexed in Qdrant"""
    if not qdrant_client_instance:
        return False
    try:
        count_res = qdrant_client_instance.count(
            collection_name="energy-minilm",
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))
                ]
            ),
            exact=False # Fast estimation is enough
        )
        return count_res.count > 0
    except Exception as e:
        print(f"⚠️ Error checking user documents: {e}")
        return False

