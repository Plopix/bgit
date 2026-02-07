import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { createAnthropic } from '@ai-sdk/anthropic';

// ── Mock the `ai` module so no real LLM call is made ─────────────────────────

const generateTextMock = mock(async () => ({ text: 'mocked summary' }));

mock.module('ai', () => ({
  generateText: generateTextMock,
}));

// Import *after* the mock is registered so the module picks up our stub.
const { summariseFileDiff } = await import('./diff-summary.ts');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fake Anthropic provider (the function just needs to be callable). */
function fakeAnthropic() {
  const provider = ((modelId: string) => ({ modelId })) as unknown as ReturnType<
    typeof createAnthropic
  >;
  return provider;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('summariseFileDiff', () => {
  beforeEach(() => {
    generateTextMock.mockClear();
    generateTextMock.mockResolvedValue({ text: 'mocked summary' } as never);
  });

  it('returns the text produced by generateText', async () => {
    const result = await summariseFileDiff(
      fakeAnthropic(),
      'claude-opus-4-6',
      'src/index.ts',
      '- old\n+ new',
      '',
    );

    expect(result).toBe('mocked summary');
  });

  it('calls generateText with the correct model', async () => {
    await summariseFileDiff(
      fakeAnthropic(),
      'claude-opus-4-6',
      'src/index.ts',
      '- old\n+ new',
      '',
    );

    expect(generateTextMock).toHaveBeenCalledTimes(1);

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    // The model is constructed via `anthropic(model)` – our fake returns { modelId }
    expect(call.model).toEqual({ modelId: 'claude-opus-4-6' });
  });

  it('includes the file path in the user prompt', async () => {
    await summariseFileDiff(
      fakeAnthropic(),
      'claude-opus-4-6',
      'lib/utils/helpers.ts',
      '+ added line',
      '',
    );

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    const prompt = call.prompt as string;

    expect(prompt).toContain('## File: lib/utils/helpers.ts');
  });

  it('includes the diff in a fenced code block', async () => {
    const diff = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
- const x = 1;
+ const x = 2;`;

    await summariseFileDiff(fakeAnthropic(), 'claude-opus-4-6', 'file.ts', diff, '');

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    const prompt = call.prompt as string;

    expect(prompt).toContain('```diff');
    expect(prompt).toContain(diff);
    expect(prompt).toContain('```');
  });

  it('includes a system prompt about code review', async () => {
    await summariseFileDiff(
      fakeAnthropic(),
      'claude-opus-4-6',
      'a.ts',
      '+ line',
      '',
    );

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    const system = call.system as string;

    expect(system).toContain('senior software engineer');
    expect(system).toContain('code diff');
  });

  it('appends repo context (truncated to 12 000 chars) when provided', async () => {
    const longContext = 'x'.repeat(15_000);

    await summariseFileDiff(
      fakeAnthropic(),
      'claude-opus-4-6',
      'a.ts',
      '+ line',
      longContext,
    );

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    const prompt = call.prompt as string;

    expect(prompt).toContain('Repository context');
    // Must be truncated to 12 000 chars, so the full 15 000-char string must not appear.
    expect(prompt).not.toContain(longContext);
    expect(prompt).toContain('x'.repeat(12_000));
  });

  it('omits the repo context section when repoContext is empty', async () => {
    await summariseFileDiff(
      fakeAnthropic(),
      'claude-opus-4-6',
      'a.ts',
      '+ line',
      '',
    );

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    const prompt = call.prompt as string;

    expect(prompt).not.toContain('Repository context');
  });

  it('propagates errors from generateText', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('API rate limit') as never);

    await expect(
      summariseFileDiff(fakeAnthropic(), 'claude-opus-4-6', 'a.ts', '+ x', ''),
    ).rejects.toThrow('API rate limit');
  });

  it('works with a different model name', async () => {
    await summariseFileDiff(
      fakeAnthropic(),
      'claude-sonnet-4-20250514',
      'b.ts',
      '+ y',
      '',
    );

    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.model).toEqual({ modelId: 'claude-sonnet-4-20250514' });
  });
});
