# SEO and AI-search discovery

The starter is designed to be easy for conventional search engines and AI-search crawlers to understand.

## Included automatically

- static HTML for every core page
- one descriptive `<title>` and meta description per page
- canonical URL on every page
- Open Graph / social metadata
- descriptive heading hierarchy and internal links
- Schema.org structured data
- XML sitemap
- RSS feed
- robots.txt
- `llms.txt` as an additional machine-readable site guide

`llms.txt` is an emerging convention, not a guaranteed ranking mechanism. Standard crawlability, useful content, strong internal links, structured data and authoritative references remain more important.

## OpenAI search visibility

The generated robots file explicitly allows `OAI-SearchBot`, which OpenAI documents as the crawler used to surface websites in ChatGPT search results. It separately disallows `GPTBot`, which is a different control for model-training crawling. You can change either decision independently.

## Google

After the final domain is live:

1. Verify the domain in Google Search Console.
2. Submit `/sitemap.xml`.
3. Test important pages with Google's Rich Results / structured data tools.
4. Keep Organization, Service, Article and Course markup consistent with visible page content.
5. Add credible author/profile information as the Insights section grows.

## Bing and IndexNow

Verify the domain in Bing Webmaster Tools and submit the sitemap. For frequent publishing, consider IndexNow so participating search engines can be notified of changed URLs quickly. Add IndexNow only after the domain and publishing workflow are stable.

## AI search and answer engines

To improve the chance that AI tools can cite the site accurately:

- publish specific, original answers instead of generic marketing copy
- use clear definitions, headings and dated articles
- expose stable canonical URLs
- make diagrams or frameworks understandable in surrounding text
- name the organisation consistently
- provide an About page and transparent contact information
- keep course/tool status accurate (for example, `Coming soon`)
- avoid important information that exists only inside images or client-rendered widgets

## Custom domain first

`static/_headers` applies `noindex` to `workers.dev` hostnames. This avoids duplicate indexing when a custom domain is the intended public identity. Remove that rule only if workers.dev will be permanent.
