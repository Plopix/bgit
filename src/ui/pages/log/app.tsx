'use client';

import { useEffect, useMemo, useState } from 'react';

import { GitBranch, Search } from 'lucide-react';
import type { CommitInput } from '../../../../components/git-log-input';
import { CommitTimeline } from '../../../../components/commit-timeline';

function filterCommits(commits: CommitInput[], query: string): CommitInput[] {
    const q = query.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter((c) => c.message.toLowerCase().includes(q) || c.hash.toLowerCase().includes(q));
}

function parseNdjson(text: string): CommitInput[] {
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

export default function Page() {
    const [commits, setCommits] = useState<CommitInput[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzerMessage, setAnalyzerMessage] = useState<string | null>(null);

    const filteredCommits = useMemo(() => (commits ? filterCommits(commits, search) : null), [commits, search]);

    async function fetchLog() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/log');
            if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
            const text = await res.text();
            const parsed = parseNdjson(text);
            setCommits(parsed);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load git log');
            setCommits([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchLog();
    }, []);

    function toggleSelect(hash: string) {
        setSelectedHashes((prev) => {
            const next = new Set(prev);
            if (next.has(hash)) {
                next.delete(hash);
            } else if (next.size >= 2) {
                const first = next.values().next().value;
                if (first !== undefined) next.delete(first);
                next.add(hash);
            } else {
                next.add(hash);
            }
            return next;
        });
    }

    async function sendToAnalyzer() {
        const hashes = [...selectedHashes];
        const from = hashes[0];
        const to = hashes[1];
        if (!from || !to) return;
        if (!confirm(`Send these 2 commits to the analyzer?\n\nFrom: ${from.slice(0, 7)}\nTo: ${to.slice(0, 7)}`))
            return;

        setAnalyzing(true);
        setAnalyzerMessage(null);
        try {
            const res = await fetch('/api/summary-diff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to }),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Request failed: ${res.status}`);
            }
            const data = await res.json();
            setAnalyzerMessage(data.summary ?? 'Analysis complete.');
            setSelectedHashes(new Set());
        } catch (e) {
            setAnalyzerMessage(e instanceof Error ? e.message : 'Analyzer request failed.');
        } finally {
            setAnalyzing(false);
        }
    }

    const selectionAction =
        selectedHashes.size === 2 ? (
            <button
                type="button"
                onClick={sendToAnalyzer}
                disabled={analyzing}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
                {analyzing ? 'Sending…' : 'Send to analyzer'}
            </button>
        ) : selectedHashes.size > 0 ? (
            <span className="text-sm text-muted-foreground">Select 1 more commit to analyze</span>
        ) : null;

    return (
        <main className="min-h-screen bg-background">
            <div className="relative mx-auto max-w-2xl px-4 py-12 md:py-20">
                {/* Search box - top right corner */}
                {commits && commits.length > 0 && (
                    <div className="absolute right-4 top-4 md:right-0 md:top-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Search by message or hash…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-64 rounded-lg border border-border bg-zinc-800/90 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                aria-label="Search commits by message or hash"
                            />
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="mb-10 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                            <GitBranch className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Git Log Viewer</h1>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Git log from the current repository. Click two commits to compare with the analyzer.
                    </p>
                </header>

                {/* Main content */}
                {loading ? (
                    <p className="text-muted-foreground">Loading git log…</p>
                ) : error ? (
                    <p className="text-sm text-destructive" role="alert">
                        {error}
                    </p>
                ) : filteredCommits && filteredCommits.length > 0 ? (
                    <>
                        {analyzerMessage && (
                            <p className="mb-4 text-sm text-muted-foreground" role="status">
                                {analyzerMessage}
                            </p>
                        )}
                        <CommitTimeline
                            commits={filteredCommits}
                            onClear={fetchLog}
                            actionLabel="Refresh"
                            selectedHashes={selectedHashes}
                            onSelectCommit={toggleSelect}
                            selectionAction={selectionAction}
                        />
                    </>
                ) : commits && commits.length > 0 ? (
                    <p className="text-muted-foreground">No commits match &quot;{search}&quot;.</p>
                ) : (
                    <p className="text-muted-foreground">No commits found.</p>
                )}
            </div>
        </main>
    );
}
