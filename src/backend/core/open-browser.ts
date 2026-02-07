import { exec } from 'node:child_process';

export const openBrowser = (url: string) => {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    const command = process.platform === 'win32' ? `${start} "" "${url}"` : `${start} "${url}"`;
    exec(command);
};
