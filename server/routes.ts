import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import nodemailer from "nodemailer";
import { insertCoachSchema, insertContactSchema, insertReminderSchema, insertEmailTemplateSchema, insertGmailSettingsSchema, insertScheduledEmailSchema, insertRecruitingProfileSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

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

  // Coaches
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

  // Contacts
  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
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

  // Reminders
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

  // Email Templates
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

  // Gmail Settings
  app.get("/api/gmail-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getGmailSettings();
      if (!settings) {
        return res.json({ configured: false });
      }
      res.json({ id: settings.id, email: settings.email, configured: settings.configured });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Gmail settings" });
    }
  });

  app.post("/api/gmail-settings", isAuthenticated, async (req, res) => {
    try {
      const data = insertGmailSettingsSchema.parse(req.body);
      const settings = await storage.saveGmailSettings(data);
      res.json({ id: settings.id, email: settings.email, configured: settings.configured });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save Gmail settings" });
    }
  });

  app.post("/api/test-gmail", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getGmailSettings();
      if (!settings || !settings.configured) {
        return res.status(400).json({ error: "Gmail not configured" });
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
      res.status(400).json({ error: error.message || "Failed to connect to Gmail" });
    }
  });

  // Send Emails
  app.post("/api/send-emails", isAuthenticated, async (req, res) => {
    try {
      const { coachIds, subject, body, attachments } = req.body;

      if (!Array.isArray(coachIds) || coachIds.length === 0) {
        return res.status(400).json({ error: "No coaches selected" });
      }

      const settings = await storage.getGmailSettings();
      if (!settings || !settings.configured) {
        return res.status(400).json({ error: "Gmail not configured" });
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

      // Parse base64 attachments
      const mailAttachments = (attachments || []).map((att: { filename: string; content: string }) => {
        // content is a data URL like "data:application/pdf;base64,..."
        const matches = att.content.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          return {
            filename: att.filename,
            content: matches[2],
            encoding: "base64",
            contentType: matches[1],
          };
        }
        return {
          filename: att.filename,
          content: att.content,
        };
      });

      const results = [];
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
        } catch (error: any) {
          results.push({ coachId: coach.id, success: false, error: error.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === results.length) {
        return res.status(500).json({ error: "Failed to send all emails", results });
      }

      res.json({ 
        message: `Successfully sent ${successCount} email(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
        results 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to send emails" });
    }
  });

  // Scheduled Emails
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
      
      if (!Array.isArray(coachIds) || coachIds.length === 0) {
        return res.status(400).json({ error: "No coaches selected" });
      }
      
      const data = insertScheduledEmailSchema.parse({
        coachIds: JSON.stringify(coachIds),
        subject,
        body,
        scheduledAt,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      
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

  // Recruiting Profiles
  app.get("/api/recruiting-profiles", isAuthenticated, async (req, res) => {
    try {
      const profiles = await storage.getRecruitingProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recruiting profiles" });
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
      res.status(500).json({ error: "Failed to create recruiting profile" });
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
      res.status(500).json({ error: "Failed to update recruiting profile" });
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
      res.status(500).json({ error: "Failed to delete recruiting profile" });
    }
  });

  const processScheduledEmails = async () => {
    try {
      const pendingEmails = await storage.getPendingScheduledEmails();
      const settings = await storage.getGmailSettings();
      
      if (!settings || !settings.configured || pendingEmails.length === 0) {
        return;
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

      for (const scheduled of pendingEmails) {
        const coachIds = JSON.parse(scheduled.coachIds) as string[];
        let allSuccess = true;

        for (const coachId of coachIds) {
          const coach = await storage.getCoach(coachId);
          if (!coach) continue;

          const personalizedSubject = scheduled.subject
            .replace(/\{\{coach_name\}\}/g, coach.name)
            .replace(/\{\{salutation\}\}/g, coach.salutation || coach.name.split(" ")[0])
            .replace(/\{\{school\}\}/g, coach.school)
            .replace(/\{\{position\}\}/g, coach.position || "Coach");

          const personalizedBody = scheduled.body
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
            });

            await storage.createContact({
              coachId: coach.id,
              date: new Date().toISOString().split("T")[0],
              method: "email",
              subject: personalizedSubject,
              notes: "Sent via RecruitTrack (scheduled)",
            });

            if (coach.status === "not_contacted") {
              await storage.updateCoach(coach.id, { status: "awaiting_response" });
            }
          } catch {
            allSuccess = false;
          }
        }

        await storage.updateScheduledEmail(scheduled.id, {
          status: allSuccess ? "sent" : "failed",
        });
      }
    } catch (error) {
      console.error("Error processing scheduled emails:", error);
    }
  };

  setInterval(processScheduledEmails, 60000);

  const escapeCsvCell = (value: string | null | undefined): string => {
    const str = (value ?? "").toString();
    return str.replace(/"/g, '""');
  };

  app.get("/api/export/coaches", isAuthenticated, async (req, res) => {
    try {
      const coaches = await storage.getCoaches();
      
      const headers = ["Name", "Email", "Phone", "School", "Position", "Division", "Status", "Notes"];
      const rows = coaches.map(coach => [
        escapeCsvCell(coach.name),
        escapeCsvCell(coach.email),
        escapeCsvCell(coach.phone),
        escapeCsvCell(coach.school),
        escapeCsvCell(coach.position),
        escapeCsvCell(coach.division),
        escapeCsvCell(coach.status),
        escapeCsvCell(coach.notes)
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=coaches_export.csv");
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to export coaches" });
    }
  });

  app.get("/api/export/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      const coaches = await storage.getCoaches();
      
      const coachMap = new Map(coaches.map(c => [c.id, c]));
      
      const headers = ["Date", "Coach Name", "School", "Method", "Subject", "Notes"];
      const rows = contacts.map(contact => {
        const coach = coachMap.get(contact.coachId);
        return [
          escapeCsvCell(contact.date),
          escapeCsvCell(coach?.name || "Unknown"),
          escapeCsvCell(coach?.school),
          escapeCsvCell(contact.method),
          escapeCsvCell(contact.subject),
          escapeCsvCell(contact.notes)
        ];
      });
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=contacts_export.csv");
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to export contacts" });
    }
  });

  return httpServer;
}
