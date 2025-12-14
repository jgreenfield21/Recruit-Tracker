import type {
  Coach,
  InsertCoach,
  Contact,
  InsertContact,
  Reminder,
  InsertReminder,
  EmailTemplate,
  InsertEmailTemplate,
  GmailSettings,
  InsertGmailSettings,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Coaches
  getCoaches(): Promise<Coach[]>;
  getCoach(id: string): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach | undefined>;
  deleteCoach(id: string): Promise<boolean>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContactsByCoach(coachId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  deleteContact(id: string): Promise<boolean>;

  // Reminders
  getReminders(): Promise<Reminder[]>;
  getRemindersByCoach(coachId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, reminder: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;

  // Email Templates
  getTemplates(): Promise<EmailTemplate[]>;
  getTemplate(id: string): Promise<EmailTemplate | undefined>;
  createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  // Gmail Settings
  getGmailSettings(): Promise<GmailSettings | undefined>;
  saveGmailSettings(settings: InsertGmailSettings): Promise<GmailSettings>;
}

export class MemStorage implements IStorage {
  private coaches: Map<string, Coach> = new Map();
  private contacts: Map<string, Contact> = new Map();
  private reminders: Map<string, Reminder> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private gmailSettings: GmailSettings | undefined;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed some sample templates
    const templates: InsertEmailTemplate[] = [
      {
        name: "Initial Introduction",
        subject: "Introduction - Class of 2026 Volleyball Recruit",
        body: `Dear {{salutation}},

I hope this email finds you well. My name is [Your Name], and I am a [position] from [Your High School] in [City, State]. I am reaching out to express my sincere interest in {{school}}'s volleyball program.

I have been following {{school}}'s season and am impressed by the team's success and the program's commitment to developing student-athletes both on and off the court.

Here are my current stats and highlights:
- Position: [Your Position]
- Height: [Your Height]
- Vertical: [Your Vertical]
- GPA: [Your GPA]

I would love the opportunity to learn more about your program and discuss how I might contribute to the team. I have attached my highlight video and recruiting profile for your review.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
[Your Name]
[Your Phone]
[Your Email]`,
      },
      {
        name: "Tournament Schedule Update",
        subject: "Upcoming Tournament Schedule - [Your Name]",
        body: `Dear {{salutation}},

I wanted to reach out with an update on my upcoming tournament schedule. I would be honored if you could come watch me play.

Upcoming Tournaments:
- [Tournament Name] - [Date] - [Location]
- [Tournament Name] - [Date] - [Location]

My team number is [Team Number] and we typically play on courts [Court Numbers].

Please let me know if you plan to attend any of these events. I would love the opportunity to meet you in person.

Thank you for your continued interest.

Best regards,
[Your Name]`,
      },
      {
        name: "Season Update",
        subject: "Season Update - [Your Name]",
        body: `Dear {{salutation}},

I hope your season is going well! I wanted to send you an update on my progress this season.

Current Season Stats:
- [Stat 1]
- [Stat 2]
- [Stat 3]

Recent Achievements:
- [Achievement 1]
- [Achievement 2]

I continue to be very interested in {{school}} and would appreciate any opportunity to learn more about your program.

Thank you for your time.

Best regards,
[Your Name]`,
      },
    ];

    templates.forEach((template) => {
      const id = randomUUID();
      this.templates.set(id, { ...template, id });
    });
  }

  // Coaches
  async getCoaches(): Promise<Coach[]> {
    return Array.from(this.coaches.values());
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    return this.coaches.get(id);
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const id = randomUUID();
    const newCoach: Coach = { ...coach, id, status: coach.status || "not_contacted" };
    this.coaches.set(id, newCoach);
    return newCoach;
  }

  async updateCoach(id: string, updates: Partial<InsertCoach>): Promise<Coach | undefined> {
    const coach = this.coaches.get(id);
    if (!coach) return undefined;
    const updated = { ...coach, ...updates };
    this.coaches.set(id, updated);
    return updated;
  }

  async deleteCoach(id: string): Promise<boolean> {
    return this.coaches.delete(id);
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getContactsByCoach(coachId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter((c) => c.coachId === coachId);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const newContact: Contact = { ...contact, id };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return Array.from(this.reminders.values());
  }

  async getRemindersByCoach(coachId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter((r) => r.coachId === coachId);
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const newReminder: Reminder = { ...reminder, id, completed: reminder.completed || false };
    this.reminders.set(id, newReminder);
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const reminder = this.reminders.get(id);
    if (!reminder) return undefined;
    const updated = { ...reminder, ...updates };
    this.reminders.set(id, updated);
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    return this.reminders.delete(id);
  }

  // Email Templates
  async getTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<EmailTemplate | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = randomUUID();
    const newTemplate: EmailTemplate = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...updates };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Gmail Settings
  async getGmailSettings(): Promise<GmailSettings | undefined> {
    return this.gmailSettings;
  }

  async saveGmailSettings(settings: InsertGmailSettings): Promise<GmailSettings> {
    const id = this.gmailSettings?.id || randomUUID();
    this.gmailSettings = { ...settings, id, configured: settings.configured || false };
    return this.gmailSettings;
  }
}

export const storage = new MemStorage();
