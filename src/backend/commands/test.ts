import { Command } from 'commander';
import type { Logger } from '../contracts/logger';

type Deps = {
    logger: Logger;
};

export const createTestCommand = ({ logger }: Deps) => {
    const command = new Command('test');
    command.description('Test stuff');
    command.action(async () => {
        logger.info('test');
    });
    return command;
};
