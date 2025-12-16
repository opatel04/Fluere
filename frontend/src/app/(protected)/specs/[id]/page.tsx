'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { specApi } from '@/lib/api/spec';
import { ProjectSpec, SpecContent } from '@/lib/types/spec';
import { SpecViewer } from '@/components/specs/SpecViewer';
import { ChatInterface } from '@/components/specs/ChatInterface';
import { ScopeCreepAlerts } from '@/components/specs/ScopeCreepAlerts';
import { LockSummaryDialog } from '@/components/specs/LockSummaryDialog';
import { VersionHistoryDialog } from '@/components/specs/VersionHistoryDialog';
import { Loader2, MessageSquare, ChevronRight, PanelRightClose, PanelRightOpen, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function SpecPage() {
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [spec, setSpec] = useState<ProjectSpec | null>(null);
    const [content, setContent] = useState<SpecContent | null>(null);
    const [previousContent, setPreviousContent] = useState<SpecContent | null>(null);
    const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [showLockDialog, setShowLockDialog] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [isLocking, setIsLocking] = useState(false);
    const [contentUpdated, setContentUpdated] = useState(false);

    useEffect(() => {
        const fetchSpec = async () => {
            try {
                const data = await specApi.getSpec(id);
                setSpec(data.spec);
                setContent(data.content);
            } catch (error) {
                console.error('Error fetching spec:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load project specification.',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSpec();
        }
    }, [id, toast]);

    const handleSendMessage = async (message: string) => {
        setProcessing(true);
        try {
            const result = await specApi.chatWithSpec(id, message);
            console.log('Chat result received:', result);
            console.log('Updated spec:', result.spec);
            console.log('Updated content:', result.content);

            // Detect new items by comparing with previous content
            const newIds = new Set<string>();
            if (content) {
                // Compare deliverables
                const oldDeliverableIds = new Set((content.deliverables || []).map(d => d.id));
                (result.content.deliverables || []).forEach(d => {
                    if (!oldDeliverableIds.has(d.id)) {
                        newIds.add(d.id);
                    }
                });

                // Compare specifications
                const oldSpecIds = new Set((content.specifications || []).map(s => s.id));
                (result.content.specifications || []).forEach(s => {
                    if (!oldSpecIds.has(s.id)) {
                        newIds.add(s.id);
                    }
                });

                // Compare exclusions
                const oldExclusionIds = new Set((content.exclusions || []).map(e => typeof e === 'string' ? e : e.id));
                (result.content.exclusions || []).forEach(e => {
                    const eId = typeof e === 'string' ? e : e.id;
                    if (!oldExclusionIds.has(eId)) {
                        newIds.add(eId);
                    }
                });
            }

            setPreviousContent(content);
            setSpec(result.spec);
            setContent(result.content);
            setNewItemIds(newIds);

            // Trigger update animation
            setContentUpdated(true);
            setTimeout(() => {
                setContentUpdated(false);
                // Clear new item highlights after 10 seconds
                setTimeout(() => setNewItemIds(new Set()), 10000);
            }, 2000);

            return result.reply;
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: 'Error',
                description: 'Failed to process your request.',
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleShowLockDialog = () => {
        setShowLockDialog(true);
    };

    const handleConfirmLock = async () => {
        if (!spec) return;

        setIsLocking(true);
        try {
            const updatedSpec = await specApi.lockSpec(id);
            setSpec(updatedSpec);
            toast({
                title: 'Spec Locked',
                description: 'The specification has been locked. You can now sync it to Trello.',
            });
        } catch (error) {
            console.error('Error locking spec:', error);
            toast({
                title: 'Error',
                description: 'Failed to lock the specification.',
                variant: 'destructive',
            });
        } finally {
            setIsLocking(false);
        }
    };

    const handleSyncToTrello = async () => {
        if (!spec) return;

        try {
            await specApi.syncToTrello(id);
            toast({
                title: 'Synced to Trello',
                description: 'The spec status has been updated on the Trello card.',
            });
        } catch (error) {
            console.error('Error syncing to Trello:', error);
            toast({
                title: 'Error',
                description: 'Failed to sync with Trello.',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!spec || !content) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Spec not found
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-slate-950 relative overflow-hidden">
            {/* Left: Spec Viewer */}
            <motion.div
                layout
                initial={false}
                animate={{ width: isChatOpen ? '65%' : '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-full overflow-hidden flex flex-col"
            >
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 z-10">
                    <div className="flex items-center gap-2">
                        {spec.status === 'locked' ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-medium rounded-full flex items-center gap-1">
                                <PanelRightClose className="w-3 h-3" /> LOCKED
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">
                                DRAFT
                            </span>
                        )}
                        <button
                            onClick={() => setShowVersionHistory(true)}
                            className="px-3 py-1.5 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                            title="View version history"
                        >
                            <History className="w-3.5 h-3.5" />
                            History
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {spec.status === 'locked' && (
                            <button
                                onClick={handleSyncToTrello}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                Process to Trello
                            </button>
                        )}

                        {spec.status !== 'locked' && (
                            <button
                                onClick={handleShowLockDialog}
                                className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-medium rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                            >
                                Lock Spec
                            </button>
                        )}
                    </div>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${
                            contentUpdated
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'bg-transparent'
                        }`}
                    >
                        <div className="h-full overflow-y-auto">
                            <div className="px-6 pt-4">
                                <ScopeCreepAlerts specId={Array.isArray(params.id) ? params.id[0] : params.id} />
                            </div>
                            <SpecViewer
                                key={spec?.updated_at || 'initial'}
                                content={content}
                                status={spec.status}
                                newItemIds={newItemIds}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right: Chat Interface */}
            <AnimatePresence mode="popLayout">
                {isChatOpen && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="h-full w-[35%] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 absolute right-0 top-0 shadow-xl z-20"
                    >
                        <div className="h-full relative">
                            {/* Toggle Button */}
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="absolute top-4 -left-10 z-10 p-2 rounded-l-md bg-white dark:bg-slate-900 border border-r-0 border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                title="Close Chat"
                            >
                                <PanelRightClose className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>

                            <ChatInterface onSendMessage={handleSendMessage} isProcessing={processing} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapsed State Toggle (Floating when closed) */}
            <AnimatePresence>
                {!isChatOpen && (
                    <motion.button
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={() => setIsChatOpen(true)}
                        className="absolute right-0 top-20 z-10 p-3 rounded-l-xl bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors group"
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span className="sr-only">Open Chat</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Lock Summary Dialog */}
            {content && (
                <LockSummaryDialog
                    open={showLockDialog}
                    onOpenChange={setShowLockDialog}
                    content={content}
                    onConfirm={handleConfirmLock}
                    isLocking={isLocking}
                />
            )}

            {/* Version History Dialog */}
            {spec && (
                <VersionHistoryDialog
                    open={showVersionHistory}
                    onOpenChange={setShowVersionHistory}
                    specId={id}
                    currentVersion={spec.current_version}
                />
            )}
        </div>
    );
}
