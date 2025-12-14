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
import type { GmailSettings } from "@shared/schema";

const formSchema = z.object({
  email: z.string().email("Please enter a valid Gmail address"),
  appPassword: z.string().min(1, "App password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Settings() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

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
      toast({ title: "Gmail settings saved successfully" });
      form.reset({ email: form.getValues("email"), appPassword: "" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test-gmail"),
    onSuccess: () => {
      toast({ title: "Gmail connection successful!" });
    },
    onError: (error: any) => {
      toast({
        title: "Gmail connection failed",
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
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to send emails directly from the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.configured ? (
            <Alert data-testid="alert-gmail-connected">
              <Check className="h-4 w-4" />
              <AlertTitle>Connected</AlertTitle>
              <AlertDescription>
                Your Gmail account ({settings.email}) is configured and ready to use.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert data-testid="alert-gmail-not-connected">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Set up your Gmail credentials to enable email sending.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">How to get your Gmail App Password:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to your Google Account settings</li>
              <li>Navigate to Security → 2-Step Verification (enable if not already)</li>
              <li>At the bottom, find "App passwords"</li>
              <li>Select "Mail" as the app and "Other" as device (name it "RecruitTrack")</li>
              <li>Copy the 16-character password generated</li>
            </ol>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              Open Google App Passwords
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
                    <FormLabel>Gmail Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@gmail.com"
                        {...field}
                        data-testid="input-gmail-email"
                      />
                    </FormControl>
                    <FormDescription>
                      The Gmail address you'll use to send emails
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
                    <FormLabel>App Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="xxxx xxxx xxxx xxxx"
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
                      The 16-character app password from Google (not your regular password)
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
