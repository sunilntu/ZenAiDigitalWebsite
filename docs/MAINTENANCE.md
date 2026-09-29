# Maintenance workflow

## Normal publishing process

Use GitHub Desktop as the bridge between your local Windows working copy and GitHub.com:

1. Pull the latest `main` branch in GitHub Desktop.
2. Edit the relevant structured content file under `src/content/`.
3. Run `npm run build`.
4. Review the changed pages locally when practical.
5. Commit with a clear message, for example `Publish AI governance insight`.
6. Push origin to GitHub.com.
7. Cloudflare automatically builds/deploys the connected `main` branch.

## Navigation tabs

Edit `src/content/site.json` -> `nav`.

- `enabled: true` shows a tab.
- `enabled: false` hides it.
- `order` controls sequence.
- `label` changes the visible wording.

## Capability programs / courses

Edit `src/content/courses.json`.

- `draft`: not public
- `published`: public
- `archived`: retained in source but not public

Use `order` and `featured` to manage emphasis. Prefer archiving to deletion when preserving history matters.

## Solutions

Edit `src/content/solutions.json`.

## Assessments and tools

Edit `src/content/tools.json`. The 10-domain capability model lives in `src/content/capability-domains.json` and should be changed deliberately because it represents core intellectual-property content.

## Insights

Edit `src/content/insights.json`. A published record generates an article page and is included in the sitemap and RSS feed.

## Founder/research links

Edit `src/content/site.json` -> `founder.links`. Keep claims tied to original evidence sources. Avoid copying volatile citation, follower or view counts into static pages unless you intend to maintain them.

## Design

Edit `static/assets/css/site.css`. Replace the logo by replacing `static/assets/brand/logo.svg` and `icon.svg` while keeping those filenames.

## Behaviour-driven changes

Use analytics and user feedback to test whether visitors are reaching the right solution, assessment, capability program and contact path. Change navigation or homepage prominence when repeated evidence supports it; do not redesign from isolated visits.

The homepage deliberately combines conventional navigation with intent-led choices so the information architecture can evolve as visitor behaviour becomes clearer.
