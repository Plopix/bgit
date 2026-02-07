import { Command } from 'commander';
import { createLogApi } from '../api/log';
import { serve } from 'bun';
import pc from 'picocolors';
import log from '../../ui/pages/log/index.html';
import type { Logger } from '../contracts/logger';

type Deps = {
    logger: Logger;
};
export const createLogCommand = ({ logger }: Deps) => {
    const command = new Command('log');
    command.description('todo');

    command.action(async () => {
        return new Promise<void>((resolve, reject) => {
            try {
                const app = createLogApi();
                const server = serve({
                    idleTimeout: 255,
                    port: Bun.env.PORT || 2424,
                    routes: {
                        '/': log,
                    },
                    fetch: app.fetch,
                    development: {
                        hmr: true,
                        console: true,
                    },
                });
                process.on('SIGINT', () => {
                    logger.info('Shutting down server...');
                    server.stop();
                    resolve();
                });
                process.on('SIGTERM', () => {
                    logger.info('Shutting down server...');
                    server.stop();
                    resolve();
                });

                logger.info(`Server is listening on ${pc.bold(pc.yellow(server.url.toString()))}`);
                // openBrowser(server.url.toString());
            } catch (error) {
                reject(error);
            }
        });
    });
    return command;
};
