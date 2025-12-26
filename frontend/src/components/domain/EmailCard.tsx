'use client';

import { Email } from '@/lib/api/queries/emails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Clock } from 'lucide-react';
import Link from 'next/link';

// Extended email type that includes optional snippet
interface EmailWithSnippet extends Email {
  snippet?: string;
}

interface EmailCardProps {
  email: EmailWithSnippet;
}

// Get plain text preview from HTML
function getPreviewText(html: string, maxLength: number = 100): string {
  if (!html) return '';

  const text = html.replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
}

export function EmailCard({ email }: EmailCardProps) {
  const previewText = email.snippet || getPreviewText(email.body);

  return (
    <Link href={`/emails/${email.id}`}>
      <Card className="border-2 border-blue-500 dark:border-white/10 bg-white/90 backdrop-blur-sm dark:bg-black cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold line-clamp-2 text-slate-800 dark:text-white">
            {email.subject}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60">
            <Mail className="w-4 h-4" />
            <span className="line-clamp-1">{email.from}</span>
          </div>

          {previewText && (
            <p className="text-sm text-slate-600 dark:text-white/60 line-clamp-2">
              {previewText}
            </p>
          )}

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/50 pt-2">
            <Clock className="w-3 h-3" />
            <span>{new Date(email.date).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
