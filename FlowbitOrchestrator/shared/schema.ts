import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (existing)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Workflow executions table
export const executions = pgTable("executions", {
  id: text("id").primaryKey(), // UUID format
  workflowId: text("workflow_id").notNull(), // e.g., "email-agent"
  workflowName: text("workflow_name").notNull(), // e.g., "Email Agent"
  status: text("status").notNull(), // running, success, failed
  triggerType: text("trigger_type").notNull(), // manual, webhook, cron
  inputPayload: jsonb("input_payload"), // JSON input data
  output: jsonb("output"), // JSON output data
  error: text("error"), // Error message if failed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // e.g., "2.3s"
  langflowRunId: text("langflow_run_id"), // LangFlow execution ID
});

// Execution logs table for SSE streaming
export const executionLogs = pgTable("execution_logs", {
  id: serial("id").primaryKey(),
  executionId: text("execution_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: text("level").notNull(), // info, warn, error, success
  message: text("message").notNull(),
  nodeId: text("node_id"), // Optional node identifier
  metadata: jsonb("metadata"), // Additional log data
});

// Cron schedules table
export const cronSchedules = pgTable("cron_schedules", {
  id: serial("id").primaryKey(),
  workflowId: text("workflow_id").notNull(),
  cronExpression: text("cron_expression").notNull(),
  payload: jsonb("payload"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
});

// Webhook configurations table
export const webhookConfigs = pgTable("webhook_configs", {
  id: serial("id").primaryKey(),
  workflowId: text("workflow_id").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  requireAuth: boolean("require_auth").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertExecutionSchema = createInsertSchema(executions).omit({
  id: true,
  startedAt: true,
});

export const insertExecutionLogSchema = createInsertSchema(executionLogs).omit({
  id: true,
  timestamp: true,
});

export const insertCronScheduleSchema = createInsertSchema(cronSchedules).omit({
  id: true,
  createdAt: true,
  lastRun: true,
  nextRun: true,
});

export const insertWebhookConfigSchema = createInsertSchema(webhookConfigs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Execution = typeof executions.$inferSelect;
export type InsertExecution = z.infer<typeof insertExecutionSchema>;

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = z.infer<typeof insertExecutionLogSchema>;

export type CronSchedule = typeof cronSchedules.$inferSelect;
export type InsertCronSchedule = z.infer<typeof insertCronScheduleSchema>;

export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = z.infer<typeof insertWebhookConfigSchema>;

// Workflow definitions
export const workflowDefinitions = [
  {
    id: "email-agent",
    name: "Email Agent",
    description: "Email processing & automation",
    icon: "envelope",
    color: "blue",
  },
  {
    id: "pdf-agent",
    name: "PDF Agent",
    description: "Document parsing & extraction",
    icon: "file-pdf",
    color: "red",
  },
  {
    id: "json-agent",
    name: "JSON Agent",
    description: "Data transformation & validation",
    icon: "code",
    color: "green",
  },
  {
    id: "classifier-agent",
    name: "Classifier Agent",
    description: "AI-powered classification",
    icon: "brain",
    color: "purple",
  },
] as const;

export type WorkflowDefinition = typeof workflowDefinitions[number];
