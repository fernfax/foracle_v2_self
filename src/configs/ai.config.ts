// AI assistant feature flag. The endpoint is enabled ONLY when this is "true",
// set explicitly per environment (including local dev) — see CLAUDE.md.
//
// The OpenAI/Voyage API keys are intentionally read at call time inside
// @/lib/ai/openai-client and @/lib/vectors/embeddings (the clients accept an
// override and the tests mutate process.env), so they're not centralised here.
export const AI_ASSISTANT_ENABLED = process.env.ENABLE_AI_ASSISTANT === "true"
