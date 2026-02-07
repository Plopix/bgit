#!/usr/bin/env bun
/**
 * diff-summary.ts
 *
 * CLI utility that computes a git diff between two commit hashes for a given
 * repository, packs changed-file context via repomix, and produces a detailed
 * per-file LLM summary using Claude (via the Vercel AI SDK).
 *
 * Usage:
 *   bun src/llm/diff-summary.ts <commit1> <commit2> --api-key <ANTHROPIC_API_KEY>
 *
 * The repository analysed is the `example-repo` directory next to this file.
 */

import { resolve, dirname } from 'node:path';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { runCli, type CliOptions } from 'repomix';
import pc from 'picocolors';

// ── Helpers ──────────────────────────────────────────────────────────────────

const REPO_DIR = resolve(dirname(import.meta.filename), 'example-repo');

interface ParsedArgs {
  commit1: string;
  commit2: string;
  apiKey: string;
  model: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let apiKey = '';
  let model = 'claude-opus-4-6';

  // Extract --api-key and --model flags
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--api-key' && args[i + 1]) {
      apiKey = args[++i]!;
    } else if (arg === '--model' && args[i + 1]) {
      model = args[++i]!;
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  const commit1 = positional[0];
  const commit2 = positional[1];

  if (!commit1 || !commit2) {
    console.error(
      pc.red('Usage: bun src/llm/diff-summary.ts <commit1> <commit2> --api-key <key> [--model <model>]'),
    );
    process.exit(1);
  }

  // Fall back to env var
  if (!apiKey) {
    apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
  }
  if (!apiKey) {
    console.error(pc.red('Error: Provide a Claude API key via --api-key or ANTHROPIC_API_KEY env var.'));
    process.exit(1);
  }

  return { commit1, commit2, apiKey, model };
}

// ── Git helpers (using Bun.$) ────────────────────────────────────────────────

