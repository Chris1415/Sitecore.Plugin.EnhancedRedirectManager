# `.claude/` — Claude Code resources for the Redirect Manager repo

This folder is auto-discovered when you open Claude Code at the product root (`products/redirect-manager/`). Anything under `commands/` becomes an available **slash command**; anything written under `*.log` is gitignored (see `.gitignore` at the product root).

## Slash commands

### [`/sync-redirect-proxy`](commands/sync-redirect-proxy.md)

Resync the local `proxy-simulator.ts` with upstream Sitecore Content SDK `RedirectsProxy` after a drift signal from the in-app banner. **Use when** the Test tab's drift banner reads *"Upstream RedirectsProxy has changed since this simulator was ported"*.

See [README.md → Dev-time tools](../README.md#dev-time-tools) for the full step-by-step + design rationale.

## Audit log

`sync-redirect-proxy.log` is **gitignored** — each `/sync-redirect-proxy` run appends a one-line entry locally (`<timestamp> | in-sync | proposed-and-accepted | proposed-and-declined | tests-failed`) so engineers can see what happened on their own machine without leaking dev-time metadata into the repo.

## Adding new slash commands

Drop a procedural Markdown file in `commands/<name>.md`. Claude Code reads it as a prompt and executes its steps using its standard tools (Read, Edit, Bash, WebFetch, etc.). No build step, no registration — opening Claude Code in this product root surfaces the new `/<name>` command immediately.

If a slash command must NOT be committed (e.g. it embeds tenant-specific values), gitignore it explicitly in the product root `.gitignore` with a leading `.claude/commands/<name>.md` entry.
