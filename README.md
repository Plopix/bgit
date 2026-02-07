# bgit

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Diff Summarizer

A CLI tool that generates LLM-powered summaries of git diffs. It compares two commits in any repository, packs file context with [repomix](https://github.com/yamadashy/repomix), and produces per-file and overall summaries using Claude.

### Usage

```bash
bun src/llm/diff-summary.ts <commit1> <commit2> --repo <url-or-path> --api-key <key> [--model <model>]
```

### Arguments

| Argument | Required | Description |
|---|---|---|
| `<commit1>` | Yes | The starting commit hash (or ref) |
| `<commit2>` | Yes | The ending commit hash (or ref) |
| `--repo <url-or-path>` | Yes | A public git URL or a local path to a repository |
| `--api-key <key>` | Yes* | Anthropic API key (*can also be set via `ANTHROPIC_API_KEY` env var) |
| `--model <model>` | No | Claude model to use (default: `claude-opus-4-6`) |

### Examples

Summarise changes between two commits in a public GitHub repo:

```bash
bun src/llm/diff-summary.ts abc1234 def5678 \
  --repo https://github.com/koajs/koa \
  --api-key sk-ant-...
```

Use a local repository and an env var for the API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
bun src/llm/diff-summary.ts HEAD~5 HEAD --repo ./my-project
```

Use a specific model:

```bash
bun src/llm/diff-summary.ts v1.0 v2.0 \
  --repo git@github.com:user/repo.git \
  --api-key sk-ant-... \
  --model claude-sonnet-4-20250514
```

### How it works

1. **Resolves the repository** — clones remote URLs into a temp directory (cleaned up automatically), or uses local paths directly.
2. **Lists changed files** between the two commits via `git diff --name-only`.
3. **Packs file context** using repomix for richer LLM understanding.
4. **Generates per-file summaries** — each changed file's diff is sent to Claude with the surrounding repo context.
5. **Generates an overall summary** — a high-level 3–5 bullet-point summary of all changes.

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
