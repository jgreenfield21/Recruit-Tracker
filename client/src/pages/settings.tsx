import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Mail,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Bell,
  BellOff,
  Link,
  Plus,
  Trash2,
  Globe,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/loading-state";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import type { EmailSettings, RecruitingProfile } from "@shared/schema";
import { profilePlatformOptions } from "@shared/schema";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  email: z.string().email("Please enter a valid iCloud email address"),
  appPassword: z.string().min(1, "App password is required"),
});

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Please enter a valid URL"),
  icon: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function Settings() {
  const [showPassword, setShowPassword] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileUrl, setNewProfileUrl] = useState("");
  const [newProfileType, setNewProfileType] = useState("other");
  const { toast } = useToast();
  const { permission, isSupported, requestPermission, showNotification } = useNotifications();

  const { data: settings, isLoading } = useQuery<EmailSettings>({
    queryKey: ["/api/email-settings"],
  });

  const { data: profiles, isLoading: loadingProfiles } = useQuery<RecruitingProfile[]>({
    queryKey: ["/api/recruiting-profiles"],
  });

  const createProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      apiRequest("POST", "/api/recruiting-profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruiting-profiles"] });
      toast({ title: "Profile link added!" });
      setProfileDialogOpen(false);
      setNewProfileName("");
      setNewProfileUrl("");
      setNewProfileType("other");
    },
    onError: () => {
      toast({ title: "Failed to add profile link", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/recruiting-profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruiting-profiles"] });
      toast({ title: "Profile link removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove profile link", variant: "destructive" });
    },
  });

  const handleAddProfile = () => {
    if (!newProfileName.trim() || !newProfileUrl.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createProfileMutation.mutate({
      name: newProfileName,
      url: newProfileUrl,
      icon: newProfileType,
    });
  };

  const getProfileIcon = (icon: string | null | undefined) => {
    switch (icon) {
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: settings?.email || "",
      appPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/email-settings", {
        email: data.email,
        appPassword: data.appPassword,
        configured: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-settings"] });
      toast({ title: "iCloud Mail settings saved successfully" });
      form.reset({ email: form.getValues("email"), appPassword: "" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test-email"),
    onSuccess: () => {
      toast({ title: "iCloud Mail connection successful!" });
    },
    onError: (error: any) => {
      toast({
        title: "iCloud Mail connection failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return <LoadingState message="Loading settings..." />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">
          Configure your app preferences and email integration
        </p>
      </div>

      <Card data-testid="card-email-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            iCloud Mail Integration
          </CardTitle>
          <CardDescription>
            Connect your iCloud Mail account to send emails directly from the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.configured ? (
            <Alert data-testid="alert-email-connected">
              <Check className="h-4 w-4" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                Your iCloud Mail account ({settings.email}) is configured and ready to use.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert data-testid="alert-email-not-connected">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Set up your iCloud Mail credentials to enable email sending.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">How to get your iCloud App Password:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Enable Two-Factor Authentication on your Apple ID (if not already)</li>
              <li>Go to appleid.apple.com and sign in</li>
              <li>Navigate to Sign-In and Security → App-Specific Passwords</li>
              <li>Click "Generate an app-specific password"</li>
              <li>Enter a label like "RecruitTrack" and copy the generated password</li>
            </ol>
            <a
              href="https://appleid.apple.com/account/manage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              Open Apple ID Settings
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>iCloud Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@icloud.com"
                        {...field}
                        data-testid="input-email-address"
                      />
                    </FormControl>
                    <FormDescription>
                      Your iCloud email address (e.g., you@icloud.com or you@me.com)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App-Specific Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="xxxx-xxxx-xxxx-xxxx"
                          {...field}
                          data-testid="input-email-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      The app-specific password from Apple (not your regular Apple ID password)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 flex-wrap">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  data-testid="button-save-email-settings"
                >
                  {mutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Settings
                </Button>
                {settings?.configured && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending}
                    data-testid="button-test-email"
                  >
                    {testMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Test Connection
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card data-testid="card-notification-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Get notified about upcoming and overdue reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <Alert>
              <BellOff className="h-4 w-4" />
              <AlertTitle>Not Supported</AlertTitle>
              <AlertDescription>
                Your browser does not support notifications.
              </AlertDescription>
            </Alert>
          ) : permission === "granted" ? (
            <Alert data-testid="alert-notifications-enabled">
              <Check className="h-4 w-4" />
              <AlertTitle>Notifications Enabled</AlertTitle>
              <AlertDescription>
                You will receive browser notifications for reminder alerts.
              </AlertDescription>
            </Alert>
          ) : permission === "denied" ? (
            <Alert variant="destructive" data-testid="alert-notifications-blocked">
              <BellOff className="h-4 w-4" />
              <AlertTitle>Notifications Blocked</AlertTitle>
              <AlertDescription>
                Notifications are blocked. Please enable them in your browser settings.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert data-testid="alert-notifications-prompt">
              <Bell className="h-4 w-4" />
              <AlertTitle>Enable Notifications</AlertTitle>
              <AlertDescription>
                Allow notifications to get reminded about your follow-ups.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            {isSupported && permission !== "granted" && permission !== "denied" && (
              <Button
                onClick={async () => {
                  const granted = await requestPermission();
                  if (granted) {
                    toast({ title: "Notifications enabled!" });
                    showNotification("RecruitTrack", {
                      body: "You will now receive reminder notifications.",
                    });
                  }
                }}
                data-testid="button-enable-notifications"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            )}
            {isSupported && permission === "granted" && (
              <Button
                variant="outline"
                onClick={() => {
                  showNotification("Test Notification", {
                    body: "This is a test reminder notification from RecruitTrack.",
                  });
                  toast({ title: "Test notification sent!" });
                }}
                data-testid="button-test-notification"
              >
                <Bell className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recruiting-profiles">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Recruiting Profile Links
            </CardTitle>
            <CardDescription>
              Add links to your recruiting profiles to quickly insert them in emails
            </CardDescription>
          </div>
          <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-profile">
                <Plus className="h-4 w-4 mr-1" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Profile Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-type">Platform</Label>
                  <Select
                    value={newProfileType}
                    onValueChange={setNewProfileType}
                  >
                    <SelectTrigger data-testid="select-profile-type">
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profilePlatformOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Display Name</Label>
                  <Input
                    id="profile-name"
                    placeholder="e.g., My NCSA Profile"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-url">URL</Label>
                  <Input
                    id="profile-url"
                    placeholder="https://..."
                    value={newProfileUrl}
                    onChange={(e) => setNewProfileUrl(e.target.value)}
                    data-testid="input-profile-url"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddProfile}
                  disabled={createProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {createProfileMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Add Profile Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingProfiles ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : !profiles || profiles.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No profile links added yet. Add your NCSA, Hudl, or other recruiting profile URLs.
            </div>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`profile-item-${profile.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getProfileIcon(profile.icon)}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{profile.name}</div>
                        <a
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground truncate hover:underline flex items-center gap-1"
                        >
                          {profile.url.length > 40 ? profile.url.slice(0, 40) + "..." : profile.url}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteProfileMutation.mutate(profile.id)}
                      disabled={deleteProfileMutation.isPending}
                      data-testid={`button-delete-profile-${profile.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-about">
        <CardHeader>
          <CardTitle>About RecruitTrack</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            RecruitTrack helps student-athletes manage their college coach contacts,
            track communications, and streamline the recruiting process. Built to make
            your recruiting journey more organized and efficient.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
