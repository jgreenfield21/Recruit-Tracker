import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Send,
  Users,
  FileText,
  Eye,
  Loader2,
  Clock,
  Calendar,
  X,
  AlertCircle,
  Search,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach, EmailTemplate, EmailSettings, ScheduledEmail, RecruitingProfile } from "@shared/schema";
import { divisionOptions } from "@shared/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link, Globe, Video, Paperclip, X as XIcon, File } from "lucide-react";

interface AttachmentFile {
  name: string;
  size: number;
  file: File;
}

export default function Compose() {
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewCoachId, setPreviewCoachId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [coachSearch, setCoachSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const newAttachments: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `File ${file.name} is too large (max 10MB)`, variant: "destructive" });
        continue;
      }
      newAttachments.push({
        name: file.name,
        size: file.size,
        file: file,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const { data: coaches, isLoading: loadingCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: emailSettings, isLoading: loadingSettings } = useQuery<EmailSettings>({
    queryKey: ["/api/email-settings"],
  });

  const { data: scheduledEmails, isLoading: loadingScheduled } = useQuery<ScheduledEmail[]>({
    queryKey: ["/api/scheduled-emails"],
  });

  const { data: profiles } = useQuery<RecruitingProfile[]>({
    queryKey: ["/api/recruiting-profiles"],
  });

  const filteredCoaches = useMemo(() => {
    if (!coaches) return [];
    return coaches.filter((coach) => {
      if (divisionFilter !== "all" && coach.division !== divisionFilter) return false;
      if (coachSearch.trim()) {
        const q = coachSearch.toLowerCase();
        return (
          coach.name.toLowerCase().includes(q) ||
          coach.school.toLowerCase().includes(q) ||
          coach.email.toLowerCase().includes(q) ||
          (coach.position && coach.position.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [coaches, coachSearch, divisionFilter]);

  const insertProfileLink = (profile: RecruitingProfile) => {
    const linkText = `[${profile.name}](${profile.url})`;
    setBody((prev) => prev + (prev ? "\n" : "") + linkText);
  };

  const getProfileIcon = (icon: string | null | undefined) => {
    switch (icon) {
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (data: { coachIds: string[]; subject: string; body: string; attachments?: { filename: string; content: string }[] }) => {
      const res = await apiRequest("POST", "/api/send-emails", data);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { message: "Emails sent successfully!" };
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      const results = Array.isArray(data?.results) ? data.results : [];
      const failed = results.filter((r: any) => !r.success);
      if (failed.length > 0) {
        toast({
          title: `${results.length - failed.length} sent, ${failed.length} failed`,
          description: failed.map((f: any) => f.error).join("; "),
          variant: "destructive",
        });
      } else {
        toast({ title: data?.message || "Emails sent successfully!" });
      }
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send emails",
        description: error.message || "Please check your iCloud Mail settings.",
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: { coachIds: string[]; subject: string; body: string; scheduledAt: string }) =>
      apiRequest("POST", "/api/scheduled-emails", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-emails"] });
      toast({ title: "Emails scheduled successfully!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/scheduled-emails/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-emails"] });
      toast({ title: "Scheduled email cancelled" });
    },
    onError: () => {
      toast({ title: "Failed to cancel", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedCoaches(new Set());
    setSubject("");
    setBody("");
    setSelectedTemplateId("");
    setScheduledDate("");
    setScheduledTime("");
    setAttachments([]);
  };

  const isLoading = loadingCoaches || loadingTemplates || loadingSettings || loadingScheduled;
  const isEmailConfigured = emailSettings?.configured;

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
    const filteredIds = filteredCoaches.map((c) => c.id);
    const allFilteredSelected = filteredIds.every((id) => selectedCoaches.has(id));
    if (allFilteredSelected) {
      const newSelected = new Set(selectedCoaches);
      filteredIds.forEach((id) => newSelected.delete(id));
      setSelectedCoaches(newSelected);
    } else {
      const newSelected = new Set(selectedCoaches);
      filteredIds.forEach((id) => newSelected.add(id));
      setSelectedCoaches(newSelected);
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSend = async () => {
    if (selectedCoaches.size === 0) {
      toast({ title: "Please select at least one coach", variant: "destructive" });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Please fill in subject and body", variant: "destructive" });
      return;
    }
    
    const attachmentData = await Promise.all(
      attachments.map(async (a) => ({
        filename: a.name,
        content: await fileToBase64(a.file),
      }))
    );
    
    sendMutation.mutate({
      coachIds: Array.from(selectedCoaches),
      subject,
      body,
      attachments: attachmentData,
    });
  };

  const handleSchedule = () => {
    if (selectedCoaches.size === 0) {
      toast({ title: "Please select at least one coach", variant: "destructive" });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Please fill in subject and body", variant: "destructive" });
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    
    if (new Date(scheduledAt) <= new Date()) {
      toast({ title: "Scheduled time must be in the future", variant: "destructive" });
      return;
    }

    scheduleMutation.mutate({
      coachIds: Array.from(selectedCoaches),
      subject,
      body,
      scheduledAt,
    });
  };

  const pendingScheduledEmails = scheduledEmails?.filter((e) => e.status === "pending") || [];

  const getScheduledCoachNames = (coachIdsJson: string) => {
    try {
      const ids = JSON.parse(coachIdsJson) as string[];
      return ids.map((id) => coaches?.find((c) => c.id === id)?.name || "Unknown").join(", ");
    } catch {
      return "Unknown";
    }
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

      {!isEmailConfigured && (
        <Alert variant="destructive" data-testid="alert-email-not-configured">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>iCloud Mail Not Configured</AlertTitle>
          <AlertDescription>
            Please configure your iCloud Mail settings to send emails.{" "}
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
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, school, email..."
                        value={coachSearch}
                        onChange={(e) => setCoachSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-coach-search"
                      />
                    </div>
                    <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-division-filter">
                        <SelectValue placeholder="Division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {divisionOptions.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={filteredCoaches.length > 0 && filteredCoaches.every((c) => selectedCoaches.has(c.id))}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium">
                        Select All ({filteredCoaches.length})
                      </Label>
                    </div>
                    {selectedCoaches.size > 0 && (
                      <span className="text-xs text-muted-foreground" data-testid="text-selected-count">
                        {selectedCoaches.size} total selected
                      </span>
                    )}
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {filteredCoaches.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-matches">
                          No coaches match your search
                        </div>
                      ) : (
                        filteredCoaches.map((coach) => (
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
                                {coach.division && (
                                  <span className="ml-1">({coach.division})</span>
                                )}
                              </div>
                            </Label>
                          </div>
                        ))
                      )}
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
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="body">Message *</Label>
                  {profiles && profiles.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-insert-link">
                          <Link className="h-4 w-4 mr-1" />
                          Insert Profile Link
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" align="end">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Insert a profile link</p>
                          <div className="space-y-1">
                            {profiles.map((profile) => (
                              <Button
                                key={profile.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => insertProfileLink(profile)}
                                data-testid={`button-insert-profile-${profile.id}`}
                              >
                                {getProfileIcon(profile.icon)}
                                <span className="ml-2 truncate">{profile.name}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <Textarea
                  id="body"
                  placeholder="Dear {{salutation}},

I am reaching out to introduce myself..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="input-email-body"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{coach_name}}"}, {"{{salutation}}"}, {"{{school}}"}, {"{{position}}"} to personalize
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Attachments</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov"
                    data-testid="input-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-add-attachment"
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Add File
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                        data-testid={`attachment-item-${index}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{attachment.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(index)}
                          data-testid={`button-remove-attachment-${index}`}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Max 10MB per file. Supported: PDF, Word, images, videos
                </p>
              </div>

              <Separator />

              <Tabs defaultValue="send-now" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="send-now" data-testid="tab-send-now">
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </TabsTrigger>
                  <TabsTrigger value="schedule" data-testid="tab-schedule">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="send-now" className="pt-4">
                  <Button
                    onClick={handleSend}
                    disabled={!isEmailConfigured || sendMutation.isPending || selectedCoaches.size === 0}
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
                </TabsContent>
                <TabsContent value="schedule" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schedule-date">Date</Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        data-testid="input-schedule-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-time">Time</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        data-testid="input-schedule-time"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSchedule}
                    disabled={scheduleMutation.isPending || selectedCoaches.size === 0}
                    className="w-full"
                    variant="secondary"
                    data-testid="button-schedule-emails"
                  >
                    {scheduleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule for {selectedCoaches.size} Coach{selectedCoaches.size !== 1 ? "es" : ""}
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {pendingScheduledEmails.length > 0 && (
            <Card data-testid="card-scheduled-emails">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Scheduled Emails
                  <Badge variant="secondary">{pendingScheduledEmails.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-3">
                    {pendingScheduledEmails.map((email) => (
                      <div
                        key={email.id}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                        data-testid={`scheduled-email-${email.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{email.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            To: {getScheduledCoachNames(email.coachIds)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(email.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => cancelScheduleMutation.mutate(email.id)}
                          disabled={cancelScheduleMutation.isPending}
                          data-testid={`button-cancel-scheduled-${email.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
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
