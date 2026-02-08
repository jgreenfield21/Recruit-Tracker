import express, { type Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";
import { z } from "zod";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import admin from "firebase-admin";

const isFirebaseConfigured = Boolean(process.env.FIREBASE_PROJECT_ID);

if (isFirebaseConfigured && admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

const coaches = pgTable("coaches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  school: text("school").notNull(),
  position: text("position"),
  division: text("division"),
  salutation: text("salutation"),
  notes: text("notes"),
  status: text("status").notNull().default("not_contacted"),
});

const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
type InsertCoach = z.infer<typeof insertCoachSchema>;
type Coach = typeof coaches.$inferSelect;

const contacts = pgTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachId: varchar("coach_id", { length: 36 }).notNull(),
  date: text("date").notNull(),
  method: text("method").notNull(),
  subject: text("subject"),
  notes: text("notes"),
});

const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
type InsertContact = z.infer<typeof insertContactSchema>;
type Contact = typeof contacts.$inferSelect;

const reminders = pgTable("reminders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachId: varchar("coach_id", { length: 36 }).notNull(),
  dueDate: text("due_date").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  completed: boolean("completed").notNull().default(false),
});

const insertReminderSchema = createInsertSchema(reminders).omit({ id: true });
type InsertReminder = z.infer<typeof insertReminderSchema>;
type Reminder = typeof reminders.$inferSelect;

const emailTemplates = pgTable("email_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
});

const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true });
type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
type EmailTemplate = typeof emailTemplates.$inferSelect;

const gmailSettings = pgTable("gmail_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: text("email").notNull(),
  appPassword: text("app_password").notNull(),
  configured: boolean("configured").notNull().default(false),
});

const insertGmailSettingsSchema = createInsertSchema(gmailSettings).omit({ id: true });
type InsertGmailSettings = z.infer<typeof insertGmailSettingsSchema>;
type GmailSettings = typeof gmailSettings.$inferSelect;

