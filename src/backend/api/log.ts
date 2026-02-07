import { Hono } from 'hono';
import { createDiffer } from '../core/git/differ';
import type { Logger } from '../contracts/logger';

type Deps = {
    logger: Logger;
    differ: ReturnType<typeof createDiffer>;
};
export const createLogApi = ({ logger, differ }: Deps) => {
    const app = new Hono();

    app.get('/log', async (c) => {
        // we may want to extract that into a service.
        const output =
            await Bun.$`git log --all --pretty=format:'{"hash":"%H","parents":"%P","author":"%an","date":"%ad","message":"%s"}'`.quiet();
        // provide correct header as JSON ND
        return c.text(output.text());
    });

    app.post('/summary-diff', async (c) => {
        const { from, to } = await c.req.json();
        // const summary = await differ.summaryDiff(from, to);
        const repoDir = process.cwd()

        const summary = await createDiffer({
            repoDir,
            commit1: from,
            commit2: to,
        });

        return c.json({
            summary,
        });
    });

    return app;
};
