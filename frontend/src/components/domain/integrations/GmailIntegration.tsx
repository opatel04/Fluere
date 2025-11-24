'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGmailStatus, useConnectGmail, useDisconnectGmail } from '@/lib/api/queries/oauth';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function GmailIntegration() {
  const searchParams = useSearchParams();
  const { data: status, isLoading: statusLoading, refetch } = useGmailStatus();
  const connectMutation = useConnectGmail();
  const disconnectMutation = useDisconnectGmail();

  // Handle OAuth callback
  useEffect(() => {
    const gmailStatus = searchParams.get('gmail');
    if (gmailStatus === 'success') {
      toast.success('Gmail connected successfully!');
      refetch();
      // Clean up URL
      window.history.replaceState({}, '', '/settings');
    } else if (gmailStatus === 'error') {
      const error = searchParams.get('error') || 'Unknown error';
      toast.error(`Failed to connect Gmail: ${error}`);
      // Clean up URL
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, refetch]);

  const handleConnect = () => {
    connectMutation.mutate(undefined, {
      onError: (error: any) => {
        toast.error(error.message || 'Failed to connect Gmail');
      },
    });
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your Gmail account?')) {
      disconnectMutation.mutate();
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <h3 className="font-semibold">Gmail</h3>
          <p className="text-sm text-muted-foreground">Checking connection status...</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <h3 className="font-semibold">Gmail</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Gmail account to enable email processing and AI task extraction
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
              'Connect Gmail'
            )}
          </Button>
        )}
      </div>

      {status?.connected && status?.email && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Connected as <strong>{status.email}</strong>
          </AlertDescription>
        </Alert>
      )}

      {!status?.connected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connect your Gmail account to:
            <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
              <li>Automatically fetch and process emails</li>
              <li>Extract tasks from email content using AI</li>
              <li>Detect follow-ups from clients</li>
              <li>Subscribe to real-time email notifications</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
