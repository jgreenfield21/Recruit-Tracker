import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { EmailTemplate, InsertEmailTemplate } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
});

type FormData = z.infer<typeof formSchema>;

interface TemplateFormProps {
  template?: EmailTemplate;
  onSuccess: () => void;
}

const mergeFieldsHelp = [
  { field: "{{coach_name}}", label: "Coach Name" },
  { field: "{{salutation}}", label: "Salutation" },
  { field: "{{school}}", label: "School" },
  { field: "{{position}}", label: "Position" },
];

export function TemplateForm({ template, onSuccess }: TemplateFormProps) {
  const { toast } = useToast();
  const isEditing = !!template;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template?.name || "",
      subject: template?.subject || "",
      body: template?.body || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertEmailTemplate) =>
      isEditing
        ? apiRequest("PATCH", `/api/templates/${template.id}`, data)
        : apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: isEditing ? "Template updated successfully" : "Template created successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: isEditing ? "Failed to update template" : "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data as InsertEmailTemplate);
  };

  const insertMergeField = (field: string) => {
    const currentBody = form.getValues("body");
    form.setValue("body", currentBody + field);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Initial Contact Email"
                  {...field}
                  data-testid="input-template-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Subject *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Introduction - Class of 2026 Recruit"
                  {...field}
                  data-testid="input-template-subject"
                />
              </FormControl>
              <FormDescription>
                You can use merge fields in the subject line too.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Insert Merge Field</FormLabel>
          <div className="flex flex-wrap gap-2">
            {mergeFieldsHelp.map((item) => (
              <Button
                key={item.field}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMergeField(item.field)}
                data-testid={`button-insert-${item.field}`}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Body *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dear {{salutation}},

I am reaching out to introduce myself as a student-athlete interested in {{school}}..."
                  rows={12}
                  className="font-mono text-sm"
                  {...field}
                  data-testid="input-template-body"
                />
              </FormControl>
              <FormDescription>
                Use merge fields like {"{{coach_name}}"} to personalize each email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-template">
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isEditing ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