/** Return the list of files changed between two commits. */
async function getChangedFiles(commit1: string, commit2: string): Promise<string[]> {
  const result =
    await Bun.$`git -C ${REPO_DIR} diff --name-only ${commit1}..${commit2}`.text();
  return result
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

/** Return the unified diff for a single file between two commits. */
async function getFileDiff(commit1: string, commit2: string, filePath: string): Promise<string> {
  const result =
    await Bun.$`git -C ${REPO_DIR} diff ${commit1}..${commit2} -- ${filePath}`.text();
  return result.trim();
}

/** Return the full diff (all files) between two commits. */
async function getFullDiff(commit1: string, commit2: string): Promise<string> {
  const result =
    await Bun.$`git -C ${REPO_DIR} diff --stat ${commit1}..${commit2}`.text();
  return result.trim();
}

// ── Repomix context ──────────────────────────────────────────────────────────

/**
 * Use repomix to pack the changed files into an AI-friendly XML blob.
 * We ask repomix to write to stdout so we can capture the output.
 */
async function packChangedFiles(changedFiles: string[]): Promise<string> {
  const includeGlob = changedFiles.join(',');
  const outputPath = resolve(REPO_DIR, '.repomix-diff-output.xml');

  const options: CliOptions = {
    output: outputPath,
    style: 'xml',
    compress: true,
    include: includeGlob,
    quiet: true,
    securityCheck: false,
    fileSummary: false,
    directoryStructure: false,
  };

  try {
    await runCli(['.'], REPO_DIR, options);
    const outputFile = Bun.file(outputPath);
    const content = await outputFile.text();
    // Clean up temp file
    await Bun.$`rm -f ${outputPath}`.quiet();
    return content;
  } catch (err) {
    console.warn(pc.yellow('⚠ Repomix packing skipped (non-fatal):'), (err as Error).message);
    return '';
  }
}

// ── LLM summarisation ────────────────────────────────────────────────────────

async function summariseFileDiff(
  anthropic: ReturnType<typeof createAnthropic>,
  model: string,
  filePath: string,
  diff: string,
  repoContext: string,
): Promise<string> {
  const systemPrompt = `You are a senior software engineer reviewing a code diff.
Provide a clear, detailed summary of the changes made to the file.
Focus on:
- What was changed and why it likely was changed
- Impact on functionality / behaviour
- Any potential issues or improvements

Be concise but thorough. Use bullet points. Do NOT repeat the raw diff back.`;

  const userPrompt = [
    `## File: ${filePath}`,
    '',
    '### Diff',
    '```diff',
    diff,
    '```',
    repoContext
      ? `\n### Repository context (packed by repomix, may help understand surrounding code)\n\n${repoContext.slice(0, 12_000)}`
      : '',
  ].join('\n');

  const { text } = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return text;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { commit1, commit2, apiKey, model } = parseArgs();

  console.log(pc.bold(pc.cyan('\n╔══════════════════════════════════════╗')));
  console.log(pc.bold(pc.cyan('║   Git Diff → LLM Summary             ║')));
  console.log(pc.bold(pc.cyan('╚══════════════════════════════════════╝\n')));

  console.log(pc.dim(`Repository : ${REPO_DIR}`));
  console.log(pc.dim(`Commits    : ${commit1} → ${commit2}`));
  console.log(pc.dim(`Model      : ${model}\n`));

  // 1. List changed files
  console.log(pc.bold('▸ Fetching changed files…'));
  const changedFiles = await getChangedFiles(commit1, commit2);
  if (changedFiles.length === 0) {
    console.log(pc.yellow('No files changed between the two commits.'));
    process.exit(0);
  }

  const diffStat = await getFullDiff(commit1, commit2);
  console.log(pc.dim(diffStat));
  console.log(pc.green(`  ${changedFiles.length} file(s) changed\n`));

  // 2. Pack repo context with repomix
  console.log(pc.bold('▸ Packing repository context with repomix…'));
  const repoContext = await packChangedFiles(changedFiles);
  if (repoContext) {
    console.log(pc.green(`  Context packed (${(repoContext.length / 1024).toFixed(1)} KB)\n`));
  } else {
    console.log(pc.dim('  (skipped)\n'));
  }

  // 3. Summarise each file
  const anthropic = createAnthropic({ apiKey });

  console.log(pc.bold('▸ Generating per-file summaries…\n'));

  for (const file of changedFiles) {
    console.log(pc.bold(pc.underline(pc.blue(`── ${file} ──`))));

    const diff = await getFileDiff(commit1, commit2, file);
    if (!diff) {
      console.log(pc.dim('  (no diff content – file may be binary or unchanged)\n'));
      continue;
    }

    try {
      const summary = await summariseFileDiff(anthropic, model, file, diff, repoContext);
      console.log(summary);
    } catch (err) {
      console.error(pc.red(`  Error summarising ${file}: ${(err as Error).message}`));
    }

    console.log(''); // blank line between files
  }

  // 4. Generate an overall summary
  console.log(pc.bold(pc.underline(pc.magenta('── Overall Summary ──'))));

  const fullDiff = await Bun.$`git -C ${REPO_DIR} diff ${commit1}..${commit2}`.text();

  try {
    const { text: overallSummary } = await generateText({
      model: anthropic(model),
      system: `You are a senior software engineer. Summarise the overall set of changes across all files in this diff in 3-5 bullet points. Be high-level and focus on the intent and impact of the changes as a whole.`,
      prompt: `Here is the complete diff between commits ${commit1} and ${commit2}:\n\n\`\`\`diff\n${fullDiff.slice(0, 30_000)}\n\`\`\``,
    });

    console.log(overallSummary);
  } catch (err) {
    console.error(pc.red(`  Error generating overall summary: ${(err as Error).message}`));
  }

  console.log(pc.bold(pc.cyan('\n✓ Done.\n')));
}

main().catch((err) => {
  console.error(pc.red(`Fatal: ${err.message}`));
  process.exit(1);
});
