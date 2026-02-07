'use client';

import { GitCommit, User, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Commit {
    hash: string;
    author: string;
    date: string;
    message: string;
}

function formatDate(raw: string): string {
    try {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return raw;
        return d.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return raw;
    }
}

function CopyHash({ hash }: { hash: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(hash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard not available
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Copy hash ${hash.slice(0, 7)}`}
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

export function CommitTimeline({ commits, onClear }: { commits: Commit[]; onClear: () => void }) {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                    {commits.length} {commits.length === 1 ? 'Commit' : 'Commits'}
                </h2>
                <button
                    type="button"
                    onClick={onClear}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    Clear & paste new
                </button>
            </div>

            <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />

                <ul className="flex flex-col gap-0" role="list">
                    {commits.map((commit, index) => (
                        <li key={commit.hash} className="relative flex gap-4 group">
                            {/* Timeline dot */}
                            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors group-hover:border-primary group-hover:bg-primary/10">
                                <GitCommit className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>

                            {/* Content card */}
                            <div
                                className={`flex-1 rounded-lg border border-border bg-card p-4 transition-colors group-hover:border-primary/30 ${
                                    index < commits.length - 1 ? 'mb-4' : ''
                                }`}
                            >
                                {/* Commit message */}
                                <p className="text-sm font-medium text-foreground leading-relaxed">{commit.message}</p>

                                {/* Metadata row */}
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                    {/* Hash */}
                                    <span className="inline-flex items-center gap-1.5">
                                        <GitCommit className="h-3.5 w-3.5" />
                                        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
                                            {commit.hash.slice(0, 7)}
                                        </code>
                                        <CopyHash hash={commit.hash} />
                                    </span>

                                    {/* Author */}
                                    <span className="inline-flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        {commit.author}
                                    </span>

                                    {/* Date */}
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        <time dateTime={commit.date}>{formatDate(commit.date)}</time>
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
