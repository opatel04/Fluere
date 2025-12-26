'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { specApi } from '@/lib/api/spec';

interface ScopeCreepAlert {
    id: string;
    severity: 'low' | 'medium' | 'high';
    category: string;
    client_quote: string;
    ai_reasoning: string;
    estimated_hours?: number;
}

interface ResponseGeneratorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    alert: ScopeCreepAlert;
}

export const ResponseGeneratorDialog: React.FC<ResponseGeneratorDialogProps> = ({
    open,
    onOpenChange,
    alert,
}) => {
    const [tone, setTone] = useState<'friendly' | 'professional' | 'firm'>('professional');
    const [generatedResponse, setGeneratedResponse] = useState<string>('');
    const [editedResponse, setEditedResponse] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await specApi.generateAlertResponse(alert.id, tone);
            setGeneratedResponse(response);
            setEditedResponse(response);
            toast({
                title: 'Response generated',
                description: `${tone.charAt(0).toUpperCase() + tone.slice(1)} response created successfully`,
            });
        } catch (error) {
            console.error('Failed to generate response:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate response. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(editedResponse);
            setCopied(true);
            toast({
                title: 'Copied to clipboard',
                description: 'Response copied successfully',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            toast({
                title: 'Error',
                description: 'Failed to copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    const handleRegenerate = () => {
        setGeneratedResponse('');
        setEditedResponse('');
        handleGenerate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Generate Client Response
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Alert Context Card */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2">
                            <span
                                className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                    alert.severity === 'high'
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                        : alert.severity === 'medium'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                }`}
                            >
                                {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {alert.category.replace(/_/g, ' ').toUpperCase()}
                            </span>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Client Request:
                            </p>
                            <div className="bg-white dark:bg-black/30 p-2 rounded text-sm italic text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                "{alert.client_quote}"
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Why Out of Scope:
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {alert.ai_reasoning}
                            </p>
                        </div>

                        {alert.estimated_hours && (
                            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Estimated Extra Work: ~{alert.estimated_hours} hours
                            </div>
                        )}
                    </div>

                    {/* Tone Selector */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                            Select Tone
                        </label>
                        <div className="flex gap-2">
                            {(['friendly', 'professional', 'firm'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t)}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        tone === t
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {tone === 'friendly' &&
                                'Warm, collaborative, and solution-oriented. Best for maintaining close client relationships.'}
                            {tone === 'professional' &&
                                'Neutral, clear, and business-like. Best for standard professional communication.'}
                            {tone === 'firm' &&
                                'Direct, assertive, and boundary-setting. Best when clear boundaries are essential.'}
                        </p>
                    </div>

                    {/* Generate Button */}
                    {!generatedResponse && (
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full"
                            size="lg"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Response
                                </>
                            )}
                        </Button>
                    )}

                    {/* Response Editor */}
                    {generatedResponse && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Generated Response
                                </label>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    You can edit before copying
                                </span>
                            </div>
                            <Textarea
                                value={editedResponse}
                                onChange={(e) => setEditedResponse(e.target.value)}
                                className="min-h-[300px] font-sans"
                                placeholder="Generated response will appear here..."
                            />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {generatedResponse && (
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                        </Button>
                        <Button onClick={handleCopy} disabled={!editedResponse}>
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy to Clipboard
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};
