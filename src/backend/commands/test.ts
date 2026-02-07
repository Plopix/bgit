import { Command } from 'commander';


export const createTestCommand = () => {
    const command = new Command('test');
    command.description('Test stuff');
    command.action(async () => {
        console.log('test');
    });
    return command;
};
