# CA-03 Submission: Full-Stack Web Application

| | |
| --- | --- |
| **Project** | Human Atlas Learning Studio |
| **Student** | Adhyayan Sonare |
| **PRN** | 25070521186 |
| **Institute** | Symbiosis Institute of Technology, Nagpur |
| **Assessment** | Continuous Assessment 03: Full-stack web application |
| **Repository** | https://github.com/AdhyayanSonare/human-atlas-learning-studio-ca |
| **Stack** | React 19 (Vite) · Node.js + Express 5 · MongoDB (Mongoose) · JWT + bcrypt · PubMed API |

## Evaluation accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator (Adhyayan Sonare) | `admin@humanatlas.test` | `Admin@Atlas2026` |
| Student (Riya Sharma) | `riya.sharma@humanatlas.test` | `Student@Atlas2026` |

Both are created automatically on first start, with bcrypt-hashed passwords, and sign in through the normal login form.

## 1. Problem and objective

Anatomy students learn hundreds of named structures, but textbooks show them flat and notes end up scattered. The objective was to build a web application where a student can explore a real 3D model of the human body, save the structures they are studying, keep personal notes on them and look up published research. Every user's data is stored privately in MongoDB.

## 2. Requirement checklist

| CA requirement | How it is met | Where |
| --- | --- | --- |
| Frontend in HTML, CSS, JavaScript and React | React 19 with React Router 7, TypeScript/JSX, CSS (Tailwind 4 plus hand-written styles), GSAP animation, built with Vite | `client/` |
| Backend in Node.js | Express 5 REST API | `server/src/` |
| Database inspectable in MongoDB Compass | MongoDB via Mongoose: `users`, `savedStructures`, `studyNotes` in database `human_atlas_studio` | `server/src/models/` |
| Frontend and backend integration | The React app calls `/api/*` (Vite proxy in development; Express serves the build in single-server mode). All data shown in Study Space comes from MongoDB | `client/app/site/api.ts` |
| Authentication | Registration, login, logout and session check. Passwords hashed with bcrypt (12 rounds). JWT kept in an HttpOnly, SameSite=Lax cookie. Protected routes on both client and server | `server/src/routes/auth.js`, `client/app/site/auth.tsx` |
| Role-based access | Student and admin roles; `/app/admin` and `/api/admin/*` return 403 for students | `server/src/routes/admin.js`, `client/app/site/pages/Admin.tsx` |
| Login page and hero page | `/login`, `/register` and an animated landing hero | `client/app/site/pages/` |
| Additional meaningful pages | Interactive 3D Atlas, Systems directory, Study Space dashboard, About | see section 3 |
| External API integration | NCBI PubMed E-utilities: "Related research" for any structure, called from the server with timeout, cache and throttling | `server/src/services/pubmed.js` |
| CRUD operations | Saved structures: create, read, delete. Notes: create, read, update, delete | `server/src/routes/` |
| Responsive design | Tested at 1440, 1280, 1024, 390 and 360 px widths | screenshots below |

## 3. Pages

| Route | Page | What it does |
| --- | --- | --- |
| `/` | Landing (hero) | Animated anatomy plate: layers swap with a scan line, an X-ray lens shows the skeleton under the cursor, and labels open structures in the atlas. Scroll-driven explode sequence, count-up figures, system marquees and a timeline that draws itself |
| `/login` | Sign in | Validation, error messages, loading state, redirect back to the requested page |
| `/register` | Create account | Display name, email, password and confirmation; duplicate emails are rejected |
| `/app/atlas` | 3D Atlas (protected) | 2,234 selectable parts, 15 systems, search, isolate, explode, plus Save, Note and Research actions |
| `/app/systems` | Systems (protected) | Filterable directory of the 15 systems with live part counts and links into the atlas |
| `/app/study-space` | Study Space (protected) | Saved structures, notes (create, edit, delete), filter notes by structure, statistics from the user's data |
| `/app/profile` | Profile (protected) | Avatar, role, activity, edit display name, change password (current password required) |
| `/app/admin` | Admin (admins only) | Live totals, most-saved structures, searchable user table, delete a user and their data |
| `/about` | About | Technology, attribution and a clear split between reused and newly built work |

