import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { isAfter, isBefore, startOfToday, addDays, parseISO } from "date-fns";
import { formatET } from "@/lib/date-utils";
import { useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import {
  Users,
  Bell,
  Mail,
  Calendar,
  ArrowRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import type { Coach, Reminder, Contact } from "@shared/schema";

interface DashboardStats {
  totalCoaches: number;
  pendingReminders: number;
  thisMonthContacts: number;
  needsFollowUp: number;
}

export default function Dashboard() {
  const { permission, showNotification } = useNotifications();
  const notifiedRef = useRef(false);

  const { data: coaches, isLoading: loadingCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const { data: reminders, isLoading: loadingReminders } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: contacts, isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const isLoading = loadingCoaches || loadingReminders || loadingContacts;

  const today = startOfToday();

  const overdueReminders = reminders?.filter(
    (r) => !r.completed && isBefore(parseISO(r.dueDate), today)
  ) || [];

  useEffect(() => {
    if (permission === "granted" && overdueReminders.length > 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      showNotification("RecruitTrack - Overdue Reminders", {
        body: `You have ${overdueReminders.length} overdue reminder${overdueReminders.length > 1 ? "s" : ""} that need attention.`,
        tag: "overdue-reminders",
      });
    }
  }, [permission, overdueReminders.length, showNotification]);

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const stats: DashboardStats = {
    totalCoaches: coaches?.length || 0,
    pendingReminders: reminders?.filter((r) => !r.completed).length || 0,
    thisMonthContacts: contacts?.filter((c) => {
      const contactDate = parseISO(c.date);
      return contactDate.getMonth() === thisMonth && contactDate.getFullYear() === thisYear;
    }).length || 0,
    needsFollowUp: coaches?.filter((c) => c.status === "follow_up_needed").length || 0,
  };

  const upcomingReminders = reminders?.filter(
    (r) => !r.completed && 
    isAfter(parseISO(r.dueDate), today) && 
    isBefore(parseISO(r.dueDate), addDays(today, 7))
  ) || [];

  const recentContacts = contacts?.slice(0, 5) || [];

  const getCoachName = (coachId: string) => {
    return coaches?.find((c) => c.id === coachId)?.name || "Unknown Coach";
  };

  const getCoachSchool = (coachId: string) => {
    return coaches?.find((c) => c.id === coachId)?.school || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your recruiting progress and stay on top of coach communications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-coaches">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coaches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-coaches">{stats.totalCoaches}</div>
            <p className="text-xs text-muted-foreground">coaches in your list</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-reminders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-reminders">{stats.pendingReminders}</div>
            <p className="text-xs text-muted-foreground">follow-ups to complete</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-contacts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-month-contacts">{stats.thisMonthContacts}</div>
            <p className="text-xs text-muted-foreground">contacts made</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-followup">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Follow-up</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-followup">{stats.needsFollowUp}</div>
            <p className="text-xs text-muted-foreground">coaches waiting</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/coaches">
          <Button data-testid="button-add-coach">
            <Users className="h-4 w-4 mr-2" />
            Add Coach
          </Button>
        </Link>
        <Link href="/compose">
          <Button variant="secondary" data-testid="button-send-email">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </Link>
        <Link href="/reminders">
          <Button variant="outline" data-testid="button-set-reminder">
            <Bell className="h-4 w-4 mr-2" />
            Set Reminder
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-overdue-reminders">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Overdue Reminders
            </CardTitle>
            {overdueReminders.length > 0 && (
              <Badge variant="destructive">{overdueReminders.length}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {overdueReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No overdue reminders. Great job staying on top of things!
              </p>
            ) : (
              <div className="space-y-3">
                {overdueReminders.slice(0, 5).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 rounded-md bg-destructive/10"
                    data-testid={`reminder-overdue-${reminder.id}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{reminder.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {getCoachName(reminder.coachId)} - {getCoachSchool(reminder.coachId)}
                      </span>
                    </div>
                    <span className="text-xs text-destructive font-medium">
                      {formatET(reminder.dueDate, "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-reminders">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming This Week
            </CardTitle>
            <Link href="/reminders">
              <Button variant="ghost" size="sm" data-testid="button-view-all-reminders">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No reminders scheduled for this week.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.slice(0, 5).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`reminder-upcoming-${reminder.id}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{reminder.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {getCoachName(reminder.coachId)} - {getCoachSchool(reminder.coachId)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatET(reminder.dueDate, "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-activity">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Recent Activity</CardTitle>
          <Link href="/coaches">
            <Button variant="ghost" size="sm" data-testid="button-view-all-coaches">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentContacts.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No recent contacts"
              description="Start reaching out to coaches to track your communication history."
              actionLabel="Add Your First Coach"
              onAction={() => window.location.href = "/coaches"}
            />
          ) : (
            <div className="space-y-4">
              {recentContacts.map((contact) => {
                const coach = coaches?.find((c) => c.id === contact.coachId);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    data-testid={`contact-recent-${contact.id}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{coach?.name || "Unknown"}</span>
                        {coach && <StatusBadge status={coach.status as any} />}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {coach?.school} - {contact.method}
                        {contact.subject && `: ${contact.subject}`}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatET(contact.date, "MMM d, yyyy")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
