import React from 'react';
import { SpecContent, SpecItem } from '@/lib/types/spec';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, FileText, Hash } from 'lucide-react';

interface SpecViewerProps {
    content: SpecContent;
    status?: string;
    newItemIds?: Set<string>;
}

export const SpecViewer: React.FC<SpecViewerProps> = ({ content, status, newItemIds = new Set() }) => {
    return (
        <div className="bg-white dark:bg-slate-950">
            <div className="max-w-3xl mx-auto py-12 px-8 space-y-10">
                {/* Header Section */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <Hash className="w-3 h-3" />
                            Project Specification
                            {status === 'locked' && (
                                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                                    LOCKED
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
                            {content.project_name}
                        </h1>
                        {content.client_name && (
                            <div className="flex items-center text-lg text-slate-600 dark:text-slate-300">
                                <span className="font-medium">for {content.client_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Metadata Row - Clean & Minimal */}
                    <div className="flex flex-wrap gap-y-4 gap-x-8 py-4 border-y border-slate-100 dark:border-slate-800">
                        <MetaItem
                            icon={<Calendar className="w-4 h-4" />}
                            label="Timeline"
                            value={`${content.timeline?.start_date || 'TBD'} — ${content.timeline?.delivery_date || 'TBD'}`}
                        />
                        <MetaItem
                            icon={<DollarSign className="w-4 h-4" />}
                            label="Budget"
                            value={content.budget?.total || 'TBD'}
                        />
                        <MetaItem
                            icon={<Clock className="w-4 h-4" />}
                            label="Revisions"
                            value={content.revision_rounds || 'Standard'}
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-12">
                    {/* Deliverables */}
                    <Section title="Deliverables" description="Core items to be delivered.">
                        <div className="space-y-1">
                            {(Array.isArray(content.deliverables) ? content.deliverables : []).map((item) => (
                                <MinimalRow key={item.id} item={item} isNew={newItemIds.has(item.id)} />
                            ))}
                            {(!Array.isArray(content.deliverables) || content.deliverables.length === 0) && (
                                <p className="text-slate-400 italic">No deliverables listed.</p>
                            )}
                        </div>
                    </Section>

                    {/* Technical Specs */}
                    <Section title="Technical Specs" description="Requirements & constraints.">
                        <div className="space-y-1">
                            {(Array.isArray(content.specifications) ? content.specifications : []).map((item) => (
                                <MinimalRow key={item.id} item={item} icon={<FileText className="w-4 h-4 text-indigo-500" />} isNew={newItemIds.has(item.id)} />
                            ))}
                            {(!Array.isArray(content.specifications) || content.specifications.length === 0) && (
                                <p className="text-slate-400 italic">No specifications listed.</p>
                            )}
                        </div>
                    </Section>

                    {/* Milestones */}
                    {content.timeline?.milestones && Array.isArray(content.timeline.milestones) && content.timeline.milestones.length > 0 && (
                        <Section title="Milestones">
                            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-2 space-y-8 pl-8 py-2">
                                {content.timeline.milestones.map((m, i) => (
                                    <div key={i} className="relative group">
                                        <div className="absolute -left-[37px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-primary transition-colors ring-4 ring-white dark:ring-slate-950" />
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-slate-900 dark:text-slate-100 text-lg leading-none">
                                                {m.description}
                                            </span>
                                            <span className="text-sm text-slate-500 font-mono">
                                                {m.date}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Exclusions */}
                    {(Array.isArray(content.exclusions) ? content.exclusions : []).length > 0 && (
                        <Section title="Exclusions">
                            <div className="bg-red-50 dark:bg-red-950/10 rounded-lg p-6 border border-red-100 dark:border-red-900/20">
                                <ul className="space-y-3">
                                    {(Array.isArray(content.exclusions) ? content.exclusions : []).map((item, i) => (
                                        <li key={typeof item === 'string' ? i : item.id} className="text-slate-700 dark:text-slate-300 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                            <span>{typeof item === 'string' ? item : item.description}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const MetaItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center gap-2">
        <div className="text-slate-400 dark:text-slate-500">
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                {label}
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-200 text-sm">
                {value}
            </span>
        </div>
    </div>
);

const Section = ({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) => (
    <div className="space-y-6">
        <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            {description && <p className="text-slate-500 dark:text-slate-400 text-sm">{description}</p>}
        </div>
        {children}
    </div>
);

const MinimalRow = ({ item, icon, isNew }: { item: SpecItem, icon?: React.ReactNode, isNew?: boolean }) => (
    <div className={`group flex items-start gap-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 -mx-4 px-4 rounded-lg transition-all ${
        isNew ? 'bg-green-50 dark:bg-green-950/20 animate-pulse' : ''
    }`}>
        <div className="mt-1 text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">
            {icon || <CheckCircle2 className="w-4 h-4" />}
        </div>
        <div className="flex-1">
            <span className="text-slate-700 dark:text-slate-300 leading-relaxed block">
                {item.description}
            </span>
        </div>
        <div className="flex items-center gap-2">
            {isNew && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold text-[10px] px-2 py-0.5">
                    NEW
                </Badge>
            )}
            {item.status && (
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                    {item.status}
                </Badge>
            )}
        </div>
    </div>
);
