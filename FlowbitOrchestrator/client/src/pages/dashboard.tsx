import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ExecutionTable } from "@/components/execution-table";
import { TriggerModal } from "@/components/trigger-modal";
import { ExecutionDetailsModal } from "@/components/execution-details-modal";
import { MetricsCards } from "@/components/metrics-cards";
import { Button } from "@/components/ui/button";
import { useExecutions } from "@/hooks/use-executions";
import { Play, Download } from "lucide-react";

export default function Dashboard() {
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  
  const { data: executionsData, isLoading, refetch } = useExecutions();

  const handleViewDetails = (executionId: string) => {
    setSelectedExecutionId(executionId);
    setDetailsModalOpen(true);
  };

  const handleExecutionCreated = () => {
    refetch();
    setTriggerModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Workflow Executions</h2>
              <p className="text-slate-600">Monitor and manage your workflow runs</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Logs
              </Button>
              <Button 
                onClick={() => setTriggerModalOpen(true)}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Trigger Workflow
              </Button>
            </div>
          </div>
        </header>

        {/* Metrics */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <MetricsCards />
        </div>

        {/* Executions Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Recent Executions</h3>
                <div className="flex items-center gap-3">
                  {/* Add search and filter controls here */}
                </div>
              </div>
            </div>

            <ExecutionTable 
              executions={executionsData?.executions || []}
              isLoading={isLoading}
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>
      </div>

      <TriggerModal 
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        onExecutionCreated={handleExecutionCreated}
      />

      <ExecutionDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        executionId={selectedExecutionId}
      />
    </div>
  );
}
