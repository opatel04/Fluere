import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Bot, ChevronRight, Loader2, FileText } from 'lucide-react';
import { specApi } from '@/lib/api/spec';
import { SpecVersion } from '@/lib/types/spec';
import { useToast } from '@/hooks/use-toast';

interface VersionHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    specId: string;
    currentVersion: number;
}

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
    open,
    onOpenChange,
    specId,
    currentVersion,
}) => {
    const { toast } = useToast();
    const [versions, setVersions] = useState<SpecVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<SpecVersion | null>(null);

    useEffect(() => {
        if (open && specId) {
            fetchVersions();
        }
    }, [open, specId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const data = await specApi.getVersions(specId);
            setVersions(data);
        } catch (error) {
            console.error('Error fetching versions:', error);
            toast({
                title: 'Error',
                description: 'Failed to load version history.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const getChangeIcon = (version: SpecVersion) => {
        if (version.created_by === 'system') {
            return <Bot className="w-4 h-4 text-purple-500" />;
        }
        return <User className="w-4 h-4 text-blue-500" />;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Clock className="w-5 h-5" />
                        Version History
                    </DialogTitle>
                    <DialogDescription>
                        View all changes made to this specification
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="flex gap-4 h-[60vh]">
                        {/* Version List */}
                        <ScrollArea className="w-1/3 border-r pr-4">
                            <div className="space-y-2">
                                {versions.map((version) => (
                                    <button
                                        key={version.id}
                                        onClick={() => setSelectedVersion(version)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                            selectedVersion?.id === version.id
                                                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        version.version_number === currentVersion
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    className="text-xs"
                                                >
                                                    v{version.version_number}
                                                </Badge>
                                                {version.version_number === currentVersion && (
                                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            {getChangeIcon(version)}
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 line-clamp-2">
                                            {version.change_summary || 'No summary'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {formatDate(version.created_at)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* Version Details */}
                        <div className="flex-1">
                            {selectedVersion ? (
                                <ScrollArea className="h-full">
                                    <div className="space-y-4 pr-4">
                                        {/* Header */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold">
                                                    Version {selectedVersion.version_number}
                                                </h3>
                                                {selectedVersion.version_number === currentVersion && (
                                                    <Badge variant="default">Current</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    {getChangeIcon(selectedVersion)}
                                                    <span className="capitalize">
                                                        {selectedVersion.created_by}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDate(selectedVersion.created_at)}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Change Summary */}
                                        <div>
                                            <h4 className="font-medium mb-2">Change Summary</h4>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                                {selectedVersion.change_summary || 'No summary provided'}
                                            </p>
                                        </div>

                                        {selectedVersion.change_reason && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <h4 className="font-medium mb-2">Reason</h4>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                                        {selectedVersion.change_reason}
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        <Separator />

                                        {/* Content Preview */}
                                        <div>
                                            <h4 className="font-medium mb-3">Content Preview</h4>
                                            <div className="space-y-3">
                                                {/* Deliverables */}
                                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        Deliverables
                                                        <Badge variant="outline" className="text-xs">
                                                            {selectedVersion.content.deliverables?.length || 0}
                                                        </Badge>
                                                    </h5>
                                                    <ul className="space-y-1">
                                                        {selectedVersion.content.deliverables
                                                            ?.slice(0, 5)
                                                            .map((item) => (
                                                                <li
                                                                    key={item.id}
                                                                    className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                                                                >
                                                                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                    <span className="line-clamp-1">
                                                                        {item.description}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        {(selectedVersion.content.deliverables?.length || 0) >
                                                            5 && (
                                                            <li className="text-xs text-slate-500 italic">
                                                                +
                                                                {(selectedVersion.content.deliverables
                                                                    ?.length || 0) - 5}{' '}
                                                                more...
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>

                                                {/* Specifications */}
                                                {selectedVersion.content.specifications && selectedVersion.content.specifications.length > 0 && (
                                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                            <FileText className="w-4 h-4" />
                                                            Specifications
                                                            <Badge variant="outline" className="text-xs">
                                                                {selectedVersion.content.specifications?.length || 0}
                                                            </Badge>
                                                        </h5>
                                                        <ul className="space-y-1">
                                                            {selectedVersion.content.specifications
                                                                ?.slice(0, 5)
                                                                .map((item) => (
                                                                    <li
                                                                        key={item.id}
                                                                        className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                                                                    >
                                                                        <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                        <span className="line-clamp-1">
                                                                            {item.description}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            {(selectedVersion.content.specifications?.length || 0) >
                                                                5 && (
                                                                <li className="text-xs text-slate-500 italic">
                                                                    +
                                                                    {(selectedVersion.content.specifications
                                                                        ?.length || 0) - 5}{' '}
                                                                    more...
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Key Info */}
                                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <span className="text-slate-500">Budget:</span>
                                                            <p className="font-medium">
                                                                {selectedVersion.content.budget?.total ||
                                                                    'Not specified'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">Deadline:</span>
                                                            <p className="font-medium">
                                                                {selectedVersion.content.timeline
                                                                    ?.delivery_date || 'Not specified'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">Revisions:</span>
                                                            <p className="font-medium">
                                                                {selectedVersion.content.revision_rounds ||
                                                                    'Not specified'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">Specs:</span>
                                                            <p className="font-medium">
                                                                {selectedVersion.content.specifications
                                                                    ?.length || 0}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    Select a version to view details
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
