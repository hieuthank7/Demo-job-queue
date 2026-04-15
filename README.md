# Demo Job Queue

A hands-on learning project to master job queues — from building a MySQL-based queue from scratch, to migrating to production-grade BullMQ (Redis).

Built as a 10-level roadmap split into 2 phases:
- **Phase 1 (Levels 1-5):** Build MySQL Queue from zero
- **Phase 2 (Levels 6-10):** Migrate to BullMQ + advanced features

## Tech Stack

- **Node.js + TypeScript**
- **Express** — API framework
- **MySQL** — business data (users table)
- **Redis** — BullMQ backend
- **BullMQ** — production queue engine
- **Bull Board** — queue dashboard UI

## Project Structure

```
demo-job-queue/
├── server.ts               # API server entry
├── worker.ts               # Worker process entry
├── schema.sql              # MySQL schema
├── src/
│   ├── api/                # Express API
│   │   ├── app.ts
│   │   └── features/
│   │       ├── auth/       # Register, OTP, reminder, test endpoints
│   │       └── admin/      # Dead jobs, queue stats
│   ├── shared/
│   │   ├── database.ts     # MySQL connection pool
│   │   ├── redis.ts        # Redis connection
│   │   └── queue/
│   │       └── bullmq-queue.ts  # Queue layer (add jobs, flows, schedules)
│   └── workers/
│       ├── bullmq-worker.ts     # Worker factory
│       ├── scheduler.ts         # Repeatable jobs registration
│       └── features/
│           ├── email/           # Email job handler
│           ├── image/           # Image processing handler
│           ├── report/          # Report generation handler
│           └── user/            # User-related handler (for flow demo)
```

## Learning Roadmap

### Phase 1 — MySQL Queue (tag: `v1-mysql-queue`)

Built from scratch to deeply understand how queues work internally.

| Level | Topic | Key Concepts |
|-------|-------|--------------|
| 1 | Basic Queue | `jobs` table, add/claim/complete, `FOR UPDATE SKIP LOCKED` |
| 2 | Retry & Dead Letter | Exponential backoff, max_attempts, dead status |
| 3 | Priority & Delayed | Priority ordering, `scheduled_at` column |
| 4 | Concurrency | Multiple jobs in parallel per worker (`activeCount`) |
| 5 | Multi-Queue & Resilience | Separate queues, graceful shutdown, stale job detection |

**Result:** ~400 lines of hand-written code covering everything a production queue needs.

### Phase 2 — BullMQ (tag: `v2-bullmq`)

Migrated to BullMQ for real production use.

| Level | Topic | Key Concepts |
|-------|-------|--------------|
| 6 | Migrate to BullMQ | Replace `mysql-queue.ts` → `bullmq-queue.ts`, ~300 lines → ~70 lines |
| 7 | Bull Board Dashboard | Visual queue monitoring at `/admin/queues` |
| 8 | Progress & Events | `job.updateProgress()`, `QueueEvents` for real-time tracking |
| 9 | Flows & Dependencies | `FlowProducer`, parent/child jobs, `getChildrenValues()` |
| 10 | Repeatable Jobs | Cron patterns, `every` interval, persistent schedules in Redis |

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+ running on `localhost:3306`
- Redis running on `localhost:6379`

Quick start Redis with Docker:
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=demo_job_queue
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

# Create database and tables
mysql -u root < schema.sql
```

### Running

Open 2 terminals:

```bash
# Terminal 1 — API server
npm run dev

# Terminal 2 — Worker process
npm run worker
```

- API: http://localhost:3000
- Bull Board dashboard: http://localhost:3000/admin/queues

## API Endpoints

### Auth / Job creation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user → queue welcome email |
| POST | `/api/auth/test-fail-job` | Create a failing job to test retry |
| POST | `/api/auth/send-otp` | Create URGENT priority OTP job |
| POST | `/api/auth/send-reminder` | Create delayed job (10s) |
| POST | `/api/auth/test-image-job` | Create image resize job |
| POST | `/api/auth/test-report-job` | Create report generation job |
| POST | `/api/auth/register-flow` | Create a flow (save_user + resize_avatar → send_welcome) |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dead-jobs` | List all failed jobs |
| POST | `/api/admin/dead-jobs/:id/retry?queue=email` | Retry a failed job |
| GET | `/api/admin/queues/stats` | Get job counts per queue |

## Queue Types

- **`email`** — welcome emails, OTP, reminders (concurrency: 3)
- **`image`** — avatar resize, image compression (concurrency: 2)
- **`report`** — revenue reports, user activity (concurrency: 1)
- **`user`** — user data operations (used in flow demo, concurrency: 2)

## Repeatable Jobs

Registered automatically when worker starts (see `src/workers/scheduler.ts`):

- `daily_revenue` — every 10 seconds (demo; production would be `0 8 * * *`)
- `user_activity` — every 20 seconds (demo; production would be `0 */6 * * *`)

## Key Learnings

- **When to use a queue:** Decouple slow/unreliable work (emails, image processing, reports) from the HTTP request cycle
- **MySQL Queue vs Redis Queue:** MySQL works for low throughput (<500 jobs/s), Redis scales to 10,000+ jobs/s via blocking reads
- **Retry strategy:** Exponential backoff prevents thundering herd on transient failures
- **Dead letter queue:** Failed jobs after max retries are kept for manual inspection, not dropped
- **Priority & delay:** Built into the database schema, no extra infrastructure needed
- **Graceful shutdown:** Always wait for in-flight jobs before exiting
- **Flows > manual chaining:** Use `FlowProducer` when jobs depend on each other
- **Repeatable jobs > node-cron:** Persistent schedules survive restarts, no duplicate execution across multiple servers

## License

MIT
