import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, 
  CheckCircle, 
  Clock, 
  Loader2,
} from "lucide-react";

interface Metrics {
  totalRuns: number;
  successRate: string;
  avgDuration: string;
  activeRuns: number;
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  isLoading 
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  isLoading: boolean;
}) {
  return (
    <Card className={`border-2 ${gradient}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsCards() {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ["/api/metrics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <MetricCard
        title="Total Runs"
        value={metrics?.totalRuns ?? 0}
        icon={Play}
        gradient="from-blue-500 to-blue-600 bg-gradient-to-r text-white"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Success Rate"
        value={metrics?.successRate ?? "0%"}
        icon={CheckCircle}
        gradient="from-green-500 to-green-600 bg-gradient-to-r text-white"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Avg Duration"
        value={metrics?.avgDuration ?? "0s"}
        icon={Clock}
        gradient="from-purple-500 to-purple-600 bg-gradient-to-r text-white"
        isLoading={isLoading}
      />
      
      <MetricCard
        title="Active Runs"
        value={metrics?.activeRuns ?? 0}
        icon={Loader2}
        gradient="from-orange-500 to-orange-600 bg-gradient-to-r text-white"
        isLoading={isLoading}
      />
    </div>
  );
}
