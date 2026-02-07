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

A CLI tool that generates LLM-powered summaries of git diffs using Claude. It compares two commits in any repository and produces either a high-level overall summary (default) or a detailed single-file summary.

### Usage

```bash
# Overall summary (default)
bun src/llm/diff-summary.ts <commit1> <commit2> --repo <url-or-path> --api-key <key>

# Single-file summary
bun src/llm/diff-summary.ts <commit1> <commit2> --repo <url-or-path> --api-key <key> --file <path>
```

### Arguments

| Argument | Required | Description |
|---|---|---|
| `<commit1>` | Yes | The starting commit hash (or ref) |
| `<commit2>` | Yes | The ending commit hash (or ref) |
| `--repo <url-or-path>` | Yes | A public git URL or a local path to a repository |
| `--api-key <key>` | Yes* | Anthropic API key (*can also be set via `ANTHROPIC_API_KEY` env var) |
| `--file <path>` | No | Path to a single file to summarise (relative to the repo root). When omitted, an overall summary is generated instead. |
| `--model <model>` | No | Claude model to use (default: `claude-opus-4-6`) |

### Examples

Get an overall summary of changes between two commits:

```bash
bun src/llm/diff-summary.ts abc1234 def5678 \
  --repo https://github.com/koajs/koa \
  --api-key sk-ant-...
```

Summarise a single file's changes:

```bash
bun src/llm/diff-summary.ts abc1234 def5678 \
  --repo https://github.com/koajs/koa \
  --api-key sk-ant-... \
  --file lib/application.js
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
3. **Generates a summary** — either:
   - **Overall (default):** a high-level 3–5 bullet-point summary of all changes.
   - **Single file (`--file`):** a detailed summary for the specified file, with surrounding repo context packed via [repomix](https://github.com/yamadashy/repomix).

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
