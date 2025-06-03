import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Copy, Play, Calendar, Link } from "lucide-react";

interface TriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecutionCreated?: () => void;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
}

const manualSchema = z.object({
  workflowId: z.string().min(1, "Please select a workflow"),
  inputPayload: z.string().min(1, "Please provide input data"),
});

const webhookSchema = z.object({
  workflowId: z.string().min(1, "Please select a workflow"),
});

const scheduleSchema = z.object({
  workflowId: z.string().min(1, "Please select a workflow"),
  cronExpression: z.string().min(1, "Please provide a cron expression"),
  payload: z.string().optional(),
});

const cronPresets = [
  { expression: "0 */6 * * *", label: "Every 6 hours" },
  { expression: "0 9 * * 1-5", label: "Weekdays 9 AM" },
  { expression: "0 0 * * 0", label: "Weekly" },
  { expression: "0 0 1 * *", label: "Monthly" },
];

export function TriggerModal({ open, onOpenChange, onExecutionCreated }: TriggerModalProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const { toast } = useToast();

  const { data: workflows } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
    enabled: open,
  });

  const { data: webhooks } = useQuery({
    queryKey: ["/api/webhooks"],
    enabled: open && activeTab === "webhook",
  });

  const manualForm = useForm<z.infer<typeof manualSchema>>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      workflowId: "",
      inputPayload: '{\n  "input": "Your input data here",\n  "options": {\n    "key": "value"\n  }\n}',
    },
  });

  const webhookForm = useForm<z.infer<typeof webhookSchema>>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      workflowId: "",
    },
  });

  const scheduleForm = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      workflowId: "",
      cronExpression: "",
      payload: '{"scheduled": true}',
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (data: { workflowId: string; inputPayload: any; triggerType: string }) => {
      const response = await apiRequest("POST", "/api/trigger", {
        workflowId: data.workflowId,
        engine: "langflow",
        triggerType: data.triggerType,
        inputPayload: data.inputPayload,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workflow triggered successfully",
        description: "Your workflow execution has been started.",
      });
      onExecutionCreated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to trigger workflow",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: { workflowId: string; cronExpression: string; payload?: any }) => {
      const response = await apiRequest("POST", "/api/schedules", {
        workflowId: data.workflowId,
        cronExpression: data.cronExpression,
        payload: data.payload,
        enabled: true,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule created successfully",
        description: "Your workflow has been scheduled.",
      });
      onOpenChange(false);
      scheduleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create schedule",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const onManualSubmit = (data: z.infer<typeof manualSchema>) => {
    try {
      const payload = JSON.parse(data.inputPayload);
      triggerMutation.mutate({
        workflowId: data.workflowId,
        inputPayload: payload,
        triggerType: "manual",
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON input.",
        variant: "destructive",
      });
    }
  };

  const onScheduleSubmit = (data: z.infer<typeof scheduleSchema>) => {
    try {
      const payload = data.payload ? JSON.parse(data.payload) : {};
      scheduleMutation.mutate({
        workflowId: data.workflowId,
        cronExpression: data.cronExpression,
        payload,
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON payload.",
        variant: "destructive",
      });
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Webhook URL copied",
      description: "The webhook URL has been copied to your clipboard.",
    });
  };

  const setCronExpression = (expression: string) => {
    scheduleForm.setValue("cronExpression", expression);
  };

  const selectedWebhook = webhooks?.find(
    w => w.workflowId === webhookForm.watch("workflowId")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trigger Workflow</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <Play className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-2">
              <Link className="h-4 w-4" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4">
                <FormField
                  control={manualForm.control}
                  name="workflowId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Workflow</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a workflow" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workflows?.map((workflow) => (
                            <SelectItem key={workflow.id} value={workflow.id}>
                              {workflow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={manualForm.control}
                  name="inputPayload"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Payload (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="h-48 font-mono text-sm"
                          placeholder="Enter JSON payload..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={triggerMutation.isPending}
                >
                  <Play className="h-4 w-4" />
                  {triggerMutation.isPending ? "Executing..." : "Execute Workflow"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Form {...webhookForm}>
              <FormField
                control={webhookForm.control}
                name="workflowId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Workflow</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a workflow" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workflows?.map((workflow) => (
                          <SelectItem key={workflow.id} value={workflow.id}>
                            {workflow.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>

            {selectedWebhook && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Webhook URL</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={selectedWebhook.url}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyWebhookUrl(selectedWebhook.url)}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        POST to this URL with JSON payload to trigger the workflow
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">Status</label>
                      <div className="mt-1">
                        <Badge className={selectedWebhook.enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {selectedWebhook.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-slate-100 rounded-lg p-3">
                      <h4 className="font-medium text-slate-900 mb-2">Example Usage</h4>
                      <pre className="text-xs text-slate-800 overflow-x-auto">
{`curl -X POST ${selectedWebhook.url} \\
  -H "Content-Type: application/json" \\
  -d '{"input": "your data here"}'`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Form {...scheduleForm}>
              <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                <FormField
                  control={scheduleForm.control}
                  name="workflowId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Workflow</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a workflow" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workflows?.map((workflow) => (
                            <SelectItem key={workflow.id} value={workflow.id}>
                              {workflow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={scheduleForm.control}
                  name="cronExpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cron Expression</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0 9 * * 1-5"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Quick Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {cronPresets.map((preset) => (
                      <Button
                        key={preset.expression}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCronExpression(preset.expression)}
                        className="text-left justify-start"
                      >
                        <div>
                          <div className="font-mono text-xs">{preset.expression}</div>
                          <div className="text-xs text-slate-500">{preset.label}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <FormField
                  control={scheduleForm.control}
                  name="payload"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Payload (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="h-24 font-mono text-sm"
                          placeholder='{"scheduled": true}'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={scheduleMutation.isPending}
                >
                  <Calendar className="h-4 w-4" />
                  {scheduleMutation.isPending ? "Creating..." : "Create Schedule"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
