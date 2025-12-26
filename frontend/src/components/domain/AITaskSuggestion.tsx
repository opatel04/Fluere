'use client';

import { AISuggestion } from '@/lib/api/queries/emails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreateTask } from '@/lib/api/queries/tasks';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AITaskSuggestionProps {
  suggestion: AISuggestion;
}

export function AITaskSuggestion({ suggestion }: AITaskSuggestionProps) {
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      // Use AI-suggested values if available, otherwise use defaults
      await createTask.mutateAsync({
        title: suggestion.title,
        description: suggestion.description,
        status: suggestion.suggested_status || 'open', // AI-determined status
        priority: suggestion.suggested_priority || 'medium', // AI-determined priority
        due_date: suggestion.suggested_due_date, // AI-suggested due date
      });
      toast({
        title: 'Success',
        description: 'Task created from suggestion',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const confidencePercentage = Math.round(suggestion.confidence * 100);
  const confidenceColor = 
    confidencePercentage >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
    confidencePercentage >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' :
    'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';

  return (
    <Card className="border-2 border-blue-500 dark:border-white/10 bg-white/90 backdrop-blur-sm dark:bg-black hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                {suggestion.title}
              </CardTitle>
              <Badge className={cn('font-semibold text-xs', confidenceColor)}>
                {confidencePercentage}% confidence
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">
          {suggestion.description}
        </p>
        <Button
          onClick={handleAccept}
          disabled={createTask.isPending}
          className="w-full bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
        >
          {createTask.isPending ? (
            'Creating...'
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Accept & Create Task
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}


