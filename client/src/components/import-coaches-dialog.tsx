import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { divisionOptions } from "@shared/schema";

interface ParsedCoach {
  name: string;
  position: string;
  email: string;
  phone: string;
  school: string;
  division: string;
}

interface ImportResult {
  name: string;
  success: boolean;
  error?: string;
}

function parseRawText(text: string, school: string, division: string): ParsedCoach[] {
  const coaches: ParsedCoach[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) continue;

    const emailPart = parts.find((p) => p.includes("@"));
    const phonePart = parts.find((p) => /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(p));

    const nonEmailPhoneParts = parts.filter((p) => p !== emailPart && p !== phonePart);

    const name = nonEmailPhoneParts[0] || "";
    const position = nonEmailPhoneParts.slice(1).join(", ") || "";

    coaches.push({
      name,
      position,
      email: emailPart || "",
      phone: phonePart || "",
      school,
      division,
    });
  }
  return coaches;
}

function parseCsvFields(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvFile(content: string, defaultSchool: string, defaultDivision: string): ParsedCoach[] {
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvFields(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, ""));

  const nameIdx = headers.findIndex((h) => h === "name" || h === "coach name" || h === "full name");
  const emailIdx = headers.findIndex((h) => h === "email" || h === "email address");
  const phoneIdx = headers.findIndex((h) => h === "phone" || h === "phone number" || h === "telephone");
  const schoolIdx = headers.findIndex((h) => h === "school" || h === "university" || h === "college");
  const positionIdx = headers.findIndex((h) => h === "position" || h === "title" || h === "role");
  const divisionIdx = headers.findIndex((h) => h === "division" || h === "div");

  const hasHeaders = nameIdx !== -1 || emailIdx !== -1;

  const dataLines = hasHeaders ? lines.slice(1) : lines;
  const coaches: ParsedCoach[] = [];

  for (const line of dataLines) {
    const parts = parseCsvFields(line);
    if (parts.length < 2) continue;

    if (hasHeaders) {
      coaches.push({
        name: nameIdx !== -1 ? parts[nameIdx] || "" : "",
        email: emailIdx !== -1 ? parts[emailIdx] || "" : "",
        phone: phoneIdx !== -1 ? parts[phoneIdx] || "" : "",
        school: schoolIdx !== -1 ? parts[schoolIdx] || defaultSchool : defaultSchool,
        position: positionIdx !== -1 ? parts[positionIdx] || "" : "",
        division: divisionIdx !== -1 ? parts[divisionIdx] || defaultDivision : defaultDivision,
      });
    } else {
      const emailPart = parts.find((p) => p.includes("@"));
      const phonePart = parts.find((p) => /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(p));
      const nonEmailPhoneParts = parts.filter((p) => p !== emailPart && p !== phonePart);

      coaches.push({
        name: nonEmailPhoneParts[0] || "",
        position: nonEmailPhoneParts.slice(1).join(", ") || "",
        email: emailPart || "",
        phone: phonePart || "",
        school: defaultSchool,
        division: defaultDivision,
      });
    }
  }
  return coaches;
}

