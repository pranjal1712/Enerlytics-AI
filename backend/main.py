from dotenv import load_dotenv
import os
# Load environment variables from the root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Response, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor
from auth import (
    User, create_user, get_user_by_email, verify_password, 
    create_access_token, verify_google_token, verify_google_access_token,
    create_password_reset_token, get_email_from_reset_token, delete_reset_token, 
    get_password_hash, decode_access_token
)
from db import init_qdrant, rate_limit_check, cache_get, cache_set
from rag import ingest_document, retrieve_and_rerank, generate_response
import tempfile
import uuid
import os

app = FastAPI(title="EnergyMind RAG API")

# Setup CORS - Use specific origin for cookies
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    import threading
    from db import init_qdrant, ensure_collections
    
    print("🚀 [STARTUP] Initializing Services...")
    
    # 1. Fast Client Init (No blocking network calls)
    client = init_qdrant()
    
    # 2. Ensure Collections (Run in background to avoid blocking main thread)
    if client:
        threading.Thread(target=ensure_collections, daemon=True).start()
    
    # 3. AI Model Pre-warming (Run in Background Thread)
    # This loads the 400MB SentenceTransformer while the server starts up
    def prewarm():
        from rag import get_embedding_model
        get_embedding_model()
    threading.Thread(target=prewarm, daemon=True).start()
    
    # 4. Test Redis Connectivity (Blocking but fast)
    try:
        from db import redis_client
        redis_client.ping()
        print("✅ Redis Connectivity: OK")
    except Exception as e:
        print(f"❌ Redis Connectivity Failed: {e}")
    
    print("✨ API is ready and listening.")

@app.post("/auth/signup")
async def signup(request: Request, response: Response, user: User):
    from db import rate_limit_check
    if not rate_limit_check(user.email, limit=5, period_hours=1):
        raise HTTPException(status_code=429, detail="Too many signup attempts. Please try again in an hour.")
        
    if get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    create_user(user)
    
    # Auto-login after signup
    token = create_access_token({"sub": user.email})
    response.set_cookie(key="access_token", value=token, httponly=True, max_age=10*24*3600, samesite="none", secure=True)
    return {"message": "User created successfully", "access_token": token}

@app.post("/auth/login")
async def login(request: Request, response: Response, user: User):
    from db import rate_limit_check
    if not rate_limit_check(user.email, limit=10, period_hours=1):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
        
    db_user = get_user_by_email(user.email)
    if not db_user or not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user.email})
    response.set_cookie(key="access_token", value=token, httponly=True, max_age=10*24*3600, samesite="none", secure=True)
    return {"access_token": token}

@app.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="none", secure=True)
    return {"message": "Logged out successfully"}

@app.post("/auth/google")
async def google_login(response: Response, data: dict):
    token = data.get("token")
    access_token = data.get("access_token")
    
    idinfo = None
    if token:
        idinfo = verify_google_token(token)
    elif access_token:
        idinfo = verify_google_access_token(access_token)
        
    if not idinfo:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    email = idinfo['email']
    name = idinfo.get('name', email.split('@')[0])
    
    db_user = get_user_by_email(email)
    if not db_user:
        # Create user if doesn't exist (random password since they use Google)
        db_user = create_user(User(username=name, email=email, password=str(uuid.uuid4())))
    
    access_token = create_access_token({"sub": email})
    response.set_cookie(key="access_token", value=access_token, httponly=True, max_age=10*24*3600, samesite="none", secure=True)
    return {"access_token": access_token}

@app.post("/auth/forgot-password")
async def forgot_password(data: dict):
    email = data.get("email")
    user = get_user_by_email(email)
    if not user:
        # Security best practice: don't reveal if user exists
        return {"message": "If this email is registered, you will receive a reset link."}
    
    token = create_password_reset_token(email)
    # Mocking email send
    print(f"DEBUG: Password reset link for {email}: http://localhost:5173/reset-password?token={token}")
    return {"message": "Reset link generated (check server console for debug link)"}

