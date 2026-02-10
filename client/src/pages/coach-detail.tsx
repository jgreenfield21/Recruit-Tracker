import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { parseISO } from "date-fns";
import { formatET } from "@/lib/date-utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  User,
  Plus,
  Bell,
  Calendar,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { CoachForm } from "@/components/coach-form";
import { ContactForm } from "@/components/contact-form";
import { ReminderForm } from "@/components/reminder-form";
import { queryClient } from "@/lib/queryClient";
import type { Coach, Contact, Reminder, CoachStatus } from "@shared/schema";
import { contactMethodOptions } from "@shared/schema";

export default function CoachDetail() {
  const { id } = useParams<{ id: string }>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);

  const { data: coach, isLoading: loadingCoach } = useQuery<Coach>({
    queryKey: ["/api/coaches", id],
  });

  const { data: contacts, isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: reminders, isLoading: loadingReminders } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const isLoading = loadingCoach || loadingContacts || loadingReminders;

  if (isLoading) {
    return <LoadingState message="Loading coach details..." />;
  }

  if (!coach) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Coach not found</h2>
        <p className="text-muted-foreground mb-4">
          The coach you're looking for doesn't exist.
        </p>
        <Link href="/coaches">
          <Button>Back to Coaches</Button>
        </Link>
      </div>
    );
  }

  const coachContacts = contacts?.filter((c) => c.coachId === id) || [];
  const coachReminders = reminders?.filter((r) => r.coachId === id) || [];
  const sortedContacts = [...coachContacts].sort(
    (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
  );

  const getMethodLabel = (method: string) => {
    return contactMethodOptions.find((m) => m.value === method)?.label || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/coaches">
          <Button variant="ghost" size="icon" data-testid="button-back-coaches">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-coach-name">{coach.name}</h1>
            <StatusBadge status={coach.status as CoachStatus} />
          </div>
          <p className="text-muted-foreground">{coach.school}</p>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-edit-coach">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Coach</DialogTitle>
              <DialogDescription>
                Update the coach's contact information.
              </DialogDescription>
            </DialogHeader>
            <CoachForm coach={coach} onSuccess={() => setIsEditDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" data-testid="card-coach-info">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${coach.email}`}
                className="text-sm hover:underline"
                data-testid="link-coach-email"
              >
                {coach.email}
              </a>
            </div>
            {coach.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${coach.phone}`}
                  className="text-sm hover:underline"
                  data-testid="link-coach-phone"
                >
                  {coach.phone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm" data-testid="text-coach-school">{coach.school}</span>
            </div>
            {coach.position && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-coach-position">{coach.position}</span>
              </div>
            )}
            {coach.division && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground ml-7" data-testid="text-coach-division">
                  {coach.division}
                </span>
              </div>
            )}
            {coach.salutation && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Preferred Salutation</p>
                <p className="text-sm" data-testid="text-coach-salutation">{coach.salutation}</p>
              </div>
            )}
            {coach.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm" data-testid="text-coach-notes">{coach.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue="history">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <TabsList>
                  <TabsTrigger value="history" data-testid="tab-contact-history">
                    Contact History
                  </TabsTrigger>
                  <TabsTrigger value="reminders" data-testid="tab-reminders">
                    Reminders
                  </TabsTrigger>
                </TabsList>
                <div className="flex gap-2 flex-wrap">
                  <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-log-contact">
                        <Plus className="h-4 w-4 mr-2" />
                        Log Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Contact</DialogTitle>
                        <DialogDescription>
                          Record a contact you made with {coach.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <ContactForm
                        coachId={id!}
                        onSuccess={() => setIsContactDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-add-reminder">
                        <Bell className="h-4 w-4 mr-2" />
                        Add Reminder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Reminder</DialogTitle>
                        <DialogDescription>
                          Set a reminder to follow up with {coach.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <ReminderForm
                        coachId={id!}
                        onSuccess={() => setIsReminderDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="history" className="mt-0">
                {sortedContacts.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No contact history"
                    description="Log your first contact with this coach to start tracking your communication."
                    actionLabel="Log First Contact"
                    onAction={() => setIsContactDialogOpen(true)}
                  />
                ) : (
                  <div className="space-y-4">
                    {sortedContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex gap-4 p-4 rounded-md border"
                        data-testid={`contact-item-${contact.id}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="font-medium text-sm">
                              {getMethodLabel(contact.method)}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatET(contact.date, "MMM d, yyyy")}
                            </span>
                          </div>
                          {contact.subject && (
                            <p className="text-sm">{contact.subject}</p>
                          )}
                          {contact.notes && (
                            <p className="text-sm text-muted-foreground">
                              {contact.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="reminders" className="mt-0">
                {coachReminders.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="No reminders set"
                    description="Set a reminder to follow up with this coach."
                    actionLabel="Set Reminder"
                    onAction={() => setIsReminderDialogOpen(true)}
                  />
                ) : (
                  <div className="space-y-4">
                    {coachReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`flex gap-4 p-4 rounded-md border ${
                          reminder.completed ? "opacity-60" : ""
                        }`}
                        data-testid={`reminder-item-${reminder.id}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p
                              className={`font-medium text-sm ${
                                reminder.completed ? "line-through" : ""
                              }`}
                            >
                              {reminder.title}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              Due: {formatET(reminder.dueDate, "MMM d, yyyy")}
                            </span>
                          </div>
                          {reminder.notes && (
                            <p className="text-sm text-muted-foreground">
                              {reminder.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
