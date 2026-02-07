import { Command } from 'commander';
import type { Logger } from '../contracts/logger';
import type { createStorage } from '../core/storage';

type Deps = {
    logger: Logger;
    storage: ReturnType<typeof createStorage>;
};

export const createTestCommand = ({ logger, storage }: Deps) => {
    const command = new Command('test');
    command.description('Test stuff');
    command.action(async () => {
        await storage.set('1', 'test 1');
        console.log('1', await storage.get('1'));
        await storage.set('2', 'test 2');
        console.log('2', await storage.get('2'));

        await storage.delete('1');
        console.log('1', await storage.get('1'));
        console.log('2', await storage.get('2'));

        await storage.clear();
        console.log('1', await storage.get('1'));
        console.log('2', await storage.get('2'));

        logger.info('test');
    });

    return command;
};
