'use client';

import { useState } from 'react';
import { Button } from './ui/button';

const PLACEHOLDER = `{"hash":"a0ea5a156ed9a9f8239a7606d84e59e63e97f3ce","parents":"7abf9001ba1b2829c2308e50e5d99b5cd21ceefe","author":"Yon Valencion","date":"Sat Feb 7 11:12:30 2026 -0800","message":"test commit!"}
{"hash":"7abf9001ba1b2829c2308e50e5d99b5cd21ceefe","parents":"","author":"Yon Valencion","date":"Sat Feb 7 11:10:23 2026 -0800","message":"Initial Commit"}`;

export interface CommitInput {
    hash: string;
    parents?: string;
    author: string;
    date: string;
    message: string;
}

interface GitLogInputProps {
    onParse: (commits: CommitInput[]) => void;
}

export function GitLogInput({ onParse }: GitLogInputProps) {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    function handleParse() {
        setError(null);
        try {
            const commits: CommitInput[] = [];

            // Try parsing as JSON array first
            const trimmed = value.trim();
            if (trimmed.startsWith('[')) {
                const parsed = JSON.parse(trimmed);
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                for (const c of arr) {
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
            } else {
                // Parse as NDJSON (newline-delimited JSON)
                const lines = trimmed.split('\n').filter((line) => line.trim());
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
            }

            onParse(commits);
        } catch (e: unknown) {
            if (e instanceof SyntaxError) {
                setError('Invalid JSON. Please check your input and try again.');
            } else if (e instanceof Error) {
                setError(e.message);
            }
        }
    }

    function handleLoadExample() {
        setValue(PLACEHOLDER);
        setError(null);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <label htmlFor="git-json-input" className="text-sm font-medium text-foreground">
                    Paste your git log JSON
                </label>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadExample}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Load example
                </Button>
            </div>
            <textarea
                id="git-json-input"
                className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-secondary p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={PLACEHOLDER}
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                }}
                spellCheck={false}
            />
            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
            <Button onClick={handleParse} disabled={!value.trim()} className="self-start">
                Render Timeline
            </Button>
        </div>
    );
}
