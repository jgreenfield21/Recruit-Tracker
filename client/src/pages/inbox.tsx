import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatET } from "@/lib/date-utils";
import DOMPurify from "dompurify";
import {
  Inbox as InboxIcon,
  RefreshCw,
  Loader2,
  Mail,
  MailOpen,
  ArrowLeft,
  Send,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { IncomingEmail } from "@shared/schema";

type EnrichedEmail = IncomingEmail & { coachName: string; school: string };

export default function InboxPage() {
  const { toast } = useToast();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: emails = [], isLoading } = useQuery<EnrichedEmail[]>({
    queryKey: ["/api/inbox"],
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync-inbox");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/unread-count"] });
      toast({
        title: "Inbox synced",
        description: `${data.newCount} new email(s) from coaches`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Could not sync inbox",
        variant: "destructive",
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/inbox/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/unread-count"] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const res = await apiRequest("POST", `/api/inbox/${id}/reply`, { body });
      return res.json();
    },
    onSuccess: () => {
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Reply sent", description: "Your reply has been sent and logged as a contact." });
    },
    onError: (error: any) => {
      toast({
        title: "Reply failed",
        description: error.message || "Could not send reply",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inbox/${id}`);
    },
    onSuccess: () => {
      setSelectedEmailId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inbox/unread-count"] });
      toast({ title: "Email deleted" });
    },
  });

  const handleSelectEmail = (email: EnrichedEmail) => {
    setSelectedEmailId(email.id);
    setReplyBody("");
    if (!email.isRead) {
      markReadMutation.mutate(email.id);
    }
  };

  useEffect(() => {
    syncMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return formatET(dateStr);
    } catch {
      return dateStr;
    }
  };

  const getPreview = (email: EnrichedEmail) => {
    const text = email.bodyText || "";
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  };

  if (selectedEmail) {
    return (
      <div className="max-w-4xl mx-auto space-y-4" data-testid="inbox-detail">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEmailId(null)}
            data-testid="button-back-to-inbox"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Inbox
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg" data-testid="text-email-subject">
                  {selectedEmail.subject || "(No subject)"}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span data-testid="text-email-from">
                    From: {selectedEmail.coachName} &lt;{selectedEmail.fromEmail}&gt;
                  </span>
                </div>
                {selectedEmail.school && (
                  <div className="text-sm text-muted-foreground" data-testid="text-email-school">
                    {selectedEmail.school}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1" data-testid="text-email-date">
                  {formatDate(selectedEmail.receivedAt)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(selectedEmail.id)}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-email"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border rounded-md p-4 bg-muted/30 min-h-[200px] overflow-auto"
              data-testid="email-body"
            >
              {selectedEmail.bodyHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.bodyHtml, { ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'hr'], ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'rel'], FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'] }) }}
                  className="prose dark:prose-invert max-w-none text-sm"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {selectedEmail.bodyText || "(No content)"}
                </pre>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">Reply</h3>
              <Textarea
                placeholder="Type your reply..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={5}
                data-testid="input-reply-body"
              />
              <div className="flex justify-end mt-2">
                <Button
                  onClick={() => replyMutation.mutate({ id: selectedEmail.id, body: replyBody })}
                  disabled={!replyBody.trim() || replyMutation.isPending}
                  data-testid="button-send-reply"
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4" data-testid="inbox-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5" />
          <h1 className="text-2xl font-bold" data-testid="text-inbox-title">Inbox</h1>
          {emails.filter((e) => !e.isRead).length > 0 && (
            <Badge variant="default" data-testid="badge-inbox-unread">
              {emails.filter((e) => !e.isRead).length} unread
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-inbox"
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync
        </Button>
      </div>

      {syncMutation.isPending && emails.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Syncing your inbox...</span>
        </div>
      )}

      {!isLoading && !syncMutation.isPending && emails.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <InboxIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No messages</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              No emails from coaches found. Make sure your iCloud Mail is configured in Settings, then click Sync to check for new messages.
            </p>
          </CardContent>
        </Card>
      )}

      {emails.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="divide-y">
                {emails.map((email) => (
                  <button
                    key={email.id}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                      !email.isRead ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleSelectEmail(email)}
                    data-testid={`inbox-item-${email.id}`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {email.isRead ? (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm truncate ${!email.isRead ? "font-semibold" : ""}`}
                          data-testid={`text-sender-${email.id}`}
                        >
                          {email.coachName}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0" data-testid={`text-date-${email.id}`}>
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>
                      {email.school && (
                        <div className="text-xs text-muted-foreground">{email.school}</div>
                      )}
                      <div
                        className={`text-sm truncate mt-0.5 ${!email.isRead ? "font-medium" : "text-muted-foreground"}`}
                      >
                        {email.subject || "(No subject)"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {getPreview(email)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
