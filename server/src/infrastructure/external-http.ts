const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function retryDelay(attempt: number, response?: Response) {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return Math.min(Number(retryAfter) * 1000, 5000);
  }
  return Math.min(250 * 2 ** attempt, 2000) + Math.floor(Math.random() * 100);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchExternal(
  input: string | URL | Request,
  init: RequestInit = {},
  options: { timeoutMs?: number; retries?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? 8000;
  const retries = options.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    let handedToCaller = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", abortFromCaller);
    };
    init.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) {
        const originalArrayBuffer = response.arrayBuffer.bind(response);
        const originalBlob = response.blob.bind(response);
        const originalFormData = response.formData.bind(response);
        const originalJson = response.json.bind(response);
        const originalText = response.text.bind(response);
        const consume = async <T>(reader: () => Promise<T>) => {
          try { return await reader(); } finally { finish(); }
        };
        Object.defineProperties(response, {
          arrayBuffer: { value: () => consume(originalArrayBuffer) },
          blob: { value: () => consume(originalBlob) },
          formData: { value: () => consume(originalFormData) },
          json: { value: () => consume(originalJson) },
          text: { value: () => consume(originalText) }
        });
        handedToCaller = true;
        return response;
      }
      await response.body?.cancel().catch(() => undefined);
      finish();
      await wait(retryDelay(attempt, response));
    } catch (error) {
      lastError = error;
      if (init.signal?.aborted || attempt === retries) throw error;
      await wait(retryDelay(attempt));
    } finally {
      if (!handedToCaller) finish();
    }
  }

  throw lastError instanceof Error ? lastError : new Error("External request failed");
}
