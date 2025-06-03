import { storage } from "../server/storage";
import { workflowDefinitions } from "@shared/schema";

interface MockWorkflowResponse {
  run_id: string;
  status: string;
  outputs?: any;
  result?: any;
  data?: any;
  error?: string;
}

class MockLangFlowClient {
  private runningExecutions = new Map<string, NodeJS.Timeout>();

  async getFlows() {
    // Return the available workflow definitions
    return workflowDefinitions.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: "active"
    }));
  }

  async runFlow(flowId: string, inputs: Record<string, any>): Promise<MockWorkflowResponse> {
    const runId = `mock-run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate workflow execution based on the flow type
    const mockResponse = this.generateMockResponse(flowId, inputs, runId);
    
    // Simulate async execution for running workflows
    if (mockResponse.status === "running") {
      this.simulateAsyncExecution(runId, flowId, inputs);
    }
    
    return mockResponse;
  }

  async getRunStatus(runId: string) {
    // Simulate different statuses based on run ID patterns
    if (runId.includes("fail")) {
      return {
        status: "failed",
        error: "Simulated workflow failure for testing"
      };
    }
    
    if (runId.includes("running")) {
      return {
        status: "running",
        progress: "Processing..."
      };
    }

    // Most executions complete successfully
    return {
      status: "completed",
      outputs: this.generateMockOutput(runId)
    };
  }

  async getRunLogs(runId: string) {
    return [
      {
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Mock execution ${runId} started`,
        nodeId: "start-node"
      },
      {
        timestamp: new Date().toISOString(),
        level: "info", 
        message: "Processing input data",
        nodeId: "process-node"
      },
      {
        timestamp: new Date().toISOString(),
        level: "success",
        message: "Execution completed successfully",
        nodeId: "end-node"
      }
    ];
  }

  private generateMockResponse(flowId: string, inputs: any, runId: string): MockWorkflowResponse {
    switch (flowId) {
      case "email-agent":
        return {
          run_id: runId,
          status: "completed",
          outputs: {
            sentiment: this.analyzeSentiment(inputs.email_text || ""),
            priority_level: inputs.priority || "medium",
            category: this.categorizeEmail(inputs.email_text || ""),
            suggested_actions: this.suggestActions(inputs.email_text || ""),
            confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
          }
        };

      case "classifier-agent":
        return {
          run_id: runId,
          status: "completed",
          outputs: {
            content_type: { category: "text", confidence: 0.95 },
            sentiment: { 
              category: this.analyzeSentiment(inputs.input_text || ""), 
              confidence: Math.random() * 0.2 + 0.8 
            },
            intent: { category: this.classifyIntent(inputs.input_text || ""), confidence: 0.85 },
            priority: { category: "medium", confidence: 0.78 },
            language: { code: "en", confidence: 0.99 },
            topics: this.extractTopics(inputs.input_text || "")
          }
        };

      case "json-agent":
        try {
          JSON.parse(inputs.data || "{}");
          return {
            run_id: runId,
            status: "completed",
            outputs: {
              valid: true,
              parsed_data: JSON.parse(inputs.data || "{}"),
              schema_analysis: {
                total_keys: Object.keys(JSON.parse(inputs.data || "{}")).length,
                data_types: this.analyzeDataTypes(JSON.parse(inputs.data || "{}"))
              }
            }
          };
        } catch (error) {
          return {
            run_id: runId,
            status: "failed",
            error: `JSON parsing failed: ${error instanceof Error ? error.message : "Invalid JSON"}`
          };
        }

      case "pdf-agent":
        // Simulate longer processing time for PDF
        return {
          run_id: runId,
          status: "running"
        };

      default:
        return {
          run_id: runId,
          status: "failed",
          error: `Unknown workflow: ${flowId}`
        };
    }
  }

  private simulateAsyncExecution(runId: string, flowId: string, inputs: any) {
    // Simulate PDF processing taking 10-30 seconds
    const processingTime = Math.random() * 20000 + 10000; // 10-30 seconds
    
    this.runningExecutions.set(runId, setTimeout(() => {
      // Update the execution with completed status
      this.completeAsyncExecution(runId, flowId, inputs);
      this.runningExecutions.delete(runId);
    }, processingTime));
  }

  private async completeAsyncExecution(runId: string, flowId: string, inputs: any) {
    // Find the execution in storage and update it
    const executions = await storage.getExecutions(100);
    const execution = executions.find(e => e.langflowRunId === runId);
    
    if (execution) {
      const mockOutput = this.generatePdfOutput(inputs);
      
      await storage.updateExecution(execution.id, {
        status: "success",
        output: mockOutput,
        completedAt: new Date(),
        duration: this.calculateDuration(execution.startedAt, new Date())
      });

      // Add completion log
      await storage.addExecutionLog({
        executionId: execution.id,
        level: "success",
        message: "PDF processing completed successfully",
        nodeId: "pdf-parser",
        metadata: { 
          pages_processed: Math.floor(Math.random() * 50) + 1,
          extracted_text_length: Math.floor(Math.random() * 5000) + 1000
        }
      });
    }
  }

  private generatePdfOutput(inputs: any) {
    return {
      summary: {
        main_topics: ["Financial Performance", "Market Analysis", "Strategic Planning"],
        key_findings: [
          "Revenue increased by 15% compared to previous quarter",
          "Market share expanded in key demographics",
          "Cost optimization initiatives showing positive results"
        ],
        important_dates: ["2024-03-31", "2024-06-30", "2024-12-31"],
        actionable_items: [
          "Review budget allocation for Q2",
          "Implement new marketing strategy",
          "Schedule board meeting for strategic review"
        ]
      },
      extracted_data: {
        total_pages: Math.floor(Math.random() * 50) + 10,
        tables_found: inputs.extract_tables ? Math.floor(Math.random() * 5) + 1 : 0,
        text_length: Math.floor(Math.random() * 10000) + 2000,
        images_count: Math.floor(Math.random() * 10)
      }
    };
  }

  private generateMockOutput(runId: string) {
    return {
      processed_at: new Date().toISOString(),
      run_id: runId,
      success: true,
      processing_time: `${(Math.random() * 5 + 0.5).toFixed(1)}s`
    };
  }

  private analyzeSentiment(text: string): string {
    const positiveWords = ["great", "amazing", "excellent", "good", "fantastic", "wonderful"];
    const negativeWords = ["bad", "terrible", "awful", "disappointed", "frustrated", "angry"];
    
    const lowerText = text.toLowerCase();
    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    
    if (hasPositive && !hasNegative) return "positive";
    if (hasNegative && !hasPositive) return "negative"; 
    return "neutral";
  }

  private categorizeEmail(text: string): string {
    const categories = {
      "billing": ["billing", "payment", "invoice", "charge", "refund"],
      "support": ["help", "support", "issue", "problem", "trouble"],
      "sales": ["purchase", "buy", "price", "cost", "quote"],
      "general": ["question", "inquiry", "information"]
    };

    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return "general";
  }

  private suggestActions(text: string): string[] {
    const actions = ["send_acknowledgment", "forward_to_specialist"];
    
    if (text.toLowerCase().includes("urgent") || text.toLowerCase().includes("asap")) {
      actions.push("escalate_priority");
    }
    
    if (this.categorizeEmail(text) === "billing") {
      actions.push("escalate_to_billing");
    }
    
    return actions;
  }

  private classifyIntent(text: string): string {
    const intents = {
      "complaint": ["disappointed", "terrible", "awful", "bad"],
      "inquiry": ["question", "how", "what", "when", "where"],
      "feedback": ["great", "amazing", "excellent", "good"],
      "request": ["please", "can you", "would you", "need"]
    };

    const lowerText = text.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return intent;
      }
    }
    
    return "general";
  }

  private extractTopics(text: string): Array<{category: string, confidence: number}> {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("product") || lowerText.includes("quality")) {
      topics.push({ category: "product_quality", confidence: 0.89 });
    }
    
    if (lowerText.includes("shipping") || lowerText.includes("delivery")) {
      topics.push({ category: "shipping", confidence: 0.82 });
    }
    
    if (lowerText.includes("service") || lowerText.includes("support")) {
      topics.push({ category: "customer_service", confidence: 0.76 });
    }
    
    if (topics.length === 0) {
      topics.push({ category: "general", confidence: 0.65 });
    }
    
    return topics;
  }

  private analyzeDataTypes(obj: any): Record<string, string> {
    const types: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      types[key] = typeof value;
    }
    
    return types;
  }

  private calculateDuration(startTime: Date, endTime: Date): string {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSeconds = durationMs / 1000;
    
    if (durationSeconds < 60) {
      return `${durationSeconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);
      return `${minutes}m ${seconds}s`;
    }
  }
}

export const mockLangflowClient = new MockLangFlowClient();