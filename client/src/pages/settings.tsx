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
import type { GmailSettings } from "@shared/schema";

const formSchema = z.object({
  email: z.string().email("Please enter a valid iCloud email address"),
  appPassword: z.string().min(1, "App password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Settings() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { permission, isSupported, requestPermission, showNotification } = useNotifications();

  const { data: settings, isLoading } = useQuery<GmailSettings>({
    queryKey: ["/api/gmail-settings"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: settings?.email || "",
      appPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/gmail-settings", {
        email: data.email,
        appPassword: data.appPassword,
        configured: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail-settings"] });
      toast({ title: "iCloud Mail settings saved successfully" });
      form.reset({ email: form.getValues("email"), appPassword: "" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test-gmail"),
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

      <Card data-testid="card-gmail-settings">
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
            <Alert data-testid="alert-gmail-connected">
              <Check className="h-4 w-4" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                Your iCloud Mail account ({settings.email}) is configured and ready to use.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert data-testid="alert-gmail-not-connected">
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
                        data-testid="input-gmail-email"
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
                          data-testid="input-gmail-password"
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
                  data-testid="button-save-gmail-settings"
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
                    data-testid="button-test-gmail"
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

      <Card data-testid="card-about">
        <CardHeader>
          <CardTitle>About RecruitTrack</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            RecruitTrack helps volleyball recruits manage their college coach contacts,
            track communications, and streamline the recruiting process. Built to make
            your recruiting journey more organized and efficient.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
