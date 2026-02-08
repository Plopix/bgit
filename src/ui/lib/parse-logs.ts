import type { CommitInput } from '../components/git-log-input';

export function parseNdjson(text: string): CommitInput[] {
    const commits: CommitInput[] = [];
    const lines = text
        .trim()
        .split('\n')
        .filter((line) => line.trim());
    for (const line of lines) {
        const c = JSON.parse(line);
        if (!c.hash || !c.author || !c.date || !c.message) {
            throw new Error('Each commit must have hash, author, date, and message fields.');
        }
        commits.push({
            hash: c.hash,
            parents: c.parents ?? '',
            author: c.author,
            date: c.date,
            message: c.message,
        });
    }
    return commits;
}
