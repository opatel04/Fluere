import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Lock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    DollarSign,
    Clock,
    Loader2
} from 'lucide-react';
import { SpecContent } from '@/lib/types/spec';

interface LockSummaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content: SpecContent;
    onConfirm: () => Promise<void>;
    isLocking: boolean;
}

export const LockSummaryDialog: React.FC<LockSummaryDialogProps> = ({
    open,
    onOpenChange,
    content,
    onConfirm,
    isLocking,
}) => {
    // Check for missing information
    const missingFields: string[] = [];
    if (!content.budget?.total) missingFields.push('Budget not specified');
    if (!content.timeline?.delivery_date) missingFields.push('Deadline not specified');
    if (!content.revision_rounds) missingFields.push('Revision rounds not specified');
    if (!content.deliverables || content.deliverables.length === 0) {
        missingFields.push('No deliverables listed');
    }

    const handleConfirm = async () => {
        await onConfirm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Lock className="w-5 h-5" />
                        Lock Specification
                    </DialogTitle>
                    <DialogDescription>
                        Review the specification before locking. Once locked, any changes will create new versions.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[50vh] pr-4">
                    <div className="space-y-6">
                        {/* Project Info */}
                        <div>
                            <h3 className="font-semibold text-lg mb-2">PROJECT: {content.project_name}</h3>
                            {content.client_name && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    CLIENT: {content.client_name}
                                </p>
                            )}
                        </div>

                        <Separator />

                        {/* Key Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <DollarSign className="w-4 h-4" />
                                    <span>Budget</span>
                                </div>
                                <p className="font-medium">
                                    {content.budget?.total || (
                                        <span className="text-amber-600">Not specified</span>
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Calendar className="w-4 h-4" />
                                    <span>Deadline</span>
                                </div>
                                <p className="font-medium">
                                    {content.timeline?.delivery_date || (
                                        <span className="text-amber-600">Not specified</span>
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    <span>Revisions</span>
                                </div>
                                <p className="font-medium">
                                    {content.revision_rounds || (
                                        <span className="text-amber-600">Not specified</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* Deliverables */}
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                DELIVERABLES
                                <Badge variant="outline">
                                    {content.deliverables?.length || 0}
                                </Badge>
                            </h4>
                            <ul className="space-y-1">
                                {content.deliverables?.map((item) => (
                                    <li key={item.id} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>{item.description}</span>
                                    </li>
                                ))}
                                {(!content.deliverables || content.deliverables.length === 0) && (
                                    <li className="text-sm text-amber-600 italic">No deliverables listed</li>
                                )}
                            </ul>
                        </div>

                        {/* Specifications */}
                        {content.specifications && content.specifications.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        SPECIFICATIONS
                                        <Badge variant="outline">
                                            {content.specifications.length}
                                        </Badge>
                                    </h4>
                                    <ul className="space-y-1">
                                        {content.specifications.map((item) => (
                                            <li key={item.id} className="flex items-start gap-2 text-sm">
                                                <span className="text-slate-400">•</span>
                                                <span>{item.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}

                        {/* Client Provides */}
                        {content.client_provides && content.client_provides.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        CLIENT PROVIDES
                                        <Badge variant="outline">
                                            {content.client_provides.length}
                                        </Badge>
                                    </h4>
                                    <ul className="space-y-1">
                                        {content.client_provides.map((item) => (
                                            <li key={item.id} className="flex items-start gap-2 text-sm">
                                                <span className="text-slate-400">•</span>
                                                <span>{item.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}

                        {/* Exclusions */}
                        {content.exclusions && content.exclusions.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        EXCLUSIONS
                                        <Badge variant="outline">
                                            {content.exclusions.length}
                                        </Badge>
                                    </h4>
                                    <ul className="space-y-1">
                                        {content.exclusions.map((item) => (
                                            <li key={item.id} className="flex items-start gap-2 text-sm">
                                                <span className="text-red-400">✕</span>
                                                <span>{item.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}

                        {/* Missing Information Warning */}
                        {missingFields.length > 0 && (
                            <>
                                <Separator />
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                                Missing Information
                                            </h4>
                                            <ul className="space-y-1">
                                                {missingFields.map((field, idx) => (
                                                    <li key={idx} className="text-sm text-amber-800 dark:text-amber-200">
                                                        • {field}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Locking Warning */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                        Once locked, changes create new versions
                                    </h4>
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        This baseline will be used to monitor scope creep. You can still edit the spec,
                                        but changes will be tracked as version updates.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLocking}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLocking}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isLocking ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Locking...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                Confirm & Lock
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
