import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { triggerWorkflow, langflowClient, getWorkflowStatus } from "../lib/langflow";
import { cronManager } from "../lib/cron";
import { workflowDefinitions, insertExecutionSchema, insertCronScheduleSchema, insertWebhookConfigSchema } from "@shared/schema";
import { z } from "zod";

// SSE connections for real-time log streaming
const sseConnections = new Map<string, Set<any>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Workflow definitions
  app.get("/api/workflows", async (req, res) => {
    try {
      const workflows = await Promise.all(
        workflowDefinitions.map(async (workflow) => {
          const status = await getWorkflowStatus(workflow.id);
          return {
            ...workflow,
            status,
          };
        })
      );
      
      res.json(workflows);
    } catch (error) {
      console.error("Failed to get workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  // Get execution runs (last 50 by default)
  app.get("/api/langflow/runs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const executions = await storage.getExecutions(limit, offset);
      
      res.json({
        executions,
        total: executions.length, // In a real DB, you'd have a separate count query
      });
    } catch (error) {
      console.error("Failed to get executions:", error);
      res.status(500).json({ error: "Failed to fetch executions" });
    }
  });

  // Get specific execution details
  app.get("/api/langflow/runs/:id", async (req, res) => {
    try {
      const execution = await storage.getExecution(req.params.id);
      
      if (!execution) {
        return res.status(404).json({ error: "Execution not found" });
      }

      const logs = await storage.getExecutionLogs(req.params.id);
      
      res.json({
        ...execution,
        logs,
      });
    } catch (error) {
      console.error("Failed to get execution details:", error);
      res.status(500).json({ error: "Failed to fetch execution details" });
    }
  });

  // SSE endpoint for streaming execution logs
  app.get("/api/langflow/runs/:id/stream", async (req, res) => {
    const executionId = req.params.id;
    
    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Add connection to tracking
    if (!sseConnections.has(executionId)) {
      sseConnections.set(executionId, new Set());
    }
    sseConnections.get(executionId)!.add(res);

    // Send existing logs first
    try {
      const logs = await storage.getExecutionLogs(executionId);
      for (const log of logs) {
        res.write(`data: ${JSON.stringify({
          timestamp: log.timestamp.toISOString(),
          level: log.level,
          message: log.message,
          nodeId: log.nodeId,
          metadata: log.metadata,
        })}\n\n`);
      }
    } catch (error) {
      console.error("Failed to send existing logs:", error);
    }

    // Handle client disconnect
    req.on("close", () => {
      const connections = sseConnections.get(executionId);
      if (connections) {
        connections.delete(res);
        if (connections.size === 0) {
          sseConnections.delete(executionId);
        }
      }
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAlive);
    });
  });

  // Trigger workflow execution
  app.post("/api/trigger", async (req, res) => {
    try {
      const { workflowId, engine, triggerType, inputPayload } = req.body;

      if (engine !== "langflow") {
        return res.status(400).json({ error: "Only langflow engine is supported" });
      }

      if (!workflowDefinitions.find(w => w.id === workflowId)) {
        return res.status(400).json({ error: "Invalid workflow ID" });
      }

      const execution = await triggerWorkflow(workflowId, inputPayload || {}, triggerType || "manual");
      
      res.json({
        success: true,
        executionId: execution.id,
        execution,
      });
    } catch (error) {
      console.error("Failed to trigger workflow:", error);
      res.status(500).json({ 
        error: "Failed to trigger workflow",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Public webhook endpoints
  app.post("/api/hooks/:workflowId", async (req, res) => {
    try {
      const { workflowId } = req.params;
      
      // Check if webhook is enabled
      const webhookConfig = await storage.getWebhookConfig(workflowId);
      if (!webhookConfig || !webhookConfig.enabled) {
        return res.status(404).json({ error: "Webhook not found or disabled" });
      }

      // Validate workflow exists
      if (!workflowDefinitions.find(w => w.id === workflowId)) {
        return res.status(400).json({ error: "Invalid workflow ID" });
      }

      // TODO: Implement authentication if requireAuth is true
      if (webhookConfig.requireAuth) {
        // Add your authentication logic here
      }

      const execution = await triggerWorkflow(workflowId, req.body, "webhook");
      
      res.json({
        success: true,
        executionId: execution.id,
        message: "Workflow triggered successfully",
      });
    } catch (error) {
      console.error("Webhook execution failed:", error);
      res.status(500).json({ 
        error: "Webhook execution failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Cron schedule management
  app.get("/api/schedules", async (req, res) => {
    try {
      const schedules = await storage.getCronSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Failed to get schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    try {
      const scheduleData = insertCronScheduleSchema.parse(req.body);
      
      // Validate cron expression
      if (!cronManager.validateCronExpression(scheduleData.cronExpression)) {
        return res.status(400).json({ error: "Invalid cron expression" });
      }

      // Calculate next run time
      const nextRun = cronManager.getNextRunTime(scheduleData.cronExpression);
      
      const schedule = await storage.createCronSchedule({
        ...scheduleData,
        nextRun,
      });

      // Schedule the job
      if (schedule.enabled) {
        await cronManager.scheduleJob(
          schedule.id,
          schedule.cronExpression,
          schedule.workflowId,
          schedule.payload
        );
      }

      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid schedule data", details: error.errors });
      }
      
      console.error("Failed to create schedule:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Remove from cron manager
      cronManager.removeJob(id);
      
      // Remove from storage
      const deleted = await storage.deleteCronSchedule(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // Webhook configuration management
  app.get("/api/webhooks", async (req, res) => {
    try {
      const configs = await storage.getWebhookConfigs();
      
      // Add webhook URLs
      const webhooksWithUrls = configs.map(config => ({
        ...config,
        url: `${req.protocol}://${req.get('host')}/api/hooks/${config.workflowId}`,
      }));
      
      res.json(webhooksWithUrls);
    } catch (error) {
      console.error("Failed to get webhook configs:", error);
      res.status(500).json({ error: "Failed to fetch webhook configurations" });
    }
  });

  app.put("/api/webhooks/:workflowId", async (req, res) => {
    try {
      const { workflowId } = req.params;
      const updates = req.body;
      
      const config = await storage.updateWebhookConfig(workflowId, updates);
      
      if (!config) {
        return res.status(404).json({ error: "Webhook configuration not found" });
      }

      res.json({
        ...config,
        url: `${req.protocol}://${req.get('host')}/api/hooks/${config.workflowId}`,
      });
    } catch (error) {
      console.error("Failed to update webhook config:", error);
      res.status(500).json({ error: "Failed to update webhook configuration" });
    }
  });

  // Metrics endpoint
  app.get("/api/metrics", async (req, res) => {
    try {
      const executions = await storage.getExecutions(1000); // Get more for metrics calculation
      const activeExecutions = await storage.getActiveExecutions();
      
      const totalRuns = executions.length;
      const successfulRuns = executions.filter(e => e.status === "success").length;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns * 100).toFixed(1) : "0.0";
      
      // Calculate average duration
      const completedExecutions = executions.filter(e => e.duration);
      const avgDurationMs = completedExecutions.length > 0 
        ? completedExecutions.reduce((sum, e) => {
            const duration = e.duration!;
            const seconds = parseFloat(duration.replace(/[^\d.]/g, ''));
            return sum + (seconds * 1000);
          }, 0) / completedExecutions.length
        : 0;
      
      const avgDuration = avgDurationMs < 1000 
        ? `${Math.round(avgDurationMs)}ms`
        : `${(avgDurationMs / 1000).toFixed(1)}s`;
      
      res.json({
        totalRuns,
        successRate: `${successRate}%`,
        avgDuration,
        activeRuns: activeExecutions.length,
      });
    } catch (error) {
      console.error("Failed to get metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  const httpServer = createServer(app);

  // Function to broadcast logs to SSE connections
  const originalAddLog = storage.addExecutionLog.bind(storage);
  storage.addExecutionLog = async function(log) {
    const result = await originalAddLog(log);
    
    // Broadcast to SSE connections
    const connections = sseConnections.get(log.executionId);
    if (connections && connections.size > 0) {
      const logData = {
        timestamp: result.timestamp.toISOString(),
        level: result.level,
        message: result.message,
        nodeId: result.nodeId,
        metadata: result.metadata,
      };
      
      const dataString = `data: ${JSON.stringify(logData)}\n\n`;
      
      for (const connection of connections) {
        try {
          connection.write(dataString);
        } catch (error) {
          // Remove failed connections
          connections.delete(connection);
        }
      }
    }
    
    return result;
  };

  return httpServer;
}
