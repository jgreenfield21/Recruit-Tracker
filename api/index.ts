import express, { type Request, Response, NextFunction } from "express";
import { storage } from "../server/storage";
import nodemailer from "nodemailer";
import { insertCoachSchema, insertContactSchema, insertReminderSchema, insertEmailTemplateSchema, insertGmailSettingsSchema, insertScheduledEmailSchema, insertRecruitingProfileSchema } from "../shared/schema";
import { z } from "zod";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pg from "pg";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PostgresSessionStore = pgSession(session);
const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
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
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  if (process.env.MOCK_AUTH === "true") {
    req.user = { claims: { sub: "dev-user", email: "dev@localhost" } };
    return next();
  }
  if (!req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = req.session.user;
  next();
};

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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create coach" });
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
    const contacts = coachId
      ? await storage.getContactsByCoach(coachId)
      : await storage.getContacts();
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

app.post("/api/contacts", isAuthenticated, async (req, res) => {
  try {
    const data = insertContactSchema.parse(req.body);
    const contact = await storage.createContact(data);
    
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

app.get("/api/reminders", isAuthenticated, async (req, res) => {
  try {
    const reminders = await storage.getReminders();
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

app.post("/api/reminders", isAuthenticated, async (req, res) => {
  try {
    const data = insertReminderSchema.parse(req.body);
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
      ...settings,
      appPassword: settings.appPassword ? "••••••••" : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/gmail-settings", isAuthenticated, async (req, res) => {
  try {
    const data = insertGmailSettingsSchema.parse(req.body);
    const settings = await storage.saveGmailSettings(data);
    res.json({
      ...settings,
      appPassword: "••••••••",
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
    if (!settings || !settings.configured) {
      return res.status(400).json({ error: "Email not configured" });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.me.com",
      port: 587,
      secure: false,
      auth: {
        user: settings.email,
        pass: settings.appPassword,
      },
    });

    await transporter.verify();
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to connect" });
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

app.post("/api/recruiting-profiles", isAuthenticated, async (req, res) => {
  try {
    const data = insertRecruitingProfileSchema.parse(req.body);
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
      auth: {
        user: settings.email,
        pass: settings.appPassword,
      },
    });

    const mailAttachments = (attachments || []).map((att: { filename: string; content: string }) => {
      const matches = att.content.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        return {
          filename: att.filename,
          content: matches[2],
          encoding: "base64",
          contentType: matches[1],
        };
      }
      return { filename: att.filename, content: att.content };
    });

    const results: Array<{ coachId: string; success: boolean; error?: string }> = [];
    for (const coachId of coachIds) {
      const coach = await storage.getCoach(coachId);
      if (!coach) continue;

      const personalizedSubject = subject
        .replace(/\{\{coach_name\}\}/g, coach.name)
        .replace(/\{\{salutation\}\}/g, coach.salutation || coach.name.split(" ")[0])
        .replace(/\{\{school\}\}/g, coach.school)
        .replace(/\{\{position\}\}/g, coach.position || "Coach");

      const personalizedBody = body
        .replace(/\{\{coach_name\}\}/g, coach.name)
        .replace(/\{\{salutation\}\}/g, coach.salutation || coach.name.split(" ")[0])
        .replace(/\{\{school\}\}/g, coach.school)
        .replace(/\{\{position\}\}/g, coach.position || "Coach");

      try {
        await transporter.sendMail({
          from: settings.email,
          to: coach.email,
          subject: personalizedSubject,
          text: personalizedBody,
          attachments: mailAttachments,
        });

        await storage.createContact({
          coachId: coach.id,
          date: new Date().toISOString().split("T")[0],
          method: "email",
          subject: personalizedSubject,
          notes: "Sent via RecruitTrack",
        });

        if (coach.status === "not_contacted") {
          await storage.updateCoach(coach.id, { status: "awaiting_response" });
        }

        results.push({ coachId: coach.id, success: true });
      } catch (emailError: any) {
        results.push({ coachId: coach.id, success: false, error: emailError.message });
      }
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to send emails" });
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
    const data = insertScheduledEmailSchema.parse(req.body);
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

export default app;
