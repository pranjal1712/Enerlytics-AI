# 🚀 Deployment Guide: Energy RAG Platform

Follow these steps to deploy your full-stack application to production.

---

## 1. Setup Cloud Redis (Upstash)
*Since Render Free Tier doesn't include Redis, we use Upstash (Free).*

1.  Go to [Upstash Console](https://console.upstash.com/) and sign up.
2.  Create a new **Redis** database.
3.  Name: `enerlytics-cache`, Region: Choose one close to you (e.g., `us-east-1`).
4.  Once created, scroll down to the **REST API** section or **Node.js/Python** connection string.
5.  Copy the **URL** (it looks like `redis://default:password@your-url:port`).
6.  **Save this as `REDIS_URL`.**

---

## 2. Deploy Backend (Render)
1.  Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2.  Connect your GitHub repository and select the `energy-rag-platform` repo.
3.  **Settings:**
    *   **Name:** `energy-rag-backend`
    *   **Root Directory:** `backend`
    *   **Environment:** `Docker`
    *   **Region:** Matches your Upstash region for best speed.
4.  **Environment Variables (Add these):**
    *   `GROQ_API_KEY`: *(Your Groq Key)*
    *   `QDRANT_URL`: *(Your Qdrant Cloud URL)*
    *   `QDRANT_API_KEY`: *(Your Qdrant API Key)*
    *   `REDIS_URL`: *(The URL from Upstash Step 1)*
    *   `SECRET_KEY`: *(Generate a long random string)*
    *   `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:3000` (Update the URL once you have your Vercel URL)
5.  Click **Create Web Service**.

---

## 3. Deploy Frontend (Vercel)
1.  Go to [Vercel](https://vercel.com/new).
2.  Import your GitHub repository.
3.  **Settings:**
    *   **Framework Preset:** `Vite`
    *   **Root Directory:** `frontend`
4.  **Environment Variables (Add these):**
    *   `VITE_API_URL`: *(The .onrender.com URL provided by Render in Step 2)*
    *   `VITE_GOOGLE_CLIENT_ID`: *(Optional - Your Google Auth Client ID)*
5.  Click **Deploy**.

---

## 4. Final Bridge (Important!)
Once your Vercel app is deployed, you will get a URL like `https://energy-rag-frontend.vercel.app`.
1.  Go back to your **Render Dashboard** for the backend.
2.  Go to **Environment Variables**.
3.  Update `ALLOWED_ORIGINS` to include your exact Vercel URL.
4.  Save changes (Render will automatically redeploy).

---

### ✅ Verification Checklist
- [ ] Backend status on Render is "Live".
- [ ] Frontend status on Vercel is "Production".
- [ ] Open your Vercel URL and try to Login.
- [ ] Upload a small PDF and check if the Progress Bar works.
