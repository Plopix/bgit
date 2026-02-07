"use client";

import { useState } from "react";

import { GitBranch } from "lucide-react";
import { GitLogInput } from "../../../../components/git-log-input";
import { CommitTimeline } from "../../../../components/commit-timeline";

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export default function Page() {
  const [commits, setCommits] = useState<Commit[] | null>(null);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Git Log Viewer
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paste the JSON output of your git log and visualize it as a
            timeline.
          </p>
        </header>

        {/* Main content */}
        {commits === null ? (
          <GitLogInput onParse={setCommits} />
        ) : (
          <CommitTimeline commits={commits} onClear={() => setCommits(null)} />
        )}
      </div>
    </main>
  );
}
