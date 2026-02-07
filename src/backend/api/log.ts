import { Hono } from 'hono';

export const createLogApi = () => {
    const app = new Hono();

    app.get('/log', async (c) => {
        const output =
            await Bun.$`git log --all --pretty=format:'{"hash":"%H","parents":"%P","author":"%an","date":"%ad","message":"%s"}'`;
        // provide correct header as JSON ND
        return c.text(output.text());
    });

    app.get('/summary-diff', async (c) => {
        const { from, to } = await c.req.json();
        const summary = `calling the function with ${from} and ${to}`;
        return c.json({
            summary,
        });
    });

    return app;
};
