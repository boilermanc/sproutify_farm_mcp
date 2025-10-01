/**
 * Browser-friendly MCP SSE client that wraps the JSON-RPC transport exposed by /mcp/sse.
 * The class keeps the low-level protocol details (endpoint discovery, request matching)
 * out of React components so the UI can focus on rendering.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

type JsonRpcId = number | string;

type JsonRpcMessage =
  | JsonRpcRequestMessage
  | JsonRpcNotificationMessage
  | JsonRpcResponseMessage;

type JsonRpcResponseMessage = JsonRpcSuccessResponse | JsonRpcErrorResponse;

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer?: ReturnType<typeof setTimeout> | null;
};

interface JsonRpcBaseMessage {
  jsonrpc: '2.0';
}

interface JsonRpcRequestMessage extends JsonRpcBaseMessage {
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcNotificationMessage extends JsonRpcBaseMessage {
  method: string;
  params?: unknown;
}

interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcSuccessResponse extends JsonRpcBaseMessage {
  id: JsonRpcId;
  result: unknown;
}

interface JsonRpcErrorResponse extends JsonRpcBaseMessage {
  id: JsonRpcId;
  error: JsonRpcErrorObject;
}

interface MessageEventLike {
  data: string;
}

interface EventLike {
  type?: string;
  message?: string;
}

interface EventSourceLike {
  close(): void;
  addEventListener(type: string, listener: (event: MessageEventLike) => void): void;
  removeEventListener(type: string, listener: (event: MessageEventLike) => void): void;
  onopen: ((event: EventLike) => void) | null;
  onerror: ((event: EventLike) => void) | null;
  onmessage: ((event: MessageEventLike) => void) | null;
}

type EventSourceFactory = (url: string) => EventSourceLike;

type FetchResponseLike = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal | null;
  }
) => Promise<FetchResponseLike>;

type Logger = {
  debug(message: string, ...details: unknown[]): void;
  error(message: string, ...details: unknown[]): void;
};

interface MCPClientCallbacks {
  onNotification?(message: JsonRpcNotificationMessage): void;
  onMessage?(message: JsonRpcMessage): void;
  onOpen?(): void;
  onClose?(): void;
  onError?(error: Error): void;
}

interface MCPClientOptions {
  baseUrl?: string;
  ssePath?: string;
  fetchImpl?: FetchLike;
  eventSourceFactory?: EventSourceFactory;
  callbacks?: MCPClientCallbacks;
  requestTimeoutMs?: number;
  logger?: Partial<Logger>;
}

export interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo: {
    name: string;
    version: string;
  };
  instructions?: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface ListToolsResult {
  tools: ToolDefinition[];
}

export interface ToolCallContent {
  type: string;
  [key: string]: unknown;
}

export interface CallToolResult {
  content: ToolCallContent[];
}

export interface CallToolParams {
  name: string;
  arguments?: Record<string, unknown>;
}

const FALLBACK_BASE_URL = (() => {
  const locationLike = (globalThis as { location?: { origin?: string } }).location;
  if (locationLike?.origin) {
    return locationLike.origin;
  }

  return 'http://localhost:3010';
})();

const DEFAULT_SSE_PATH = '/mcp/sse';

const globalFetch = (globalThis as { fetch?: unknown }).fetch as FetchLike | undefined;
const resolvedFetch: FetchLike | null =
  typeof globalFetch === 'function' ? (globalFetch.bind(globalThis) as FetchLike) : null;

const globalEventSource = (globalThis as { EventSource?: unknown }).EventSource as
  | (new (url: string) => EventSourceLike)
  | undefined;
const resolvedEventSourceFactory: EventSourceFactory | null =
  typeof globalEventSource === 'function'
    ? ((url: string) => new globalEventSource(url))
    : null;

export class BrowserMCPClient {
  private readonly baseUrl: string;
  private readonly ssePath: string;
  private readonly fetchImpl: FetchLike;
  private readonly createEventSource: EventSourceFactory;
  private readonly logger: Logger;
  private callbacks: MCPClientCallbacks;
  private requestTimeout: number;
  private eventSource: EventSourceLike | null = null;
  private postUrl: string | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private accessToken: string | null = null;
  private isReady = false;
  private endpointListener: ((event: MessageEventLike) => void) | null = null;
  private abortController: AbortController | null = null;
  private nextId = 1;

  constructor(options: MCPClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? FALLBACK_BASE_URL;
    this.ssePath = options.ssePath ?? DEFAULT_SSE_PATH;
    this.fetchImpl = options.fetchImpl ?? resolvedFetch ?? (() => {
      throw new Error('No fetch implementation available. Provide fetchImpl.');
    });
    this.createEventSource = options.eventSourceFactory ?? resolvedEventSourceFactory ?? ((url: string) => {
      const factory = globalEventSource ?? ((globalThis as { EventSource?: unknown }).EventSource as
        | (new (url: string) => EventSourceLike)
        | undefined);

      if (!factory) {
        throw new Error('No EventSource implementation available. Provide eventSourceFactory.');
      }

      return new factory(url);
    });
    this.callbacks = options.callbacks ?? {};
    this.requestTimeout = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.logger = {
      debug: options.logger?.debug ?? (() => undefined),
      error: options.logger?.error ?? (() => undefined),
    };
  }

  public updateCallbacks(callbacks: Partial<MCPClientCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async connect(accessToken: string, callbacks?: Partial<MCPClientCallbacks>): Promise<void> {
    if (!accessToken) {
      throw new Error('An access token is required to start an MCP session.');
    }

    this.disconnect();

    if (callbacks) {
      this.updateCallbacks(callbacks);
    }

    this.accessToken = accessToken;
    this.abortController = new AbortController();
    const sseUrl = new URL(this.ssePath, this.baseUrl);
    sseUrl.searchParams.set('access_token', accessToken);

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;

      try {
        this.eventSource = this.createEventSource(sseUrl.toString());
      } catch (error) {
        reject(error as Error);
        this.callbacks.onError?.(error as Error);
        return;
      }

      const eventSourceCandidate = this.eventSource;

      if (!eventSourceCandidate) {
        const error = new Error('Failed to create EventSource instance.');
        reject(error);
        this.callbacks.onError?.(error);
        return;
      }

      const eventSource = eventSourceCandidate as EventSourceLike;

      const endpointListener = (event: MessageEventLike) => {
        try {
          const relativeEndpoint = event.data.trim();
          if (!relativeEndpoint) {
            throw new Error('Received empty endpoint event from server.');
          }

          const absoluteUrl = new URL(relativeEndpoint, this.baseUrl);
          this.postUrl = absoluteUrl.toString();
          this.isReady = true;

          this.logger.debug('MCP session ready', this.postUrl);
          eventSource.removeEventListener('endpoint', endpointListener);

          if (!settled) {
            settled = true;
            resolve();
            this.callbacks.onOpen?.();
          }
        } catch (error) {
          this.logger.error('Failed to process MCP endpoint event', error);
          if (!settled) {
            settled = true;
            reject(error as Error);
          }
          this.callbacks.onError?.(error as Error);
          this.disconnect('Failed to process MCP endpoint event');
        }
      };

      this.endpointListener = endpointListener;
      eventSource.addEventListener('endpoint', endpointListener);

      eventSource.onmessage = (event: MessageEventLike) => {
        this.handleMessageEvent(event);
      };

      eventSource.onerror = (event: EventLike) => {
        const error = this.normalizeEventError(event);
        this.logger.error('SSE stream error', error);

        if (!settled) {
          settled = true;
          reject(error);
        }

        this.callbacks.onError?.(error);
        this.disconnect('SSE stream error');
      };

      eventSource.onopen = () => {
        this.logger.debug('SSE stream opened');
      };
    });

    await this.connectPromise;
  }

  public disconnect(reason = 'Connection closed by client'): void {
    const hadConnection = this.eventSource !== null || this.isReady || this.connectPromise !== null;

    if (this.eventSource) {
      if (this.endpointListener) {
        this.eventSource.removeEventListener('endpoint', this.endpointListener);
      }
      this.eventSource.close();
      this.eventSource = null;
    }

    this.endpointListener = null;
    this.postUrl = null;
    this.isReady = false;
    this.accessToken = null;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.connectPromise) {
      this.connectPromise = null;
    }

    const error = new Error(reason);

    for (const [id, pending] of Array.from(this.pendingRequests.entries())) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.reject(error);
      this.pendingRequests.delete(id);
    }

    if (hadConnection) {
      this.callbacks.onClose?.();
    }
  }

  public isConnected(): boolean {
    return this.isReady;
  }

  public async initialize(params?: Partial<InitializeParams>): Promise<InitializeResult> {
    const payload: InitializeParams = {
      protocolVersion: params?.protocolVersion ?? '2024-11-05',
      capabilities: params?.capabilities ?? { tools: {} },
      clientInfo: params?.clientInfo ?? { name: 'sproutify-web-client', version: '0.1.0' },
    };

    const result = await this.sendRequest<InitializeResult>('initialize', payload);
    return result;
  }

  public async listTools(): Promise<ListToolsResult> {
    return this.sendRequest<ListToolsResult>('tools/list');
  }

  public async callTool(params: CallToolParams): Promise<CallToolResult> {
    return this.sendRequest<CallToolResult>('tools/call', params);
  }

  public async sendNotification(message: JsonRpcNotificationMessage): Promise<void> {
    await this.postMessage(message);
  }

  public async sendRaw(message: JsonRpcRequestMessage | JsonRpcNotificationMessage): Promise<void> {
    await this.postMessage(message);
  }

  public async sendRequest<TResult = unknown>(
    method: string,
    params?: unknown,
    options?: { timeoutMs?: number; id?: JsonRpcId }
  ): Promise<TResult> {
    const id = options?.id ?? this.nextId++;
    const request: JsonRpcRequestMessage = {
      jsonrpc: '2.0',
      id,
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };

    const timeoutMs = options?.timeoutMs ?? this.requestTimeout;

    return new Promise<TResult>((resolve, reject) => {
      const timer = timeoutMs > 0
        ? setTimeout(() => {
            if (this.pendingRequests.delete(id)) {
              reject(new Error(`MCP request ${method} timed out after ${timeoutMs}ms`));
            }
          }, timeoutMs)
        : null;

      this.pendingRequests.set(id, {
        resolve: (value: unknown) => {
          if (timer) {
            clearTimeout(timer);
          }
          resolve(value as TResult);
        },
        reject: (error: Error) => {
          if (timer) {
            clearTimeout(timer);
          }
          reject(error);
        },
        timer,
      });

      this.postMessage(request).catch((error) => {
        if (timer) {
          clearTimeout(timer);
        }
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private async postMessage(message: JsonRpcRequestMessage | JsonRpcNotificationMessage): Promise<void> {
    await this.ensureConnectionReady();

    if (!this.postUrl) {
      throw new Error('MCP message endpoint not ready.');
    }

    if (!this.accessToken) {
      throw new Error('No access token is available for the MCP session.');
    }

    const response = await this.fetchImpl(this.postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(message),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`MCP message POST failed (${response.status}): ${body}`);
    }
  }

  private async ensureConnectionReady(): Promise<void> {
    if (this.connectPromise) {
      await this.connectPromise;
    }

    if (!this.isReady || !this.eventSource) {
      throw new Error('MCP SSE connection not established. Call connect() first.');
    }
  }

  private handleMessageEvent(event: MessageEventLike): void {
    let parsed: JsonRpcMessage;

    try {
      parsed = JSON.parse(event.data) as JsonRpcMessage;
    } catch (error) {
      this.logger.error('Failed to parse MCP message', error, event.data);
      this.callbacks.onError?.(this.normalizeEventError(error));
      return;
    }

    this.callbacks.onMessage?.(parsed);

    if (this.isResponseMessage(parsed)) {
      this.resolvePendingRequest(parsed);
      return;
    }

    if (this.isNotification(parsed)) {
      this.callbacks.onNotification?.(parsed);
      return;
    }

    this.logger.debug('Received MCP request that the browser client cannot handle', parsed);
  }

  private isResponseMessage(message: JsonRpcMessage): message is JsonRpcResponseMessage {
    return typeof (message as Partial<JsonRpcResponseMessage>).id !== 'undefined'
      && !('method' in message);
  }

  private isNotification(message: JsonRpcMessage): message is JsonRpcNotificationMessage {
    return !('id' in message) && 'method' in message;
  }

  private resolvePendingRequest(message: JsonRpcResponseMessage): void {
    const pending = this.pendingRequests.get(message.id);

    if (!pending) {
      this.logger.debug('Dropping MCP response with no matching request', message);
      return;
    }

    this.pendingRequests.delete(message.id);

    if ('error' in message) {
      const error = new Error(message.error.message);
      (error as { code?: number }).code = message.error.code;
      if (typeof message.error.data !== 'undefined') {
        (error as { data?: unknown }).data = message.error.data;
      }
      pending.reject(error);
      return;
    }

    pending.resolve(message.result);
  }

  private normalizeEventError(input: unknown): Error {
    if (input instanceof Error) {
      return input;
    }

    if (typeof input === 'object' && input !== null) {
      const maybeMessage = (input as { message?: unknown }).message;
      if (typeof maybeMessage === 'string') {
        return new Error(maybeMessage);
      }
    }

    if (typeof input === 'string') {
      return new Error(input);
    }

    return new Error('Unknown MCP SSE error');
  }
}





