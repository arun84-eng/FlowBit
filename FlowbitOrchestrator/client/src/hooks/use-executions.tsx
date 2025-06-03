import { useQuery } from "@tanstack/react-query";

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

export interface ExecutionsResponse {
  executions: Execution[];
  total: number;
}

export function useExecutions(limit = 50, offset = 0) {
  return useQuery<ExecutionsResponse>({
    queryKey: ["/api/langflow/runs", { limit, offset }],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });
}

export function useExecution(executionId: string | null) {
  return useQuery({
    queryKey: ["/api/langflow/runs", executionId],
    enabled: !!executionId,
  });
}
