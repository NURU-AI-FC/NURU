# Contributing

1. Comment on your issue so it can be assigned to you.
2. Create a branch from the latest `main`: `git checkout main && git pull && git checkout -b <your-name>/<issue-number>`.
3. Change only the files your issue lists (see [docs/TEAM.md](docs/TEAM.md)). If you need to touch anything else, ask on the issue first.
4. Commit small pieces with your own name and email. Do not add AI co-author lines, `Claude-Session` lines or "Generated with" footers; CI rejects them.
5. Before pushing, run `git pull --rebase origin main` so your branch is up to date.
6. Open a pull request with `Closes #<issue>` in the description and fill in the checklist.

A pull request is merged only when every CI check is green, the branch is up to date with `main`,
and @Bolajiomo99 has approved it.

## Running locally

```
docker compose up --build
```

Open http://localhost:3000 and sign in with judge@nuru.app / Zecathon-2026, code 000000.
