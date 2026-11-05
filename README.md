Whiplash

> **Letterboxd, but for music.** Rate, review, and discover songs and albums with your friends.

Whiplash is a full-stack social music review platform built with the **MERN stack** (MongoDB, Express, React, Node.js) and powered by the **Spotify Web API** for music data.

---

## ✅ Current Status — Phase 1 Complete

> **Phase 1: Foundation & Data Architecture**
> MongoDB schemas defined · Spotify API config wired · Project scaffold ready

What has been set up in this phase:

- **Project structure** — monorepo-style layout with `server/` and `client/` directories
- **MongoDB Schemas** (in `server/src/models/`) — all five core data models are defined with full validation rules and indexes
- **Spotify API config** (`server/src/config/spotify.js`) — `SpotifyWebApi` instance configured with auto-refreshing client credentials
- **Express server** skeleton with CORS, helmet, morgan, and all route stubs registered
- **React client** scaffolded with React Router v6, Redux Toolkit store, and dark theme base CSS
- **Environment template** (`.env.example`) documenting every required environment variable

---

## 🗂️ Project Structure

```
whiplash/
├── .env.example               # Environment variable template
├── .gitignore
├── package.json               # Root — convenience scripts (concurrently)
│
├── server/                    # Express + MongoDB backend
│   ├── package.json
│   └── src/
│       ├── index.js           # App entry point
│       ├── config/
│       │   ├── db.js          # Mongoose connection
│       │   └── spotify.js     # Spotify Web API client + token refresh
│       ├── models/
│       │   ├── User.model.js      # Users, auth, Spotify OAuth link
│       │   ├── Review.model.js    # Song / album reviews + ratings
│       │   ├── List.model.js      # Curated lists (like Letterboxd lists)
│       │   ├── Follow.model.js    # Social follow graph
│       │   └── Activity.model.js  # Activity feed events
│       └── routes/
│           ├── auth.routes.js
│           ├── user.routes.js
│           ├── review.routes.js
│           ├── music.routes.js
│           └── list.routes.js
│
└── client/                    # React frontend
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js           # React entry + Redux Provider
        ├── index.css          # Global dark-theme base styles
        ├── App.js             # Router setup (stub pages)
        └── store/
            └── store.js       # Redux Toolkit store
```

---

## 📐 Data Models

### `User`
| Field | Type | Notes |
|---|---|---|
| `username` | String | Unique, 3–30 chars, alphanumeric + _ |
| `email` | String | Unique, lowercase |
| `password` | String | bcrypt hashed, never returned in queries |
| `displayName` | String | Defaults to username |
| `avatar` | String | URL |
| `bio` | String | Max 300 chars |
| `followers` / `following` | ObjectId[] | Ref: User |
| `spotifyId` | String | Linked Spotify account |
| `role` | Enum | `user` \| `admin` |

### `Review`
| Field | Type | Notes |
|---|---|---|
| `author` | ObjectId | Ref: User |
| `targetType` | Enum | `track` \| `album` |
| `spotifyId` | String | Spotify track/album ID |
| `rating` | Number | 0.5 – 5.0 in 0.5 steps |
| `body` | String | Up to 5000 chars |
| `likes` | ObjectId[] | Ref: User |
| `listenedAt` | Date | When the user listened |
| Cached: `trackName`, `albumName`, `artistNames`, `coverImage`, `releaseYear` | | Avoids extra Spotify API calls on reads |

### `List`
Curated playlists / ranked lists (similar to Letterboxd lists). Each item has a `position`, `spotifyId`, `targetType`, and an optional per-item `note`.

### `Follow`
Dedicated collection for the follower/following graph with compound unique index `(follower, following)`.

### `Activity`
Polymorphic event log powering the social feed. Types: `review`, `list_created`, `list_liked`, `review_liked`, `follow`.

---

## 🔧 Setup Instructions

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (free tier is fine) **or** local MongoDB
- Spotify Developer account → create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)

### 1. Clone & install dependencies
```bash
git clone <repo-url>
cd whiplash
npm run install:all   # installs root + server + client dependencies
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in your MONGO_URI, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, JWT_SECRET
```

### 3. Run in development mode
```bash
npm run dev           # starts server (port 5000) + client (port 3000) concurrently
```

### 4. Verify the server
```bash
curl http://localhost:5000/api/health
# → { "status": "OK", "message": "Whiplash API is running 🎵" }
```

---

## 🗺️ Development Roadmap

| Phase | Focus | Status |
|---|---|---|
| **Phase 1** | MongoDB schemas + Spotify API credentials + project scaffold | ✅ Done |
| **Phase 2** | Auth — register / login / JWT middleware + Spotify OAuth | 🔲 Up next |
| **Phase 3** | Music search & detail endpoints (Spotify integration) | 🔲 Pending |
| **Phase 4** | Reviews & ratings CRUD + likes | 🔲 Pending |
| **Phase 5** | Lists CRUD | 🔲 Pending |
| **Phase 6** | Social — follow/unfollow + activity feed | 🔲 Pending |
| **Phase 7** | React UI — pages, components, Redux slices | 🔲 Pending |
| **Phase 8** | Polish — infinite scroll, search, recommendations, deploy | 🔲 Pending |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Redux Toolkit, Axios |
| **Backend** | Node.js, Express 4 |
| **Database** | MongoDB Atlas, Mongoose 8 |
| **Music Data** | Spotify Web API (`spotify-web-api-node`) |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Dev Tools** | Nodemon, Concurrently, ESLint |

---

*Built with ❤️ and way too many listens.*
