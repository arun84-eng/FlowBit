import { useState, useEffect, useRef } from "react";

interface SSEMessage {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  nodeId: string | null;
  metadata: any;
}

export function useSSE(url: string) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    console.log("Connecting to SSE:", url);
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connection opened");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (event.data.trim() === "") return; // Skip keep-alive messages
      
      try {
        const data = JSON.parse(event.data);
        console.log("Received SSE message:", data);
        
        setMessages(prev => [...prev, data]);
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      setIsConnected(false);
    };

    return () => {
      console.log("Closing SSE connection");
      eventSource.close();
      setIsConnected(false);
    };
  }, [url]);

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isConnected,
    clearMessages,
  };
}
