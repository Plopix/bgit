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
        const testStore = storage('test');
        await testStore.set('1', 'test 1');
        console.log('1', await testStore.get('1'));
        await testStore.set('2', 'test 2');
        console.log('2', await testStore.get('2'));

        await testStore.delete('1');
        console.log('1', await testStore.get('1'));
        console.log('2', await testStore.get('2'));

        await testStore.clear();
        console.log('1', await testStore.get('1'));
        console.log('2', await testStore.get('2'));

        const otherStore = storage('other');
        await otherStore.set('1', 'other 1');
        console.log('1', await otherStore.get('1'));
        await otherStore.set('2', 'other 2');
        console.log('2', await otherStore.get('2'));

        logger.info('test');
    });

    return command;
};
