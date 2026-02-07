#!/usr/bin/env bun --hot

import packageJson from '../package.json';
import { Command } from 'commander';
import pc from 'picocolors';
import { createTestCommand } from './backend/commands/test';
import { createLogCommand } from './backend/commands/log';

// const logLevels = (`${Bun.env.LOG_LEVELS}` === 'no-output' ? [] : ['info', ...`${Bun.env.LOG_LEVELS}`.split(',')]) as (
//     | 'info'
//     | 'debug'
// )[];

const program = new Command();
program.allowExcessArguments(false);
program.allowUnknownOption(false);
program.version(packageJson.version);
program.name('bgit');
const helpStyling = {
    styleTitle: (str: string) => pc.bold(str),
    styleCommandText: (str: string) => pc.cyan(str),
    styleCommandDescription: (str: string) => pc.magenta(str),
    styleDescriptionText: (str: string) => pc.italic(str),
    styleOptionText: (str: string) => pc.green(str),
    styleArgumentText: (str: string) => pc.yellow(str),
    styleSubcommandText: (str: string) => pc.cyan(str),
};

export const logo: string = `BGIT ${pc.italic(pc.yellow(packageJson.version))}`;
console.log(pc.cyanBright(logo));
program.description('todo');

const genericCommandOption = (command: Command) => {
    command.configureHelp(helpStyling);
    command.allowExcessArguments(false);
    command.allowUnknownOption(false);
    command.configureOutput({
        writeErr: (str) => console.error(str),
    });
};
genericCommandOption(program);

const commands = [createTestCommand(), createLogCommand()];


commands.forEach((command) => {
    genericCommandOption(command);
    program.addCommand(command);
});

const logMemory = () => {
    const used = process.memoryUsage();
    console.debug(
        `${pc.bold('Memory usage:')} ${Object.keys(used)
            .map((key) => `${key} ${Math.round((used[key as keyof typeof used] / 1024 / 1024) * 100) / 100} MB`)
            .join(', ')}`,
    );
};

try {
    await program.parseAsync(process.argv);
} catch (exception) {
    // console.flush();
    if (exception instanceof Error) {
        console.error(`[${pc.bold(exception.name)}] ${exception.message} `);
    } else if (typeof exception === 'string') {
        console.error(exception);
    } else if (exception instanceof Object && 'message' in exception) {
        console.error(exception.message);
    } else {
        console.error(`Unknown error.`);
    }
    console.debug(exception);
    logMemory();
    process.exit(1);
}
// console.flush();
logMemory();
process.exit(0);
