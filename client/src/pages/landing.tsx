import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Users, Mail, Bell, BarChart3, FileText, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const { isFirebaseConfigured, signInWithGoogle } = useAuth();

  const handleLogin = async () => {
    if (isFirebaseConfigured) {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error("Login failed:", error);
      }
    } else {
      window.location.href = "/api/login";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <h1 className="text-xl font-semibold">RecruitTrack</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button onClick={handleLogin} data-testid="button-login">
            {isFirebaseConfigured ? "Sign in with Google" : "Log In"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Manage Your Recruiting Journey
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Track college coaches, send personalized emails, set reminders, and stay organized 
            throughout your recruiting process.
          </p>
          <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
            {isFirebaseConfigured ? "Sign in with Google" : "Get Started"}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                Keep all your college coach contacts organized in one place with status tracking.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Create reusable email templates with merge fields for personalized outreach.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle>Reminders</CardTitle>
              <CardDescription>
                Set follow-up reminders so you never miss an opportunity to connect.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle>Schedule Emails</CardTitle>
              <CardDescription>
                Schedule emails to be sent at the perfect time for maximum impact.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle>Communication Log</CardTitle>
              <CardDescription>
                Track all your interactions with coaches to stay organized.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                View insights about your recruiting progress and outreach efforts.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
