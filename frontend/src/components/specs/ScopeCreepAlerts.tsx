import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, DollarSign, FileText } from 'lucide-react';
import { specApi } from '@/lib/api/spec';
import { motion, AnimatePresence } from 'framer-motion';

interface ScopeCreepAlert {
    id: string;
    severity: 'low' | 'medium' | 'high';
    category: string;
    client_quote: string;
    ai_reasoning: string;
    estimated_hours?: number;
    created_at: string;
}

interface ScopeCreepAlertsProps {
    specId: string;
}

export const ScopeCreepAlerts: React.FC<ScopeCreepAlertsProps> = ({ specId }) => {
    const [alerts, setAlerts] = useState<ScopeCreepAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlerts();
    }, [specId]);

    const loadAlerts = async () => {
        try {
            const data = await specApi.getScopeCreepAlerts(specId);
            // Filter for pending alerts only
            setAlerts(data.filter((a: any) => a.status === 'pending'));
        } catch (error) {
            console.error('Failed to load alerts', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (alertId: string, resolution: string) => {
        try {
            await specApi.resolveScopeCreepAlert(alertId, resolution);
            // Remove from list
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Failed to resolve alert', error);
        }
    };

    if (loading) return null;
    if (alerts.length === 0) return null;

    return (
        <div className="mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Scope Creep Detected ({alerts.length})
            </h3>

            <AnimatePresence>
                {alerts.map(alert => (
                    <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 rounded-lg border ${alert.severity === 'high' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                alert.severity === 'medium' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                                    'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${alert.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                            alert.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        }`}>
                                        {alert.severity.toUpperCase()} SEVERITY
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {new Date(alert.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {alert.ai_reasoning}
                                </p>

                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-xs italic text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                    "{alert.client_quote}"
                                </div>

                                {alert.estimated_hours && (
                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        Estimated Impact: ~{alert.estimated_hours} hours
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => handleResolve(alert.id, 'billed')}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                                <DollarSign className="w-3 h-3" />
                                Bill Extra
                            </button>
                            <button
                                onClick={() => handleResolve(alert.id, 'spec_updated')}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                <FileText className="w-3 h-3" />
                                Update Spec
                            </button>
                            <button
                                onClick={() => handleResolve(alert.id, 'ignored')}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Ignore
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
