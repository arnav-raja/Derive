import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropicKey } from "@/lib/env";

import { NO_USAGE, type TokenUsage } from "./config";

/*
 * The one place that talks to the Claude API. The key is read from the
 * server's environment and never leaves it. Callers depend on the small
 * `ModelClient` interface, so tests can supply a fake.
 */

export type ModelRequest = Anthropic.MessageCreateParamsNonStreaming;

export type ModelReply = {
  text: string;
  stopReason: string | null;
  usage: TokenUsage;
};

export interface ModelClient {
  create(request: ModelRequest): Promise<ModelReply>;
}

function usageOf(message: Anthropic.Message): TokenUsage {
  const u = message.usage;
  if (!u) return NO_USAGE;
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
}

class AnthropicClient implements ModelClient {
  constructor(private readonly sdk: Anthropic) {}

  async create(request: ModelRequest): Promise<ModelReply> {
    const message = await this.sdk.messages.create(request);
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return { text, stopReason: message.stop_reason, usage: usageOf(message) };
  }
}

let shared: ModelClient | null = null;

/** The Claude API client, or null when no key is configured. */
export function modelClient(): ModelClient | null {
  const key = anthropicKey();
  if (!key) return null;
  shared ??= new AnthropicClient(new Anthropic({ apiKey: key, maxRetries: 2, timeout: 90_000 }));
  return shared;
}
