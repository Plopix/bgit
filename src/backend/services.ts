import { homedir } from 'os';
import { createLogger } from './core/logger';
import { createRunner } from './core/runner';
import { createStorage } from './core/storage';

export const buildServices = ({ logLevels }: { logLevels: ('info' | 'debug')[] }) => {
    const homeDir = homedir();
    const logger = createLogger('bgit', logLevels);
    const runner = createRunner();
    const storage = createStorage({ logger, homeDir });

    return {
        logger,
        runner,
        storage,
    };
};
