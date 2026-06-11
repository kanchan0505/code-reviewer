# AI Code Reviewer (ReviewBot)

An intelligent automated code review system that integrates with GitHub to analyze pull request changes using AI and post inline review comments.

## Architecture

```
PR opened/synchronized
       │
       ▼
 GitHub Webhook (with signature verification & deduplication)
       │
       ▼
 processPR() ──► check rate limits ──► fetch PR files via App installation token
       │
       ▼
 parseDiff() ──► extract added lines and ±8 lines of context
       │
       ▼
 reviewCode() ──► Groq (Llama 3.3 70B) structured JSON review
       │
       ▼
 postGitHubReview() ──► format & post inline review comments on GitHub
       │
       ▼
 store Review + Issues in PostgreSQL (Prisma)
```

## Features

- **GitHub App integration** — authenticates natively via App installation tokens. No Personal Access Tokens (PATs) required.
- **Webhook signature verification** — verifies payload hashes using `timingSafeEqual` and raw body text to secure endpoints.
- **Idempotency** — dedupes events using `x-github-delivery` delivery headers.
- **Rate limiting** — restricts reviews to a maximum of 10 reviews per hour per installation to control resource use.
- **Robust error logs** — catches and logs process errors to the dashboard and posts helpful feedback to GitHub PRs.
- **Contextual code reviews** — diff parser extracts added lines with ±8 lines of surrounding context for the LLM.
- **Structured inline comments** — reviews are categorized by severity levels: Bug 🐛, Warning ⚠️, and Suggestion 💡.
- **Review dashboard** — tracks reviews, repository connections, bugs caught, and lists recent activity with status badges.
- **Detailed review page** — groups identified issues by file with line highlights and suggestions.

## Tech Stack

- **Framework:** Next.js 16.2.7 (App Router)
- **Language:** React 19.2.4
- **AI:** Groq SDK — `llama-3.3-70b-versatile`
- **Database ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** NextAuth.js (GitHub OAuth + GitHub App tokens)
- **UI:** Tailwind CSS + Radix UI (shadcn/ui)
- **Client:** jsonwebtoken (GitHub App JWT signing)

## Prerequisites

- Node.js >= 18
- PostgreSQL database instance
- A [GitHub App](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app) configured with:
  - **Permissions:** Pull requests (Read & Write), Commit statuses (Read), Contents (Read & Write), Metadata (Read)
  - **Events:** Pull request, Push, Installation
- A [Groq API key](https://console.groq.com/keys)

## Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repo-url>
   cd ai-code-reviewer
   npm install
   ```

2. **Configure Environment Variables:**
   Copy the `.env.example` file to `.env` and fill in the details:
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database Schema:**
   Apply database migrations:
   ```bash
   npx prisma migrate dev
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Local Development with GitHub Webhooks

To test webhooks locally, you must expose your local dev server via a tunnel:

1. **Start ngrok:**
   ```bash
   npx ngrok http 3000
   ```

2. **Configure Webhook URL in GitHub App:**
   Set the Webhook URL in your GitHub App settings to:
   ```
   https://<your-ngrok-subdomain>.ngrok-free.app/api/webhook/github
   ```
   Ensure you set the Webhook Secret matching `GITHUB_WEBHOOK_SECRET` in your `.env`.

## Project Structure

```
app/
  api/
    apply-fix/route.js             — API to commit AI-suggested code fixes to GitHub
    auth/[...nextauth]/route.js    — NextAuth GitHub OAuth handler
    webhook/github/route.js        — GitHub webhook receiver (PR and Push events)
  dashboard/
    commits/                       — Commits review view grouped by repo
    page.js                        — User review dashboard (recent PR reviews)
  review/
    [id]/page.js                   — Detailed view of a single review grouped by files
  page.js                          — Redesigned landing page

lib/
  db.js                            — Prisma client singleton
  github.js                        — GitHub App JWT, installation tokens, PR file fetch, review posting
  parseDiff.js                     — Unified diff parser, extracts added lines + context
  aiReview.js                      — Groq LLM code review logic

prisma/
  schema.prisma                    — User, Installation, Review, Issue models
```

## License

MIT
