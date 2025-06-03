import { storage } from "../server/storage";
import { workflowDefinitions } from "@shared/schema";
import { mockLangflowClient } from "./mock-langflow";

interface LangFlowConfig {
  baseUrl: string;
  apiKey?: string;
}

class LangFlowClient {
  private config: LangFlowConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.LANGFLOW_URL || "http://localhost:7860",
      apiKey: process.env.LANGFLOW_API_KEY,
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`LangFlow API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFlows() {
    try {
      return await this.makeRequest("/api/v1/flows");
    } catch (error) {
      console.error("Failed to get flows from LangFlow:", error);
      // Fall back to mock client when LangFlow is not available
      return await mockLangflowClient.getFlows();
    }
  }

  async runFlow(flowId: string, inputs: Record<string, any>) {
    try {
      const response = await this.makeRequest(`/api/v1/run/${flowId}`, {
        method: "POST",
        body: JSON.stringify({
          input_value: JSON.stringify(inputs),
          output_type: "chat",
          input_type: "chat",
        }),
      });

      return response;
    } catch (error) {
      console.error(`Failed to run flow ${flowId}:`, error);
      // Fall back to mock client when LangFlow is not available
      return await mockLangflowClient.runFlow(flowId, inputs);
    }
  }

  async getRunStatus(runId: string) {
    try {
      return await this.makeRequest(`/api/v1/runs/${runId}`);
    } catch (error) {
      console.error(`Failed to get run status for ${runId}:`, error);
      // Fall back to mock client when LangFlow is not available
      return await mockLangflowClient.getRunStatus(runId);
    }
  }

  async getRunLogs(runId: string) {
    try {
      return await this.makeRequest(`/api/v1/runs/${runId}/logs`);
    } catch (error) {
      console.error(`Failed to get run logs for ${runId}:`, error);
      // Fall back to mock client when LangFlow is not available
      return await mockLangflowClient.getRunLogs(runId);
    }
  }
}

export const langflowClient = new LangFlowClient();

export async function triggerWorkflow(workflowId: string, payload: any, triggerType: string = "manual") {
  try {
    // Find workflow definition
    const workflowDef = workflowDefinitions.find(w => w.id === workflowId);
    if (!workflowDef) {
      throw new Error(`Unknown workflow: ${workflowId}`);
    }

    // Create execution record
    const execution = await storage.createExecution({
      workflowId,
      workflowName: workflowDef.name,
      status: "running",
      triggerType,
      inputPayload: payload,
      output: null,
      error: null,
      duration: null,
      langflowRunId: null,
    });

    // Add initial log
    await storage.addExecutionLog({
      executionId: execution.id,
      level: "info",
      message: `Starting ${workflowDef.name} execution...`,
      nodeId: null,
      metadata: { triggerType, workflowId },
    });

    try {
      // Trigger LangFlow execution
      const langflowResult = await langflowClient.runFlow(workflowId, payload);
      
      // Update execution with LangFlow run ID
      await storage.updateExecution(execution.id, {
        langflowRunId: langflowResult.run_id || langflowResult.id,
      });

      // Add success log
      await storage.addExecutionLog({
        executionId: execution.id,
        level: "info",
        message: "LangFlow execution initiated successfully",
        nodeId: null,
        metadata: { langflowRunId: langflowResult.run_id || langflowResult.id },
      });

      // Start monitoring the execution
      monitorExecution(execution.id, langflowResult.run_id || langflowResult.id);

      return execution;

    } catch (error) {
      // Update execution with error
      await storage.updateExecution(execution.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
        duration: calculateDuration(execution.startedAt, new Date()),
      });

      // Add error log
      await storage.addExecutionLog({
        executionId: execution.id,
        level: "error",
        message: `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        nodeId: null,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      throw error;
    }

  } catch (error) {
    console.error(`Failed to trigger workflow ${workflowId}:`, error);
    throw error;
  }
}

async function monitorExecution(executionId: string, langflowRunId: string) {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  const monitor = async () => {
    try {
      attempts++;
      
      // Get execution status from LangFlow
      const runStatus = await langflowClient.getRunStatus(langflowRunId);
      
      // Add monitoring log
      await storage.addExecutionLog({
        executionId,
        level: "info",
        message: `Execution status: ${runStatus.status || "running"}`,
        nodeId: null,
        metadata: { langflowStatus: runStatus.status, attempt: attempts },
      });

      if (runStatus.status === "completed" || runStatus.status === "success") {
        // Execution completed successfully
        const execution = await storage.getExecution(executionId);
        if (execution) {
          await storage.updateExecution(executionId, {
            status: "success",
            output: runStatus.outputs || runStatus.result || runStatus.data,
            completedAt: new Date(),
            duration: calculateDuration(execution.startedAt, new Date()),
          });

          await storage.addExecutionLog({
            executionId,
            level: "success",
            message: "Execution completed successfully",
            nodeId: null,
            metadata: { totalAttempts: attempts, output: runStatus.outputs },
          });
        }
        
      } else if (runStatus.status === "failed" || runStatus.status === "error") {
        // Execution failed
        const execution = await storage.getExecution(executionId);
        if (execution) {
          await storage.updateExecution(executionId, {
            status: "failed",
            error: runStatus.error || "LangFlow execution failed",
            completedAt: new Date(),
            duration: calculateDuration(execution.startedAt, new Date()),
          });

          await storage.addExecutionLog({
            executionId,
            level: "error",
            message: `Execution failed: ${runStatus.error || "Unknown error"}`,
            nodeId: null,
            metadata: { totalAttempts: attempts, error: runStatus.error },
          });
        }
        
      } else if (attempts < maxAttempts) {
        // Still running, check again in 5 seconds
        setTimeout(monitor, 5000);
      } else {
        // Timeout
        const execution = await storage.getExecution(executionId);
        if (execution) {
          await storage.updateExecution(executionId, {
            status: "failed",
            error: "Execution timeout - exceeded maximum monitoring time",
            completedAt: new Date(),
            duration: calculateDuration(execution.startedAt, new Date()),
          });

          await storage.addExecutionLog({
            executionId,
            level: "error",
            message: "Execution monitoring timeout",
            nodeId: null,
            metadata: { totalAttempts: attempts, timeout: true },
          });
        }
      }
      
    } catch (error) {
      console.error(`Error monitoring execution ${executionId}:`, error);
      
      if (attempts < maxAttempts) {
        // Retry monitoring
        setTimeout(monitor, 5000);
      } else {
        // Mark as failed due to monitoring errors
        const execution = await storage.getExecution(executionId);
        if (execution) {
          await storage.updateExecution(executionId, {
            status: "failed",
            error: "Failed to monitor execution",
            completedAt: new Date(),
            duration: calculateDuration(execution.startedAt, new Date()),
          });
        }
      }
    }
  };

  // Start monitoring
  setTimeout(monitor, 5000); // Wait 5 seconds before first check
}

function calculateDuration(startTime: Date, endTime: Date): string {
  const durationMs = endTime.getTime() - startTime.getTime();
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
}

export async function getWorkflowStatus(workflowId: string): Promise<"connected" | "disconnected" | "error"> {
  try {
    const flows = await langflowClient.getFlows();
    const workflowExists = flows.some((flow: any) => 
      flow.id === workflowId || flow.name?.toLowerCase() === workflowId.replace("-", " ")
    );
    
    return workflowExists ? "connected" : "disconnected";
  } catch (error) {
    console.error(`Failed to check workflow status for ${workflowId}:`, error);
    return "error";
  }
}
