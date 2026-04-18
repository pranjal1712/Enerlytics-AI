import os
import random
from typing import List

class APIKeyRotator:
    def __init__(self, env_prefix: str):
        self.env_prefix = env_prefix
        self.keys = []
        i = 1
        while True:
            key = os.getenv(f"{env_prefix}_{i}")
            if not key:
                break
            self.keys.append(key)
            i += 1
            
        if not self.keys:
            # Fallback to single key if numbered keys aren't found
            single_key = os.getenv(env_prefix)
            if single_key:
                # Support comma-separated keys in a single env variable
                if "," in single_key:
                    # Strip spaces AND quotes (' or ") for cloud environment robustness
                    self.keys.extend([k.strip().strip("'").strip('"') for k in single_key.split(",") if k.strip() and not k.startswith("your-")])
                else:
                    clean_key = single_key.strip().strip("'").strip('"')
                    if not clean_key.startswith("your-"):
                        self.keys.append(clean_key)
            
        print(f"[ROTATOR] Initialized {env_prefix} with {len(self.keys)} active keys.")

    def get_key(self) -> str:
        if not self.keys:
            raise ValueError(f"No API keys found for prefix {self.env_prefix}")
        return random.choice(self.keys)
    
    def get_all_keys(self) -> List[str]:
        return self.keys

groq_rotator = APIKeyRotator("GROQ_API_KEY")

import time

def execute_with_rotation(rotator: APIKeyRotator, func, *args, **kwargs):
    max_attempts = 3
    delays = [0, 4, 8]  # Progressive delay for retries
    
    last_exception = None
    
    for attempt in range(max_attempts):
        if attempt > 0:
            print(f"[RETRY] Attempt {attempt+1}/{max_attempts} starting after {delays[attempt]}s sleep...")
            time.sleep(delays[attempt])
            
        keys = list(rotator.get_all_keys())
        if not keys:
            raise Exception(f"No API keys found for {rotator.env_prefix}. Please check your environment variables.")
        
        random.shuffle(keys)
        
        for key in keys:
            try:
                # Mask key for security but show last 4 chars for identification in logs
                masked_key = f"***{key[-4:]}" if len(key) > 4 else "***"
                
                # EXECUTION: Call the function with explicit api_key
                # We specifically avoid passing through arbitrary kwargs that might be polluted by environment
                return func(*args, api_key=key)
            except Exception as e:
                # CRITICAL: Print the actual error so user can see it in Render logs
                print(f"[ERROR] API Key {masked_key} failed: {str(e)}")
                last_exception = e
            
    # If we reach here, all keys failed after all attempts
    error_msg = f"The AI Server is currently under heavy load or facing technical difficulties. (Last Error: {str(last_exception)})"
    raise Exception(error_msg)
