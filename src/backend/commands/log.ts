import { Command } from 'commander';
import { createLogApi } from '../api/log';
import { serve } from 'bun';
import pc from 'picocolors';
import log from '../../ui/pages/log/index.html';
import type { Logger } from '../contracts/logger';
import type { createDiffer } from '../core/git/differ';
import type { createStorage } from '../core/storage';
import { openBrowser } from '../core/functions/open-browser';

type Deps = {
    logger: Logger;
    differ: ReturnType<typeof createDiffer>;
    storage: ReturnType<typeof createStorage>;
};
export const createLogCommand = ({ logger, differ, storage }: Deps) => {
    const command = new Command('log');
    command.description('todo');

    command.action(async () => {
        return new Promise<void>((resolve, reject) => {
            try {
                const app = createLogApi({
                    logger,
                    differ,
                    storage,
                });
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
                    logger.debug('Shutting down server...');
                    server.stop();
                    resolve();
                });
                process.on('SIGTERM', () => {
                    logger.debug('Shutting down server...');
                    server.stop();
                    resolve();
                });

                logger.debug(`Server is listening on ${pc.bold(pc.yellow(server.url.toString()))}`);
                openBrowser(server.url.toString());
            } catch (error) {
                reject(error);
            }
        });
    });
    return command;
};
