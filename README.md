# LIGHT-TIME console

These are the screens for LIGHT-TIME: the crew console on the ship and the flight surgeon's console on Earth. LIGHT-TIME is crew health monitoring that knows how far away Earth is. It tells the crew how long a falling reading has left and who has to act, the flight surgeon on Earth or the crew medical officer on board. It was built for the NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

- Live demo: https://lighttime.health
- The backend, the ship's computer and the delayed link to Earth: https://github.com/NASA-space-apps-the-procrastinators/LightTime-backend
- The concept, with the math explained step by step: [docs/concept.pdf](docs/concept.pdf)
- The research paper (draft): [docs/paper.pdf](docs/paper.pdf)

## What is on screen

`/base-station` is the crew console. It shows each crew member scored against their own baseline, the cabin (carbon dioxide, oxygen, pressure, temperature, radiation and space weather), alerts with their checklists, the daily check-in, the health log and messages to Earth. A dial sets how far the ship is from Earth (the space station, the Moon, Mars, or behind the Sun with no link), and every screen follows it.

`/command-center` is the Earth console. It shows only what the delayed link has delivered, how old each message is, and the earliest a reply can reach the ship. At Mars on our mission date that is 11 minutes each way.

The Start story button in the crew console opens a short click-through tour of the screens that ends with a live emergency at Mars distance. The crew's vital signs in the demo are simulated, and the screens label them.

## Run it locally

You need Node 22 and pnpm 10 (corepack provides it).

```bash
corepack enable
pnpm install
pnpm dev
```

Open http://localhost:3000. To connect to the backend, run it first (see its README) and put `NEXT_PUBLIC_API_URL=http://localhost:5000` in `.env.local`. Without that setting the console makes no calls and runs on its own seed data in `src/data`.

| Command | What it does |
|---|---|
| `pnpm lint` | Biome checks for lint and formatting |
| `pnpm typecheck` | TypeScript, with Next.js route types |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm e2e` | Browser tests (Playwright) |
| `pnpm build` | Production build |

## Run with Docker

```bash
docker build -t light-time-frontend .
docker run --rm -p 8080:8080 light-time-frontend
```

The app starts at http://localhost:8080. The image reads the backend address at build time from the `NEXT_PUBLIC_API_URL` build argument, which defaults to `https://lighttime.health`; pass `--build-arg NEXT_PUBLIC_API_URL=...` to point it elsewhere.

## Deploy to Google Cloud Run

Cloud Run sets the `PORT` environment variable at runtime. The image defaults to port 8080, binds to all interfaces and runs as a non-root user. Deploy from the repository with Cloud Build:

```bash
gcloud run deploy light-time-frontend \
  --source . \
  --region REGION \
  --allow-unauthenticated
```

Replace `REGION` with the Cloud Run region to use. The command builds from the repository's `Dockerfile`, and Cloud Run routes traffic to the container's port. On the live site an HTTPS load balancer sends `/api/*` to the backend and everything else to this app.

## Code organisation

| Path | What it holds |
|---|---|
| `src/app/` | The routes: `base-station` (crew, alerts, log) and `command-center` |
| `src/components/base-station/` | The crew console's components |
| `src/components/command-center/` | The Earth console's components |
| `src/components/shared/` and `src/components/ui/` | Parts both consoles use, including the Start story tour |
| `src/lib/` | The API client (`ship-api.ts`, which checks every answer from the server with zod), scoring, formatting and the mission store |
| `src/data/` | Seed data and thresholds used when no backend is set |
| `public/` | Icons and images |
| `docs/` | The concept and the paper as PDFs, and the build log |

## Known gaps

The backend can shape each answer by who is looking, named in the `X-LightTime-Viewer` header, but this console does not send that header yet, so every screen gets the medical station's full view. The backend's [security and privacy page](https://github.com/NASA-space-apps-the-procrastinators/LightTime-backend/blob/main/docs/tech/security-privacy.md) lists every gap.

## AI use

AI assistants helped write the code and the documents. The working plans are in [docs/build-log](docs/build-log/), and the backend keeps a dated log of every use in its `AI_USE.md`. `AGENTS.md` holds the instructions Next.js writes for coding assistants; `next dev` adds it back if it is removed. The app itself calls no AI model.

## Licence

No licence file has been added yet. The team has to choose one before the repository is made public; until then the code is all rights reserved.
