import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import nodemailer from "nodemailer";
import { insertCoachSchema, insertContactSchema, insertReminderSchema, insertEmailTemplateSchema, insertEmailSettingsSchema, insertScheduledEmailSchema, insertRecruitingProfileSchema } from "@shared/schema";
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

  app.post("/api/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.uid || (req.user as any)?.claims?.sub;
      const data = insertContactSchema.parse({
        ...req.body,
        userId: userId || req.body.userId
      });
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

  app.post("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.uid || (req.user as any)?.claims?.sub;
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

  // iCloud Mail Settings
  app.get("/api/email-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      if (!settings) {
        return res.json({ configured: false });
      }
      res.json({ id: settings.id, email: settings.email, configured: settings.configured });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email settings" });
    }
  });

  app.post("/api/email-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.uid || (req.user as any)?.claims?.sub;
      const data = insertEmailSettingsSchema.parse({
        ...req.body,
        userId: userId || req.body.userId
      });
      const settings = await storage.saveEmailSettings(data);
      res.json({ id: settings.id, email: settings.email, configured: settings.configured });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save email settings" });
    }
  });

  app.post("/api/test-email", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      console.log("[test-email] Settings loaded:", settings ? { email: settings.email, configured: settings.configured } : "none");
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

      console.log("[test-email] Verifying SMTP connection to smtp.mail.me.com:587...");
      await transporter.verify();
      console.log("[test-email] SMTP connection verified, sending test email...");

      await transporter.sendMail({
        from: settings.email,
        to: settings.email,
        subject: "RecruitTrack - Test Email",
        text: "This is a test email from RecruitTrack. Your iCloud Mail integration is working correctly!",
      });
      console.log("[test-email] Test email sent successfully to " + settings.email);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[test-email] Failed:", error.code, error.message, error.response);
      let userMessage = error.message || "Failed to connect to iCloud Mail";
      if (error.code === "EAUTH" || error.responseCode === 535) {
        userMessage = "Authentication failed. Please check your iCloud email and app-specific password.";
      } else if (error.code === "ESOCKET" || error.code === "ECONNECTION") {
        userMessage = "Could not connect to iCloud Mail server. Please check your network connection.";
      } else if (error.code === "ETIMEDOUT") {
        userMessage = "Connection timed out. The mail server may be temporarily unavailable.";
      }
      res.status(400).json({ error: userMessage });
    }
  });

  // Send Emails
  app.post("/api/send-emails", isAuthenticated, async (req: any, res) => {
    try {
      const { coachIds, subject, body, attachments } = req.body;

      if (!Array.isArray(coachIds) || coachIds.length === 0) {
        return res.status(400).json({ error: "No coaches selected" });
      }

      const settings = await storage.getEmailSettings();
      console.log("[send-emails] Settings loaded:", settings ? { email: settings.email, configured: settings.configured } : "none");
      if (!settings || !settings.configured) {
        return res.status(400).json({ error: "Email not configured. Please set up your iCloud Mail settings first." });
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
          const userId = (req as any).user?.uid || (req as any).user?.claims?.sub;
          console.log(`[send-emails] Sending to ${coach.email} (${coach.name})...`);
          await transporter.sendMail({
            from: settings.email,
            to: coach.email,
            subject: personalizedSubject,
            text: personalizedBody,
            attachments: mailAttachments,
          });
          console.log(`[send-emails] Successfully sent to ${coach.email}`);

          try {
            await storage.createContact({
              coachId: coach.id,
              userId: userId,
              date: new Date().toISOString().split("T")[0],
              method: "email",
              subject: personalizedSubject,
              notes: "Sent via RecruitTrack",
            });
          } catch (logError: any) {
            console.error(`[send-emails] Failed to log contact for ${coach.email}:`, logError.message);
          }

          try {
            if (coach.status === "not_contacted") {
              await storage.updateCoach(coach.id, { status: "awaiting_response" });
            }
          } catch (statusError: any) {
            console.error(`[send-emails] Failed to update coach status:`, statusError.message);
          }

          results.push({ coachId: coach.id, success: true });
        } catch (error: any) {
          console.error(`[send-emails] Failed to send to ${coach.email}:`, error.code, error.message, error.response);
          let errorMsg = error.message;
          if (error.code === "EAUTH" || error.responseCode === 535) {
            errorMsg = "Authentication failed. Check your iCloud email and app password.";
          }
          results.push({ coachId: coach.id, success: false, error: errorMsg });
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

  app.post("/api/recruiting-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.uid || (req.user as any)?.claims?.sub;
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
      const settings = await storage.getEmailSettings();
      
      if (!settings || !settings.configured || pendingEmails.length === 0) {
        return;
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

            try {
              await storage.createContact({
                coachId: coach.id,
                date: new Date().toISOString().split("T")[0],
                method: "email",
                subject: personalizedSubject,
                notes: "Sent via RecruitTrack (scheduled)",
              });
            } catch (logError: any) {
              console.error(`[scheduled-emails] Failed to log contact:`, logError.message);
            }

            try {
              if (coach.status === "not_contacted") {
                await storage.updateCoach(coach.id, { status: "awaiting_response" });
              }
            } catch (statusError: any) {
              console.error(`[scheduled-emails] Failed to update status:`, statusError.message);
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