![Landing](screenshots/landing.webp)
![Explode scene](screenshots/landing-explode.webp)
![Atlas with study actions](screenshots/atlas-study-actions.webp)
![Study Space](screenshots/study-space.webp)
![Systems](screenshots/systems.webp)
![Admin](screenshots/admin.webp)
![Profile](screenshots/profile.webp)

## 4. Database design (MongoDB Compass)

Database: `human_atlas_studio`

```
users             { _id, displayName, email (unique, lowercase), passwordHash (bcrypt), createdAt, updatedAt }
savedStructures   { _id, user → users._id, structureId, name, system, pieces, createdAt }   unique index (user, structureId)
studyNotes        { _id, user → users._id, structureId, structureName, content, createdAt, updatedAt }
```

To demonstrate this in Compass: register, save a structure, add a note, then refresh the three collections. The password field shows a bcrypt hash such as `$2b$12$…`, never the plain password.

## 5. REST API

| Method | Endpoint | Protected | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | | API and database status |
| POST | `/api/auth/register` | | Create an account |
| POST | `/api/auth/login` | | Sign in |
| POST | `/api/auth/logout` | | Sign out |
| GET | `/api/auth/me` | ✓ | Current user |
| GET / POST | `/api/saved-structures` | ✓ | List or save structures |
| DELETE | `/api/saved-structures/:id` | ✓ | Remove a saved structure |
| GET / POST | `/api/notes` | ✓ | List or create notes |
| PATCH / DELETE | `/api/notes/:id` | ✓ | Edit or delete a note |
| GET | `/api/research?term=` | ✓ | Up to five PubMed articles |
| PATCH | `/api/auth/me` | ✓ | Update display name |
| POST | `/api/auth/password` | ✓ | Change password |
| GET | `/api/admin/stats`, `/api/admin/users` | Admin | Dashboard data |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user and their data |

Security: the user id always comes from the verified cookie, never from the request body. Every query filters by `{ _id, user }`, so one user cannot read, edit or delete another user's records (tested). Sign-in and research are rate-limited, and every input is validated.

## 6. Testing

| Check | Result |
| --- | --- |
| `npm test`: 12 API integration tests against a real MongoDB-protocol server (registration, hashing, duplicate email, login/logout, protected routes, duplicate save, notes CRUD, cross-user isolation, PubMed, evaluation accounts, admin roles, profile and password change) | 12 / 12 pass |
| Browser end-to-end: register → atlas deep link → save → note → research → Study Space → refresh persists → edit → create → delete → logout → protected redirect | Pass |
| Upstream model validation (`validate-atlas.mjs`, `validate-interactions.mjs`) | Pass |
| TypeScript check and production build | Pass |
| Live PubMed response format checked against `eutils.ncbi.nlm.nih.gov` | Matches parser |

## 7. Reused work and attribution

The 3D viewer (Three.js renderer, anatomy model, system toggles, search, isolation and exploded view) is the open-source **Human Atlas** project by ashemag, released under the MIT licence. Its code was reused, not rewritten. The anatomy data is **BodyParts3D**, © The Database Center for Life Science, released under CC BY 4.0. The first commit in the repository is the unmodified upstream import, so every later commit shows exactly what was added for this CA.

Built for this CA: the landing page and all of its animation, routing, the authentication pages, Systems, Study Space, About, the study actions inside the atlas, the whole Express/MongoDB backend, the PubMed integration, the tests and the documentation.

## 8. How to run

```sh
# macOS one-click: double-click start-mac.command
# or manually:
npm run install:all
cp server/.env.example server/.env      # set MONGODB_URI and JWT_SECRET
npm run dev:server                       # http://localhost:5050
npm run dev:client                       # http://localhost:3016
```

## 9. Future scope

Spaced-repetition quizzes generated from saved structures, shared study groups, and deployment with a managed MongoDB Atlas cluster.
