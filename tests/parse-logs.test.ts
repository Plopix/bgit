import { describe, it, expect } from 'bun:test';
import { parseNdjson } from '@/ui/lib/parse-logs';

describe('parseNdjson', () => {
    it('parses valid ndjson', async () => {
        const text = await Bun.file('./tests/logs.ndjson').text();
        const commits = parseNdjson(text);
        expect(commits).toHaveLength(9211);
    });
});
