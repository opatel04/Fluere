'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { specApi } from '@/lib/api/spec';
import { ProjectSpec } from '@/lib/types/spec';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Clock, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function SpecsPage() {
    const [specs, setSpecs] = useState<ProjectSpec[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSpecs = async () => {
            try {
                const data = await specApi.listSpecs();
                setSpecs(data);
            } catch (error) {
                console.error('Error fetching specs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSpecs();
    }, []);

    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Project Specs</h1>
                        <p className="text-slate-600 dark:text-white/50 text-base">Manage your project specifications</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Project Specs</h1>
                    <p className="text-slate-600 dark:text-white/50 text-base">Manage your project specifications</p>
                </div>
                {/* Placeholder for manual creation if needed later */}
                {/* <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Spec
        </Button> */}
            </div>

            {specs.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-white/70">No specs found</h3>
                    <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                        Generate specs from client emails to see them here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {specs.map((spec) => (
                        <Link key={spec.id} href={`/specs/${spec.id}`}>
                            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500 dark:hover:border-white/20">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <Badge variant={spec.status === 'locked' ? 'default' : 'secondary'}>
                                            {spec.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-4 text-xl">{spec.project_name}</CardTitle>
                                    <CardDescription>
                                        Version {spec.current_version}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                                        <Clock className="w-4 h-4 mr-1" />
                                        Updated {new Date(spec.updated_at).toLocaleDateString()}
                                    </div>
                                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm">
                                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
