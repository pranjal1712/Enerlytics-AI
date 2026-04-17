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
                    self.keys.extend([k.strip() for k in single_key.split(",") if k.strip() and not k.startswith("your-")])
                else:
                    if not single_key.startswith("your-"):
                        self.keys.append(single_key)
            
        print(f"[ROTATOR] Initialized {env_prefix} with {len(self.keys)} active keys.")

    def get_key(self) -> str:
        if not self.keys:
            raise ValueError(f"No API keys found for prefix {self.env_prefix}")
        return random.choice(self.keys)
    
    def get_all_keys(self) -> List[str]:
        return self.keys

openai_rotator = APIKeyRotator("OPENAI_API_KEY")
cohere_rotator = APIKeyRotator("COHERE_API_KEY")
groq_rotator = APIKeyRotator("GROQ_API_KEY")

import time

def execute_with_rotation(rotator: APIKeyRotator, func, *args, **kwargs):
    max_attempts = 3
    delays = [0, 4, 5]  # No delay for 1st, 4s for 2nd, 5s for 3rd
    
    last_exception = None
    
    for attempt in range(max_attempts):
        if attempt > 0:
            print(f"[RETRY] API attempt {attempt} failed. Waiting {delays[attempt]}s before retry...")
            time.sleep(delays[attempt])
            
        keys = list(rotator.get_all_keys())
        if not keys:
            raise Exception(f"No API keys found for {rotator.env_prefix}. Please check your .env file.")
        
        random.shuffle(keys)
        
        for key in keys:
            try:
                kwargs['api_key'] = key
                return func(*args, **kwargs)
            except Exception as e:
                print(f"[RETRY] Key failed, rotating... Error: {e}")
                last_exception = e
            
    raise Exception("The AI Server is currently under heavy load or facing technical difficulties. Please try again after some time.")
