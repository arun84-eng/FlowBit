import { apiRequest } from "@/lib/queryClient";

// Types for API responses
export interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: "connected" | "disconnected" | "error";
}

export interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "success" | "failed";
  triggerType: "manual" | "webhook" | "cron";
  inputPayload: any;
  output: any;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  duration: string | null;
  langflowRunId: string | null;
}

export interface ExecutionDetails extends Execution {
  logs: LogEntry[];
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  nodeId: string | null;
  metadata: any;
}

export interface ExecutionsResponse {
  executions: Execution[];
  total: number;
}

export interface Metrics {
  totalRuns: number;
  successRate: string;
  avgDuration: string;
  activeRuns: number;
}

export interface CronSchedule {
  id: number;
  workflowId: string;
  cronExpression: string;
  payload: any;
  enabled: boolean;
  createdAt: string;
  lastRun: string | null;
  nextRun: string | null;
}

export interface WebhookConfig {
  id: number;
  workflowId: string;
  enabled: boolean;
  requireAuth: boolean;
  createdAt: string;
  url: string;
}

// API functions
export const api = {
  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    const response = await apiRequest("GET", "/api/workflows");
    return response.json();
  },

  // Executions
  async getExecutions(limit = 50, offset = 0): Promise<ExecutionsResponse> {
    const response = await apiRequest("GET", `/api/langflow/runs?limit=${limit}&offset=${offset}`);
    return response.json();
  },

  async getExecution(id: string): Promise<ExecutionDetails> {
    const response = await apiRequest("GET", `/api/langflow/runs/${id}`);
    return response.json();
  },

  async triggerWorkflow(data: {
    workflowId: string;
    inputPayload: any;
    triggerType?: string;
  }): Promise<{ success: boolean; executionId: string; execution: Execution }> {
    const response = await apiRequest("POST", "/api/trigger", {
      workflowId: data.workflowId,
      engine: "langflow",
      triggerType: data.triggerType || "manual",
      inputPayload: data.inputPayload,
    });
    return response.json();
  },

  // Metrics
  async getMetrics(): Promise<Metrics> {
    const response = await apiRequest("GET", "/api/metrics");
    return response.json();
  },

  // Schedules
  async getSchedules(): Promise<CronSchedule[]> {
    const response = await apiRequest("GET", "/api/schedules");
    return response.json();
  },

  async createSchedule(data: {
    workflowId: string;
    cronExpression: string;
    payload?: any;
    enabled?: boolean;
  }): Promise<CronSchedule> {
    const response = await apiRequest("POST", "/api/schedules", {
      workflowId: data.workflowId,
      cronExpression: data.cronExpression,
      payload: data.payload || {},
      enabled: data.enabled ?? true,
    });
    return response.json();
  },

  async deleteSchedule(id: number): Promise<{ success: boolean }> {
    const response = await apiRequest("DELETE", `/api/schedules/${id}`);
    return response.json();
  },

  // Webhooks
  async getWebhooks(): Promise<WebhookConfig[]> {
    const response = await apiRequest("GET", "/api/webhooks");
    return response.json();
  },

  async updateWebhook(workflowId: string, updates: {
    enabled?: boolean;
    requireAuth?: boolean;
  }): Promise<WebhookConfig> {
    const response = await apiRequest("PUT", `/api/webhooks/${workflowId}`, updates);
    return response.json();
  },

  // Utility functions
  validateCronExpression(expression: string): boolean {
    // Basic cron validation - in production you might want a more robust solution
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    return cronRegex.test(expression);
  },

  validateJSON(jsonString: string): { valid: boolean; error?: string } {
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : "Invalid JSON" 
      };
    }
  },

  formatDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const durationSeconds = durationMs / 1000;
    
    if (durationSeconds < 60) {
      return `${durationSeconds.toFixed(1)}s`;
    } else if (durationSeconds < 3600) {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  },

  // SSE connection helper
  createSSEConnection(url: string): EventSource {
    return new EventSource(url);
  },

  // Webhook URL generator
  generateWebhookUrl(workflowId: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/api/hooks/${workflowId}`;
  },
};

export default api;
