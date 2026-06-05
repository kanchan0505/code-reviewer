# AI Code Reviewer

An intelligent automated code review system that integrates with GitHub to analyze pull request changes using AI and post inline review comments.

## Architecture

```
PR opened/synchronized
       │
       ▼
 GitHub Webhook
       │
       ▼
 processPR() ──► fetch PR files via GitHub App installation token
       │
       ▼
 parseDiff() ──► extract added lines per file
       │
       ▼
 reviewCode() ──► Groq (Llama 3.3 70B) code review
       │
       ▼
 postGitHubReview() ──► inline comments on PR
       │
       ▼
 store Review + Issues in PostgreSQL (Prisma)
```

## Features

- **GitHub App integration** — authenticates via JWT and installation tokens; no PAT required
- **Webhook-driven** — reviews PRs automatically on `opened` and `synchronize` events
- **AI-powered reviews** — uses Llama 3.3 70B via Groq to identify bugs, warnings, and suggestions
- **Inline PR comments** — posts specific, line-level review comments on GitHub
- **Review dashboard** — tracks total reviews, issues found, and bugs caught per user
- **Persistent storage** — all reviews and issues are stored in PostgreSQL via Prisma

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** React 19
- **AI:** Groq SDK — `llama-3.3-70b-versatile`
- **Database ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (GitHub OAuth + GitHub App tokens)
- **UI:** Tailwind CSS + shadcn/ui (Radix UI)
- **Client:** jsonwebtoken (GitHub App JWT signing)

## Prerequisites

- Node.js >= 18
- PostgreSQL
- A [GitHub App](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app) with:
  - **Permissions:** Pull requests (Read & Write), Commit statuses (Read), Contents (Read), Metadata (Read)
  - **Events:** Pull request, Installation
- A [Groq API key](https://console.groq.com/keys)
- A GitHub Personal Access Token (PAT) with `repo` scope (used as fallback for posting reviews)

## Setup

```bash
git clone <repo-url>
cd ai-code-reviewer
npm install
```

### Database

```bash
npx prisma migrate dev --name init
```

### Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_code_reviewer

GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY_BASE64=base64_encoded_app_private_key
GITHUB_PAT=your_github_personal_access_token

GROQ_API_KEY=your_groq_api_key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

AUTH_SECRET=your_auth_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret
AUTH_GROQ_API_KEY=your_app_owner_groq_key
```

### Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project Structure

```
app/
  api/
    auth/[...nextauth]/route.js    — NextAuth GitHub OAuth handler
    webhook/github/route.js        — GitHub webhook receiver (PR events)
  dashboard/page.js                — User review dashboard
  page.js                          — Landing page

lib/
  db.js                            — Prisma client singleton
  github.js                        — GitHub App JWT, installation tokens, PR file fetch, review posting
  parseDiff.js                     — Unified diff parser, extracts added lines
  aiReview.js                      — Groq LLM code review logic
  postReview.js                    — Post review comments to GitHub via PAT

prisma/
  schema.prisma                    — User, Installation, Review, Issue models
```

## Deployment

- Deploy to any Node.js host (Vercel, Railway, Render, Fly.io)
- Ensure `NEXTAUTH_URL` points to your production domain
- Configure GitHub App webhooks to point to `https://your-app.com/api/webhook/github`
- Expose via tunnel (e.g., ngrok) during local development:

```bash
npx ngrok http 3000
```

## License

MIT
