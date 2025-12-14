import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { format, addDays } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { InsertReminder } from "@shared/schema";

const formSchema = z.object({
  coachId: z.string(),
  dueDate: z.string().min(1, "Due date is required"),
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  completed: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface ReminderFormProps {
  coachId: string;
  onSuccess: () => void;
}

export function ReminderForm({ coachId, onSuccess }: ReminderFormProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coachId,
      dueDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      title: "",
      notes: "",
      completed: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertReminder) =>
      apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder set successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to set reminder", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data as InsertReminder);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Follow up on recruiting visit"
                  {...field}
                  data-testid="input-reminder-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  data-testid="input-reminder-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional details..."
                  rows={3}
                  {...field}
                  data-testid="input-reminder-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-reminder">
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Set Reminder
          </Button>
        </div>
      </form>
    </Form>
  );
}
