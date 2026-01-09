# SnapShare – Photo Sharing Web App (COM769 CW2)

## Overview
SnapShare is a simple photo-sharing web application developed for COM769 Coursework 2.
It is deployed on Microsoft Azure using a cloud-native **3-tier (n-tier)** architecture:

- **Presentation Tier:** Azure Static Web Apps (HTML, CSS, JavaScript)
- **Application Tier:** Azure Functions (REST API)
- **Data Tier:** Azure Blob Storage (images) and Azure Cosmos DB (metadata, comments, ratings)

This design separates concerns, reduces configuration effort, and scales by using Azure-managed services.

## Core Functionality (Rubric Coverage)
**Creator**
- Upload an image
- Add title, caption, location, people present
- Publish a post

**Consumer**
- Browse photo feed
- Search posts
- Open a post (detail view)
- Comment on posts
- Rate posts (1–5)

## Project Structure
```
snapshare/
├── frontend/        # Static web interface
├── api/             # Azure Functions REST API
├── README.md
├── .gitignore
└── package.json
```

## Cosmos DB Data Model (Simple + Reliable)
To avoid partition-key errors, create Cosmos containers with these partition keys:

- **posts** container: partition key **/postId**
- **comments** container: partition key **/postId**
- **ratings** container: partition key **/postId**

Documents include `postId` so queries and updates remain consistent.

## Local Development (Optional)
1. Install Node.js (LTS) and Azure Functions Core Tools v4.
2. In `api/` install dependencies:
   - `npm install`
3. Edit `api/local.settings.json` and set your (real) connection strings/keys.
4. Run the Functions locally:
   - `func start`

Frontend can be opened with VS Code “Live Server” from `frontend/index.html`.

## Deployment
Deploy using GitHub integration with **Azure Static Web Apps** (CI/CD). Azure builds and deploys on each commit.

**Static Web App configuration**
- App location: `frontend`
- API location: `api`
- Output location: (leave empty)

## Environment Variables (Azure)
Set these in Azure configuration.

**Blob Storage**
- `AZURE_STORAGE_CONNECTION_STRING`
- `BLOB_CONTAINER_NAME` (e.g., `images`)
- `PUBLIC_BLOB_BASE_URL` (e.g., `https://<account>.blob.core.windows.net/images`)

**Cosmos DB**
- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DB_NAME` (e.g., `snapshare`)
- `COSMOS_CONTAINER_POSTS` (e.g., `posts`)
- `COSMOS_CONTAINER_COMMENTS` (e.g., `comments`)
- `COSMOS_CONTAINER_RATINGS` (e.g., `ratings`)

## Notes
- Image upload uses a base64 payload for reliability in coursework demos.
- For production, direct-to-Blob upload via SAS would be preferred (not required here).