interface ImportCoachesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCoachesDialog({ open, onOpenChange }: ImportCoachesDialogProps) {
  const [rawText, setRawText] = useState("");
  const [school, setSchool] = useState("");
  const [division, setDivision] = useState("");
  const [parsedCoaches, setParsedCoaches] = useState<ParsedCoach[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [step, setStep] = useState<"input" | "preview" | "results">("input");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (coaches: ParsedCoach[]) => {
      const res = await apiRequest("POST", "/api/coaches/import", { coaches });
      return res.json();
    },
    onSuccess: (data: { imported: number; failed: number; results: ImportResult[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      setImportResults(data.results);
      setStep("results");
      if (data.failed === 0) {
        toast({ title: `${data.imported} coach${data.imported === 1 ? "" : "es"} imported successfully` });
      } else {
        toast({
          title: `${data.imported} imported, ${data.failed} failed`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({ title: "Failed to import coaches", variant: "destructive" });
    },
  });

  const handleParse = () => {
    if (!school.trim()) {
      toast({ title: "Please enter a school name", variant: "destructive" });
      return;
    }
    const coaches = parseRawText(rawText, school, division);
    if (coaches.length === 0) {
      toast({ title: "Could not parse any coaches from the text. Use the format: Name, Position, Email, Phone (one per line)", variant: "destructive" });
      return;
    }
    setParsedCoaches(coaches);
    setStep("preview");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const coaches = parseCsvFile(content, school, division);
      if (coaches.length === 0) {
        toast({ title: "Could not parse any coaches from the CSV file", variant: "destructive" });
        return;
      }
      setParsedCoaches(coaches);
      setStep("preview");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = () => {
    importMutation.mutate(parsedCoaches);
  };

  const handleClose = () => {
    setRawText("");
    setSchool("");
    setDivision("");
    setParsedCoaches([]);
    setImportResults(null);
    setStep("input");
    onOpenChange(false);
  };

  const handleRemoveCoach = (index: number) => {
    setParsedCoaches((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Coaches</DialogTitle>
          <DialogDescription>
            {step === "input" && "Import multiple coaches at once using CSV or pasted text."}
            {step === "preview" && `Review ${parsedCoaches.length} coach${parsedCoaches.length === 1 ? "" : "es"} before importing.`}
            {step === "results" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input
                  placeholder="e.g. University of Dayton"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  data-testid="input-import-school"
                />
              </div>
              <div className="space-y-2">
                <Label>Division (Optional)</Label>
                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger data-testid="select-import-division">
                    <SelectValue placeholder="Select division..." />
                  </SelectTrigger>
                  <SelectContent>
                    {divisionOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="paste">
              <TabsList className="w-full">
                <TabsTrigger value="paste" className="flex-1" data-testid="tab-paste">
                  <FileText className="h-4 w-4 mr-2" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="file" className="flex-1" data-testid="tab-file">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-3 mt-3">
                <Label>Paste coach data (one per line)</Label>
                <Textarea
                  placeholder={"Tim Horsmon, Head Coach, daytonvbrecruiting@udayton.edu, (937) 229-5631\nTim Balice, Assistant Coach, tbalice1@udayton.edu, (937) 229-5631"}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={6}
                  data-testid="textarea-import-raw"
                />
                <p className="text-xs text-muted-foreground">
                  Format: Name, Position, Email, Phone (one coach per line)
                </p>
                <Button onClick={handleParse} disabled={!rawText.trim()} data-testid="button-parse-text">
                  Preview Coaches
                </Button>
              </TabsContent>

              <TabsContent value="file" className="space-y-3 mt-3">
                <Label>Upload a CSV file</Label>
                <p className="text-xs text-muted-foreground">
                  The CSV can include headers: name, email, phone, position, school, division. If no headers are detected, the format Name, Position, Email, Phone is assumed.
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!school.trim()}
                  data-testid="button-upload-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                {!school.trim() && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Enter a school name first (used as default if not in CSV)
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {parsedCoaches.map((coach, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border"
                    data-testid={`preview-coach-${i}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{coach.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {coach.position && <span>{coach.position}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {coach.email}
                        {coach.phone && <span> · {coach.phone}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {coach.school}
                        {coach.division && <span> · {coach.division}</span>}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveCoach(i)}
                      data-testid={`button-remove-preview-${i}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("input")} data-testid="button-back-to-input">
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedCoaches.length === 0 || importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {parsedCoaches.length} Coach{parsedCoaches.length === 1 ? "" : "es"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "results" && importResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {importResults.filter((r) => r.success).length} imported
              </Badge>
              {importResults.some((r) => !r.success) && (
                <Badge variant="destructive">
                  {importResults.filter((r) => !r.success).length} failed
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {importResults.map((result, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-md border text-sm"
                    data-testid={`import-result-${i}`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="flex-1">{result.name}</span>
                    {result.error && (
                      <span className="text-xs text-muted-foreground">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={handleClose} className="w-full" data-testid="button-close-import">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}