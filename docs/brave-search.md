---
summary: "Brave Search API setup for web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search"
---

# Brave Search API

Moltbot uses Brave Search as the default provider for `web_search`.

## Get an API key

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
1) Create a Brave Search API account at https://brave.com/search/api/
2) In the dashboard, choose the **Data for Search** plan and generate an API key.
3) Store the key in config (recommended) or set `BRAVE_API_KEY` in the Gateway environment.
=======
1. Create a Brave Search API account at [https://brave.com/search/api/](https://brave.com/search/api/)
=======
1. Create a Brave Search API account at https://brave.com/search/api/
>>>>>>> 0a1f4f666 (revert(docs): undo markdownlint autofix churn)
=======
1. Create a Brave Search API account at [https://brave.com/search/api/](https://brave.com/search/api/)
>>>>>>> 578a6e27a (Docs: enable markdownlint autofixables except list numbering (#10476))
2. In the dashboard, choose the **Data for Search** plan and generate an API key.
3. Store the key in config (recommended) or set `BRAVE_API_KEY` in the Gateway environment.
>>>>>>> c7aec0660 (docs(markdownlint): enable autofixable rules and normalize links)

## Config example

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
        timeoutSeconds: 30
      }
    }
  }
}
```

## Notes

- The Data for AI plan is **not** compatible with `web_search`.
- Brave provides a free tier plus paid plans; check the Brave API portal for current limits.

See [Web tools](/tools/web) for the full web_search configuration.
