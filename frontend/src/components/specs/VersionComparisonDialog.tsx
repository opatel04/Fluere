'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompare, AlertCircle, Plus, Minus, Edit3 } from 'lucide-react';
import { specApi } from '@/lib/api/spec';

interface VersionComparisonDialogProps {
    isOpen: boolean;
    onClose: () => void;
    specId: string;
    versions: Array<{
        version_number: number;
        created_at: string;
        change_summary: string;
        created_by: string;
    }>;
}

export default function VersionComparisonDialog({
    isOpen,
    onClose,
    specId,
    versions,
}: VersionComparisonDialogProps) {
    const [version1, setVersion1] = useState<number>(versions[versions.length - 1]?.version_number || 1);
    const [version2, setVersion2] = useState<number>(versions[0]?.version_number || 2);
    const [comparison, setComparison] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && version1 !== version2) {
            loadComparison();
        }
    }, [isOpen, version1, version2]);

    const loadComparison = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await specApi.compareVersions(specId, version1, version2);
            setComparison(data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to load comparison';
            setError(typeof errorMessage === 'string' ? errorMessage : 'Failed to load comparison');
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract readable text from any item type
    const getItemText = (item: any): string => {
        if (item === null || item === undefined) {
            return '';
        }

        if (typeof item === 'string') {
            return item;
        }

        if (typeof item === 'number' || typeof item === 'boolean') {
            return String(item);
        }

        if (item?.description) {
            return item.description;
        }

        if (Array.isArray(item)) {
            // Handle arrays by joining their readable representations
            return item.map(i => getItemText(i)).join(', ');
        }

        if (typeof item === 'object') {
            // For objects, create a readable summary with nested handling
            const formatValue = (val: any): string => {
                if (val === null || val === undefined) return 'null';
                if (typeof val === 'string') return val;
                if (typeof val === 'number' || typeof val === 'boolean') return String(val);
                if (Array.isArray(val)) return `[${val.length} items]`;
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val);
            };

            return Object.entries(item)
                .filter(([key]) => !key.startsWith('_') && !key.startsWith('$'))
                .map(([key, val]) => `${key}: ${formatValue(val)}`)
                .join(', ');
        }

        return String(item);
    };

    // Helper to clean up notes field specifically
    const cleanNotesArray = (items: any[]): any[] => {
        if (!items || items.length === 0) return items;

        // Check if this looks like a character array (many single-char strings)
        const singleCharItems = items.filter((item: any) =>
            typeof item === 'string' && item.length === 1
        );

        // If more than 50% are single characters, it's likely a corrupted string
        if (singleCharItems.length > items.length * 0.5) {
            // Join all string items
            const joined = items
                .filter((item: any) => typeof item === 'string')
                .join('');

            // Split into readable parts
            const parts: string[] = [];

            // Look for common patterns and split them
            const patterns = [
                /revision_abuse:/gi,
                /Timeline change:/gi,
                /assumed_inclusion:/gi,
                /budget_change:/gi,
                /scope_addition:/gi,
            ];

            let text = joined;
            let lastIndex = 0;

            // Find all pattern matches and their positions
            const matches: {index: number, text: string}[] = [];
            patterns.forEach(pattern => {
                let match;
                const regex = new RegExp(pattern.source, 'gi');
                while ((match = regex.exec(text)) !== null) {
                    matches.push({index: match.index, text: match[0]});
                }
            });

            // Sort by position
            matches.sort((a, b) => a.index - b.index);

            // Split text at pattern positions
            if (matches.length > 0) {
                matches.forEach((match, i) => {
                    if (i === 0 && match.index > 0) {
                        // Add text before first match
                        const beforeText = text.substring(0, match.index).trim();
                        if (beforeText) parts.push(beforeText);
                    }

                    const nextIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
                    const part = text.substring(match.index, nextIndex).trim();
                    if (part) {
                        // Clean up the part and format for readability
                        let cleaned = part
                            .replace(/^revision_abuse:\s*/i, '⚠️ Client wants more revisions: ')
                            .replace(/^Timeline change:\s*/i, '📅 Timeline changed: ')
                            .replace(/^assumed_inclusion:\s*/i, '➕ Client assumes this is included: ')
                            .replace(/^budget_change:\s*/i, '💰 Budget changed: ')
                            .replace(/^scope_addition:\s*/i, '📋 New requirement: ')
                            .trim();

                        // Extract client quote if present
                        const clientQuoteMatch = cleaned.match(/\(Client:\s*"([^"]+)"\)/);
                        if (clientQuoteMatch) {
                            const quote = clientQuoteMatch[1];
                            const beforeQuote = cleaned.substring(0, clientQuoteMatch.index).trim();
                            cleaned = beforeQuote || quote;
                        } else {
                            // Remove other parenthetical client quotes
                            cleaned = cleaned.replace(/\(Client:\s*/g, '').replace(/\)/g, '').replace(/"/g, '');
                        }

                        if (cleaned) parts.push(cleaned);
                    }
                });

                return parts.length > 0 ? parts : [joined];
            }

            return joined ? [joined] : items;
        }

        return items;
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const renderArrayDiff = (field: any, title: string) => {
        if (!field || field.changeType === 'unchanged') {
            return null;
        }

        // Clean up notes if this is the notes field
        const isNotes = title.toLowerCase().includes('note');
        if (isNotes) {
            if (field.added) field.added = cleanNotesArray(field.added);
            if (field.removed) field.removed = cleanNotesArray(field.removed);
            if (field.unchanged) field.unchanged = cleanNotesArray(field.unchanged);
            if (field.modified) {
                field.modified = field.modified.map((item: any) => ({
                    old: cleanNotesArray([item.old])[0],
                    new: cleanNotesArray([item.new])[0]
                }));
            }
        }

        const hasChanges =
            field.added?.length > 0 || field.removed?.length > 0 || field.modified?.length > 0;

        if (!hasChanges) return null;

        const sectionId = title.toLowerCase().replace(/\s+/g, '-');
        const isExpanded = expandedSections.has(sectionId);
        const unchangedCount = field.unchanged?.length || 0;
        const showLimit = 3;

        return (
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Version 1 */}
                    <div className="space-y-2">
                        {/* Removed items */}
                        {field.removed?.map((item: any, idx: number) => (
                            <div
                                key={`removed-${idx}`}
                                className="p-3 bg-red-50 border border-red-200 rounded-lg"
                            >
                                <div className="flex items-start gap-2">
                                    <Minus className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-red-900">{getItemText(item)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Modified items (old) */}
                        {field.modified?.map((item: any, idx: number) => (
                            <div
                                key={`modified-old-${idx}`}
                                className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                            >
                                <div className="flex items-start gap-2">
                                    <Edit3 className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-yellow-900">{getItemText(item.old)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Unchanged items - Left */}
                        {field.unchanged?.slice(0, isExpanded ? unchangedCount : showLimit).map((item: any, idx: number) => (
                            <div
                                key={`unchanged-left-${idx}`}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
                            >
                                <span className="text-sm text-gray-600">{getItemText(item)}</span>
                            </div>
                        ))}
                        {unchangedCount > showLimit && (
                            <button
                                onClick={() => toggleSection(sectionId)}
                                className="text-xs text-blue-600 hover:text-blue-800 pl-3 py-1 underline"
                            >
                                {isExpanded
                                    ? 'Show less'
                                    : `+${unchangedCount - showLimit} more unchanged`}
                            </button>
                        )}
                    </div>

                    {/* Right: Version 2 */}
                    <div className="space-y-2">
                        {/* Added items */}
                        {field.added?.map((item: any, idx: number) => (
                            <div
                                key={`added-${idx}`}
                                className="p-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <div className="flex items-start gap-2">
                                    <Plus className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-green-900">{getItemText(item)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Modified items (new) */}
                        {field.modified?.map((item: any, idx: number) => (
                            <div
                                key={`modified-new-${idx}`}
                                className="p-3 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <div className="flex items-start gap-2">
                                    <Edit3 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-green-900">{getItemText(item.new)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Unchanged items - Right */}
                        {field.unchanged?.slice(0, isExpanded ? unchangedCount : showLimit).map((item: any, idx: number) => (
                            <div
                                key={`unchanged-right-${idx}`}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
                            >
                                <span className="text-sm text-gray-600">{getItemText(item)}</span>
                            </div>
                        ))}
                        {unchangedCount > showLimit && (
                            <button
                                onClick={() => toggleSection(sectionId)}
                                className="text-xs text-blue-600 hover:text-blue-800 pl-3 py-1 underline"
                            >
                                {isExpanded
                                    ? 'Show less'
                                    : `+${unchangedCount - showLimit} more unchanged`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderObjectDiff = (field: any, title: string) => {
        if (!field || field.changeType === 'unchanged') {
            return null;
        }

        const renderObjectContent = (obj: any) => {
            if (!obj) return <span className="text-gray-400 italic">Not set</span>;

            const formatValue = (value: any): string => {
                if (value === null || value === undefined) return 'null';
                if (typeof value === 'string') return value;
                if (typeof value === 'number' || typeof value === 'boolean') return String(value);
                if (Array.isArray(value)) {
                    // Format array items
                    if (value.length === 0) return '[]';
                    if (typeof value[0] === 'string') return value.join(', ');
                    // For array of objects, show each item
                    return value.map((item) => {
                        if (typeof item === 'object' && item !== null) {
                            const parts = Object.entries(item)
                                .filter(([k]) => !k.startsWith('_') && !k.startsWith('$'))
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ');
                            return parts || JSON.stringify(item);
                        }
                        return String(item);
                    }).join(' | ');
                }
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }
                return String(value);
            };

            return (
                <div className="space-y-2">
                    {Object.entries(obj).map(([key, value]) => (
                        <div key={key}>
                            <span className="font-medium text-gray-700">{key}: </span>
                            <span className="text-gray-600">{formatValue(value)}</span>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Version 1 */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-2">Version 1</div>
                        {renderObjectContent(field.old)}
                    </div>

                    {/* Right: Version 2 */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-2">Version 2</div>
                        {renderObjectContent(field.new)}
                    </div>
                </div>
                {field.changes && Object.keys(field.changes).length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-xs font-semibold text-yellow-800 mb-2">Changed:</div>
                        {Object.entries(field.changes).map(([key, change]: [string, any]) => {
                            const formatValue = (value: any): string => {
                                if (value === null || value === undefined) return 'null';
                                if (typeof value === 'string') return value;
                                if (typeof value === 'number' || typeof value === 'boolean') return String(value);
                                if (Array.isArray(value)) {
                                    if (value.length === 0) return '[]';
                                    return value.map((item) => {
                                        if (typeof item === 'object' && item !== null) {
                                            return Object.entries(item)
                                                .filter(([k]) => !k.startsWith('_') && !k.startsWith('$'))
                                                .map(([k, v]) => `${k}: ${v}`)
                                                .join(', ');
                                        }
                                        return String(item);
                                    }).join(' | ');
                                }
                                if (typeof value === 'object') return JSON.stringify(value);
                                return String(value);
                            };

                            return (
                                <div key={key} className="text-xs text-yellow-900 mb-1">
                                    <span className="font-medium">{key}:</span>{' '}
                                    <span className="line-through text-red-700">{formatValue(change.old)}</span>
                                    {' → '}
                                    <span className="text-green-700">{formatValue(change.new)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <GitCompare className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Compare Versions
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        View changes between spec versions
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Version Selectors */}
                        <div className="p-6 border-b border-gray-200 bg-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Version 1 (Base)
                                    </label>
                                    <select
                                        value={version1}
                                        onChange={(e) => setVersion1(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {versions.map((v) => (
                                            <option key={v.version_number} value={v.version_number}>
                                                v{v.version_number} - {v.change_summary} (
                                                {new Date(v.created_at).toLocaleDateString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Version 2 (Compare)
                                    </label>
                                    <select
                                        value={version2}
                                        onChange={(e) => setVersion2(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {versions.map((v) => (
                                            <option key={v.version_number} value={v.version_number}>
                                                v{v.version_number} - {v.change_summary} (
                                                {new Date(v.created_at).toLocaleDateString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {comparison && !loading && (
                                <div>
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                            <div className="text-2xl font-bold text-green-700">
                                                {comparison.summary.addedItems}
                                            </div>
                                            <div className="text-sm text-green-600">Added</div>
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div className="text-2xl font-bold text-red-700">
                                                {comparison.summary.removedItems}
                                            </div>
                                            <div className="text-sm text-red-600">Removed</div>
                                        </div>
                                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="text-2xl font-bold text-yellow-700">
                                                {comparison.summary.modifiedItems}
                                            </div>
                                            <div className="text-sm text-yellow-600">Modified</div>
                                        </div>
                                    </div>

                                    {/* Header Row */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="font-semibold text-gray-900">
                                                Version {comparison.metadata.version1.number}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(
                                                    comparison.metadata.version1.createdAt
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-semibold text-gray-900">
                                                Version {comparison.metadata.version2.number}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(
                                                    comparison.metadata.version2.createdAt
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comparison Sections */}
                                    {renderArrayDiff(comparison.changes.deliverables, 'Deliverables')}
                                    {renderArrayDiff(
                                        comparison.changes.specifications,
                                        'Technical Specifications'
                                    )}
                                    {renderArrayDiff(comparison.changes.exclusions, 'Exclusions')}
                                    {renderArrayDiff(comparison.changes.notes, 'Notes')}
                                    {renderObjectDiff(comparison.changes.timeline, 'Timeline')}
                                    {renderObjectDiff(comparison.changes.budget, 'Budget')}

                                    {comparison.summary.totalChanges === 0 && (
                                        <div className="text-center py-12 text-gray-500">
                                            No differences found between these versions
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
