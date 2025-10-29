# Streamly

End-to-end movie streaming sandbox featuring a React-powered UI, a Go/Gin API, and AI-assisted recommendations backed by MongoDB. Streamly demonstrates how a modern media platform can combine responsive interfaces, resilient services, and intelligent automation within one cohesive stack.

## Vision

Streamly recreates the moving pieces of a contemporary movie service:

- React front end delivers an immersive browsing experience with trailers via `react-player`.
- Gin-based Go services expose secure RESTful routes for catalog, authentication, and personalization flows.
- AI recommendation layer (LangChainGo + OpenAI) curates content suggestions tailored to each viewer.
- MongoDB persists high-volume metadata, user preferences, and ranking inputs at scale.

## Repository map

```
Movie-Streaming/
├─ client/         # React workspace placeholder
├─ seed-data/      # JSON datasets for movies, users, rankings, genres
└─ server/         # Go backend (Gin, MongoDB, LangChainGo integration point)
   ├─ controllers/ # HTTP handlers for movies and users
   ├─ database/    # Connection helpers reading .env configuration
   ├─ middleware/  # Reserved for cross-cutting Gin middleware
   ├─ models/      # BSON/JSON schema definitions with validation tags
   ├─ routes/      # Route grouping (planned)
   └─ utils/       # Shared helpers (e.g., JWT token scaffolding)
```

## Core capabilities

- **Movie catalog API** exposes list and detail endpoints with request validation.
- **User management** supports registration with bcrypt hashing and conflict checks.
- **AI-ready pipeline** leaves hooks for LangChainGo agents to feed recommendations into the user flow.
- **Data seeding** provides rich sample JSON dumps so the experience is fully populated in minutes.
- **Composable architecture** keeps front end, backend, and ML components independently deployable.

## Technology stack

| Layer                  | Technologies                       | Notes                                 |
| ---------------------- | ---------------------------------- | ------------------------------------- |
| Client                 | React, TypeScript, react-player    | SPA shell ready for feature build-out |
| API & Services         | Go, gin-gonic, bcrypt, LangChainGo | REST endpoints, AI orchestration      |
| Data & Persistence     | MongoDB, BSON models               | Flexible schemas for media content    |
| AI Recommendation Mesh | OpenAI API, LangChain chains       | Personalized rankings and discovery   |

## Prerequisites

- Go 1.25+ (see `server/go.mod`).
- Node.js 18+ for the upcoming React client.
- MongoDB instance (local Docker container or hosted cluster).
- OpenAI API key when enabling the recommendation layer.

## Quick start

1. **Clone**

   ```powershell
   git clone https://github.com/ChannMyaeAung/streamly.git
   cd streamly/server
   ```

2. **Configure environment**
   Create `server/.env`:

   ```env
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=streamly
   OPENAI_API_KEY=
   ```

   Additional keys (e.g., `RECOMMENDER_MODEL`) can be added as the AI layer evolves.

3. **Install backend dependencies**

   ```powershell
   go mod tidy
   ```

4. **Run the API**

   ```powershell
   go run main.go
   ```

   The service listens on `http://localhost:8080`.

5. **Seed MongoDB (optional but recommended)**
   ```powershell
   $env:MONGODB_URI="mongodb://localhost:27017"
   $env:DATABASE_NAME="streamly"
   mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection movies --file ..\seed-data\movies.json --jsonArray
   mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection users --file ..\seed-data\users.json --jsonArray
   ```
   Import `genres.json` and `rankings.json` using the same command pattern.

## API snapshot

| Method | Route             | Purpose                              |
| ------ | ----------------- | ------------------------------------ |
| GET    | `/hello`          | Connectivity probe                   |
| GET    | `/movies`         | Retrieve the full catalog            |
| GET    | `/movie/:imdb_id` | Fetch a single movie by IMDb handle  |
| POST   | `/addmovie`       | Insert a validated movie entry       |
| POST   | `/register`       | Register new users with hashed creds |

