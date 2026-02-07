// import { homedir } from 'os';
import { createLogger } from './core/logger';

export const buildServices = ({ logLevels }: { logLevels: ('info' | 'debug')[] }) => {
    // const homeDir = homedir();
    const logger = createLogger('bgit', logLevels);

    return {
        logger,
    };
};
