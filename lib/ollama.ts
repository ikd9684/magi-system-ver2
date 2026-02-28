import { Ollama } from 'ollama';

// Server-side only
export function createOllamaClient(
  baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
) {
  return new Ollama({ host: baseUrl });
}

export async function* streamChat(
  client: Ollama,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): AsyncGenerator<string> {
  const stream = await client.chat({
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  });
  for await (const part of stream) {
    yield part.message.content;
  }
}

export async function chat(
  client: Ollama,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): Promise<string> {
  const response = await client.chat({
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: false,
  });
  return response.message.content;
}
