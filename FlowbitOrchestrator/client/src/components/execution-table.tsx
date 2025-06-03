import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Mail, 
  FileText, 
  Code, 
  Brain,
  Loader2,
} from "lucide-react";

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "success" | "failed";
  triggerType: "manual" | "webhook" | "cron";
  duration: string | null;
  startedAt: string;
}

interface ExecutionTableProps {
  executions: Execution[];
  isLoading: boolean;
  onViewDetails: (executionId: string) => void;
}

const iconMap = {
  "email-agent": Mail,
  "pdf-agent": FileText,
  "json-agent": Code,
  "classifier-agent": Brain,
} as const;

const colorMap = {
  "email-agent": "bg-blue-100 text-blue-600",
  "pdf-agent": "bg-red-100 text-red-600",
  "json-agent": "bg-green-100 text-green-600",
  "classifier-agent": "bg-purple-100 text-purple-600",
} as const;

const statusConfig = {
  success: { className: "bg-green-100 text-green-800", label: "Success" },
  running: { className: "bg-yellow-100 text-yellow-800", label: "Running" },
  failed: { className: "bg-red-100 text-red-800", label: "Failed" },
} as const;

const triggerConfig = {
  manual: { className: "bg-blue-100 text-blue-800", label: "Manual" },
  webhook: { className: "bg-green-100 text-green-800", label: "Webhook" },
  cron: { className: "bg-purple-100 text-purple-800", label: "Cron" },
} as const;

function ExecutionRow({ execution, onViewDetails }: { 
  execution: Execution; 
  onViewDetails: (id: string) => void;
}) {
  const IconComponent = iconMap[execution.workflowId as keyof typeof iconMap];
  const colorClass = colorMap[execution.workflowId as keyof typeof colorMap];
  const statusInfo = statusConfig[execution.status];
  const triggerInfo = triggerConfig[execution.triggerType];

  return (
    <tr 
      className="hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => onViewDetails(execution.id)}
    >
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClass)}>
            {IconComponent && <IconComponent className="h-4 w-4" />}
          </div>
          <div>
            <div className="font-medium text-slate-900">{execution.workflowName}</div>
            <div className="text-sm text-slate-500 font-mono">{execution.id}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <Badge className={cn("gap-1.5", statusInfo.className)}>
          {execution.status === "running" && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {execution.status !== "running" && (
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              execution.status === "success" ? "bg-green-400" : "bg-red-400"
            )} />
          )}
          {statusInfo.label}
        </Badge>
      </td>
      <td className="py-4 px-6">
        <Badge className={triggerInfo.className}>
          {triggerInfo.label}
        </Badge>
      </td>
      <td className="py-4 px-6 text-sm text-slate-900 font-mono">
        {execution.duration || "—"}
      </td>
      <td className="py-4 px-6 text-sm text-slate-500">
        {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
      </td>
      <td className="py-4 px-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(execution.id);
          }}
          className="text-blue-600 hover:text-blue-700"
        >
          View Details
        </Button>
      </td>
    </tr>
  );
}

function LoadingSkeleton() {
  return (
    <tr>
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-6 w-14 rounded-full" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-4 w-12" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-8 w-20" />
      </td>
    </tr>
  );
}

export function ExecutionTable({ executions, isLoading, onViewDetails }: ExecutionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Workflow
            </th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trigger
            </th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Started
            </th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))
          ) : executions.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-slate-500">
                No executions found. Trigger a workflow to get started.
              </td>
            </tr>
          ) : (
            executions.map((execution) => (
              <ExecutionRow
                key={execution.id}
                execution={execution}
                onViewDetails={onViewDetails}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
