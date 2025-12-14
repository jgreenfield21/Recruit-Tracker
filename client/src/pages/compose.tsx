import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Send,
  Users,
  FileText,
  Eye,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach, EmailTemplate, GmailSettings } from "@shared/schema";

export default function Compose() {
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewCoachId, setPreviewCoachId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: coaches, isLoading: loadingCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: gmailSettings, isLoading: loadingSettings } = useQuery<GmailSettings>({
    queryKey: ["/api/gmail-settings"],
  });

  const sendMutation = useMutation({
    mutationFn: (data: { coachIds: string[]; subject: string; body: string }) =>
      apiRequest("POST", "/api/send-emails", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Emails sent successfully!" });
      setSelectedCoaches(new Set());
      setSubject("");
      setBody("");
      setSelectedTemplateId("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send emails",
        description: error.message || "Please check your Gmail settings.",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingCoaches || loadingTemplates || loadingSettings;
  const isGmailConfigured = gmailSettings?.configured;

  const selectedTemplate = useMemo(() => {
    return templates?.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleCoachToggle = (coachId: string) => {
    const newSelected = new Set(selectedCoaches);
    if (newSelected.has(coachId)) {
      newSelected.delete(coachId);
    } else {
      newSelected.add(coachId);
    }
    setSelectedCoaches(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCoaches.size === coaches?.length) {
      setSelectedCoaches(new Set());
    } else {
      setSelectedCoaches(new Set(coaches?.map((c) => c.id) || []));
    }
  };

  const applyMergeFields = (text: string, coach: Coach) => {
    return text
      .replace(/\{\{coach_name\}\}/g, coach.name)
      .replace(/\{\{salutation\}\}/g, coach.salutation || coach.name.split(" ")[0])
      .replace(/\{\{school\}\}/g, coach.school)
      .replace(/\{\{position\}\}/g, coach.position || "Coach");
  };

  const previewCoach = useMemo(() => {
    if (previewCoachId) {
      return coaches?.find((c) => c.id === previewCoachId);
    }
    const firstSelected = Array.from(selectedCoaches)[0];
    return coaches?.find((c) => c.id === firstSelected);
  }, [previewCoachId, selectedCoaches, coaches]);

  const previewSubject = useMemo(() => {
    if (!previewCoach) return subject;
    return applyMergeFields(subject, previewCoach);
  }, [subject, previewCoach]);

  const previewBody = useMemo(() => {
    if (!previewCoach) return body;
    return applyMergeFields(body, previewCoach);
  }, [body, previewCoach]);

  const handleSend = () => {
    if (selectedCoaches.size === 0) {
      toast({ title: "Please select at least one coach", variant: "destructive" });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Please fill in subject and body", variant: "destructive" });
      return;
    }
    sendMutation.mutate({
      coachIds: Array.from(selectedCoaches),
      subject,
      body,
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-compose-title">Send Emails</h1>
        <p className="text-muted-foreground">
          Compose and send personalized emails to multiple coaches
        </p>
      </div>

      {!isGmailConfigured && (
        <Alert variant="destructive" data-testid="alert-gmail-not-configured">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gmail Not Configured</AlertTitle>
          <AlertDescription>
            Please configure your Gmail settings to send emails.{" "}
            <a href="/settings" className="underline font-medium">
              Go to Settings
            </a>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card data-testid="card-select-recipients">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Select Recipients
              </CardTitle>
              <Badge variant="secondary">
                {selectedCoaches.size} selected
              </Badge>
            </CardHeader>
            <CardContent>
              {!coaches || coaches.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No coaches found"
                  description="Add coaches first to send them emails."
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="select-all"
                      checked={selectedCoaches.size === coaches.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium">
                      Select All ({coaches.length})
                    </Label>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {coaches.map((coach) => (
                        <div
                          key={coach.id}
                          className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                          data-testid={`coach-recipient-${coach.id}`}
                        >
                          <Checkbox
                            id={`coach-${coach.id}`}
                            checked={selectedCoaches.has(coach.id)}
                            onCheckedChange={() => handleCoachToggle(coach.id)}
                            data-testid={`checkbox-coach-${coach.id}`}
                          />
                          <Label
                            htmlFor={`coach-${coach.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium text-sm">{coach.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {coach.school} - {coach.email}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-compose-email">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Compose Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template (Optional)</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={handleTemplateSelect}
                >
                  <SelectTrigger data-testid="select-email-template">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Introduction - Class of 2026 Volleyball Recruit"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-email-subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message *</Label>
                <Textarea
                  id="body"
                  placeholder="Dear {{salutation}},

I am reaching out to introduce myself..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="input-email-body"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{coach_name}}"}, {"{{salutation}}"}, {"{{school}}"}, {"{{position}}"} to personalize
                </p>
              </div>

              <Button
                onClick={handleSend}
                disabled={!isGmailConfigured || sendMutation.isPending || selectedCoaches.size === 0}
                className="w-full"
                data-testid="button-send-emails"
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedCoaches.size} Coach{selectedCoaches.size !== 1 ? "es" : ""}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-email-preview">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Email Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCoaches.size === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select coaches and compose your email to see a preview</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Preview for:</Label>
                  <Select
                    value={previewCoachId || Array.from(selectedCoaches)[0]}
                    onValueChange={setPreviewCoachId}
                  >
                    <SelectTrigger data-testid="select-preview-coach">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(selectedCoaches).map((coachId) => {
                        const coach = coaches?.find((c) => c.id === coachId);
                        return (
                          <SelectItem key={coachId} value={coachId}>
                            {coach?.name} - {coach?.school}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {previewCoach && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">To:</p>
                      <p className="text-sm font-medium" data-testid="text-preview-to">
                        {previewCoach.name} &lt;{previewCoach.email}&gt;
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                      <p className="text-sm font-medium" data-testid="text-preview-subject">
                        {previewSubject || "(No subject)"}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Message:</p>
                      <div
                        className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md min-h-[200px]"
                        data-testid="text-preview-body"
                      >
                        {previewBody || "(No message)"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
