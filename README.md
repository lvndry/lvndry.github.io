# lvndry.github.io

The site at [lvndry.github.io](https://lvndry.github.io/): the products I've shipped, and my GitHub activity, refreshed every hour.

## How it works

`scripts/fetch-data.ts` reads my contribution calendar since 2016, the commits and details of the repos in `site.config.ts`, and writes them to `src/data/activity.json`. Astro builds the page from that file. The dashboard at the top is the only part that needs JavaScript.

The `Site` workflow fetches the data, builds and type-checks on every pull request, and on master it also deploys to GitHub Pages: on every push, every hour, and on demand.

## Run it locally

```sh
bun install
GITHUB_TOKEN=$(gh auth token) bun run fetch-data
bun run dev
```

`bun run build` writes the site to `dist/`, and `bun run check` type-checks it.

## Change what's on the page

- Which repos appear, their colours, logos and descriptions: `REPOS` in `site.config.ts`.
- Which repos are products on the page, in what order: `PRODUCTS` in the same file.
- Logos live in `public/logos/`, screenshots in `public/images/`.
