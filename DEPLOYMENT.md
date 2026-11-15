# CivicOps Deployment Guide

This guide outlines the production deployment architecture for **CivicOps — Smart Apartment Community Operations Platform**:
- **Frontend (React + Vite + TypeScript)** → Hosted on **Netlify**
- **Backend (Java 17 + Spring Boot 3)** → Hosted on **Google Cloud Run**
- **Database (PostgreSQL)** → Hosted on **Google Cloud SQL**

---

## 1. Frontend Deployment (Netlify)

### Prerequisites
- Node.js 20+ installed locally
- Netlify CLI or Netlify dashboard access

### Build & Deploy Steps
1. **Connect Repository**: Link your GitHub repository (`dushyantcha111-boop/CivicOps`) to Netlify.
2. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Node Version**: `20` (configured via `netlify.toml`)
3. **Environment Variables**:
   In Netlify Site Settings > Build & deploy > Environment, add:
   - `VITE_API_BASE_URL` = `https://your-cloud-run-backend-url.a.run.app/api/v1`
4. **SPA Redirects**:
   `netlify.toml` in the repository root automatically handles client-side routing fallback (`/* /index.html 200`).

---

## 2. Backend Deployment (Google Cloud Run)

### Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated
- Docker installed

### Containerization & Deployment Steps
1. **Build Docker Image via Cloud Build**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/civicops-backend ./backend
   ```
2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy civicops-backend \
     --image gcr.io/YOUR_GCP_PROJECT_ID/civicops-backend \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --set-env-vars SQL_HOST=YOUR_CLOUD_SQL_IP,SQL_DB_NAME=civicops_db,SQL_USER=civicops_user,SQL_PASSWORD=YOUR_SECURE_PASSWORD,JWT_SECRET=YOUR_64_BYTE_SECURE_JWT_SECRET,CORS_ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
   ```
   *(Note: If connecting via Cloud SQL Auth Proxy, configure the UNIX socket or private IP accordingly).*

---

## 3. Database Setup (Google Cloud SQL PostgreSQL)

1. Provision a Cloud SQL PostgreSQL 15+ instance in `asia-southeast1`.
2. Create database `civicops_db` and user `civicops_user`.
3. Flyway migrations (`V1__init_schema.sql`, `V2__seed_demo_data.sql`, `V3__add_requisitions_preventive_and_roles.sql`) will automatically execute and initialize the schema upon Spring Boot application startup.

---

## 4. Verification

1. Open your Netlify production URL.
2. Log in using verified credentials (e.g., `vikram.admin@civicops.in` or `suresh.patel@civicops.in`).
3. Verify that JWT tokens are correctly attached to API requests and data persists in PostgreSQL.
