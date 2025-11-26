import React from 'react';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ClientSummaryProps {
    summary?: string;
    isLoading: boolean;
    className?: string;
}

export function ClientSummary({ summary, isLoading, className }: ClientSummaryProps) {
    if (isLoading) {
        return (
            <div className={cn('p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-100 dark:border-purple-500/20', className)}>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Generating AI Summary...</span>
                </div>
                <Skeleton className="h-4 w-full bg-purple-100 dark:bg-purple-900/20" />
            </div>
        );
    }

    if (!summary) {
        return (
            <div className={cn('p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800', className)}>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Summary</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Unable to generate summary at this time.
                </p>
            </div>
        );
    }

    return (
        <div className={cn('p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-100 dark:border-purple-500/20', className)}>
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI Summary</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {summary}
            </p>
        </div>
    );
}
