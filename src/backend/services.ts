import { homedir } from 'os';
import { createLogger } from './core/logger';
import { createRunner } from './core/runner';
import { createStorage } from './core/storage';
import { createDiffer } from './core/git/differ';

export const buildServices = ({ logLevels }: { logLevels: ('info' | 'debug')[] }) => {
    const homeDir = homedir();
    const logger = createLogger('bgit', logLevels);
    const runner = createRunner();
    const storage = createStorage({ logger, homeDir });
    const differ = createDiffer({ logger });

    return {
        logger,
        runner,
        storage,
        differ,
    };
};
