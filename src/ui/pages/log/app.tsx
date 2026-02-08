'use client';

import { useEffect, useMemo, useState } from 'react';

import { GitBranch, Loader2, Search, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { CommitInput } from '../../components/git-log-input';
import { CommitTimeline } from '../../components/commit-timeline';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { parseNdjson } from '@/ui/lib/parse-logs';

function filterCommits(commits: CommitInput[], query: string): CommitInput[] {
    const q = query.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter((c) => c.message.toLowerCase().includes(q) || c.hash.toLowerCase().includes(q));
}

export default function Page() {
    const [commits, setCommits] = useState<CommitInput[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzerMessage, setAnalyzerMessage] = useState<string | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

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

    function openConfirmModal() {
        if (selectedHashes.size !== 2) return;
        setConfirmModalOpen(true);
    }

    async function sendToAnalyzer() {
        const hashes = [...selectedHashes];
        const from = hashes[0];
        const to = hashes[1];
        if (!from || !to) return;

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
            setConfirmModalOpen(false);
        } catch (e) {
            setAnalyzerMessage(e instanceof Error ? e.message : 'Analyzer request failed.');
            setConfirmModalOpen(false);
        } finally {
            setAnalyzing(false);
        }
    }

    const hashes = [...selectedHashes];
    const fromHash = hashes[0];
    const toHash = hashes[1];
    const fromCommit = filteredCommits?.find((c) => c.hash === fromHash);
    const toCommit = filteredCommits?.find((c) => c.hash === toHash);

    const selectionAction =
        selectedHashes.size === 2 ? (
            <button
                type="button"
                onClick={openConfirmModal}
                disabled={analyzing}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
                {analyzing ? 'Analyzing…' : 'Send to analyzer'}
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
                            <div className="mb-4 overflow-hidden rounded-lg border border-border bg-card" role="status">
                                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                                    <h2 className="text-sm font-semibold text-foreground">Analyzer response</h2>
                                    <button
                                        type="button"
                                        onClick={() => setAnalyzerMessage(null)}
                                        aria-label="Close analyzer response"
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5f57] text-black/60 transition-colors hover:bg-[#ff6b63] hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#ff5f57]/50"
                                    >
                                        <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                                    </button>
                                </div>
                                <div className="px-4 py-3 text-sm text-muted-foreground [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
                                    <ReactMarkdown>{analyzerMessage}</ReactMarkdown>
                                </div>
                            </div>
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

            {/* Confirm & progress modal */}
            <Dialog
                open={confirmModalOpen}
                onOpenChange={(open) => {
                    if (!open && analyzing) return;
                    setConfirmModalOpen(open);
                }}
            >
                <DialogContent
                    className={cn('sm:max-w-md', analyzing && '[&>button]:invisible')}
                    onPointerDownOutside={(e) => analyzing && e.preventDefault()}
                    onEscapeKeyDown={(e) => analyzing && e.preventDefault()}
                >
                    {analyzing ? (
                        <div className="flex flex-col items-center gap-6 py-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                            </div>
                            <div className="space-y-1 text-center">
                                <h3 className="text-lg font-semibold text-foreground">Analyzing diff</h3>
                                <p className="text-sm text-muted-foreground">
                                    Comparing commits and generating summary…
                                </p>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full w-1/3 bg-primary/60"
                                    style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }}
                                    aria-hidden
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>Send to analyzer</DialogTitle>
                                <DialogDescription>
                                    Compare these two commits and generate a diff summary?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">From</span>
                                    <p className="mt-0.5 truncate font-mono text-sm text-foreground">
                                        {fromHash?.slice(0, 7)}
                                    </p>
                                    {fromCommit && (
                                        <p className="truncate text-xs text-muted-foreground">{fromCommit.message}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">To</span>
                                    <p className="mt-0.5 truncate font-mono text-sm text-foreground">
                                        {toHash?.slice(0, 7)}
                                    </p>
                                    {toCommit && (
                                        <p className="truncate text-xs text-muted-foreground">{toCommit.message}</p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmModalOpen(false)}
                                    disabled={analyzing}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={sendToAnalyzer} disabled={analyzing}>
                                    Send to analyzer
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    );
}
