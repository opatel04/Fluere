'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OAuthDebugger() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const testGmailConnect = async () => {
    try {
      console.log('Testing Gmail connect with userId:', user?.id);
      const response = await fetch(
        `http://localhost:3000/api/v1/auth/gmail/connect?userId=${user?.id}`
      );
      const data = await response.json();
      console.log('Gmail connect response:', data);
      if (data.data?.authUrl) {
        console.log('Redirecting to:', data.data.authUrl);
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      console.error('Gmail connect error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold">User Info:</p>
          <pre className="text-xs bg-muted p-2 rounded mt-1">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-sm font-semibold">Token:</p>
          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
            {token ? `${token.substring(0, 50)}...` : 'No token'}
          </pre>
        </div>
        <Button onClick={testGmailConnect}>
          Test Gmail Connect (Direct Fetch)
        </Button>
      </CardContent>
    </Card>
  );
}
