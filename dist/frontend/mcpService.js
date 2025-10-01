/**
 * Browser-friendly MCP SSE client that wraps the JSON-RPC transport exposed by /mcp/sse.
 * The class keeps the low-level protocol details (endpoint discovery, request matching)
 * out of React components so the UI can focus on rendering.
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const FALLBACK_BASE_URL = (() => {
    const locationLike = globalThis.location;
    if (locationLike?.origin) {
        return locationLike.origin;
    }
    return 'http://localhost:3010';
})();
const DEFAULT_SSE_PATH = '/mcp/sse';
const globalFetch = globalThis.fetch;
const resolvedFetch = typeof globalFetch === 'function' ? globalFetch.bind(globalThis) : null;
const globalEventSource = globalThis.EventSource;
const resolvedEventSourceFactory = typeof globalEventSource === 'function'
    ? ((url) => new globalEventSource(url))
    : null;
export class BrowserMCPClient {
    baseUrl;
    ssePath;
    fetchImpl;
    createEventSource;
    logger;
    callbacks;
    requestTimeout;
    eventSource = null;
    postUrl = null;
    connectPromise = null;
    pendingRequests = new Map();
    accessToken = null;
    isReady = false;
    endpointListener = null;
    abortController = null;
    nextId = 1;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl ?? FALLBACK_BASE_URL;
        this.ssePath = options.ssePath ?? DEFAULT_SSE_PATH;
        this.fetchImpl = options.fetchImpl ?? resolvedFetch ?? (() => {
            throw new Error('No fetch implementation available. Provide fetchImpl.');
        });
        this.createEventSource = options.eventSourceFactory ?? resolvedEventSourceFactory ?? ((url) => {
            const factory = globalEventSource ?? globalThis.EventSource;
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
    updateCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    async connect(accessToken, callbacks) {
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
        this.connectPromise = new Promise((resolve, reject) => {
            let settled = false;
            try {
                this.eventSource = this.createEventSource(sseUrl.toString());
            }
            catch (error) {
                reject(error);
                this.callbacks.onError?.(error);
                return;
            }
            const eventSourceCandidate = this.eventSource;
            if (!eventSourceCandidate) {
                const error = new Error('Failed to create EventSource instance.');
                reject(error);
                this.callbacks.onError?.(error);
                return;
            }
            const eventSource = eventSourceCandidate;
            const endpointListener = (event) => {
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
                }
                catch (error) {
                    this.logger.error('Failed to process MCP endpoint event', error);
                    if (!settled) {
                        settled = true;
                        reject(error);
                    }
                    this.callbacks.onError?.(error);
                    this.disconnect('Failed to process MCP endpoint event');
                }
            };
            this.endpointListener = endpointListener;
            eventSource.addEventListener('endpoint', endpointListener);
            eventSource.onmessage = (event) => {
                this.handleMessageEvent(event);
            };
            eventSource.onerror = (event) => {
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
    disconnect(reason = 'Connection closed by client') {
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
    isConnected() {
        return this.isReady;
    }
    async initialize(params) {
        const payload = {
            protocolVersion: params?.protocolVersion ?? '2024-11-05',
            capabilities: params?.capabilities ?? { tools: {} },
            clientInfo: params?.clientInfo ?? { name: 'sproutify-web-client', version: '0.1.0' },
        };
        const result = await this.sendRequest('initialize', payload);
        return result;
    }
    async listTools() {
        return this.sendRequest('tools/list');
    }
    async callTool(params) {
        return this.sendRequest('tools/call', params);
    }
    async sendNotification(message) {
        await this.postMessage(message);
    }
    async sendRaw(message) {
        await this.postMessage(message);
    }
    async sendRequest(method, params, options) {
        const id = options?.id ?? this.nextId++;
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            ...(typeof params === 'undefined' ? {} : { params }),
        };
        const timeoutMs = options?.timeoutMs ?? this.requestTimeout;
        return new Promise((resolve, reject) => {
            const timer = timeoutMs > 0
                ? setTimeout(() => {
                    if (this.pendingRequests.delete(id)) {
                        reject(new Error(`MCP request ${method} timed out after ${timeoutMs}ms`));
                    }
                }, timeoutMs)
                : null;
            this.pendingRequests.set(id, {
                resolve: (value) => {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    resolve(value);
                },
                reject: (error) => {
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
    async postMessage(message) {
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
    async ensureConnectionReady() {
        if (this.connectPromise) {
            await this.connectPromise;
        }
        if (!this.isReady || !this.eventSource) {
            throw new Error('MCP SSE connection not established. Call connect() first.');
        }
    }
    handleMessageEvent(event) {
        let parsed;
        try {
            parsed = JSON.parse(event.data);
        }
        catch (error) {
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
    isResponseMessage(message) {
        return typeof message.id !== 'undefined'
            && !('method' in message);
    }
    isNotification(message) {
        return !('id' in message) && 'method' in message;
    }
    resolvePendingRequest(message) {
        const pending = this.pendingRequests.get(message.id);
        if (!pending) {
            this.logger.debug('Dropping MCP response with no matching request', message);
            return;
        }
        this.pendingRequests.delete(message.id);
        if ('error' in message) {
            const error = new Error(message.error.message);
            error.code = message.error.code;
            if (typeof message.error.data !== 'undefined') {
                error.data = message.error.data;
            }
            pending.reject(error);
            return;
        }
        pending.resolve(message.result);
    }
    normalizeEventError(input) {
        if (input instanceof Error) {
            return input;
        }
        if (typeof input === 'object' && input !== null) {
            const maybeMessage = input.message;
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
