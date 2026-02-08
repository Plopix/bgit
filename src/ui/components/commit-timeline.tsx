'use client';

import { GitCommit, User, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { CommitInput } from './git-log-input';

interface Commit extends CommitInput {
    parentHashes: string[];
    depth: number;
    lane: number;
}

const GRAPH_WIDTH = 56;
const LANE_WIDTH = 14;
const LANE_COLORS = [
    'rgb(59 130 246)', // blue
    'rgb(234 179 8)', // yellow/amber
    'rgb(249 115 22)', // orange
    'rgb(219 39 119)', // pink/magenta
];

/** Orders commits chronologically (newest first) and assigns depth from root for indentation. */
function orderCommitsAsTree(commits: CommitInput[]): Commit[] {
    if (commits.length === 0) return [];

    const byHash = new Map<string, Commit>();
    const enriched: Commit[] = commits.map((c) => {
        const parentStr = c.parents ?? '';
        const parentHashes = parentStr
            .split(/\s+/)
            .map((h) => h.trim())
            .filter(Boolean);
        const commit: Commit = {
            depth: 0,
            lane: 0,
            ...c,
            parentHashes,
        };
        byHash.set(c.hash, commit);
        return commit;
    });

    const parentOf = new Set<string>();
    for (const c of enriched) {
        for (const p of c.parentHashes) {
            parentOf.add(p);
        }
    }

    const heads = enriched.filter((c) => !parentOf.has(c.hash));
    if (heads.length === 0) {
        return enriched
            .map((c) => ({ ...c, depth: 0, lane: 0 }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Build parent -> children map for depth calculation
    const childrenOf = new Map<string, Commit[]>();
    for (const c of enriched) {
        for (const pHash of c.parentHashes) {
            const list = childrenOf.get(pHash) ?? [];
            list.push(c);
            childrenOf.set(pHash, list);
        }
    }

    // Roots: no parents, or all parents not in our set
    const roots = enriched.filter((c) => {
        if (c.parentHashes.length === 0) return true;
        return c.parentHashes.every((p) => !byHash.has(p));
    });

    // BFS from roots to assign depth (0 = root, +1 per level)
    const depthByHash = new Map<string, number>();
    const rootQueue = [...roots];
    for (const r of roots) {
        depthByHash.set(r.hash, 0);
    }
    while (rootQueue.length > 0) {
        const c = rootQueue.shift()!;
        const childDepth = (depthByHash.get(c.hash) ?? 0) + 1;
        for (const child of childrenOf.get(c.hash) ?? []) {
            const existing = depthByHash.get(child.hash);
            if (existing === undefined || childDepth > existing) {
                depthByHash.set(child.hash, childDepth);
                rootQueue.push(child);
            }
        }
    }

    // Lane assignment: use "depth from heads" (newest commits) so the main line stays in lane 0.
    // Heads = tips of branches. BFS from heads toward parents - newer commits get lower depth.
    const depthFromHead = new Map<string, number>();
    const headQueue = [...heads.map((h) => h.hash)];
    for (const h of heads) {
        depthFromHead.set(h.hash, 0);
    }
    while (headQueue.length > 0) {
        const hash = headQueue.shift()!;
        const d = depthFromHead.get(hash)!;
        const commit = byHash.get(hash);
        if (!commit) continue;
        for (const pHash of commit.parentHashes) {
            if (!byHash.has(pHash)) continue;
            const existing = depthFromHead.get(pHash);
            if (existing === undefined || d + 1 < existing) {
                depthFromHead.set(pHash, d + 1);
                headQueue.push(pHash);
            }
        }
    }

    // Assign depth (from root) and lane (from head, modulo for cycling)
    for (const c of enriched) {
        const depth = depthByHash.get(c.hash) ?? 0;
        const dFromHead = depthFromHead.get(c.hash) ?? 0;
        (c as Commit).depth = depth;
        (c as Commit).lane = dFromHead % LANE_COLORS.length;
    }

    // Order chronologically: newest first (most recent at top)
    return [...enriched].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
            onClick={(e) => {
                e.stopPropagation();
                handleCopy();
            }}
            className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Copy hash ${hash.slice(0, 7)}`}
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

interface CommitTimelineProps {
    commits: CommitInput[];
    onClear?: () => void;
    onRefresh?: () => void | Promise<void>;
    actionLabel?: string;
    selectedHashes?: Set<string>;
    onSelectCommit?: (hash: string) => void;
    selectionAction?: React.ReactNode;
}

export function CommitTimeline({
    commits,
    onClear,
    onRefresh,
    actionLabel,
    selectedHashes,
    onSelectCommit,
    selectionAction,
}: CommitTimelineProps) {
    const ordered = orderCommitsAsTree(commits);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-foreground">
                    Last {ordered.length} {ordered.length === 1 ? 'Commit' : 'Commits'}
                </h2>
                <div className="flex items-center gap-3">
                    {selectionAction}
                    {(onRefresh || onClear) && (
                        <button
                            type="button"
                            onClick={onRefresh ?? onClear}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {actionLabel ?? (onRefresh ? 'Refresh' : 'Clear & paste new')}
                        </button>
                    )}
                </div>
            </div>

            <div className="relative flex">
                {/* Graph column - VS Code style lines */}
                <div className="relative shrink-0 self-stretch" style={{ width: GRAPH_WIDTH }} aria-hidden="true">
                    {LANE_COLORS.map((color, i) => (
                        <div
                            key={i}
                            className="absolute top-5 bottom-5 w-px opacity-40"
                            style={{
                                left: i * LANE_WIDTH + LANE_WIDTH / 2 - 1,
                                backgroundColor: color,
                            }}
                        />
                    ))}
                </div>

                <ul className="flex flex-1 flex-col gap-0" role="list">
                    {ordered.map((commit, index) => {
                        const isSelected = selectedHashes?.has(commit.hash);
                        const laneColor = LANE_COLORS[commit.lane];
                        const dotLeft = commit.lane * LANE_WIDTH + LANE_WIDTH / 2 - 8;
                        return (
                            <li key={commit.hash} className="relative flex items-stretch gap-4 group">
                                {/* Graph node (dot) - positioned in left column */}
                                <div
                                    className="relative z-10 flex shrink-0 items-center"
                                    style={{ width: GRAPH_WIDTH, marginLeft: -GRAPH_WIDTH }}
                                    aria-hidden
                                >
                                    <div
                                        className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 transition-all group-hover:scale-110"
                                        style={{
                                            left: dotLeft,
                                            backgroundColor: laneColor,
                                            borderColor: 'hsl(var(--background))',
                                            opacity: 0.95,
                                        }}
                                    />
                                    {commit.parentHashes.length > 1 && (
                                        <div
                                            className="absolute top-1/2 z-5 h-1 -translate-y-1/2 rounded-full"
                                            style={{
                                                left: 0,
                                                width: dotLeft + 10,
                                                backgroundColor: laneColor,
                                                opacity: 0.85,
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Content card */}
                                <div
                                    role={onSelectCommit ? 'button' : undefined}
                                    tabIndex={onSelectCommit ? 0 : undefined}
                                    onClick={onSelectCommit ? () => onSelectCommit(commit.hash) : undefined}
                                    onKeyDown={
                                        onSelectCommit
                                            ? (e) => e.key === 'Enter' && onSelectCommit(commit.hash)
                                            : undefined
                                    }
                                    className={`flex-1 rounded-lg border p-4 transition-colors ${
                                        commit.depth === 0
                                            ? 'border-border/80 bg-zinc-800/90 group-hover:border-primary/30'
                                            : 'border-border/60 bg-zinc-800/70 group-hover:border-primary/20'
                                    } ${onSelectCommit ? 'cursor-pointer select-none' : ''} ${
                                        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                                    } ${index < ordered.length - 1 ? 'mb-4' : ''}`}
                                >
                                    {/* Commit message */}
                                    <p className="text-sm font-medium text-foreground leading-relaxed">
                                        {commit.message}
                                        {commit.parentHashes.length > 1 && (
                                            <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                                                merge
                                            </span>
                                        )}
                                    </p>

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

                                        {/* Parents (tree structure) */}
                                        {commit.parentHashes.length > 0 && (
                                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                                ←{' '}
                                                {commit.parentHashes.map((pH, i) => (
                                                    <code
                                                        key={pH}
                                                        className="rounded bg-secondary/80 px-1 py-0.5 font-mono text-xs"
                                                        title={pH}
                                                    >
                                                        {pH.slice(0, 7)}
                                                    </code>
                                                ))}
                                            </span>
                                        )}

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
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
