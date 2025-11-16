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
├─ client/         # Next.js 14 app (App Router, shadcn/ui, client auth context)
├─ seed-data/      # JSON datasets for movies, users, rankings, genres
└─ server/         # Go backend (Gin, MongoDB, LangChainGo integration point)
   ├─ controllers/ # HTTP handlers for movies and users
   ├─ database/    # Connection helpers reading .env configuration
   ├─ middleware/  # JWT auth middleware
   ├─ models/      # BSON/JSON schema definitions with validation tags
   ├─ routes/      # Public vs protected route registration
   └─ utils/       # Shared helpers (JWT, token rotation, etc.)
```

## Backend capabilities

- **Authentication & session management** using bcrypt-hashed passwords, JWT access/refresh tokens, and secure HTTP-only cookies.
- **Movie catalog APIs** to list, fetch, create, update, and delete titles with caching (Redis) to minimise database pressure.
- **AI-assisted admin tooling**: LangChainGo + OpenAI classify admin reviews and assign rankings automatically.
- **Personalised recommendations** driven by stored favourite genres and cached per-user results.
- **Data validation** via `go-playground/validator` to enforce schema rules on incoming payloads.
- **Seed data** for instant local bootstrapping of movies, genres, rankings, and users.

## Technology stack

| Layer                  | Technologies                                    | Notes                                                  |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Client                 | Next.js 14, TypeScript, shadcn/ui, react-player | Responsive App Router experience with protected routes |
| API & Services         | Go, gin-gonic, Redis, bcrypt, LangChainGo       | REST endpoints, caching, AI orchestration              |
| Data & Persistence     | MongoDB, BSON models                            | Flexible schemas with validation (runtime, ranking)    |
| Email Delivery         | Resend (Nodemailer alt)                         | Admin access requests delivered via serverless route   |
| AI Recommendation Mesh | OpenAI API, LangChain chains                    | Personalized rankings and discovery                    |

## Environment variables

Define these keys in `server/.env` before running the backend:

| Variable                             | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `MONGODB_URI`                        | Connection string for your MongoDB deployment                   |
| `DATABASE_NAME`                      | Database name Streamly targets                                  |
| `SECRET_KEY`                         | HMAC secret for signing 15-minute access tokens                 |
| `SECRET_REFRESH_KEY`                 | Separate HMAC secret for signing 7-day refresh tokens           |
| `BASE_PROMPT_TEMPLATE`               | LangChain/OpenAI template used when scoring admin reviews       |
| `OPENAI_API_KEY`                     | API key used by the LangChainGo OpenAI client                   |
| `RECOMMENDED_MOVIE_LIMIT` (optional) | Max number of personalized results returned                     |
| `ALLOWED_ORIGINS`                    | Comma-separated CORS origins for any future frontend middleware |

Define these keys in `client/.env.local` before running the frontend:

| Variable              | Purpose                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL for the Go API (`http://localhost:8080` during development) |
| `RESEND_API_KEY`      | API key for Resend transactional email delivery                      |
| `RESEND_FROM_EMAIL`   | Verified/sandbox sender used when emailing admin-access requests     |
| `ADMIN_EMAIL`         | Address that receives admin-access request notifications             |

## Backend quick start

1. **Clone the repo**

   ```powershell
   git clone https://github.com/ChannMyaeAung/streamly.git
   cd streamly/server
   ```

2. **Provision environment variables**
   Create `server/.env` with the keys above. Example:

   ```env
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=streamly
   SECRET_KEY=change_me
   SECRET_REFRESH_KEY=change_me_too
   BASE_PROMPT_TEMPLATE=Return a response using one of these words: {rankings}.The response should be a single word and should not contain any other text. The response should be based on the following review: {review}
   OPENAI_API_KEY=sk-...
   RECOMMENDED_MOVIE_LIMIT=12
   ```

3. **Install dependencies**

   ```powershell
   go mod tidy
   ```

4. **Seed data (optional)**

   ```powershell
   $env:MONGODB_URI="mongodb://localhost:27017"
   $env:DATABASE_NAME="streamly"
   mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection movies --file ..\seed-data\movies.json --jsonArray
   mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection users --file ..\seed-data\users.json --jsonArray
   mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection genres --file ..\seed-data\genres.json --jsonArray
   mongoimport --uri "$env:MONGODB_URI" --db $env:DATABASE_NAME --collection rankings --file ..\seed-data\rankings.json --jsonArray
   ```

5. **Run the API**
   ```powershell
   go run main.go
   ```
   The server listens on `http://localhost:8080` and exposes both public and protected routes.

## Backend API surface

Use the `AuthMiddleware`-protected endpoints with the HTTP-only cookies issued during login.

**Public endpoints**

| Method | Route       | Description                                                |
| ------ | ----------- | ---------------------------------------------------------- |
| GET    | `/hello`    | Health probe defined in `main.go`                          |
| GET    | `/movies`   | Return the full movie catalog                              |
| GET    | `/genres`   | List available genres (driven by `models.Genre`)           |
| POST   | `/register` | Register a user; validates payload and hashes the password |
| POST   | `/login`    | Issue access/refresh cookies on successful authentication  |
| POST   | `/logout`   | Clear cookies and invalidate tokens stored in MongoDB      |
| POST   | `/refresh`  | Rotate access/refresh tokens using the refresh cookie      |

**Protected endpoints** (require valid `access_token` cookie)

| Method | Route                    | Description                                                       |
| ------ | ------------------------ | ----------------------------------------------------------------- |
| GET    | `/movie/:imdb_id`        | Fetch a single movie by IMDb identifier                           |
| POST   | `/addmovie`              | Create a movie entry; validates request body before inserting     |
| DELETE | `/movies/:imdb_id`       | Remove an existing movie (admin only, invalidates caches)         |
| GET    | `/recommendedmovies`     | Return personalized picks filtered by the user’s favourite genres |
| PATCH  | `/updatereview/:imdb_id` | Update admin review text and AI-derived ranking for a movie       |

## Auth & session notes

- Tokens are stored in secure, HTTP-only cookies (`access_token`, `refresh_token`) to shield them from XSS.
- Access tokens live for 15 minutes; refresh tokens remain valid for 7 days and are rotated by `/refresh`.
- Token pairs are also cached in MongoDB (`users.token`, `users.refresh_token`) so logout and rotation can revoke them server-side.
- `AuthMiddleware` extracts the bearer token, validates it, and surfaces `userId`/`role` in the Gin context for downstream handlers.
- Admin-only routes (add/update/delete) enforce role checks before mutating data.

## Recommendation & AI workflow

- `AdminReviewUpdate` uses LangChainGo + OpenAI to classify admin-written reviews against values pulled from the `rankings` collection.
- Personalized results returned by `/recommendedmovies` leverage stored favourite genres and sorted ranking metadata to surface the best matches.
- Movie listings and recommendations are cached in both Redis (server) and per-session memory (client) with invalidation triggered on mutations.

## Frontend roadmap

- Admin dashboard for adding movies with runtime + YouTube ID parsing and real-time validation.
- Catalogue search and recommendation search filters powered by client-side memoized results.
- Protected admin delete actions with optimistic UI updates.
- Server Actions / ISR for SEO-friendly catalogue pages (future enhancement).

## Contribution guide

1. Fork the project: `https://github.com/ChannMyaeAung/streamly`.
2. Create a branch (`git checkout -b feature/recommendations`).
3. Add tests or sample JSON updates when introducing new behavior.
4. Submit a pull request describing the change and validation performed.

## License

Streamly is available under the MIT License. Contributions are welcome; feel free to fork and innovate.
