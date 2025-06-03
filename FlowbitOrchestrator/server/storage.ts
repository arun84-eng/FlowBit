import {
  users,
  executions,
  executionLogs,
  cronSchedules,
  webhookConfigs,
  type User,
  type InsertUser,
  type Execution,
  type InsertExecution,
  type ExecutionLog,
  type InsertExecutionLog,
  type CronSchedule,
  type InsertCronSchedule,
  type WebhookConfig,
  type InsertWebhookConfig,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Executions
  getExecution(id: string): Promise<Execution | undefined>;
  getExecutions(limit?: number, offset?: number): Promise<Execution[]>;
  createExecution(execution: InsertExecution): Promise<Execution>;
  updateExecution(id: string, updates: Partial<Execution>): Promise<Execution | undefined>;
  getActiveExecutions(): Promise<Execution[]>;

  // Execution Logs
  getExecutionLogs(executionId: string): Promise<ExecutionLog[]>;
  addExecutionLog(log: InsertExecutionLog): Promise<ExecutionLog>;

  // Cron Schedules
  getCronSchedules(): Promise<CronSchedule[]>;
  getCronSchedule(id: number): Promise<CronSchedule | undefined>;
  createCronSchedule(schedule: InsertCronSchedule): Promise<CronSchedule>;
  updateCronSchedule(id: number, updates: Partial<CronSchedule>): Promise<CronSchedule | undefined>;
  deleteCronSchedule(id: number): Promise<boolean>;

  // Webhook Configs
  getWebhookConfigs(): Promise<WebhookConfig[]>;
  getWebhookConfig(workflowId: string): Promise<WebhookConfig | undefined>;
  createWebhookConfig(config: InsertWebhookConfig): Promise<WebhookConfig>;
  updateWebhookConfig(workflowId: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private executions: Map<string, Execution>;
  private executionLogs: Map<string, ExecutionLog[]>;
  private cronSchedules: Map<number, CronSchedule>;
  private webhookConfigs: Map<string, WebhookConfig>;
  private currentUserId: number;
  private currentScheduleId: number;

  constructor() {
    this.users = new Map();
    this.executions = new Map();
    this.executionLogs = new Map();
    this.cronSchedules = new Map();
    this.webhookConfigs = new Map();
    this.currentUserId = 1;
    this.currentScheduleId = 1;

    // Initialize with default webhook configs
    const defaultWebhooks = [
      { workflowId: "email-agent", enabled: true, requireAuth: false },
      { workflowId: "pdf-agent", enabled: true, requireAuth: false },
      { workflowId: "json-agent", enabled: true, requireAuth: false },
      { workflowId: "classifier-agent", enabled: true, requireAuth: false },
    ];

    defaultWebhooks.forEach((config) => {
      const webhook: WebhookConfig = {
        ...config,
        id: this.currentScheduleId++,
        createdAt: new Date(),
      };
      this.webhookConfigs.set(config.workflowId, webhook);
    });

    // Add sample executions for demonstration
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleExecutions = [
      {
        workflowId: "email-agent",
        workflowName: "Email Agent",
        status: "success" as const,
        triggerType: "manual" as const,
        inputPayload: {
          email_text: "Hello, I need help with my account billing issue.",
          sender: "customer@example.com",
          priority: "high"
        },
        output: {
          sentiment: "neutral",
          priority_level: "high",
          category: "billing",
          suggested_actions: ["escalate_to_billing", "send_acknowledgment"],
          confidence: 0.87
        },
        error: null,
        duration: "1.2s",
        langflowRunId: "lf-run-001",
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: new Date(Date.now() - 3599000)
      },
      {
        workflowId: "classifier-agent",
        workflowName: "Classifier Agent", 
        status: "success" as const,
        triggerType: "webhook" as const,
        inputPayload: {
          input_text: "This product is amazing! Great quality and fast shipping."
        },
        output: {
          content_type: { category: "review", confidence: 0.95 },
          sentiment: { category: "positive", confidence: 0.92 },
          intent: { category: "feedback", confidence: 0.88 },
          priority: { category: "low", confidence: 0.78 },
          language: { code: "en", confidence: 0.99 },
          topics: [
            { category: "product_quality", confidence: 0.89 },
            { category: "shipping", confidence: 0.82 }
          ]
        },
        error: null,
        duration: "0.8s",
        langflowRunId: "lf-run-002",
        startedAt: new Date(Date.now() - 1800000), // 30 minutes ago
        completedAt: new Date(Date.now() - 1799000)
      },
      {
        workflowId: "json-agent",
        workflowName: "JSON Agent",
        status: "failed" as const,
        triggerType: "cron" as const,
        inputPayload: {
          data: '{"invalid": json syntax}'
        },
        output: null,
        error: "JSON parsing failed: Unexpected token 'j' at position 12",
        duration: "0.1s", 
        langflowRunId: "lf-run-003",
        startedAt: new Date(Date.now() - 900000), // 15 minutes ago
        completedAt: new Date(Date.now() - 899900)
      },
      {
        workflowId: "pdf-agent",
        workflowName: "PDF Agent",
        status: "running" as const,
        triggerType: "manual" as const,
        inputPayload: {
          file_path: "/uploads/financial_report_q4.pdf",
          extract_tables: true,
          summary_length: "detailed"
        },
        output: null,
        error: null,
        duration: null,
        langflowRunId: "lf-run-004",
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
        completedAt: null
      }
    ];

    sampleExecutions.forEach((execData, index) => {
      const id = `exec-sample-${Date.now()}-${index}`;
      const execution: Execution = {
        ...execData,
        id
      };
      this.executions.set(id, execution);

      // Add sample logs for each execution
      const sampleLogs = this.generateSampleLogs(id, execData.workflowId, execData.status);
      this.executionLogs.set(id, sampleLogs);
    });

    // Add a sample cron schedule
    const sampleSchedule: CronSchedule = {
      id: this.currentScheduleId++,
      workflowId: "email-agent",
      cronExpression: "0 9 * * 1-5",
      payload: { scheduled: true, batch_size: 50 },
      enabled: true,
      createdAt: new Date(),
      lastRun: new Date(Date.now() - 86400000), // 1 day ago
      nextRun: new Date(Date.now() + 43200000) // 12 hours from now
    };
    this.cronSchedules.set(sampleSchedule.id, sampleSchedule);
  }

  private generateSampleLogs(executionId: string, workflowId: string, status: string): ExecutionLog[] {
    const logs: ExecutionLog[] = [];
    let logId = 1;

    // Starting log
    logs.push({
      id: logId++,
      executionId,
      timestamp: new Date(Date.now() - 5000),
      level: "info",
      message: `Starting ${workflowId} execution...`,
      nodeId: null,
      metadata: { workflowId, triggerType: "manual" }
    });

    // Processing logs
    logs.push({
      id: logId++,
      executionId,
      timestamp: new Date(Date.now() - 4000),
      level: "info", 
      message: "Input validation completed successfully",
      nodeId: "input-validator",
      metadata: { nodeType: "validator", duration: "0.1s" }
    });

    logs.push({
      id: logId++,
      executionId,
      timestamp: new Date(Date.now() - 3000),
      level: "info",
      message: "Processing data through main workflow",
      nodeId: "main-processor",
      metadata: { nodeType: "processor", progress: "50%" }
    });

    if (status === "success") {
      logs.push({
        id: logId++,
        executionId,
        timestamp: new Date(Date.now() - 1000),
        level: "success",
        message: "Workflow execution completed successfully",
        nodeId: "output-formatter",
        metadata: { nodeType: "formatter", outputSize: "1.2KB" }
      });
    } else if (status === "failed") {
      logs.push({
        id: logId++,
        executionId,
        timestamp: new Date(Date.now() - 1000), 
        level: "error",
        message: "Execution failed due to invalid input format",
        nodeId: "main-processor",
        metadata: { nodeType: "processor", errorCode: "INVALID_INPUT" }
      });
    } else if (status === "running") {
      logs.push({
        id: logId++,
        executionId,
        timestamp: new Date(Date.now() - 1000),
        level: "info",
        message: "Currently processing large document...",
        nodeId: "pdf-parser",
        metadata: { nodeType: "parser", progress: "75%" }
      });
    }

    return logs;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Executions
  async getExecution(id: string): Promise<Execution | undefined> {
    return this.executions.get(id);
  }

  async getExecutions(limit = 50, offset = 0): Promise<Execution[]> {
    const allExecutions = Array.from(this.executions.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    return allExecutions.slice(offset, offset + limit);
  }

  async createExecution(insertExecution: InsertExecution): Promise<Execution> {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution: Execution = {
      ...insertExecution,
      id,
      startedAt: new Date(),
      completedAt: null,
      duration: null,
    };
    this.executions.set(id, execution);
    this.executionLogs.set(id, []);
    return execution;
  }

  async updateExecution(id: string, updates: Partial<Execution>): Promise<Execution | undefined> {
    const execution = this.executions.get(id);
    if (!execution) return undefined;

    const updatedExecution = { ...execution, ...updates };
    this.executions.set(id, updatedExecution);
    return updatedExecution;
  }

  async getActiveExecutions(): Promise<Execution[]> {
    return Array.from(this.executions.values())
      .filter((execution) => execution.status === "running");
  }

  // Execution Logs
  async getExecutionLogs(executionId: string): Promise<ExecutionLog[]> {
    return this.executionLogs.get(executionId) || [];
  }

  async addExecutionLog(insertLog: InsertExecutionLog): Promise<ExecutionLog> {
    const log: ExecutionLog = {
      ...insertLog,
      id: Date.now(),
      timestamp: new Date(),
    };

    const logs = this.executionLogs.get(insertLog.executionId) || [];
    logs.push(log);
    this.executionLogs.set(insertLog.executionId, logs);
    
    return log;
  }

  // Cron Schedules
  async getCronSchedules(): Promise<CronSchedule[]> {
    return Array.from(this.cronSchedules.values());
  }

  async getCronSchedule(id: number): Promise<CronSchedule | undefined> {
    return this.cronSchedules.get(id);
  }

  async createCronSchedule(insertSchedule: InsertCronSchedule): Promise<CronSchedule> {
    const id = this.currentScheduleId++;
    const schedule: CronSchedule = {
      ...insertSchedule,
      id,
      createdAt: new Date(),
      lastRun: null,
      nextRun: null, // This should be calculated based on cron expression
    };
    this.cronSchedules.set(id, schedule);
    return schedule;
  }

  async updateCronSchedule(id: number, updates: Partial<CronSchedule>): Promise<CronSchedule | undefined> {
    const schedule = this.cronSchedules.get(id);
    if (!schedule) return undefined;

    const updatedSchedule = { ...schedule, ...updates };
    this.cronSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteCronSchedule(id: number): Promise<boolean> {
    return this.cronSchedules.delete(id);
  }

  // Webhook Configs
  async getWebhookConfigs(): Promise<WebhookConfig[]> {
    return Array.from(this.webhookConfigs.values());
  }

  async getWebhookConfig(workflowId: string): Promise<WebhookConfig | undefined> {
    return this.webhookConfigs.get(workflowId);
  }

  async createWebhookConfig(insertConfig: InsertWebhookConfig): Promise<WebhookConfig> {
    const config: WebhookConfig = {
      ...insertConfig,
      id: this.currentScheduleId++,
      createdAt: new Date(),
    };
    this.webhookConfigs.set(insertConfig.workflowId, config);
    return config;
  }

  async updateWebhookConfig(workflowId: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | undefined> {
    const config = this.webhookConfigs.get(workflowId);
    if (!config) return undefined;

    const updatedConfig = { ...config, ...updates };
    this.webhookConfigs.set(workflowId, updatedConfig);
    return updatedConfig;
  }
}

export const storage = new MemStorage();
