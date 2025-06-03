import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { 
  Zap, 
  Mail, 
  FileText, 
  Code, 
  Brain,
  BarChart3,
  Settings,
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: "connected" | "disconnected" | "error";
}

const iconMap = {
  envelope: Mail,
  "file-pdf": FileText,
  code: Code,
  brain: Brain,
} as const;

const colorMap = {
  blue: "bg-blue-100 text-blue-600",
  red: "bg-red-100 text-red-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
} as const;

export function Sidebar() {
  const { data: workflows } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">FlowBit</h1>
            <p className="text-xs text-slate-500">Workflow Orchestration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Workflows
        </div>
        
        {workflows?.map((workflow) => {
          const IconComponent = iconMap[workflow.icon as keyof typeof iconMap];
          const colorClass = colorMap[workflow.color as keyof typeof colorMap];
          
          return (
            <div
              key={workflow.id}
              className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", colorClass)}>
                  {IconComponent && <IconComponent className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{workflow.name}</div>
                  <div className="text-xs text-slate-500">{workflow.description}</div>
                </div>
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    workflow.status === "connected" ? "bg-green-400" :
                    workflow.status === "disconnected" ? "bg-yellow-400" :
                    "bg-red-400"
                  )}
                />
              </div>
            </div>
          );
        })}

        <hr className="my-4 border-slate-200" />
        
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          System
        </div>
        
        <div className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-slate-700">Analytics</span>
          </div>
        </div>
        
        <div className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-slate-700">Settings</span>
          </div>
        </div>
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-slate-600">LangFlow Connected</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">Docker: Running on port 7860</div>
      </div>
    </div>
  );
}
