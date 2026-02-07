import { createAnthropic } from '@ai-sdk/anthropic';
import pc from 'picocolors';
import {
    getChangedFiles,
    getFileDiff,
    getFullDiff,
    packChangedFiles,
    summariseFileDiff,
} from '../../../llm/diff-summary';
import { generateText } from 'ai';
import type { Logger } from '../../contracts/logger';

type Deps = {
    logger: Logger;
};

export const createDiffer = ({ logger }: Deps) => {
    const repoDir = process.cwd();

    type Args = {
        file?: string;
        commit1: string;
        commit2: string;
    };
    const summarize = async ({ file, commit1, commit2 }: Args) => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const model = 'claude-opus-4-6';

        try {
            logger.debug(pc.bold(pc.cyan('\n╔══════════════════════════════════════╗')));
            logger.debug(pc.bold(pc.cyan('║   Git Diff → LLM Summary             ║')));
            logger.debug(pc.bold(pc.cyan('╚══════════════════════════════════════╝\n')));

            logger.debug(pc.dim(`Commits    : ${commit1} → ${commit2}`));
            logger.debug(pc.dim(`Mode       : ${file ? `single file (${file})` : 'overall summary'}`));
            logger.debug(pc.dim(`Model      : ${model}\n`));

            const anthropic = createAnthropic({ apiKey });

            if (file) {
                // ── Single-file mode ────────────────────────────────────────────────
                logger.debug(pc.bold(`▸ Generating summary for ${file}…\n`));

                const diff = await getFileDiff(repoDir, commit1, commit2, file);
                if (!diff) {
                    logger.debug(
                        pc.yellow('  No diff content – file may be binary, unchanged, or not part of this diff.'),
                    );
                    process.exit(0);
                }

                // Pack context for just this file
                logger.debug(pc.bold('▸ Packing repository context with repomix…'));
                const repoContext = await packChangedFiles(repoDir, [file]);
                if (repoContext) {
                    logger.debug(pc.green(`  Context packed (${(repoContext.length / 1024).toFixed(1)} KB)\n`));
                } else {
                    logger.debug(pc.dim('  (skipped)\n'));
                }

                logger.debug(pc.bold(pc.underline(pc.blue(`── ${file} ──`))));

                try {
                    const summary = await summariseFileDiff(anthropic, model, file, diff, repoContext);
                    logger.debug(summary);
                } catch (err) {
                    console.error(pc.red(`  Error summarising ${file}: ${(err as Error).message}`));
                }
            } else {
                // ── Overall summary mode (default) ──────────────────────────────────
                logger.debug(pc.bold('▸ Fetching changed files…'));
                const changedFiles = await getChangedFiles(repoDir, commit1, commit2);
                if (changedFiles.length === 0) {
                    logger.debug(pc.yellow('No files changed between the two commits.'));
                    process.exit(0);
                }

                const diffStat = await getFullDiff(repoDir, commit1, commit2);
                logger.debug(pc.dim(diffStat));
                logger.debug(pc.green(`  ${changedFiles.length} file(s) changed\n`));

                logger.debug(pc.bold(pc.underline(pc.magenta('── Overall Summary ──'))));

                const fullDiff = await Bun.$`git -C ${repoDir} diff ${commit1}..${commit2}`.text();

                try {
                    const { text: overallSummary } = await generateText({
                        model: anthropic(model),
                        system: `You are a senior software engineer. Summarise the overall set of changes across all files in this diff in 3-5 bullet points. Be high-level and focus on the intent and impact of the changes as a whole.`,
                        prompt: `Here is the complete diff between commits ${commit1} and ${commit2}:\n\n\`\`\`diff\n${fullDiff.slice(0, 30_000)}\n\`\`\``,
                    });

                    logger.debug(overallSummary);

                    return overallSummary;
                } catch (err) {
                    console.error(pc.red(`  Error generating overall summary: ${(err as Error).message}`));
                }
            }

            logger.debug(pc.bold(pc.cyan('\n✓ Done.\n')));
        } catch (err) {
            logger.debug('error summarizing');
        }
    };

    return summarize;
};
