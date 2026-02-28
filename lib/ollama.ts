import { spawn } from 'child_process';

// Server-side only
// Uses curl subprocess to bypass macOS 16 Local Network privacy restriction
// that blocks third-party signed Node.js binaries from accessing LAN addresses.

export interface OllamaClient {
  baseUrl: string;
}

export function createOllamaClient(
  baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
): OllamaClient {
  return { baseUrl };
}

export async function* streamChat(
  client: OllamaClient,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): AsyncGenerator<string> {
  const url = `${client.baseUrl}/api/chat`;
  const body = JSON.stringify({
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  });

  const curl = spawn('curl', [
    '--silent', '--no-buffer',
    '--request', 'POST',
    '--header', 'Content-Type: application/json',
    '--data', '@-',
    url,
  ]);

  curl.stdin.write(body);
  curl.stdin.end();

  let buffer = '';
  let stderrOutput = '';
  curl.stderr.on('data', (chunk: Buffer) => { stderrOutput += chunk.toString(); });

  for await (const chunk of curl.stdout) {
    buffer += (chunk as Buffer).toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed) as {
          message?: { content: string };
          done?: boolean;
          error?: string;
        };
        if (json.error) throw new Error(`Ollama error: ${json.error}`);
        if (json.message?.content) yield json.message.content;
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  if (buffer.trim()) {
    try {
      const json = JSON.parse(buffer.trim()) as {
        message?: { content: string };
        error?: string;
      };
      if (json.error) throw new Error(`Ollama error: ${json.error}`);
      if (json.message?.content) yield json.message.content;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }

  await new Promise<void>((resolve, reject) => {
    curl.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`));
      } else {
        resolve();
      }
    });
  });
}

export async function chat(
  client: OllamaClient,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): Promise<string> {
  const url = `${client.baseUrl}/api/chat`;
  const body = JSON.stringify({
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: false,
  });

  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '--silent',
      '--request', 'POST',
      '--header', 'Content-Type: application/json',
      '--data', '@-',
      url,
    ]);

    curl.stdin.write(body);
    curl.stdin.end();

    let output = '';
    let stderrOutput = '';
    curl.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    curl.stderr.on('data', (chunk: Buffer) => { stderrOutput += chunk.toString(); });

    curl.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl exited with code ${code}${stderrOutput ? `: ${stderrOutput}` : ''}`));
        return;
      }
      try {
        const json = JSON.parse(output) as { message?: { content: string }; error?: string };
        if (json.error) { reject(new Error(`Ollama error: ${json.error}`)); return; }
        resolve(json.message?.content ?? '');
      } catch (e) {
        reject(new Error(`Failed to parse Ollama response: ${output.slice(0, 200)}`));
      }
    });
  });
}