@app.post("/auth/reset-password")
async def reset_password(data: dict):
    token = data.get("token")
    new_password = data.get("new_password")
    
    email = get_email_from_reset_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user_data = get_user_by_email(email)
    if user_data:
        user_data['password'] = get_password_hash(new_password)
        from db import redis_client
        import json
        redis_client.set(f"user:{email}", json.dumps(user_data))
        delete_reset_token(token)
        return {"message": "Password reset successfully"}
    
    raise HTTPException(status_code=404, detail="User not found")

# Dependency for getting current user from secure cookie
def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid session")
        return payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Session validation failed")

@app.get("/auth/status")
async def get_auth_status(request: Request):
    try:
        user = get_current_user(request)
        return {"authenticated": True, "user": user}
    except HTTPException:
        return {"authenticated": False}

from fastapi import BackgroundTasks

@app.get("/workspace/init")
async def init_workspace(user: str = Depends(get_current_user)):
    from db import get_user_documents, get_user_sessions, user_has_documents
    from auth import get_user_by_email
    
    # Fetch all critical data in parallel/sequence for unified dispatch
    profile = get_user_by_email(user)
    docs = get_user_documents(user)
    sessions = get_user_sessions(user)
    has_docs = user_has_documents(user)
    
    return {
        "user_profile": {
            "username": profile.get("username") if profile else user,
            "email": profile.get("email") if profile else user,
            "profile_pic": profile.get("profile_pic", "") if profile else ""
        },
        "sessions": sessions,
        "documents": docs,
        "status": {
            "authenticated": True,
            "has_documents": has_docs
        }
    }

@app.get("/user/documents")
async def list_documents(user: str = Depends(get_current_user)):
    from db import get_user_documents
    return get_user_documents(user)

@app.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user: str = Depends(get_current_user)
):
    from rag import extract_text_from_pdf, extract_text_from_docx, validate_domain_keywords, ingest_document
    from agents import energy_agent
    from db import register_document, create_session, redis_client
    import os
    import shutil
    import uuid
    import tempfile

    all_registered = []
    first_text = ""
    
    # 0. Global Size Check (Safety limit: 25MB total per request)
    MAX_FILE_SIZE = 25 * 1024 * 1024
    
    for file in files:
        # Check individual file size
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_FILE_SIZE:
             raise HTTPException(status_code=413, detail=f"File {file.filename} exceeds the 25MB limit.")

        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # 1. Quick Extract for Validation
            text = ""
            if file.filename.lower().endswith('.pdf'):
                text = extract_text_from_pdf(tmp_path)
            elif file.filename.lower().endswith(('.docx', '.doc')):
                text = extract_text_from_docx(tmp_path)
            
            if not validate_domain_keywords(text):
                os.remove(tmp_path)
                continue 

            if not first_text:
                first_text = text
            
            # 2. Register & Queue
            doc_id = str(uuid.uuid4())
            doc_info = register_document(user, file.filename, doc_id)
            all_registered.append(doc_id)
            background_tasks.add_task(ingest_document, tmp_path, user, file.filename)
            
        except Exception as e:
            print(f"Error processing {file.filename}: {e}")
            try:
                if 'tmp_path' in locals() and os.path.exists(tmp_path): 
                    os.remove(tmp_path)
            except: pass

    if not all_registered:
        raise HTTPException(status_code=400, detail="No valid energy documents found in upload.")

    # 3. Create Session for this Batch
    title = f"Analysis: {files[0].filename}" if len(files) == 1 else f"Batch Analysis ({len(files)} docs)"
    session = create_session(user, title, all_registered)

    # 4. Generate AI Insight (Summary + Questions)
    insight = energy_agent.generate_document_insight(first_text)
    
    # Store initial AI message in history
    intro_content = f"### Technical Summary\n{insight['summary']}\n\n**Suggested Investigations:**\n" + \
                    "\n".join([f"- {q}" for q in insight['suggested_questions']])
    
    # Set TTL using Global Retention Policy (User Scoped Key)
    from db import RETENTION_SECONDS
    history_key = f"chat_history:{user}:{session['id']}"
    redis_client.setex(history_key, RETENTION_SECONDS, json.dumps([{"role": "ai", "content": intro_content}]))

    return {
        "message": "Analysis initiated", 
        "session_id": session["id"],
        "insight": insight
    }
        
