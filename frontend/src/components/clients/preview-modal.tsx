'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Email, Task } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, Mail } from 'lucide-react';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  email?: Email | null;
  task?: Task | null;
}

/**
 * Strips images from HTML content while preserving other formatting and decoding entities
 */
function stripImages(html: string): string {
  if (!html) return '';

  // Use DOMParser for proper HTML parsing and entity decoding
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove all img elements
  const images = doc.querySelectorAll('img');
  images.forEach(img => img.remove());

  // Remove elements with background images
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    const style = (el as HTMLElement).style;
    if (style && style.backgroundImage) {
      style.backgroundImage = '';
    }
  });

  // Get the cleaned HTML from body
  let cleaned = doc.body.innerHTML;

  // Convert line breaks to <br> if not already HTML
  if (!cleaned.includes('<p>') && !cleaned.includes('<div>') && cleaned.includes('\n')) {
    cleaned = cleaned.replace(/\n/g, '<br>');
  }

  return cleaned;
}

export function PreviewModal({ open, onClose, email, task }: PreviewModalProps) {
  // Debug: Log email data to console
  if (email && open) {
    console.log('Email data:', email);
    console.log('Available fields:', Object.keys(email));
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper to format sender info
  const formatSender = (email: Email) => {
    // Use new fields (sender, sender_email) or fall back to old field (from)
    const senderName = email.sender || email.from;
    const senderEmail = email.sender_email;

    if (!senderName && !senderEmail) {
      return { name: 'Unknown Sender', email: '' };
    }

    // If from field has format "Name <email>"
    if (senderName && senderName.includes('<')) {
      const parts = senderName.split('<');
      return {
        name: parts[0].trim(),
        email: parts[1].replace('>', '').trim(),
      };
    }

    return {
      name: senderName || senderEmail || 'Unknown',
      email: senderEmail || '',
    };
  };

  // Helper to format recipient
  const formatRecipient = (email: Email) => {
    // Use new field (recipients) or fall back to old field (to)
    const recipient = email.recipients || email.to;

    if (!recipient) return '';

    if (recipient.includes('<')) {
      return recipient.split('<')[1].replace('>', '').trim();
    }

    return recipient;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'open':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        {email && (
          <>
            <DialogHeader className="space-y-0 pb-0">
              <DialogTitle className="sr-only">Email Preview</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col h-full -mt-2">
              {/* Gmail-style Email Header - Fixed */}
              <div className="border-b pb-4 flex-shrink-0">
                <h2 className="text-xl font-semibold mb-3">{email.subject}</h2>

                {/* Sender and Date Row */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    {(() => {
                      const sender = formatSender(email);
                      return (
                        <div className="font-medium text-sm">
                          {sender.name}
                          {sender.email && (
                            <span className="font-normal text-muted-foreground">
                              {' <'}{sender.email}{'>'}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="text-sm text-muted-foreground mt-0.5">
                      To: {formatRecipient(email) || 'Not specified'}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(email.received_at || email.date || email.created_at)}
                  </div>
                </div>
              </div>

              {/* Email Body - Scrollable */}
              <div className="pt-4 pb-2 flex-1 overflow-y-auto min-h-0">
                {email.body ? (
                  <div
                    className="email-content"
                    dangerouslySetInnerHTML={{
                      __html: stripImages(email.body),
                    }}
                    style={{
                      fontSize: '14px',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  />
                ) : email.snippet ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {email.snippet}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No email content available
                  </div>
                )}
              </div>

              {/* Actions - Fixed */}
              <div className="border-t pt-4 flex justify-between items-center flex-shrink-0">
                <div>
                  {email.gmail_link && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={email.gmail_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-3 w-3" />
                        View in Gmail
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            <style jsx global>{`
              .email-content {
                font-family: inherit;
                line-height: 1.6;
              }
              .email-content p {
                margin: 0 0 1em 0;
                line-height: 1.6;
              }
              .email-content p:last-child {
                margin-bottom: 0;
              }
              .email-content br {
                display: block;
                content: "";
                margin-top: 0.5em;
              }
              .email-content div {
                margin-bottom: 0.5em;
              }
              .email-content a {
                color: #1a73e8;
                text-decoration: none;
              }
              .email-content a:hover {
                text-decoration: underline;
              }
              .email-content strong, .email-content b {
                font-weight: 600;
              }
              .email-content ul, .email-content ol {
                margin: 0.5em 0;
                padding-left: 1.5em;
              }
              .email-content li {
                margin: 0.25em 0;
              }
            `}</style>
          </>
        )}

        {task && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Task Preview
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task Header */}
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{task.title}</h2>

                <div className="flex flex-wrap gap-2">
                  {task.status && (
                    <Badge variant={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  )}
                  {task.priority && (
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority} priority
                    </Badge>
                  )}
                  {task.source && (
                    <Badge variant="outline">
                      {task.source}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(task.created_at)}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {formatDate(task.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Description */}
              {task.description && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    {task.description}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {task.status === 'completed' && (
                  <Button asChild>
                    <a
                      href={`https://trello.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      View in Trello
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
