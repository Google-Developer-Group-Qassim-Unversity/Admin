export function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: string, data: string) => void,
  onError: () => void,
  abortSignal: AbortSignal,
) {
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let currentData = "";

  const processBuffer = () => {
    while (buffer.includes("\n")) {
      const idx = buffer.indexOf("\n");
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);

      if (line === "") {
        if (currentData) {
          onEvent(currentEvent, currentData);
        }
        currentEvent = "message";
        currentData = "";
      } else if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const chunk = line.slice(5);
        currentData = currentData ? currentData + "\n" + chunk : chunk;
      }
    }
  };

  const pump = async () => {
    try {
      while (true) {
        if (abortSignal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }
    } catch {
      if (!abortSignal.aborted) {
        onError();
      }
    } finally {
      onError();
    }
  };

  pump();
}
