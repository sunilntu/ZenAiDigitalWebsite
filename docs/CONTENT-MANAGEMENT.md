# ZenAI Digital V2 — Content Management

The site is intentionally configuration-driven so routine changes do not require editing page HTML.

## Navigation tabs
Edit `src/content/site.json` → `nav`.

Each item has:
- `label` — text shown in the menu
- `href` — destination
- `order` — display order
- `enabled` — `true` shows it; `false` hides it

Run `npm run build` after a change.

## Courses / capability programs
Edit `src/content/courses.json`.

Lifecycle values:
- `draft` — retained in the repository but not published
- `published` — public and included in sitemap/schema
- `archived` — retained for history but not published

Use `featured` and `order` to control emphasis and sequence. Add a new JSON record to create a new public page when its lifecycle is `published`. Change the record to update it. Use `archived` rather than deleting a record when you want to preserve history.

## Solutions
Edit `src/content/solutions.json`.

## Assessments and tools
Edit `src/content/tools.json`. The interactive capability self-check is generated from `src/content/capability-domains.json`.

## Capability domains
Edit `src/content/capability-domains.json` only when the underlying model changes. This is intellectual-property content and should be versioned deliberately.

## Insights
Edit `src/content/insights.json`. Each record generates an indexable article page, RSS entry and sitemap URL.

## Founder / research source links
Edit `src/content/site.json` → `founder.links`. Prefer original source records (UTS, Google Scholar, publisher, official profile) over copied claims. Do not hard-code changing citation counts, follower counts or other volatile metrics unless there is a process to keep them current.

## Recommended publishing workflow
1. Edit locally.
2. Run `npm run build`.
3. Review locally with `npm run dev` if Wrangler is installed.
4. Commit in GitHub Desktop.
5. Push to GitHub.com.
6. Cloudflare automatically builds/deploys from the connected repository.
