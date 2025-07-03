type ResponseSocket = {
  type: "response-stream" | "error" | "done";
  chunk?: string;
  message?: string;
  title?: string;
};

// Helper function to create an abortable WebSocket connection
const createAbortableWebSocket = (
  url: string,
  abortController?: AbortController
): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let isAborted = false;

    if (abortController) {
      abortController.signal.addEventListener("abort", () => {
        isAborted = true;
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.close();
          reject(new Error("WebSocket connection aborted"));
        }
      });
    }

    socket.onopen = () => {
      if (isAborted) {
        socket.close();
        reject(new Error("WebSocket connection aborted"));
      } else {
        resolve(socket);
      }
    };

    socket.onerror = (error) => {
      reject(new Error("WebSocket connection failed"));
    };

    // Timeout for connection
    setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.close();
        reject(new Error("WebSocket connection timeout"));
      }
    }, 10000); // 10 second timeout
  });
};

export const streamMessageFromOllama = async (
  prompt: string,
  language: string,
  onData: (chunk: string) => void,
  abortController?: AbortController
): Promise<string> => {
  const wsUrl = "ws://localhost:6540";
  let title: string = "";
  let isAborted = false;

  // Check if already aborted
  if (abortController?.signal.aborted) {
    throw new Error("Operation was aborted before starting");
  }

  // Setup abort listener
  if (abortController) {
    abortController.signal.addEventListener("abort", () => {
      console.log("🚫 Operation aborted by client");
      isAborted = true;
    });
  }

  try {
    console.log("🔗 Connecting to WebSocket...");
    const socket = await createAbortableWebSocket(wsUrl, abortController);

    if (isAborted) {
      socket.close(1000, "Aborted by client");
      throw new Error("Operation aborted during connection");
    }

    console.log("✅ WebSocket connected successfully");

    // Set up message handler
    socket.onmessage = (event) => {
      if (!event?.data || isAborted) return;

      try {
        const data = JSON.parse(event.data) as ResponseSocket;

        if (data.type === "response-stream") {
          if (!isAborted) {
            onData(data.chunk || "");
          }
        } else if (data.type === "error") {
          console.error("❌ Error from server:", data.message);
          return;
        } else if (data.type === "done") {
          console.log("✅ Streaming completed:", data);
          title = data.title || "";
          socket.close();
          return;
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = (e) => {
      console.log(`🔌 WebSocket closed: ${e.code} - ${e.reason}`);
    };

    // Send the request
    if (!isAborted) {
      console.log("📤 Sending request to server...");
      socket.send(
        JSON.stringify({
          type: "start-stream",
          password: "password_here",
          prompt,
          language,
        })
      );
    }

    // Wait for connection to close or abort
    while (
      [WebSocket.CONNECTING, WebSocket.OPEN].includes(
        socket.readyState as any
      ) &&
      !isAborted
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (isAborted) {
      console.log("🚫 Operation was aborted");
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Aborted by client");
      }
    }

    return title;
  } catch (error) {
    if (isAborted || abortController?.signal.aborted) {
      console.log("🚫 WebSocket operation aborted");
      throw new Error("Operation aborted");
    }
    console.error("❌ WebSocket operation failed:", error);
    throw error;
  }
};

// Ejemplo de uso con AbortController
export const exampleUsageWithAbort = () => {
  const abortController = new AbortController();

  // Función para cancelar la operación
  const cancelOperation = () => {
    console.log("🚫 Cancelling operation...");
    abortController.abort();
  };

  // Usar la función con abort
  streamMessageFromOllama(
    "¿Qué es la aspirina?",
    "es",
    (chunk) => {
      console.log("📝 Received chunk:", chunk);
    },
    abortController
  )
    .then((title) => {
      console.log("✅ Completed with title:", title);
    })
    .catch((error) => {
      if (error.message.includes("aborted")) {
        console.log("🚫 Operation was cancelled");
      } else {
        console.error("❌ Operation failed:", error);
      }
    });

  // Ejemplo: cancelar después de 5 segundos
  setTimeout(() => {
    cancelOperation();
  }, 5000);
};