# --- CHAT SESSIONS ---

@app.get("/chats")
async def list_chats(user: str = Depends(get_current_user)):
    from db import get_user_sessions
    return get_user_sessions(user)

@app.get("/chat/history")
async def get_history(session_id: str, user: str = Depends(get_current_user)):
    from db import redis_client
    import json
    
    # SECURITY: Verify that the session_id belongs to this user before fetching
    user_sessions = redis_client.smembers(f"user_sessions:{user}")
    if session_id not in user_sessions:
        raise HTTPException(status_code=403, detail="Unauthorized access to this session's history")

    history_key = f"chat_history:{user}:{session_id}"
    history_raw = redis_client.get(history_key)
    if not history_raw:
        return []
        
    try:
        if isinstance(history_raw, bytes): history_raw = history_raw.decode('utf-8')
        return json.loads(history_raw)
    except:
        # Aggressively recover old text-based history by splitting merged strings
        messages = []
        parts = str(history_raw).split("\n")
        
        for p in parts:
            if not p.strip(): continue
            
            # Robust split: Find "User: " anywhere in the line
            if "User: " in p:
                u_parts = p.split("User: ")
                if u_parts[0].strip():
                    if messages and messages[-1]["role"] == "ai":
                        messages[-1]["content"] += "\n" + u_parts[0].strip()
                    else:
                        messages.append({"role": "ai", "content": u_parts[0].strip()})
                
                # Append the fresh user message if text is present after "User: "
                if len(u_parts) > 1 and u_parts[1].strip():
                    messages.append({"role": "user", "content": u_parts[1].strip()})
                continue

            if p.startswith("AI: "):
                messages.append({"role": "ai", "content": p[4:]})
            else:
                if messages and messages[-1]["role"] == "ai":
                    messages[-1]["content"] += "\n" + p
                else:
                    messages.append({"role": "ai", "content": p})
        return messages

@app.post("/chats/new")
async def new_chat(user: str = Depends(get_current_user)):
    from db import create_session
    return create_session(user)

@app.get("/user/status")
async def get_user_status(user: str = Depends(get_current_user)):
    from db import user_has_documents
    from auth import get_user_by_email
    
    db_user = get_user_by_email(user)
    has_docs = user_has_documents(user)
    
    return {
        "authenticated": True,
        "username": db_user.get("username") if db_user else user,
        "has_documents": has_docs
    }

@app.delete("/chats/{session_id}")
async def remove_chat(session_id: str, user: str = Depends(get_current_user)):
    from db import delete_session
    from rag import delete_vector_data
    
    # Deep Purge: Redis metadata first, then Qdrant vectors
    doc_names = delete_session(user, session_id)
    if doc_names:
        delete_vector_data(user, doc_names)
        
    return {"message": "Workspace cleared", "purged_docs": doc_names}

# --- USER PROFILE ---

@app.get("/user/profile")
async def get_profile(user: str = Depends(get_current_user)):
    from auth import get_user_by_email
    data = get_user_by_email(user)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    # Return profile without sensitive data
    return {
        "username": data.get("username"),
        "email": data.get("email"),
        "profile_pic": data.get("profile_pic", "")
    }

