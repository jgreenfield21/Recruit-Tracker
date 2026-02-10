import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { parseISO, isBefore, startOfToday, isAfter, addDays } from "date-fns";
import { formatET } from "@/lib/date-utils";
import {
  Bell,
  Check,
  Clock,
  AlertTriangle,
  Calendar,
  Trash2,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ReminderForm } from "@/components/reminder-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Reminder, Coach } from "@shared/schema";

export default function Reminders() {
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: reminders, isLoading: loadingReminders } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: coaches, isLoading: loadingCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/reminders/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder deleted" });
    },
  });

  const isLoading = loadingReminders || loadingCoaches;

  if (isLoading) {
    return <LoadingState message="Loading reminders..." />;
  }

  const today = startOfToday();

  const overdueReminders = reminders?.filter(
    (r) => !r.completed && isBefore(parseISO(r.dueDate), today)
  ) || [];

  const upcomingReminders = reminders?.filter(
    (r) => !r.completed && !isBefore(parseISO(r.dueDate), today)
  ) || [];

  const completedReminders = reminders?.filter((r) => r.completed) || [];

  const getCoachName = (coachId: string) => {
    return coaches?.find((c) => c.id === coachId)?.name || "Unknown Coach";
  };

  const getCoachSchool = (coachId: string) => {
    return coaches?.find((c) => c.id === coachId)?.school || "";
  };

  const ReminderItem = ({ reminder }: { reminder: Reminder }) => {
    const isOverdue = !reminder.completed && isBefore(parseISO(reminder.dueDate), today);
    
    return (
      <div
        className={`flex items-start gap-4 p-4 rounded-md border ${
          reminder.completed ? "opacity-60" : ""
        } ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}
        data-testid={`reminder-item-${reminder.id}`}
      >
        <Checkbox
          checked={reminder.completed}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ id: reminder.id, completed: !!checked })
          }
          className="mt-1"
          data-testid={`checkbox-reminder-${reminder.id}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium ${reminder.completed ? "line-through" : ""}`}
                data-testid={`text-reminder-title-${reminder.id}`}
              >
                {reminder.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {getCoachName(reminder.coachId)} - {getCoachSchool(reminder.coachId)}
              </p>
              {reminder.notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {reminder.notes}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isOverdue ? "destructive" : reminder.completed ? "secondary" : "outline"}
                className="shrink-0"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {formatET(reminder.dueDate, "MMM d, yyyy")}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(reminder.id)}
                data-testid={`button-delete-reminder-${reminder.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reminders-title">Reminders</h1>
          <p className="text-muted-foreground">
            Stay on top of your follow-up schedule
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-reminder">
              <Plus className="h-4 w-4 mr-2" />
              New Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set New Reminder</DialogTitle>
              <DialogDescription>
                Choose a coach and set a reminder for follow-up.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Coach</Label>
                <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                  <SelectTrigger data-testid="select-reminder-coach">
                    <SelectValue placeholder="Choose a coach..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches?.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name} - {coach.school}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCoachId && (
                <ReminderForm
                  coachId={selectedCoachId}
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                    setSelectedCoachId("");
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-stat-overdue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-overdue">
              {overdueReminders.length}
            </div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-upcoming">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-upcoming">
              {upcomingReminders.length}
            </div>
            <p className="text-xs text-muted-foreground">scheduled</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-completed">
              {completedReminders.length}
            </div>
            <p className="text-xs text-muted-foreground">done</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Tabs defaultValue="overdue">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="overdue" data-testid="tab-overdue">
                Overdue
                {overdueReminders.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {overdueReminders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                Upcoming
                {upcomingReminders.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {upcomingReminders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                Completed
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="overdue" className="mt-0">
              {overdueReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No overdue reminders. Great job!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueReminders.map((reminder) => (
                    <ReminderItem key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-0">
              {upcomingReminders.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No upcoming reminders"
                  description="Set reminders to stay on top of your coach communications."
                  actionLabel="Add Reminder"
                  onAction={() => setIsAddDialogOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {upcomingReminders
                    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
                    .map((reminder) => (
                      <ReminderItem key={reminder.id} reminder={reminder} />
                    ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-0">
              {completedReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No completed reminders yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedReminders.map((reminder) => (
                    <ReminderItem key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
