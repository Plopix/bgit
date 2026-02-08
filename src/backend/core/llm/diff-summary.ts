import { resolve } from 'node:path';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { runCli, type CliOptions } from 'repomix';
import pc from 'picocolors';

/** Return the list of files changed between two commits. */
export async function getChangedFiles(repoDir: string, commit1: string, commit2: string): Promise<string[]> {
    const result = await Bun.$`git -C ${repoDir} diff --name-only ${commit1}..${commit2}`.text();
    return result
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
}

/** Return the unified diff for a single file between two commits. */
export async function getFileDiff(
    repoDir: string,
    commit1: string,
    commit2: string,
    filePath: string,
): Promise<string> {
    const result = await Bun.$`git -C ${repoDir} diff ${commit1}..${commit2} -- ${filePath}`.text();
    return result.trim();
}

/** Return the full diff (all files) between two commits. */
export async function getFullDiff(repoDir: string, commit1: string, commit2: string): Promise<string> {
    const result = await Bun.$`git -C ${repoDir} diff --stat ${commit1}..${commit2}`.text();
    return result.trim();
}

// ── Repomix context ──────────────────────────────────────────────────────────

/**
 * Use repomix to pack the changed files into an AI-friendly XML blob.
 * We ask repomix to write to stdout so we can capture the output.
 */
export async function packChangedFiles(repoDir: string, changedFiles: string[]): Promise<string> {
    const includeGlob = changedFiles.join(',');
    const outputPath = resolve(repoDir, '.repomix-diff-output.xml');

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
        await runCli(['.'], repoDir, options);
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

export async function summariseFileDiff(
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
