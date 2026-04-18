import os
import sys
from dotenv import load_dotenv

# Add the current directory to path so we can import db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from db import redis_client, init_qdrant, ensure_collections, qdrant_client_instance

def full_cleanup():
    print("[STARTING] Full System Cleanup...")
    
    # 1. Flush Redis
    try:
        print("[REDIS] Flushing all data (Users, Sessions, OTPs)...")
        redis_client.flushall()
        print("[SUCCESS] Redis Flushed.")
    except Exception as e:
        print(f"[ERROR] Redis Flush failed: {e}")

    # 2. Reset Qdrant Collections
    try:
        client = init_qdrant()
        print("[QDRANT] Deleting old vector collections...")
        collections_to_reset = ["energy-minilm"]
        
        existing_response = client.get_collections()
        existing = [c.name for c in existing_response.collections]
        
        for name in collections_to_reset:
            if name in existing:
                print(f"Deleting collection: {name}")
                client.delete_collection(name)
        
        print("[QDRANT] Recreating fresh empty collections...")
        ensure_collections()
        print("[SUCCESS] Qdrant Reset.")

    except Exception as e:
        print(f"[ERROR] Qdrant Reset failed: {e}")

    print("\n[FINISHED] Your system is now in a Pure Fresh state!")
    print("Note: You will need to Signup again with a fresh OTP.")

if __name__ == "__main__":
    full_cleanup()
