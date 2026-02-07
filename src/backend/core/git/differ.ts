import { createAnthropic } from '@ai-sdk/anthropic';
import pc from 'picocolors';
import { getChangedFiles, getFileDiff, getFullDiff, packChangedFiles, summariseFileDiff } from '../../../llm/diff-summary';
import { generateText } from 'ai';

type Deps = {
    repoDir: string;
    file?: string;
    commit1: string;
    commit2: string;
};
export const createDiffer = ({ repoDir, file, commit1, commit2 }: Deps) => {
    const summarize = async () => {
        const apiKey = process.env.ANTHROPIC_API_KEY
        const model = 'claude-opus-4-6'

        try {
            console.log(pc.bold(pc.cyan('\n╔══════════════════════════════════════╗')));
            console.log(pc.bold(pc.cyan('║   Git Diff → LLM Summary             ║')));
            console.log(pc.bold(pc.cyan('╚══════════════════════════════════════╝\n')));

            console.log(pc.dim(`Commits    : ${commit1} → ${commit2}`));
            console.log(pc.dim(`Mode       : ${file ? `single file (${file})` : 'overall summary'}`));
            console.log(pc.dim(`Model      : ${model}\n`));

            const anthropic = createAnthropic({ apiKey });

            if (file) {
                // ── Single-file mode ────────────────────────────────────────────────
                console.log(pc.bold(`▸ Generating summary for ${file}…\n`));

                const diff = await getFileDiff(repoDir, commit1, commit2, file);
                if (!diff) {
                    console.log(pc.yellow('  No diff content – file may be binary, unchanged, or not part of this diff.'));
                    process.exit(0);
                }

                // Pack context for just this file
                console.log(pc.bold('▸ Packing repository context with repomix…'));
                const repoContext = await packChangedFiles(repoDir, [file]);
                if (repoContext) {
                    console.log(pc.green(`  Context packed (${(repoContext.length / 1024).toFixed(1)} KB)\n`));
                } else {
                    console.log(pc.dim('  (skipped)\n'));
                }

                console.log(pc.bold(pc.underline(pc.blue(`── ${file} ──`))));

                try {
                    const summary = await summariseFileDiff(anthropic, model, file, diff, repoContext);
                    console.log(summary);
                } catch (err) {
                    console.error(pc.red(`  Error summarising ${file}: ${(err as Error).message}`));
                }
            } else {
                // ── Overall summary mode (default) ──────────────────────────────────
                console.log(pc.bold('▸ Fetching changed files…'));
                const changedFiles = await getChangedFiles(repoDir, commit1, commit2);
                if (changedFiles.length === 0) {
                    console.log(pc.yellow('No files changed between the two commits.'));
                    process.exit(0);
                }

                const diffStat = await getFullDiff(repoDir, commit1, commit2);
                console.log(pc.dim(diffStat));
                console.log(pc.green(`  ${changedFiles.length} file(s) changed\n`));

                console.log(pc.bold(pc.underline(pc.magenta('── Overall Summary ──'))));

                const fullDiff = await Bun.$`git -C ${repoDir} diff ${commit1}..${commit2}`.text();

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
            }

            console.log(pc.bold(pc.cyan('\n✓ Done.\n')));
        } catch (err) {
            console.log('error summarizing');
        }
    }

    return summarize();
};