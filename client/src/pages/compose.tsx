import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { formatET, toEasternISO } from "@/lib/date-utils";
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
  AlertTriangle,
  Search,
  Star,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Filter,
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
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach, Contact, EmailTemplate, EmailSettings, ScheduledEmail, RecruitingProfile } from "@shared/schema";
import { divisionOptions, coachStatusOptions } from "@shared/schema";
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

interface SendResult {
  coachId: string;
  coachName: string;
  coachEmail: string;
  school: string;
  success: boolean;
  error?: string;
}

interface SendReport {
  results: SendResult[];
  totalSent: number;
  totalFailed: number;
  aborted: boolean;
  timestamp: Date;
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
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [lastContactedFilter, setLastContactedFilter] = useState("none");
  const [sortMode, setSortMode] = useState<"name" | "school" | "state" | "status">("name");
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; failed: number; startTime: number; aborted: boolean } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showLargeSendWarning, setShowLargeSendWarning] = useState(false);
  const [sendReport, setSendReport] = useState<SendReport | null>(null);
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
    refetchInterval: 30000,
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: profiles } = useQuery<RecruitingProfile[]>({
    queryKey: ["/api/recruiting-profiles"],
  });

  const lastContactDateMap = useMemo(() => {
    const map = new Map<string, Date>();
    if (!contacts) return map;
    for (const contact of contacts) {
      const date = parseISO(contact.date);
      const existing = map.get(contact.coachId);
      if (!existing || date > existing) {
        map.set(contact.coachId, date);
      }
    }
    return map;
  }, [contacts]);

  const filteredCoaches = useMemo(() => {
    if (!coaches) return [];
    const filtered = coaches.filter((coach) => {
      if (favoriteFilter && !coach.favorite) return false;
      if (divisionFilter !== "all" && coach.division !== divisionFilter) return false;
      if (stateFilter !== "all" && (coach.state || "") !== stateFilter) return false;
      if (statusFilter !== "all" && coach.status !== statusFilter) return false;
      if (lastContactedFilter !== "none") {
        const days = parseInt(lastContactedFilter, 10);
        const lastDate = lastContactDateMap.get(coach.id);
        if (lastDate) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          if (lastDate >= cutoff) return false;
        }
      }
      if (coachSearch.trim()) {
        const q = coachSearch.toLowerCase();
        return (
          coach.name.toLowerCase().includes(q) ||
          coach.school.toLowerCase().includes(q) ||
          coach.email.toLowerCase().includes(q) ||
          (coach.position && coach.position.toLowerCase().includes(q)) ||
          (coach.state && coach.state.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return filtered.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "school") return a.school.localeCompare(b.school);
      if (sortMode === "state") return (a.state || "").localeCompare(b.state || "");
      if (sortMode === "status") return a.status.localeCompare(b.status);
      return 0;
    });
  }, [coaches, coachSearch, divisionFilter, stateFilter, statusFilter, favoriteFilter, lastContactedFilter, lastContactDateMap, sortMode]);

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

  const BATCH_SIZE = 15;

  const sendBatch = useCallback(async (
    coachIds: string[],
    subj: string,
    bodyText: string,
    attachmentData: { filename: string; content: string }[]
  ) => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/send-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      credentials: "include",
      body: JSON.stringify({
        coachIds,
        subject: subj,
        body: bodyText,
        attachments: attachmentData,
      }),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!res.ok && !data.results) {
        throw new Error(data.error || res.statusText);
      }
      return data;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(res.ok ? "Unknown response" : text || res.statusText);
      }
      throw e;
    }
  }, []);

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

  const uniqueStates = useMemo(() => {
    if (!coaches) return [];
    const stateSet = new Set<string>();
    for (const coach of coaches) {
      if (coach.state && coach.state.trim()) stateSet.add(coach.state.trim());
    }
    return Array.from(stateSet).sort();
  }, [coaches]);

  const RECIPIENT_CAP = 100;

  const handleSelectAll = () => {
    const filteredIds = filteredCoaches.map((c) => c.id);
    const allFilteredSelected = filteredIds.every((id) => selectedCoaches.has(id));
    if (allFilteredSelected) {
      const newSelected = new Set(selectedCoaches);
      filteredIds.forEach((id) => newSelected.delete(id));
      setSelectedCoaches(newSelected);
    } else {
      const newSelected = new Set(selectedCoaches);
      for (const id of filteredIds) {
        if (newSelected.size >= RECIPIENT_CAP) break;
        newSelected.add(id);
      }
      setSelectedCoaches(newSelected);
      if (filteredIds.length > RECIPIENT_CAP) {
        toast({ title: `Selection capped at ${RECIPIENT_CAP} recipients (iCloud limit)`, variant: "destructive" });
      }
    }
  };

  const handleCoachToggleWithCap = (coachId: string) => {
    const newSelected = new Set(selectedCoaches);
    if (newSelected.has(coachId)) {
      newSelected.delete(coachId);
      setSelectedCoaches(newSelected);
    } else {
      if (newSelected.size >= RECIPIENT_CAP) {
        toast({ title: `Maximum ${RECIPIENT_CAP} recipients allowed (iCloud limit)`, variant: "destructive" });
        return;
      }
      newSelected.add(coachId);
      setSelectedCoaches(newSelected);
    }
  };

  const applyMergeFields = (text: string, coach: Coach) => {
    return text
      .replace(/\{\{coach_name\}\}/g, coach.name)
      .replace(/\{\{salutation\}\}/g, coach.salutation || "Coach " + (coach.name.includes(" ") ? coach.name.substring(coach.name.indexOf(" ") + 1) : coach.name))
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

  const LARGE_SEND_THRESHOLD = 50;
  const ESTIMATED_SECONDS_PER_EMAIL = 2.5;

  const getEstimatedTime = (count: number): string => {
    const totalSeconds = Math.ceil(count * ESTIMATED_SECONDS_PER_EMAIL);
    if (totalSeconds < 60) return `about ${totalSeconds} seconds`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) return seconds > 0 ? `about ${minutes}m ${seconds}s` : `about ${minutes} minute${minutes > 1 ? "s" : ""}`;
    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;
    return `about ${hours}h ${remainMinutes}m`;
  };

  const getTimeRemaining = (progress: { sent: number; total: number; failed: number; startTime: number }): string => {
    const processed = progress.sent + progress.failed;
    if (processed === 0) return getEstimatedTime(progress.total);
    const elapsed = (Date.now() - progress.startTime) / 1000;
    const avgPerEmail = elapsed / processed;
    const remaining = (progress.total - processed) * avgPerEmail;
    if (remaining < 60) return `~${Math.ceil(remaining)}s remaining`;
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.ceil(remaining % 60);
    return `~${minutes}m ${seconds}s remaining`;
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

    if (selectedCoaches.size >= LARGE_SEND_THRESHOLD && !showLargeSendWarning) {
      setShowLargeSendWarning(true);
      return;
    }
    setShowLargeSendWarning(false);

    setIsSending(true);
    setSendReport(null);
    let totalSent = 0;
    const allResults: SendResult[] = [];

    const coachLookup = new Map<string, Coach>();
    coaches?.forEach((c) => coachLookup.set(c.id, c));

    try {
      const allCoachIds = Array.from(selectedCoaches);
      const total = allCoachIds.length;
      let totalFailed = 0;
      const startTime = Date.now();

      setSendProgress({ sent: 0, total, failed: 0, startTime, aborted: false });

      const attachmentData = await Promise.all(
        attachments.map(async (a) => ({
          filename: a.name,
          content: await fileToBase64(a.file),
        }))
      );

      const batches: string[][] = [];
      for (let i = 0; i < allCoachIds.length; i += BATCH_SIZE) {
        batches.push(allCoachIds.slice(i, i + BATCH_SIZE));
      }

      let aborted = false;
      for (let i = 0; i < batches.length; i++) {
        try {
          const result = await sendBatch(batches[i], subject, body, attachmentData);
          const results = Array.isArray(result?.results) ? result.results : [];
          for (const r of results) {
            const coach = coachLookup.get(r.coachId);
            allResults.push({
              coachId: r.coachId,
              coachName: coach?.name || "Unknown",
              coachEmail: coach?.email || "Unknown",
              school: coach?.school || "Unknown",
              success: r.success,
              error: r.error,
            });
          }
          const batchSuccess = results.filter((r: any) => r.success).length;
          const batchFail = results.filter((r: any) => !r.success).length;
          totalSent += batchSuccess;
          totalFailed += batchFail;
          setSendProgress({ sent: totalSent, total, failed: totalFailed, startTime, aborted: false });

          if (result?.rateLimited) {
            const remainingBatches = batches.slice(i + 1);
            for (const batch of remainingBatches) {
              for (const coachId of batch) {
                const coach = coachLookup.get(coachId);
                allResults.push({
                  coachId,
                  coachName: coach?.name || "Unknown",
                  coachEmail: coach?.email || "Unknown",
                  school: coach?.school || "Unknown",
                  success: false,
                  error: "Skipped: iCloud rate limit reached",
                });
              }
            }
            const remaining = remainingBatches.reduce((sum, b) => sum + b.length, 0);
            totalFailed += remaining;
            aborted = true;
            setSendProgress({ sent: totalSent, total, failed: totalFailed, startTime, aborted: true });
            break;
          }
        } catch (error: any) {
          for (const coachId of batches[i]) {
            const coach = coachLookup.get(coachId);
            allResults.push({
              coachId,
              coachName: coach?.name || "Unknown",
              coachEmail: coach?.email || "Unknown",
              school: coach?.school || "Unknown",
              success: false,
              error: error.message || "Batch request failed",
            });
          }
          totalFailed += batches[i].length;
          setSendProgress({ sent: totalSent, total, failed: totalFailed, startTime, aborted: false });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });

      setSendReport({
        results: allResults,
        totalSent,
        totalFailed,
        aborted,
        timestamp: new Date(),
      });

      if (aborted) {
        toast({
          title: `Sent ${totalSent}, stopped due to rate limiting`,
          description: "See the send report below for details on each coach.",
          variant: "destructive",
        });
      } else if (totalFailed > 0 && totalSent > 0) {
        toast({
          title: `${totalSent} sent, ${totalFailed} failed`,
          description: "See the send report below for details.",
          variant: "destructive",
        });
      } else if (totalFailed > 0 && totalSent === 0) {
        toast({
          title: "Failed to send emails",
          description: "See the send report below for details.",
          variant: "destructive",
        });
      } else {
        toast({ title: `Successfully sent ${totalSent} email(s)!` });
      }
    } catch (error: any) {
      toast({
        title: "Failed to send emails",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSendProgress(null);
      setIsSending(false);
      if (totalSent > 0) {
        resetForm();
      }
    }
  };

  const handleSchedule = () => {
    if (!emailSettings?.configured) {
      toast({ title: "Please configure your iCloud Mail settings first", description: "Go to Settings to set up your email before scheduling.", variant: "destructive" });
      return;
    }
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
    
    const scheduledAt = toEasternISO(scheduledDate, scheduledTime);
    
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

  const pendingScheduledEmails = scheduledEmails?.filter((e) => e.status === "pending" || e.status === "processing") || [];
  const failedScheduledEmails = scheduledEmails?.filter((e) => e.status === "failed" || e.status === "partial") || [];

  const getScheduledCoachNames = (coachIdsRaw: string) => {
    let ids: string[];
    try {
      const parsed = JSON.parse(coachIdsRaw);
      ids = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      ids = coachIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (ids.length === 0) return "Unknown";
    const names = ids.map((id) => coaches?.find((c) => c.id === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Unknown";
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
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, school, state, email..."
                          value={coachSearch}
                          onChange={(e) => setCoachSearch(e.target.value)}
                          className="pl-9"
                          data-testid="input-coach-search"
                        />
                      </div>
                      <Button
                        variant={favoriteFilter ? "default" : "outline"}
                        size="icon"
                        onClick={() => setFavoriteFilter(!favoriteFilter)}
                        className="toggle-elevate"
                        data-testid="button-favorite-filter"
                        title="Favorites only"
                      >
                        <Star className={`h-4 w-4 ${favoriteFilter ? "fill-current" : ""}`} />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                        <SelectTrigger className="w-[130px]" data-testid="select-division-filter">
                          <SelectValue placeholder="Division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Divisions</SelectItem>
                          {divisionOptions.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {uniqueStates.length > 0 && (
                        <Select value={stateFilter} onValueChange={setStateFilter}>
                          <SelectTrigger className="w-[110px]" data-testid="select-state-filter">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All States</SelectItem>
                            {uniqueStates.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Select value={lastContactedFilter} onValueChange={setLastContactedFilter}>
                        <SelectTrigger className="w-[170px]" data-testid="select-last-contacted-filter">
                          <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                          <SelectValue placeholder="Last contacted" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No time filter</SelectItem>
                          <SelectItem value="1">Not in 1 day</SelectItem>
                          <SelectItem value="2">Not in 2 days</SelectItem>
                          <SelectItem value="3">Not in 3 days</SelectItem>
                          <SelectItem value="5">Not in 5 days</SelectItem>
                          <SelectItem value="7">Not in 7 days</SelectItem>
                          <SelectItem value="14">Not in 14 days</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
                        <SelectTrigger className="w-[120px]" data-testid="select-sort-mode">
                          <SlidersHorizontal className="h-4 w-4 mr-1 flex-shrink-0" />
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Sort: Name</SelectItem>
                          <SelectItem value="school">Sort: School</SelectItem>
                          <SelectItem value="state">Sort: State</SelectItem>
                          <SelectItem value="status">Sort: Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap gap-1" data-testid="status-filter-chips">
                      {[{ value: "all", label: "All" }, ...coachStatusOptions].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setStatusFilter(opt.value)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            statusFilter === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                          data-testid={`chip-status-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1 text-xs text-muted-foreground px-0.5" data-testid="filter-summary">
                    <span>
                      {filteredCoaches.length} coach{filteredCoaches.length === 1 ? "" : "es"} shown
                      {(divisionFilter !== "all" || stateFilter !== "all" || statusFilter !== "all" || favoriteFilter || lastContactedFilter !== "none" || coachSearch.trim()) && (
                        <button
                          className="ml-2 text-primary hover:underline"
                          onClick={() => {
                            setDivisionFilter("all");
                            setStateFilter("all");
                            setStatusFilter("all");
                            setFavoriteFilter(false);
                            setLastContactedFilter("none");
                            setCoachSearch("");
                          }}
                          data-testid="button-clear-filters"
                        >
                          Clear filters
                        </button>
                      )}
                    </span>
                    <span data-testid="text-selected-count">
                      {selectedCoaches.size}/{RECIPIENT_CAP} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="select-all"
                      checked={filteredCoaches.length > 0 && filteredCoaches.every((c) => selectedCoaches.has(c.id))}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select All visible ({Math.min(filteredCoaches.length, RECIPIENT_CAP - selectedCoaches.size + filteredCoaches.filter(c => selectedCoaches.has(c.id)).length)})
                    </Label>
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
                              onCheckedChange={() => handleCoachToggleWithCap(coach.id)}
                              data-testid={`checkbox-coach-${coach.id}`}
                            />
                            <Label
                              htmlFor={`coach-${coach.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium text-sm flex items-center gap-1">
                                {coach.favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                                {coach.name}
                                {coach.state && (
                                  <span className="text-xs text-muted-foreground font-normal ml-1">· {coach.state}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {coach.school}
                                {coach.division && <span className="ml-1">· {coach.division}</span>}
                                {" · "}{coach.email}
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
                  placeholder="Introduction - Class of 2026 Recruit"
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
                <TabsContent value="send-now" className="pt-4 space-y-3">
                  {showLargeSendWarning && !isSending && (
                    <Alert data-testid="alert-large-send">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Sending to {selectedCoaches.size} coaches</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>
                          This will take {getEstimatedTime(selectedCoaches.size)}. iCloud Mail limits how many emails can be sent per hour (roughly 100). 
                          If you exceed the limit, some emails may not be delivered.
                        </p>
                        <p className="font-medium">
                          For best results, send to 100 or fewer coaches at a time.
                        </p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <Button size="sm" onClick={handleSend} data-testid="button-confirm-large-send">
                            <Send className="h-4 w-4 mr-2" />
                            Send Anyway
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowLargeSendWarning(false)} data-testid="button-cancel-large-send">
                            Cancel
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  {sendProgress && (
                    <div className="space-y-2" data-testid="send-progress">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{sendProgress.aborted ? "Sending stopped (rate limited)" : "Sending emails..."}</span>
                        <span>{sendProgress.sent + sendProgress.failed} / {sendProgress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="flex h-2">
                          <div
                            className="bg-primary h-2 transition-all duration-300"
                            style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                          />
                          {sendProgress.failed > 0 && (
                            <div
                              className="bg-destructive h-2 transition-all duration-300"
                              style={{ width: `${(sendProgress.failed / sendProgress.total) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-3">
                          <span>{sendProgress.sent} sent</span>
                          {sendProgress.failed > 0 && <span className="text-destructive">{sendProgress.failed} failed</span>}
                          <span>{sendProgress.total - sendProgress.sent - sendProgress.failed} pending</span>
                        </div>
                        {!sendProgress.aborted && sendProgress.sent + sendProgress.failed < sendProgress.total && (
                          <span>{getTimeRemaining(sendProgress)}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {!showLargeSendWarning && (
                    <Button
                      onClick={handleSend}
                      disabled={!isEmailConfigured || isSending || selectedCoaches.size === 0}
                      className="w-full"
                      data-testid="button-send-emails"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending {sendProgress ? `${sendProgress.sent + sendProgress.failed}/${sendProgress.total}` : "..."}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {selectedCoaches.size} Coach{selectedCoaches.size !== 1 ? "es" : ""}
                          {selectedCoaches.size >= LARGE_SEND_THRESHOLD && (
                            <span className="ml-1 text-xs opacity-75">({getEstimatedTime(selectedCoaches.size)})</span>
                          )}
                        </>
                      )}
                    </Button>
                  )}
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
                      <Label htmlFor="schedule-time">Time (ET)</Label>
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

          {sendReport && (
            <Card data-testid="card-send-report">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {sendReport.totalFailed === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : sendReport.totalSent > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  Send Report
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="badge-report-sent">
                    {sendReport.totalSent} sent
                  </Badge>
                  {sendReport.totalFailed > 0 && (
                    <Badge variant="destructive" data-testid="badge-report-failed">
                      {sendReport.totalFailed} failed
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSendReport(null)}
                    data-testid="button-dismiss-report"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sendReport.aborted && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Sending was stopped early due to iCloud rate limiting. Some coaches were skipped.
                    </AlertDescription>
                  </Alert>
                )}
                <ScrollArea className="h-[250px]">
                  <div className="space-y-1">
                    {sendReport.results.map((result, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-md"
                        data-testid={`send-result-${result.coachId}`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {result.coachName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.school} - {result.coachEmail}
                          </div>
                        </div>
                        {!result.success && result.error && (
                          <span className="text-xs text-destructive max-w-[200px] truncate flex-shrink-0">
                            {result.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

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
                            {formatET(email.scheduledAt, "MMM d, yyyy 'at' h:mm a 'ET'")}
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

          {failedScheduledEmails.length > 0 && (
            <Card data-testid="card-failed-scheduled-emails">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {failedScheduledEmails.some((e) => e.status === "partial") ? "Email Send Issues" : "Failed Scheduled Emails"}
                  <Badge variant="destructive">{failedScheduledEmails.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {failedScheduledEmails.map((email) => (
                      <div
                        key={email.id}
                        className={`p-3 rounded-md ${email.status === "partial" ? "bg-yellow-500/10 dark:bg-yellow-500/10" : "bg-destructive/10"}`}
                        data-testid={`failed-scheduled-email-${email.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-medium truncate">{email.subject}</p>
                              <Badge variant={email.status === "partial" ? "outline" : "destructive"} className="text-[10px]">
                                {email.status === "partial" ? "Partially Sent" : "Failed"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              To: {getScheduledCoachNames(email.coachIds)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Scheduled for {formatET(email.scheduledAt, "MMM d, yyyy 'at' h:mm a 'ET'")}
                            </p>
                            {email.errorMessage && (
                              <p className="text-xs mt-2 text-destructive" data-testid={`text-error-${email.id}`}>
                                {email.errorMessage}
                              </p>
                            )}
                            {!email.errorMessage && email.status === "failed" && (
                              <p className="text-xs mt-2 text-muted-foreground">
                                Check that your iCloud Mail is configured in Settings.
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => cancelScheduleMutation.mutate(email.id)}
                            disabled={cancelScheduleMutation.isPending}
                            data-testid={`button-dismiss-failed-${email.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
