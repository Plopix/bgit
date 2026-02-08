import { Hono } from 'hono';
import { createDiffer } from '../core/git/differ';
import type { Logger } from '../contracts/logger';
import type { createStorage } from '../core/storage';

type Deps = {
    logger: Logger;
    differ: ReturnType<typeof createDiffer>;
    storage: ReturnType<typeof createStorage>;
};
export const createLogApi = ({ logger, differ, storage }: Deps) => {
    const app = new Hono();
    const commitDiffStore = storage('commit-diffs');

    app.get('/api/log', async (c) => {
        // Use a hidden character as a separator to avoid issues with JSON parsing of the message
        const output = await Bun.$`git log -n 1000 --pretty=format:'%H%x1f%P%x1f%an%x1f%ad%x1f%s'`.quiet();

        const text = output.text();
        const lines = text.split('\n').filter((line) => line.trim());

        const jsonLines = lines.map((line) => {
            const [hash, parents, author, date, message] = line.split('\x1f');
            return JSON.stringify({ hash, parents, author, date, message });
        });

        // provide correct header as JSON ND
        return c.text(jsonLines.join('\n'));
    });

    app.post('/api/summary-diff', async (c) => {
        const { from, to } = await c.req.json();

        const hashes = [from, to].sort() as [string, string];

        const key = hashes.join('|');
        const commits = await commitDiffStore.get(key);

        if (commits) {
            console.log('diff found in store, returning cached summary');

            return c.json({
                summary: commits,
            });
        }

        logger.debug('diff not found in store, generating summary');

        const summary = await differ({
            commit1: hashes[0],
            commit2: hashes[1],
        });

        await commitDiffStore.set(key, summary);

        return c.json({
            summary,
        });
    });

    return app;
};