Upcoming endpoints will cover `/login`, `/recommendations`, and user preference updates once the AI workflows are wired in.

## Frontend game plan

- Bootstrapped via Vite or Create React App targeting the `client/` directory.
- Uses global state (Redux Toolkit or Zustand) to orchestrate playback, favorites, and profile data.
- Integrates with the `/recommendations` endpoint to surface LangChain-driven picks in the hero carousel.

## Contribution guide

1. Fork the project: `https://github.com/ChannMyaeAung/streamly`.
2. Create a branch (`git checkout -b feature/recommendations`).
3. Add tests or sample JSON updates when introducing new behavior.
4. Submit a pull request describing the change and validation performed.

## Roadmap ideas

- OAuth login and session refresh tokens.
- Real-time presence metrics via WebSockets.
- Offline-first progressive web app experience.
- Automated evaluation of AI recommendations against user feedback loops.

## License

Streamly is available under the MIT License. Contributions are welcome; feel free to fork and innovate.

# Streamly

Streamly is a lightweight movie discovery and streaming companion built with Go, Gin, and MongoDB. The backend powers movie catalog lookups, secure user registration, and future playback features, while the repository also reserves space for a web client. This README walks through the project structure, setup steps, and available endpoints so you can run the service locally or extend it further.

## Project layout

```
Movie-Streaming/
├─ client/               # Front-end placeholder for a future React or SPA client
├─ seed-data/            # Sample MongoDB import files for movies, users, rankings, and genres
└─ server/               # Go REST API (Gin, MongoDB)
	├─ controllers/       # Route handlers for movies and users
	├─ database/          # MongoDB connection helpers
	├─ middleware/        # Reserved for shared Gin middleware
	├─ models/            # BSON/JSON models with validation tags
	├─ routes/            # Route grouping (reserved)
	└─ utils/             # Shared utilities such as JWT helpers
```

## Backend features

- REST API built with `gin-gonic` exposing movie discovery and user flows.
- MongoDB integration with connection helpers that read `MONGODB_URI` and `DATABASE_NAME` from `.env`.
- Request validation via `go-playground/validator` to enforce schema rules on movies and users.
- Secure password hashing with `bcrypt` before persisting user records.
- Seed JSON collections to bootstrap development data, including genres, movies, and user profiles.

## Prerequisites

- Go 1.25 or newer (per `server/go.mod`).
- MongoDB instance (local Docker container, Atlas cluster, etc.).
- PowerShell or a Unix-like shell for running the setup commands below.

## Getting started

1. **Clone the repository**

   ```powershell
   git clone https://github.com/ChannMyaeAung/streamly.git
   cd streamly/server
   ```

2. **Provide environment variables**
   Create `server/.env` with at least:

   ```env
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=streamly
   ```

   Adjust the URI and database name for your environment. The backend loads these values on startup.

3. **Install dependencies**

   ```powershell
   go mod tidy
   ```

4. **Run the API**
   ```powershell
   go run main.go
   ```
   The server listens on `http://localhost:8080` by default.

## Seeding development data

The `seed-data/` directory contains JSON exports you can import into MongoDB for quick testing. For example, using `mongoimport`:

```powershell
mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection movies --file ..\seed-data\movies.json --jsonArray
mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection users --file ..\seed-data\users.json --jsonArray
```

Repeat for `genres.json` and `rankings.json` if needed. Ensure the target database matches `DATABASE_NAME` in `.env`.

## API reference

| Method | Endpoint          | Description                                |
| ------ | ----------------- | ------------------------------------------ |
| GET    | `/hello`          | Health check that returns a welcome string |
| GET    | `/movies`         | Fetch all movies from the catalog          |
| GET    | `/movie/:imdb_id` | Retrieve a single movie by IMDb identifier |
| POST   | `/addmovie`       | Create a new movie (validated payload)     |
| POST   | `/register`       | Register a new user with hashed password   |
