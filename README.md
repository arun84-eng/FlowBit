# FlowBit 🧠⚙️

**FlowBit** is a visual workflow orchestration platform built on top of [LangFlow](https://github.com/logspace-ai/langflow). It allows you to connect, run, and monitor AI-powered agents through a simple UI.

## 📦 Features

- Visual low-code orchestration using LangFlow
- Agent-based execution (Email, PDF, JSON, Classifier)
- Execution triggers: Manual, Webhook, or Cron-based
- Real-time log streaming via Server-Sent Events (SSE)
- Built-in UI built with Next.js + Tailwind + shadcn/ui

---

## 🚀 Quick Start

### 1. Clone the Repo

###Start Local LangFlow
docker-compose up --build


###Setup LangFlow API Secrets (Local)
LANGFLOW_API_KEY=your_local_token_if_auth_enabled
LANGFLOW_URL=http://localhost:7860

### Run the Frontend
npm install
npm run dev


