// import { homedir } from 'os';
import { createLogger } from './core/logger';
import { createRunner } from './core/runner';

export const buildServices = ({ logLevels }: { logLevels: ('info' | 'debug')[] }) => {
    // const homeDir = homedir();
    const logger = createLogger('bgit', logLevels);
    const runner = createRunner();
    return {
        logger,
        runner,
    };
};
