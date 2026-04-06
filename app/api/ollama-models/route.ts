import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '--silent',
      '--request', 'GET',
      `${baseUrl}/api/tags`,
    ]);

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
        const json = JSON.parse(output) as OllamaTagsResponse;
        resolve((json.models ?? []).map((m) => m.name));
      } catch {
        reject(new Error(`Failed to parse Ollama response: ${output.slice(0, 200)}`));
      }
    });
  });
}

export async function GET() {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const models = await fetchOllamaModels(baseUrl);
    return Response.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ models: [], error: message }, { status: 500 });
  }
}
