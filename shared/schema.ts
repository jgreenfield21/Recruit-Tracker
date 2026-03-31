import { pgTable, text, varchar, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const coaches = pgTable("coaches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  school: text("school").notNull(),
  position: text("position"),
  division: text("division"),
  state: text("state"),
  salutation: text("salutation"),
  notes: text("notes"),
  status: text("status").notNull().default("not_contacted"),
  favorite: boolean("favorite").notNull().default(false),
});

export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type Coach = typeof coaches.$inferSelect;

export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachId: varchar("coach_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }), // Explicitly match type for storage
  date: text("date").notNull(),
  method: text("method").notNull(),
  subject: text("subject"),
  notes: text("notes"),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const reminders = pgTable("reminders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachId: varchar("coach_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  dueDate: text("due_date").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  completed: boolean("completed").notNull().default(false),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true });
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true });
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const emailSettings = pgTable("gmail_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  email: text("email").notNull(),
  appPassword: text("app_password").notNull(),
  configured: boolean("configured").notNull().default(false),
});

export const gmailSettings = emailSettings;

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({ id: true });
export const insertGmailSettingsSchema = insertEmailSettingsSchema;
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type InsertGmailSettings = InsertEmailSettings;
export type EmailSettings = typeof emailSettings.$inferSelect;
export type GmailSettings = EmailSettings;

export type CoachStatus = "not_contacted" | "contacted" | "awaiting_response" | "follow_up_needed" | "responded";

export const coachStatusOptions: { value: CoachStatus; label: string }[] = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "awaiting_response", label: "Awaiting Response" },
  { value: "follow_up_needed", label: "Follow-up Needed" },
  { value: "responded", label: "Responded" },
];

export const contactMethodOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Call" },
  { value: "text", label: "Text Message" },
  { value: "in_person", label: "In Person" },
  { value: "other", label: "Other" },
];

export const divisionOptions = [
  { value: "D1", label: "Division I" },
  { value: "D2", label: "Division II" },
  { value: "D3", label: "Division III" },
  { value: "NAIA", label: "NAIA" },
  { value: "JUCO", label: "Junior College" },
];

export const scheduledEmails = pgTable("scheduled_emails", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachIds: text("coach_ids").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  errorMessage: text("error_message"),
  sentCoachIds: text("sent_coach_ids"),
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({ id: true });
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

export type ScheduledEmailStatus = "pending" | "sent" | "failed" | "partial";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const incomingEmails = pgTable("incoming_emails", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  messageId: text("message_id"),
  coachId: varchar("coach_id", { length: 36 }),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: text("received_at").notNull(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertIncomingEmailSchema = createInsertSchema(incomingEmails).omit({ id: true });
export type InsertIncomingEmail = z.infer<typeof insertIncomingEmailSchema>;
export type IncomingEmail = typeof incomingEmails.$inferSelect;

export const recruitingProfiles = pgTable("recruiting_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
});

export const insertRecruitingProfileSchema = createInsertSchema(recruitingProfiles).omit({ id: true });
export type InsertRecruitingProfile = z.infer<typeof insertRecruitingProfileSchema>;
export type RecruitingProfile = typeof recruitingProfiles.$inferSelect;

export const profilePlatformOptions = [
  { value: "ncsa", label: "NCSA", icon: "globe" },
  { value: "sportsrecruits", label: "SportsRecruits", icon: "globe" },
  { value: "maxpreps", label: "MaxPreps", icon: "globe" },
  { value: "hudl", label: "Hudl", icon: "video" },
  { value: "youtube", label: "YouTube", icon: "video" },
  { value: "twitter", label: "Twitter/X", icon: "twitter" },
  { value: "instagram", label: "Instagram", icon: "instagram" },
  { value: "other", label: "Other", icon: "link" },
];
