# CivicOps Local Setup Guide (Windows 11 & VS Code)

Welcome to the local development guide for **CivicOps — Smart Apartment Community Operations Platform**. This guide covers setting up, running, and testing the full stack (React + Spring Boot + PostgreSQL) on Windows 11 using Visual Studio Code.

---

## 1. Prerequisites

Ensure you have installed:
1. **Git for Windows**: [Download Git](https://git-scm.com/download/win)
2. **Node.js (LTS v20+)**: [Download Node.js](https://nodejs.org/) (includes `npm`)
3. **Java JDK 17**: [Download Temurin JDK 17](https://adoptium.net/) (Ensure `JAVA_HOME` is set and added to system `PATH`)
4. **Maven 3.8+**: [Download Maven](https://maven.apache.org/download.cgi) (or use `mvnw` included in backend)
5. **Docker Desktop**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) (Required for local PostgreSQL container)

---

## 2. Clone Repository & Checkout Branch

Open PowerShell and run:
```powershell
git clone https://github.com/dushyantcha111-boop/CivicOps.git
cd CivicOps
git checkout -b feat/civicops-local-development-setup
```

---

## 3. Quick Setup via PowerShell Script

We provide automated PowerShell scripts in the `scripts/` folder.

1. **Check Environment Prerequisites**:
   ```powershell
   .\scripts\check-environment.ps1
   ```
2. **Run Automated Setup** (installs frontend packages and builds backend):
   ```powershell
   .\scripts\setup.ps1
   ```

---

## 4. Manual Local Setup Steps

If you prefer setting up manually:

### Step 1: Configure Environment Variables
Copy `.env.example` to `.env` in the root folder:
```powershell
Copy-Item .env.example .env
```
Ensure `VITE_API_BASE_URL=http://localhost:8080/api/v1`.

### Step 2: Install Frontend Dependencies
```powershell
npm ci
```

### Step 3: Start Local PostgreSQL via Docker Compose
```powershell
cd backend
docker compose up -d postgres
cd ..
```

### Step 4: Build & Run the Java Spring Boot Backend
```powershell
cd backend
mvn spring-boot:run
```
*(The backend will start on port `8080` with Flyway migrations automatically executed against PostgreSQL).*

### Step 5: Start the React Frontend
Open a separate PowerShell terminal in the project root:
```powershell
npm run dev
```
*(Vite will start the frontend development server on `http://localhost:5173`).*

---

## 5. Running in Visual Studio Code

1. Open the project folder in VS Code:
   ```powershell
   code .
   ```
2. Install recommended extensions when prompted (Java Extension Pack, Spring Boot, ESLint, Tailwind CSS, Docker).
3. Use **Terminal > Run Task** or press `Ctrl+Shift+B` to execute tasks defined in `.vscode/tasks.json`.

---

## 6. Accessing the Application

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:8080/api/v1`
- **Demo Accounts**:
  - **Admin / Multi-Role**: `vikram.admin@civicops.in` (Password: `password123`)
  - **Management**: `suresh.patel@civicops.in` (Password: `password123`)
  - **Resident (Tower B-402)**: `rahul.sharma@greenvalley.in` (Password: `password123`)
  - **Maintenance**: `ramesh.kumar@civicops.in` (Password: `password123`)
