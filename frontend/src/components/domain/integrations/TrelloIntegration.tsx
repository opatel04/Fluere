'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, KanbanSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  useTrelloStatus,
  useConnectTrello,
  useDisconnectTrello,
  useTrelloCallback
} from '@/lib/api/queries/oauth';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function TrelloIntegration() {
  const searchParams = useSearchParams();
  const { data: status, isLoading: statusLoading, refetch } = useTrelloStatus();
  const connectMutation = useConnectTrello();
  const disconnectMutation = useDisconnectTrello();
  const callbackMutation = useTrelloCallback();
  const callbackProcessedRef = useRef(false);

  // Handle Trello OAuth callback (token in URL fragment)
  useEffect(() => {
    const trelloCallback = searchParams.get('trello');

    if (trelloCallback === 'callback' && !callbackProcessedRef.current) {
      // Trello returns token in URL fragment (#token=xxx)
      const hash = window.location.hash;
      const tokenMatch = hash.match(/token=([^&]+)/);

      if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        // Mark as processed immediately to prevent duplicate calls
        callbackProcessedRef.current = true;
        // Clean up URL immediately
        window.history.replaceState({}, '', '/settings');

        callbackMutation.mutate(token, {
          onSuccess: () => {
            toast.success('Trello connected successfully!');
            refetch();
          },
          onError: (error: any) => {
            toast.error(`Failed to connect Trello: ${error.message}`);
            // Reset on error so user can retry
            callbackProcessedRef.current = false;
          },
        });
      } else {
        toast.error('No Trello token found in callback');
        // Clean up URL
        window.history.replaceState({}, '', '/settings');
      }
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    connectMutation.mutate(undefined, {
      onError: (error: any) => {
        toast.error(error.message || 'Failed to connect Trello');
      },
    });
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your Trello account?')) {
      disconnectMutation.mutate();
    }
  };

  if (statusLoading || callbackMutation.isPending) {
    return (
      <div className="flex items-center gap-3">
        <KanbanSquare className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <h3 className="font-semibold">Trello</h3>
          <p className="text-sm text-muted-foreground">
            {callbackMutation.isPending ? 'Completing connection...' : 'Checking connection status...'}
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <KanbanSquare className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <h3 className="font-semibold">Trello</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Trello account to sync tasks and manage boards
          </p>
        </div>
        {status?.connected ? (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Trello'
            )}
          </Button>
        )}
      </div>

      {status?.connected && (status?.username || status?.fullName) && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Connected as <strong>{status.fullName || status.username}</strong>
          </AlertDescription>
        </Alert>
      )}

      {!status?.connected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connect your Trello account to:
            <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
              <li>Automatically create Trello cards from email tasks</li>
              <li>Sync tasks between TaskSnap and Trello boards</li>
              <li>Access your Trello boards and lists</li>
              <li>Configure board automation rules</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
