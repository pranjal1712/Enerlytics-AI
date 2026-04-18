from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is missing. This is required for secure authentication.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 10

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

from pydantic import BaseModel, EmailStr, Field

class User(BaseModel):
    username: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# In a real app we would use a DB for users, mocking with Redis
from db import redis_client
import json

def get_user_by_email(email: str):
    user_data = redis_client.get(f"user:{email}")
    if user_data:
        return json.loads(user_data)
    return None

def create_user(user: User):
    user_data = user.dict()
    user_data['password'] = get_password_hash(user.password)
    redis_client.set(f"user:{user.email}", json.dumps(user_data))
    return user_data

import requests as requests_lib

def verify_google_token(token: str):
    try:
        # Specify the CLIENT_ID of the app that accesses the backend:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)

        # ID token is valid. Get the user's Google Account ID from the decoded token.
        return idinfo
    except ValueError:
        # Invalid token
        return None

def verify_google_access_token(access_token: str):
    try:
        response = requests_lib.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception:
        return None

def create_password_reset_token(email: str):
    token = str(uuid.uuid4())
    # Store token in redis with 1 hour expiration
    redis_client.setex(f"password_reset:{token}", 3600, email)
    return token

def get_email_from_reset_token(token: str):
    return redis_client.get(f"password_reset:{token}")

def delete_reset_token(token: str):
    redis_client.delete(f"password_reset:{token}")
