# xxalim-apnaakaam-backend

India's Professional Service Marketplace.

ApnaKaam is a full-stack local service discovery platform with a React frontend, Node.js backend, MongoDB support, Cloudinary image upload, and deployment-ready config.

## Run locally

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
node server.js
```

## Environment variables

Create a `.env` file in `server/` or set these in your hosting provider:

- `MONGODB_URI` - MongoDB connection string. If missing, the backend runs with in-memory storage.
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `OPENAI_API_KEY` - optional, enables real OpenAI chat responses.

Example file: `server/.env.example`