@app.post("/user/profile")
async def update_profile(request: Request, user: str = Depends(get_current_user)):
    from auth import get_user_by_email
    import json
    from db import redis_client
    
    data = await request.json()
    db_user = get_user_by_email(user)
    
    if db_user:
        if "username" in data:
            db_user["username"] = data["username"]
        if "profile_pic" in data:
            db_user["profile_pic"] = data["profile_pic"]
            
        redis_client.set(f"user:{user}", json.dumps(db_user))
        return {
            "username": db_user["username"],
            "profile_pic": db_user.get("profile_pic", "")
        }
    
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/chat")
async def chat(request: Request, user: str = Depends(get_current_user)):
    from rag import retrieve_and_rerank, generate_response
    from db import rate_limit_check, cache_get, cache_set
    
    if not rate_limit_check(user):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. 15 chats per 4 hours.")
        
    data = await request.json()
    query = data.get("query")
    doc_name = data.get("doc_name")
    session_id = data.get("session_id") # New session support
    
    # Setup History Key (User Scoped)
    from db import RETENTION_SECONDS, redis_client
    history_key = f"chat_history:{user}:{session_id}" if session_id else f"chat_history:{user}"

    # Check Cache
    cache_key = f"cache:{user}:{query}"
    cached = cache_get(cache_key)
    if cached:
        # Save Cached hit to history as well (JSON STYLE)
        import json
        hist_raw = redis_client.get(history_key) or "[]"
        if isinstance(hist_raw, bytes): hist_raw = hist_raw.decode('utf-8')
        try:
            hist_list = json.loads(hist_raw)
        except:
            hist_list = []
        
        hist_list.append({"role": "user", "content": query})
        hist_list.append({"role": "ai", "content": cached})
        redis_client.setex(history_key, RETENTION_SECONDS, json.dumps(hist_list[-50:]))
        return {"response": cached, "type": "cache"}
    
    # 1. RETRIEVAL & RERANKING
    chunks = retrieve_and_rerank(query, user, doc_name)
    
    # 2. GENERATION (STREAMING)
    response_data = generate_response(query, chunks, user, session_id)
    
    # EARLY PERSISTENCE: Save the user question immediately so it's not lost on refresh
    import json
    hist_raw = redis_client.get(history_key) or "[]"
    if isinstance(hist_raw, bytes): hist_raw = hist_raw.decode('utf-8')
    try:
        hist_list = json.loads(hist_raw)
    except:
        hist_list = []
    
    # Check if question already present (to avoid duplicates on error retries/refreshes)
    if not (hist_list and hist_list[-1].get("role") == "user" and hist_list[-1].get("content") == query):
        hist_list.append({"role": "user", "content": query})
        redis_client.setex(history_key, RETENTION_SECONDS, json.dumps(hist_list[-50:]))
    
    async def stream_generator():
        # 1. Send Chunks Metadata for UI Trace
        metadata_payload = json.dumps({"chunks": chunks})
        yield f"[METADATA]: {metadata_payload}\n\n"

        if isinstance(response_data, str):
            # Save User + Error to history (JSON STYLE)
            import json
            hist_raw = redis_client.get(history_key) or "[]"
            if isinstance(hist_raw, bytes): hist_raw = hist_raw.decode('utf-8')
            try:
                hist_list = json.loads(hist_raw)
            except:
                hist_list = []
            
            hist_list.append({"role": "ai", "content": response_data})
            redis_client.setex(history_key, RETENTION_SECONDS, json.dumps(hist_list[-50:]))
            yield response_data
            return

        full_text = ""
        for chunk in response_data:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                full_text += content
                yield content
        
        # FINAL COMMIT: Save only the AI response (User was saved early)
        import json
        cache_set(cache_key, full_text)
        hist_raw = redis_client.get(history_key) or "[]"
        if isinstance(hist_raw, bytes): hist_raw = hist_raw.decode('utf-8')
        try:
            hist_list = json.loads(hist_raw)
        except:
            hist_list = []
        
        hist_list.append({"role": "ai", "content": full_text})
        redis_client.setex(history_key, RETENTION_SECONDS, json.dumps(hist_list[-50:]))
                
    return StreamingResponse(stream_generator(), media_type="text/event-stream")
