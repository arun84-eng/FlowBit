import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSSE } from "@/hooks/use-sse";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Scroll, 
  Map, 
  FileText,
  Download,
  Pause,
  RotateCcw,
} from "lucide-react";

interface ExecutionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
}

interface ExecutionDetails {
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
  logs: LogEntry[];
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  nodeId: string | null;
  metadata: any;
}

const statusConfig = {
  success: { className: "bg-green-100 text-green-800", label: "Success" },
  running: { className: "bg-yellow-100 text-yellow-800", label: "Running" },
  failed: { className: "bg-red-100 text-red-800", label: "Failed" },
} as const;

const logLevelColors = {
  info: "text-blue-300",
  warn: "text-yellow-300",
  error: "text-red-300",
  success: "text-green-300",
} as const;

function LogStream({ executionId }: { executionId: string }) {
  const { messages, isConnected } = useSSE(`/api/langflow/runs/${executionId}/stream`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Real-time Execution Logs</h4>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
            )} />
            <span className="text-xs text-slate-500">
              {isConnected ? "Live" : "Disconnected"}
            </span>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-3 w-3" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Pause className="h-3 w-3" />
            Pause
          </Button>
        </div>
      </div>
      
      <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-1">
        {messages.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            No logs available yet...
          </div>
        ) : (
          messages.map((log, index) => (
            <div
              key={index}
              className={cn(
                "py-1 border-l-2 border-transparent pl-3",
                log.level === "error" && "border-l-red-400",
                log.level === "warn" && "border-l-yellow-400",
                log.level === "success" && "border-l-green-400",
                log.level === "info" && "border-l-blue-400"
              )}
            >
              <span className="text-slate-400">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              {" "}
              <span className={cn(
                "font-medium",
                logLevelColors[log.level] || "text-slate-300"
              )}>
                [{log.level.toUpperCase()}]
              </span>
              {" "}
              <span className="text-slate-200">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OverviewTab({ execution }: { execution: ExecutionDetails }) {
  const statusInfo = statusConfig[execution.status];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Execution Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <Badge className={statusInfo.className}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Duration:</span>
                <span className="font-mono">{execution.duration || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Started:</span>
                <span>{new Date(execution.startedAt).toLocaleString()}</span>
              </div>
              {execution.completedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Completed:</span>
                  <span>{new Date(execution.completedAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Trigger:</span>
                <Badge className="capitalize">{execution.triggerType}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Input Data</h4>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto">
              {JSON.stringify(execution.inputPayload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Node Execution</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm font-medium">Input Parser</span>
                <span className="text-xs text-slate-500 ml-auto">0.1s</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm font-medium">Main Processor</span>
                <span className="text-xs text-slate-500 ml-auto">0.8s</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm font-medium">Output Formatter</span>
                <span className="text-xs text-slate-500 ml-auto">0.4s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {execution.error && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-red-900 mb-3">Error Details</h4>
              <pre className="text-xs bg-red-50 border border-red-200 rounded p-3 overflow-x-auto text-red-800">
                {execution.error}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function OutputTab({ execution }: { execution: ExecutionDetails }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Final Output</h4>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-3 w-3" />
          Copy
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <pre className="text-sm bg-white border border-slate-200 rounded p-4 overflow-x-auto h-80">
            {execution.output ? JSON.stringify(execution.output, null, 2) : "No output available"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export function ExecutionDetailsModal({ 
  open, 
  onOpenChange, 
  executionId 
}: ExecutionDetailsModalProps) {
  const { data: execution, isLoading } = useQuery<ExecutionDetails>({
    queryKey: ["/api/langflow/runs", executionId],
    enabled: open && !!executionId,
  });

  if (!executionId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Execution Details</DialogTitle>
              <p className="text-sm text-slate-500 font-mono">{executionId}</p>
            </div>
            {execution && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Re-run
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : execution ? (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <Scroll className="h-4 w-4" />
                Message Logs
              </TabsTrigger>
              <TabsTrigger value="nodes" className="gap-2">
                <Map className="h-4 w-4" />
                Node Details
              </TabsTrigger>
              <TabsTrigger value="output" className="gap-2">
                <FileText className="h-4 w-4" />
                Output
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-6">
              <TabsContent value="overview" className="m-0">
                <OverviewTab execution={execution} />
              </TabsContent>

              <TabsContent value="logs" className="m-0">
                <LogStream executionId={executionId} />
              </TabsContent>

              <TabsContent value="nodes" className="m-0">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Node Execution Details</h4>
                  <div className="space-y-4">
                    {/* Mock node details - in real implementation, this would come from the API */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-400 rounded-full" />
                            <h5 className="font-medium">Input Parser</h5>
                          </div>
                          <span className="text-sm text-slate-500">Duration: 0.1s</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600 mb-1">Input:</p>
                            <pre className="bg-slate-50 p-2 rounded text-xs">
                              {JSON.stringify(execution.inputPayload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-slate-600 mb-1">Output:</p>
                            <pre className="bg-slate-50 p-2 rounded text-xs">
                              {"{\n  \"parsed\": true,\n  \"valid\": true\n}"}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="output" className="m-0">
                <OutputTab execution={execution} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="p-6 text-center text-slate-500">
            Execution not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
