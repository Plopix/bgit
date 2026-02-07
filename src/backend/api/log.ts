import { Hono } from 'hono';

export const createLogApi = () => {
    const app = new Hono();

    app.get('/log', (c) => {
        return c.text('Hello, World!');
    });

    return app;
};
