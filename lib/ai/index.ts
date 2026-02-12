// OpenAI Client
export {
  ForacleAIClient,
  getAIClient,
  resetAIClient,
  OpenAIClientError,
  type Tool,
  type ToolCall,
  type AIResponse,
  type CreateResponseParams,
  type OpenAIClientConfig,
} from "./openai-client";

// Tool Registry & Executors
export {
  ToolRegistry,
  getToolRegistry,
  resetToolRegistry,
  executeTool,
  getAuditLog,
  clearAuditLog,
  type ToolName,
  type ToolDefinition,
  type MonthParams,
  type FamilySummaryParams,
  type ToolExecutionResult,
  type AuditRecord,
  type IncomeSummaryResult,
  type ExpensesSummaryResult,
  type FamilySummaryResult,
} from "./tools";

// Orchestrator
export {
  AIOrchestrator,
  getOrchestrator,
  resetOrchestrator,
  type Message,
  type MessageRole,
  type ConversationState,
  type OrchestratorConfig,
  type OrchestratorResult,
} from "./orchestrator";

// Rate Limiting
export {
  checkRateLimits,
  recordMessage,
  getUserQuotaInfo,
  checkUserDailyQuota,
  checkThreadRateLimit,
  resetUserQuota,
  resetThreadRateLimit,
  resetAllLimits,
  RATE_LIMIT_CONFIG,
  type RateLimitResult,
  type UserQuota,
  type ThreadRateLimit,
} from "./rate-limiter";

// Thread Management
export {
  createThread,
  getThread,
  getUserThreads,
  addMessageToThread,
  updateThreadResponseId,
  deleteThread,
  renameThread,
  getThreadMessages,
  clearThreadMessages,
  type ChatMessage,
  type ChatThread,
  type ThreadSummary,
} from "./threads";
