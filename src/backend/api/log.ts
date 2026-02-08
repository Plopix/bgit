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
        // we may want to extract that into a service.
        const output =
            await Bun.$`git log --all --pretty=format:'{"hash":"%H","parents":"%P","author":"%an","date":"%ad","message":"%s"}'`.quiet();
        // provide correct header as JSON ND
        return c.text(output.text());
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

        console.log('diff not found in store, generating summary');

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
