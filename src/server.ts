#!/usr/bin/env bun --hot

import packageJson from '../package.json';
import { Command } from 'commander';
import pc from 'picocolors';
import { createTestCommand } from './backend/commands/test';
import { createLogCommand } from './backend/commands/log';
import { buildServices } from './backend/services';

const logLevels = (`${Bun.env.LOG_LEVELS}` === 'no-output' ? [] : ['info', ...`${Bun.env.LOG_LEVELS}`.split(',')]) as (
    | 'info'
    | 'debug'
)[];
const services = buildServices({ logLevels });
const { logger } = services;
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
        writeErr: (str) => logger.error(str),
    });
};
genericCommandOption(program);

const commands = [createTestCommand(services), createLogCommand(services)];

commands.forEach((command) => {
    genericCommandOption(command);
    program.addCommand(command);
});

const logMemory = () => {
    const used = process.memoryUsage();
    logger.debug(
        `${pc.bold('Memory usage:')} ${Object.keys(used)
            .map((key) => `${key} ${Math.round((used[key as keyof typeof used] / 1024 / 1024) * 100) / 100} MB`)
            .join(', ')}`,
    );
};

try {
    await program.parseAsync(process.argv);
} catch (exception) {
    logger.flush();
    if (exception instanceof Error) {
        logger.fatal(`[${pc.bold(exception.name)}] ${exception.message} `);
    } else if (typeof exception === 'string') {
        logger.fatal(exception);
    } else if (exception instanceof Object && 'message' in exception) {
        logger.fatal(exception.message);
    } else {
        logger.error(`Unknown error.`);
    }
    logger.debug(exception);
    logMemory();
    process.exit(1);
}
logger.flush();
logMemory();
process.exit(0);