const scheduledEmails = pgTable("scheduled_emails", {
  id: varchar("id", { length: 36 }).primaryKey(),
  coachIds: text("coach_ids").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({ id: true });
type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
type ScheduledEmail = typeof scheduledEmails.$inferSelect;

const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

type UpsertUser = typeof users.$inferInsert;
type User = typeof users.$inferSelect;

const recruitingProfiles = pgTable("recruiting_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
});

const insertRecruitingProfileSchema = createInsertSchema(recruitingProfiles).omit({ id: true });
type InsertRecruitingProfile = z.infer<typeof insertRecruitingProfileSchema>;
type RecruitingProfile = typeof recruitingProfiles.$inferSelect;

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coaches (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        school TEXT NOT NULL,
        position TEXT,
        division TEXT,
        salutation TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'not_contacted'
      );
      
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(36) PRIMARY KEY,
        coach_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        date TEXT NOT NULL,
        method TEXT NOT NULL,
        subject TEXT,
        notes TEXT
      );
      
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(36) PRIMARY KEY,
        coach_id VARCHAR(36) NOT NULL,
        due_date TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        completed BOOLEAN NOT NULL DEFAULT FALSE
      );
      
      CREATE TABLE IF NOT EXISTS email_templates (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS gmail_settings (
        id VARCHAR(36) PRIMARY KEY,
        email TEXT NOT NULL,
        app_password TEXT NOT NULL,
        configured BOOLEAN NOT NULL DEFAULT FALSE
      );
      
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id VARCHAR(36) PRIMARY KEY,
        coach_ids TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS recruiting_profiles (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);
    `);
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initializeDatabase();

class DatabaseStorage {
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
    return await db.select().from(coaches);
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const id = randomUUID();
    const [newCoach] = await db.insert(coaches).values({ ...coach, id, status: coach.status || "not_contacted" }).returning();
    return newCoach;
  }

  async updateCoach(id: string, updates: Partial<InsertCoach>): Promise<Coach | undefined> {
    const [updated] = await db.update(coaches).set(updates).where(eq(coaches.id, id)).returning();
    return updated;
  }

  async deleteCoach(id: string): Promise<boolean> {
    const result = await db.delete(coaches).where(eq(coaches.id, id));
    return true;
  }

  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getContactsByCoach(coachId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.coachId, coachId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const [newContact] = await db.insert(contacts).values({ ...contact, id }).returning();
    return newContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    await db.delete(contacts).where(eq(contacts.id, id));
    return true;
  }

  async getReminders(): Promise<Reminder[]> {
    return await db.select().from(reminders);
  }

  async getRemindersByCoach(coachId: string): Promise<Reminder[]> {
    return await db.select().from(reminders).where(eq(reminders.coachId, coachId));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const [newReminder] = await db.insert(reminders).values({ ...reminder, id, completed: reminder.completed || false }).returning();
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db.update(reminders).set(updates).where(eq(reminders.id, id)).returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    await db.delete(reminders).where(eq(reminders.id, id));
    return true;
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates);
  }

  async getTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = randomUUID();
    const [newTemplate] = await db.insert(emailTemplates).values({ ...template, id }).returning();
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates).set(updates).where(eq(emailTemplates.id, id)).returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return true;
  }

  async getGmailSettings(): Promise<GmailSettings | undefined> {
    const [settings] = await db.select().from(gmailSettings);
    return settings;
  }

  async saveGmailSettings(settings: InsertGmailSettings): Promise<GmailSettings> {
    const existing = await this.getGmailSettings();
    if (existing) {
      const [updated] = await db.update(gmailSettings).set(settings).where(eq(gmailSettings.id, existing.id)).returning();
      return updated;
    }
    const id = randomUUID();
    const [newSettings] = await db.insert(gmailSettings).values({ ...settings, id }).returning();
    return newSettings;
  }

  async getScheduledEmails(): Promise<ScheduledEmail[]> {
    return await db.select().from(scheduledEmails);
  }

  async getPendingScheduledEmails(): Promise<ScheduledEmail[]> {
    return await db.select().from(scheduledEmails).where(eq(scheduledEmails.status, "pending"));
  }

  async createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail> {
    const id = randomUUID();
    const [newEmail] = await db.insert(scheduledEmails).values({ ...email, id, status: email.status || "pending" }).returning();
    return newEmail;
  }

  async updateScheduledEmail(id: string, updates: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined> {
    const [updated] = await db.update(scheduledEmails).set(updates).where(eq(scheduledEmails.id, id)).returning();
    return updated;
  }

  async deleteScheduledEmail(id: string): Promise<boolean> {
    await db.delete(scheduledEmails).where(eq(scheduledEmails.id, id));
    return true;
  }

  async getRecruitingProfiles(): Promise<RecruitingProfile[]> {
    return await db.select().from(recruitingProfiles);
  }

  async createRecruitingProfile(profile: InsertRecruitingProfile): Promise<RecruitingProfile> {
    const id = randomUUID();
    const [newProfile] = await db.insert(recruitingProfiles).values({ ...profile, id }).returning();
    return newProfile;
  }

  async updateRecruitingProfile(id: string, updates: Partial<InsertRecruitingProfile>): Promise<RecruitingProfile | undefined> {
    const [updated] = await db.update(recruitingProfiles).set(updates).where(eq(recruitingProfiles.id, id)).returning();
    return updated;
  }

  async deleteRecruitingProfile(id: string): Promise<boolean> {
    await db.delete(recruitingProfiles).where(eq(recruitingProfiles.id, id));
    return true;
  }
}

const storage = new DatabaseStorage();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

const PostgresSessionStore = pgSession(session);
const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

app.use(
  session({
    store: new PostgresSessionStore({
      pool: sessionPool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: isProduction ? "none" : "lax",
    },
  })
);

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
  if (process.env.MOCK_AUTH === "true") {
    req.user = { claims: { sub: "dev-user", email: "dev@localhost" } };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ") && isFirebaseConfigured) {
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        claims: {
          sub: decodedToken.uid,
          email: decodedToken.email || "",
          name: decodedToken.name,
          picture: decodedToken.picture,
        },
      };
      
      // Upsert user in database to ensure they exist for other operations
      try {
        await storage.upsertUser({
          id: decodedToken.uid,
          email: decodedToken.email || null,
          firstName: decodedToken.name?.split(' ')[0] || null,
          lastName: decodedToken.name?.split(' ').slice(1).join(' ') || null,
          profileImageUrl: decodedToken.picture || null,
        });
      } catch (upsertError) {
        console.error("Failed to upsert user after Firebase login:", upsertError);
      }
      
      return next();
    } catch (error) {
      console.error("Firebase token verification failed:", error);
      return res.status(401).json({ message: "Invalid token" });
    }
  }

  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as time, current_database() as database");
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({
      status: "ok",
      database: result.rows[0].database,
      serverTime: result.rows[0].time,
      tables: tableCheck.rows.map(r => r.table_name),
      environment: {
        isProduction,
        hasFirebase: isFirebaseConfigured,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
      }
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      error: String(error),
      environment: {
        isProduction,
        hasFirebase: isFirebaseConfigured,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      }
    });
  }
});

app.get("/api/login", (req: any, res) => {
  if (process.env.MOCK_AUTH === "true") {
    req.session.user = { claims: { sub: "dev-user", email: "dev@localhost" } };
    return res.redirect("/");
  }
  res.status(501).json({ error: "OAuth login not configured for Vercel. Set MOCK_AUTH=true or use Replit deployment." });
});

app.get("/api/callback", (req, res) => {
  res.redirect("/");
});

app.get("/api/logout", (req: any, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.get("/api/coaches", isAuthenticated, async (req, res) => {
  try {
    const coaches = await storage.getCoaches();
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch coaches" });
  }
});

app.get("/api/coaches/:id", isAuthenticated, async (req, res) => {
  try {
    const coach = await storage.getCoach(req.params.id);
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }
    res.json(coach);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch coach" });
  }
});

app.post("/api/coaches", isAuthenticated, async (req, res) => {
  try {
    const data = insertCoachSchema.parse(req.body);
    const coach = await storage.createCoach(data);
    res.status(201).json(coach);
  } catch (error) {
    console.error("Error creating coach:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create coach", details: String(error) });
  }
});

app.patch("/api/coaches/:id", isAuthenticated, async (req, res) => {
  try {
    const data = insertCoachSchema.partial().parse(req.body);
    const coach = await storage.updateCoach(req.params.id, data);
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }
    res.json(coach);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update coach" });
  }
});

app.delete("/api/coaches/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteCoach(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Coach not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete coach" });
  }
});

app.get("/api/contacts", isAuthenticated, async (req, res) => {
  try {
    const coachId = req.query.coachId as string | undefined;
    const contacts = coachId ? await storage.getContactsByCoach(coachId) : await storage.getContacts();
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

app.post("/api/contacts", isAuthenticated, async (req: any, res) => {
  try {
    const data = insertContactSchema.parse(req.body);
    const userId = req.user?.uid || req.user?.claims?.sub;
    const contact = await storage.createContact({ ...data, userId } as any);
    
    const coach = await storage.getCoach(data.coachId);
    if (coach && coach.status === "not_contacted") {
      await storage.updateCoach(data.coachId, { status: "contacted" });
    }
    
    res.status(201).json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create contact" });
  }
});

app.delete("/api/contacts/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteContact(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

app.get("/api/reminders", isAuthenticated, async (req, res) => {
  try {
    const reminders = await storage.getReminders();
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

app.post("/api/reminders", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.uid || req.user?.claims?.sub;
    const data = insertReminderSchema.parse({
      ...req.body,
      userId: userId || req.body.userId
    });
    const reminder = await storage.createReminder(data);
    res.status(201).json(reminder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

app.patch("/api/reminders/:id", isAuthenticated, async (req, res) => {
  try {
    const data = insertReminderSchema.partial().parse(req.body);
    const reminder = await storage.updateReminder(req.params.id, data);
    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }
    res.json(reminder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update reminder" });
  }
});

app.delete("/api/reminders/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteReminder(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Reminder not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

app.get("/api/templates", isAuthenticated, async (req, res) => {
  try {
    const templates = await storage.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

app.get("/api/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const template = await storage.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

app.post("/api/templates", isAuthenticated, async (req, res) => {
  try {
    const data = insertEmailTemplateSchema.parse(req.body);
    const template = await storage.createTemplate(data);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create template" });
  }
});

app.patch("/api/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const data = insertEmailTemplateSchema.partial().parse(req.body);
    const template = await storage.updateTemplate(req.params.id, data);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update template" });
  }
});

app.delete("/api/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteTemplate(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete template" });
  }
});

app.get("/api/gmail-settings", isAuthenticated, async (req, res) => {
  try {
    const settings = await storage.getGmailSettings();
    if (!settings) {
      return res.json({ configured: false });
    }
    res.json({
      id: settings.id,
      email: settings.email,
      configured: settings.configured,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/gmail-settings", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.uid || req.user?.claims?.sub;
    const data = insertGmailSettingsSchema.parse({
      ...req.body,
      userId: userId || req.body.userId
    });
    const settings = await storage.saveGmailSettings(data);
    res.json({
      id: settings.id,
      email: settings.email,
      configured: settings.configured,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/test-gmail", isAuthenticated, async (req, res) => {
  try {
    const settings = await storage.getGmailSettings();
    console.log("[test-gmail] Settings loaded:", settings ? { email: settings.email, configured: settings.configured } : "none");
    if (!settings || !settings.configured) {
      return res.status(400).json({ error: "Email not configured. Please save your iCloud Mail settings first." });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.me.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: settings.email,
        pass: settings.appPassword,
      },
    });

    console.log("[test-gmail] Verifying SMTP connection...");
    await transporter.verify();
    console.log("[test-gmail] SMTP verified successfully");
    res.json({ success: true });
  } catch (error: any) {
    console.error("[test-gmail] Failed:", error.message);
    res.status(400).json({ error: error.message || "Failed to connect to iCloud Mail" });
  }
});

app.get("/api/recruiting-profiles", isAuthenticated, async (req, res) => {
  try {
    const profiles = await storage.getRecruitingProfiles();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

app.post("/api/recruiting-profiles", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.uid || req.user?.claims?.sub;
    const data = insertRecruitingProfileSchema.parse({
      ...req.body,
      userId: userId || req.body.userId
    });
    const profile = await storage.createRecruitingProfile(data);
    res.status(201).json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create profile" });
  }
});

app.patch("/api/recruiting-profiles/:id", isAuthenticated, async (req, res) => {
  try {
    const data = insertRecruitingProfileSchema.partial().parse(req.body);
    const profile = await storage.updateRecruitingProfile(req.params.id, data);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.delete("/api/recruiting-profiles/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteRecruitingProfile(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

app.get("/api/scheduled-emails", isAuthenticated, async (req, res) => {
  try {
    const emails = await storage.getScheduledEmails();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scheduled emails" });
  }
});

app.post("/api/scheduled-emails", isAuthenticated, async (req, res) => {
  try {
    const { coachIds, subject, body, scheduledAt } = req.body;
    const data = {
      coachIds: Array.isArray(coachIds) ? coachIds.join(",") : coachIds,
      subject,
      body,
      scheduledAt,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const email = await storage.createScheduledEmail(data);
    res.status(201).json(email);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to schedule email" });
  }
});

app.delete("/api/scheduled-emails/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteScheduledEmail(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Scheduled email not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete scheduled email" });
  }
});

app.post("/api/send-emails", isAuthenticated, async (req, res) => {
  try {
    const { coachIds, subject, body, attachments } = req.body;

    if (!Array.isArray(coachIds) || coachIds.length === 0) {
      return res.status(400).json({ error: "No coaches selected" });
    }

    const settings = await storage.getGmailSettings();
    if (!settings || !settings.configured) {
      return res.status(400).json({ error: "Email not configured" });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.me.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: settings.email,
        pass: settings.appPassword,
      },
    });

    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const coachId of coachIds) {
      try {
        const coach = await storage.getCoach(coachId);
        if (!coach) {
          results.failed.push({ id: coachId, error: "Coach not found" });
          continue;
        }

        let personalizedBody = body
          .replace(/\{\{coach_name\}\}/g, coach.name)
          .replace(/\{\{school\}\}/g, coach.school)
          .replace(/\{\{salutation\}\}/g, coach.salutation || "Coach")
          .replace(/\{\{position\}\}/g, coach.position || "");

        let personalizedSubject = subject
          .replace(/\{\{coach_name\}\}/g, coach.name)
          .replace(/\{\{school\}\}/g, coach.school)
          .replace(/\{\{salutation\}\}/g, coach.salutation || "Coach")
          .replace(/\{\{position\}\}/g, coach.position || "");

        const mailOptions: any = {
          from: settings.email,
          to: coach.email,
          subject: personalizedSubject,
          text: personalizedBody,
        };

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          mailOptions.attachments = attachments.map((att: any) => ({
            filename: att.name,
            content: Buffer.from(att.data, "base64"),
            contentType: att.type,
          }));
        }

        await transporter.sendMail(mailOptions);

        await storage.createContact({
          coachId,
          date: new Date().toISOString().split("T")[0],
          method: "email",
          subject: personalizedSubject,
          notes: `Sent via RecruitTrack`,
        });

        if (coach.status === "not_contacted") {
          await storage.updateCoach(coachId, { status: "contacted" });
        }

        results.success.push(coachId);
      } catch (error: any) {
        results.failed.push({ id: coachId, error: error.message });
      }
    }

    res.json({
      message: `Sent ${results.success.length} emails successfully`,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send emails" });
  }
});

export default app;
