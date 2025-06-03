import * as cron from "node-cron";
import { storage } from "../server/storage";
import { triggerWorkflow } from "./langflow";
import fs from "fs";
import path from "path";

interface CronJob {
  id: number;
  task: cron.ScheduledTask;
  schedule: string;
}

class CronManager {
  private jobs: Map<number, CronJob> = new Map();
  private persistPath: string;

  constructor() {
    this.persistPath = path.join(process.cwd(), "cron-jobs.json");
    this.loadPersistedJobs();
  }

  private async loadPersistedJobs() {
    try {
      if (fs.existsSync(this.persistPath)) {
        const persistedJobs = JSON.parse(fs.readFileSync(this.persistPath, "utf-8"));
        
        // Restore jobs from database
        const schedules = await storage.getCronSchedules();
        
        for (const schedule of schedules) {
          if (schedule.enabled && persistedJobs.includes(schedule.id)) {
            await this.scheduleJob(schedule.id, schedule.cronExpression, schedule.workflowId, schedule.payload || {});
          }
        }
      }
    } catch (error) {
      console.error("Failed to load persisted cron jobs:", error);
    }
  }

  private persistJobs() {
    try {
      const jobIds = Array.from(this.jobs.keys());
      fs.writeFileSync(this.persistPath, JSON.stringify(jobIds, null, 2));
    } catch (error) {
      console.error("Failed to persist cron jobs:", error);
    }
  }

  async scheduleJob(id: number, cronExpression: string, workflowId: string, payload: any = {}) {
    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Remove existing job if any
      this.removeJob(id);

      // Create new scheduled task
      const task = cron.schedule(cronExpression, async () => {
        try {
          console.log(`Executing scheduled workflow: ${workflowId}`);
          
          // Update last run time
          await storage.updateCronSchedule(id, { lastRun: new Date() });
          
          // Trigger the workflow
          await triggerWorkflow(workflowId, {
            ...payload,
            trigger: "cron",
            scheduled: true,
            cronId: id,
          });
          
        } catch (error) {
          console.error(`Cron job ${id} failed:`, error);
        }
      }, {
        scheduled: true,
      });

      // Store the job
      this.jobs.set(id, {
        id,
        task,
        schedule: cronExpression,
      });

      // Persist to disk
      this.persistJobs();

      console.log(`Cron job ${id} scheduled with expression: ${cronExpression}`);
      
    } catch (error) {
      console.error(`Failed to schedule cron job ${id}:`, error);
      throw error;
    }
  }

  removeJob(id: number) {
    const job = this.jobs.get(id);
    if (job) {
      job.task.destroy();
      this.jobs.delete(id);
      this.persistJobs();
      console.log(`Cron job ${id} removed`);
    }
  }

  getJob(id: number): CronJob | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  async restartAllJobs() {
    // Clear existing jobs
    for (const job of this.jobs.values()) {
      job.task.destroy();
    }
    this.jobs.clear();

    // Reload from database
    await this.loadPersistedJobs();
  }

  validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  getNextRunTime(expression: string): Date | null {
    try {
      if (!this.validateCronExpression(expression)) {
        return null;
      }
      
      // This is a simplified calculation - in production you might want to use a more robust library
      const now = new Date();
      const task = cron.schedule(expression, () => {}, { scheduled: false });
      const nextRun = task.nextDate();
      task.destroy();
      
      return nextRun ? nextRun.toDate() : null;
    } catch (error) {
      return null;
    }
  }
}

export const cronManager = new CronManager();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down cron jobs...");
  for (const job of cronManager.getAllJobs()) {
    cronManager.removeJob(job.id);
  }
});

process.on("SIGINT", () => {
  console.log("Shutting down cron jobs...");
  for (const job of cronManager.getAllJobs()) {
    cronManager.removeJob(job.id);
  }
  process.exit(0);
});
