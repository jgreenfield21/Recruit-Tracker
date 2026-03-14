import {
  type Coach,
  type InsertCoach,
  type Contact,
  type InsertContact,
  type Reminder,
  type InsertReminder,
  type EmailTemplate,
  type InsertEmailTemplate,
  type EmailSettings,
  type InsertEmailSettings,
  type ScheduledEmail,
  type InsertScheduledEmail,
  type User,
  type UpsertUser,
  type RecruitingProfile,
  type InsertRecruitingProfile,
  type IncomingEmail,
  type InsertIncomingEmail,
  users,
  coaches,
  contacts,
  reminders,
  emailTemplates,
  emailSettings,
  scheduledEmails,
  recruitingProfiles,
  incomingEmails,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getCoaches(): Promise<Coach[]>;
  getCoach(id: string): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach | undefined>;
  deleteCoach(id: string): Promise<boolean>;

  getContacts(): Promise<Contact[]>;
  getContactsByCoach(coachId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  deleteContact(id: string): Promise<boolean>;

  getReminders(): Promise<Reminder[]>;
  getRemindersByCoach(coachId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;

  getTemplates(): Promise<EmailTemplate[]>;
  getTemplate(id: string): Promise<EmailTemplate | undefined>;
  createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  getEmailSettings(): Promise<EmailSettings | undefined>;
  saveEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;

  getScheduledEmails(): Promise<ScheduledEmail[]>;
  getPendingScheduledEmails(): Promise<ScheduledEmail[]>;
  createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail>;
  updateScheduledEmail(id: string, updates: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined>;
  deleteScheduledEmail(id: string): Promise<boolean>;

  getRecruitingProfiles(): Promise<RecruitingProfile[]>;
  createRecruitingProfile(profile: InsertRecruitingProfile): Promise<RecruitingProfile>;
  updateRecruitingProfile(id: string, profile: Partial<InsertRecruitingProfile>): Promise<RecruitingProfile | undefined>;
  deleteRecruitingProfile(id: string): Promise<boolean>;

  getIncomingEmails(userId: string): Promise<IncomingEmail[]>;
  getIncomingEmail(id: string, userId: string): Promise<IncomingEmail | undefined>;
  getIncomingEmailByMessageId(messageId: string, userId: string): Promise<IncomingEmail | undefined>;
  createIncomingEmail(email: InsertIncomingEmail): Promise<IncomingEmail>;
  markIncomingEmailRead(id: string, userId: string): Promise<IncomingEmail | undefined>;
  getUnreadIncomingEmailCount(userId: string): Promise<number>;
  deleteIncomingEmail(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCoaches(): Promise<Coach[]> {
    return db.select().from(coaches);
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const id = randomUUID();
    const [newCoach] = await db
      .insert(coaches)
      .values({ ...coach, id, status: coach.status || "not_contacted" })
      .returning();
    return newCoach;
  }

  async updateCoach(id: string, updates: Partial<InsertCoach>): Promise<Coach | undefined> {
    const [updated] = await db
      .update(coaches)
      .set(updates)
      .where(eq(coaches.id, id))
      .returning();
    return updated;
  }

  async deleteCoach(id: string): Promise<boolean> {
    const result = await db.delete(coaches).where(eq(coaches.id, id)).returning();
    return result.length > 0;
  }

  async getContacts(): Promise<Contact[]> {
    return db.select().from(contacts);
  }

  async getContactsByCoach(coachId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.coachId, coachId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const [newContact] = await db
      .insert(contacts)
      .values({ ...contact, id })
      .returning();
    return newContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return result.length > 0;
  }

  async getReminders(): Promise<Reminder[]> {
    return db.select().from(reminders);
  }

  async getRemindersByCoach(coachId: string): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.coachId, coachId));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const [newReminder] = await db
      .insert(reminders)
      .values({ ...reminder, id, completed: reminder.completed || false })
      .returning();
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const result = await db.delete(reminders).where(eq(reminders.id, id)).returning();
    return result.length > 0;
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates);
  }

  async getTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = randomUUID();
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values({ ...template, id })
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning();
    return result.length > 0;
  }

  async getEmailSettings(): Promise<EmailSettings | undefined> {
    const [settings] = await db.select().from(emailSettings);
    return settings;
  }

  async saveEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    const existing = await this.getEmailSettings();
    if (existing) {
      const [updated] = await db
        .update(emailSettings)
        .set(settings)
        .where(eq(emailSettings.id, existing.id))
        .returning();
      return updated;
    }
    const id = randomUUID();
    const [newSettings] = await db
      .insert(emailSettings)
      .values({ ...settings, id })
      .returning();
    return newSettings;
  }

  async getScheduledEmails(): Promise<ScheduledEmail[]> {
    return db.select().from(scheduledEmails);
  }

  async getPendingScheduledEmails(): Promise<ScheduledEmail[]> {
    const now = new Date().toISOString();
    return db
      .select()
      .from(scheduledEmails)
      .where(and(eq(scheduledEmails.status, "pending"), lte(scheduledEmails.scheduledAt, now)));
  }

  async createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail> {
    const id = randomUUID();
    const [newEmail] = await db
      .insert(scheduledEmails)
      .values({ ...email, id, status: email.status || "pending" })
      .returning();
    return newEmail;
  }

  async updateScheduledEmail(id: string, updates: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined> {
    const [updated] = await db
      .update(scheduledEmails)
      .set(updates)
      .where(eq(scheduledEmails.id, id))
      .returning();
    return updated;
  }

  async deleteScheduledEmail(id: string): Promise<boolean> {
    const result = await db.delete(scheduledEmails).where(eq(scheduledEmails.id, id)).returning();
    return result.length > 0;
  }

  async getRecruitingProfiles(): Promise<RecruitingProfile[]> {
    return db.select().from(recruitingProfiles);
  }

  async createRecruitingProfile(profile: InsertRecruitingProfile): Promise<RecruitingProfile> {
    const id = randomUUID();
    const [newProfile] = await db
      .insert(recruitingProfiles)
      .values({ ...profile, id })
      .returning();
    return newProfile;
  }

  async updateRecruitingProfile(id: string, updates: Partial<InsertRecruitingProfile>): Promise<RecruitingProfile | undefined> {
    const [updated] = await db
      .update(recruitingProfiles)
      .set(updates)
      .where(eq(recruitingProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteRecruitingProfile(id: string): Promise<boolean> {
    const result = await db.delete(recruitingProfiles).where(eq(recruitingProfiles.id, id)).returning();
    return result.length > 0;
  }

  async getIncomingEmails(userId: string): Promise<IncomingEmail[]> {
    return db.select().from(incomingEmails).where(eq(incomingEmails.userId, userId)).orderBy(desc(incomingEmails.receivedAt));
  }

  async getIncomingEmail(id: string, userId: string): Promise<IncomingEmail | undefined> {
    const [email] = await db.select().from(incomingEmails).where(and(eq(incomingEmails.id, id), eq(incomingEmails.userId, userId)));
    return email;
  }

  async getIncomingEmailByMessageId(messageId: string, userId: string): Promise<IncomingEmail | undefined> {
    const [email] = await db.select().from(incomingEmails).where(and(eq(incomingEmails.messageId, messageId), eq(incomingEmails.userId, userId)));
    return email;
  }

  async createIncomingEmail(email: InsertIncomingEmail): Promise<IncomingEmail> {
    const id = randomUUID();
    const [newEmail] = await db
      .insert(incomingEmails)
      .values({ ...email, id, isRead: email.isRead ?? false })
      .returning();
    return newEmail;
  }

  async markIncomingEmailRead(id: string, userId: string): Promise<IncomingEmail | undefined> {
    const [updated] = await db
      .update(incomingEmails)
      .set({ isRead: true })
      .where(and(eq(incomingEmails.id, id), eq(incomingEmails.userId, userId)))
      .returning();
    return updated;
  }

  async getUnreadIncomingEmailCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(incomingEmails).where(and(eq(incomingEmails.isRead, false), eq(incomingEmails.userId, userId)));
    return Number(result[0]?.count || 0);
  }

  async deleteIncomingEmail(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(incomingEmails).where(and(eq(incomingEmails.id, id), eq(incomingEmails.userId, userId))).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
