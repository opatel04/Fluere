'use client';

import { useEmails } from '@/lib/api/queries/emails';
import { EmailCard } from '@/components/domain/EmailCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useGmailStore, GmailEmail } from '@/lib/store/gmailStore';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

// Clean email content - extract readable text, remove URLs and tracking
function cleanEmailContent(content: string): string {
  if (!content) return '';

  let text = content;

  // First, if it's HTML, extract text content
  if (typeof window !== 'undefined' && text.includes('<')) {
    const tmp = document.createElement('div');
    tmp.innerHTML = text;
    // Remove scripts, styles, images
    tmp.querySelectorAll('script, style, img, picture, video, audio, iframe').forEach(el => el.remove());
    text = tmp.textContent || tmp.innerText || '';
  }

  // Remove URLs in parentheses: "Text ( https://... )" -> "Text"
  text = text.replace(/\s*\(\s*https?:\/\/[^)]+\)/gi, '');

  // Remove standalone URLs
  text = text.replace(/https?:\/\/[^\s]+/gi, '');

  // Remove invisible/padding characters (zero-width spaces, soft hyphens, etc.)
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u2060-\u206F\u3164\uFFA0]/g, '');

  // Remove repeated special characters used for padding
  text = text.replace(/[͏­]+/g, ''); // Common email padding chars

  // Remove arrows and decorative markers
  text = text.replace(/-->/g, '');
  text = text.replace(/<--/g, '');

  // Clean up asterisks used as separators
  text = text.replace(/\*{3,}/g, '\n\n');

  // Normalize whitespace - collapse multiple spaces/newlines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');

  // Clean up lines - remove lines that are just whitespace
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Remove duplicate consecutive lines
  const uniqueLines: string[] = [];
  for (const line of lines) {
    if (uniqueLines.length === 0 || uniqueLines[uniqueLines.length - 1] !== line) {
      uniqueLines.push(line);
    }
  }

  return uniqueLines.join('\n\n');
}

// Get plain text preview for cards
function getPlainTextPreview(content: string, maxLength: number = 150): string {
  const cleaned = cleanEmailContent(content);
  if (!cleaned) return '(No text content)';

  // Get first meaningful line
  const firstLine = cleaned.split('\n')[0] || '';

  if (firstLine.length > maxLength) {
    return firstLine.slice(0, maxLength) + '...';
  }
  return firstLine;
}

export default function EmailsPage() {
  const { data: inboundEmails, isLoading: inboundLoading, error } = useEmails();
  const { emails: gmailEmails, setEmails: setGmailEmails } = useGmailStore();
  const [isFetching, setIsFetching] = useState(false);
  const user = useAuthStore((state) => state.user);
  const hasFetched = gmailEmails.length > 0;

  const handleFetchFromGmail = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsFetching(true);
    try {
      const response = await apiClient.get(`/emails/fetch?userId=${user.id}&maxResults=20`);
      if (response.data.success) {
        const fetchedEmails = response.data.data.emails || [];
        // Transform Gmail emails to our format
        const transformed: GmailEmail[] = fetchedEmails.map((email: any) => {
          const rawBody = email.body || email.snippet || '';
          // Clean the email content - remove URLs, tracking, get readable text
          const cleanedBody = cleanEmailContent(rawBody);
          // Plain text preview for cards
          const preview = getPlainTextPreview(rawBody);

          return {
            id: email.messageId,
            messageId: email.messageId,
            subject: email.subject || '(No subject)',
            from: email.from || '',
            to: email.to || '',
            date: email.date || email.internalDate || new Date().toISOString(),
            body: cleanedBody, // Store cleaned readable text
            snippet: preview, // Store plain text preview
            labels: email.labels,
            status: email.labels?.includes('UNREAD') ? 'unread' : 'read',
            created_at: email.date || email.internalDate || new Date().toISOString(),
            updated_at: email.date || email.internalDate || new Date().toISOString(),
          };
        });
        setGmailEmails(transformed);
        toast.success(`Fetched ${transformed.length} emails from Gmail`);
      }
    } catch (err: any) {
      console.error('Failed to fetch Gmail emails:', err);
      if (err.response?.status === 401 || err.response?.status === 404) {
        toast.error('Gmail not connected. Go to Settings to connect your Gmail account.');
      } else {
        toast.error(err.response?.data?.error?.message || 'Failed to fetch emails from Gmail');
      }
    } finally {
      setIsFetching(false);
    }
  };

  // Combine inbound emails with Gmail emails
  const allEmails = [...gmailEmails, ...(inboundEmails || [])];

  const emails = {
    all: allEmails,
    unread: allEmails.filter((email) => email.status === 'unread'),
    read: allEmails.filter((email) => email.status === 'read'),
    archived: allEmails.filter((email) => email.status === 'archived'),
  };

  const isLoading = inboundLoading && !hasFetched;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Emails</h1>
            <p className="text-slate-600 dark:text-white/50 text-base">Manage your emails and extract tasks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Emails</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Manage your emails and extract tasks</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <p className="text-slate-600 dark:text-white/60">Error loading emails. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Emails</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Manage your emails and extract tasks</p>
        </div>
        <Button
          onClick={handleFetchFromGmail}
          disabled={isFetching}
          className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
        >
          {isFetching ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {isFetching ? 'Fetching...' : 'Fetch from Gmail'}
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            All ({emails.all.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            Unread ({emails.unread.length})
          </TabsTrigger>
          <TabsTrigger value="read" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            Read ({emails.read.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            Archived ({emails.archived.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {emails.all.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emails.all.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg">
              <div className="text-center space-y-4">
                <Mail className="w-12 h-12 mx-auto text-slate-400 dark:text-white/30" />
                <p className="text-slate-600 dark:text-white/60 text-lg font-medium">No emails yet</p>
                <p className="text-slate-500 dark:text-white/40 text-sm">Get started by adding your first email</p>
                <Button
                  onClick={handleFetchFromGmail}
                  disabled={isFetching}
                  className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
                >
                  {isFetching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isFetching ? 'Fetching...' : 'Fetch from Gmail'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-6">
          {emails.unread.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emails.unread.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg">
              <div className="text-center space-y-4">
                <Mail className="w-12 h-12 mx-auto text-slate-400 dark:text-white/30" />
                <p className="text-slate-600 dark:text-white/60 text-lg font-medium">No unread emails</p>
                <p className="text-slate-500 dark:text-white/40 text-sm">All caught up!</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="read" className="space-y-6">
          {emails.read.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emails.read.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg">
              <div className="text-center space-y-4">
                <Mail className="w-12 h-12 mx-auto text-slate-400 dark:text-white/30" />
                <p className="text-slate-600 dark:text-white/60 text-lg font-medium">No read emails</p>
                <p className="text-slate-500 dark:text-white/40 text-sm">Read emails will appear here</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          {emails.archived.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {emails.archived.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg">
              <div className="text-center space-y-4">
                <Mail className="w-12 h-12 mx-auto text-slate-400 dark:text-white/30" />
                <p className="text-slate-600 dark:text-white/60 text-lg font-medium">No archived emails</p>
                <p className="text-slate-500 dark:text-white/40 text-sm">Archived emails will appear here</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


