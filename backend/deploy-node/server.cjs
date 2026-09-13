"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/server-node.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_stream2 = require("node:stream");

// node_modules/@hono/node-server/dist/constants-BLSFu_RU.mjs
var X_ALREADY_SENT = "x-hono-already-sent";

// node_modules/@hono/node-server/dist/index.mjs
var import_node_http = require("node:http");
var import_node_http2 = require("node:http2");
var import_node_stream = require("node:stream");

// node_modules/hono/dist/helper/websocket/index.js
var defineWebSocketHelper = (handler) => {
  return (...args) => {
    if (typeof args[0] === "function") {
      const [createEvents, options] = args;
      return async function upgradeWebSocket2(c, next) {
        const events = await createEvents(c);
        const result = await handler(c, events, options);
        if (result) {
          return result;
        }
        await next();
      };
    } else {
      const [c, events, options] = args;
      return (async () => {
        const upgraded = await handler(c, events, options);
        if (!upgraded) {
          throw new Error("Failed to upgrade WebSocket");
        }
        return upgraded;
      })();
    }
  };
};

// node_modules/@hono/node-server/dist/index.mjs
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var nonJoinedHeaders = /* @__PURE__ */ new Set([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "server",
  "user-agent"
]);
var validHeaderName = /^[!#$%&'*+\-.^_`|~\dA-Za-z]+$/;
var isHttpWhitespace = (code) => code === 9 || code === 10 || code === 13 || code === 32;
var normalizeHeaderValue = (value) => {
  if (!isHttpWhitespace(value.charCodeAt(0)) && !isHttpWhitespace(value.charCodeAt(value.length - 1))) return value;
  let start = 0;
  let end = value.length;
  while (start < end && isHttpWhitespace(value.charCodeAt(start))) start++;
  while (end > start && isHttpWhitespace(value.charCodeAt(end - 1))) end--;
  return value.slice(start, end);
};
var forbiddenHeaderValue = /[\0\r\n]/;
var GlobalHeaders = globalThis.Headers;
var materializeHeaders = (rawHeaders, HeadersCtor = GlobalHeaders) => {
  const headers = new HeadersCtor();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i];
    if (!name.startsWith(":")) headers.append(name, rawHeaders[i + 1]);
  }
  return headers;
};
var RequestHeaders = class {
  #incoming;
  #rawHeaders;
  #headers;
  #invalidValue;
  constructor(incoming) {
    this.#incoming = incoming;
    if (incoming instanceof import_node_http2.Http2ServerRequest) this.#rawHeaders = incoming.rawHeaders.slice();
  }
  get #lazyRawHeaders() {
    return this.#rawHeaders ??= this.#incoming.rawHeaders.slice();
  }
  get #native() {
    if (!this.#headers) {
      this.#headers = materializeHeaders(this.#lazyRawHeaders);
      this.#rawHeaders = void 0;
    }
    return this.#headers;
  }
  #normalizedName(name) {
    if (typeof name !== "string") return;
    if (!validHeaderName.test(name)) throw new TypeError(`Invalid header name: ${name}`);
    return name.toLowerCase();
  }
  #lookupHttp1(lowerName) {
    const headers = this.#incoming instanceof import_node_http2.Http2ServerRequest ? void 0 : this.#incoming.headers;
    if (!headers || nonJoinedHeaders.has(lowerName) || lowerName === "set-cookie" || lowerName === "__proto__") return;
    if (!Object.hasOwn(headers, lowerName)) return null;
    const rawValue = headers[lowerName];
    if (typeof rawValue === "string") {
      const value = normalizeHeaderValue(rawValue);
      return forbiddenHeaderValue.test(value) ? void 0 : value;
    }
  }
  #lookup(rawHeaders, lowerName) {
    const separator = lowerName === "cookie" ? "; " : ", ";
    let value = null;
    for (let i = 0; i < rawHeaders.length; i += 2) {
      const rawName = rawHeaders[i];
      if (rawName.length === lowerName.length && rawName.toLowerCase() === lowerName) {
        const rawValue = normalizeHeaderValue(rawHeaders[i + 1]);
        if (forbiddenHeaderValue.test(rawValue)) {
          this.#invalidValue = true;
          return;
        }
        value = value === null ? rawValue : value + separator + rawValue;
      }
    }
    return value;
  }
  append(name, value) {
    this.#native.append(name, value);
  }
  delete(name) {
    this.#native.delete(name);
  }
  get(name) {
    const lowerName = this.#normalizedName(name);
    if (lowerName && !this.#headers && !this.#invalidValue) {
      const http1Value = this.#lookupHttp1(lowerName);
      if (http1Value !== void 0) return http1Value;
      const value = this.#lookup(this.#lazyRawHeaders, lowerName);
      if (value !== void 0) return value;
    }
    return this.#native.get(name);
  }
  has(name) {
    const lowerName = this.#normalizedName(name);
    if (lowerName && !this.#headers && !this.#invalidValue) {
      const http1Value = this.#lookupHttp1(lowerName);
      if (http1Value !== void 0) return http1Value !== null;
      const value = this.#lookup(this.#lazyRawHeaders, lowerName);
      if (value !== void 0) return value !== null;
    }
    return this.#native.has(name);
  }
  set(name, value) {
    this.#native.set(name, value);
  }
  getSetCookie() {
    return this.#native.getSetCookie();
  }
  keys() {
    return this.#native.keys();
  }
  values() {
    return this.#native.values();
  }
  entries() {
    return this.#native.entries();
  }
  forEach(callback, thisArg) {
    this.#native.forEach((value, key) => {
      callback.call(thisArg, value, key, this);
    });
  }
  [Symbol.iterator]() {
    return this.entries();
  }
};
Object.defineProperty(RequestHeaders.prototype, Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
  return `Headers (lightweight) ${inspectFn(Object.fromEntries(this), {
    ...options,
    depth: depth == null ? null : depth - 1
  })}`;
} });
Object.setPrototypeOf(RequestHeaders.prototype, GlobalHeaders.prototype);
var newHeadersFromIncoming = (incoming) => globalThis.Headers === GlobalHeaders ? new RequestHeaders(incoming) : materializeHeaders(incoming.rawHeaders, globalThis.Headers);
var reValidRequestUrl = /^\/[!#$&-;=?-\[\]_a-z~]*$/;
var reDotSegment = /\/\.\.?(?:[/?#]|$)/;
var reValidHost = /^[a-z0-9._-]+(?::(?:[1-5]\d{3,4}|[6-9]\d{3}))?$/;
var buildUrl = (scheme, host, incomingUrl) => {
  const url = `${scheme}://${host}${incomingUrl}`;
  if (!reValidHost.test(host)) {
    const urlObj = new URL(url);
    if (urlObj.hostname.length !== host.length && urlObj.hostname !== (host.includes(":") ? host.replace(/:\d+$/, "") : host).toLowerCase()) throw new RequestError("Invalid host header");
    return urlObj.href;
  } else if (incomingUrl.length === 0) return url + "/";
  else {
    if (incomingUrl.charCodeAt(0) !== 47) throw new RequestError("Invalid URL");
    if (!reValidRequestUrl.test(incomingUrl) || reDotSegment.test(incomingUrl)) return new URL(url).href;
    return url;
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) return e;
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request$1 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      const hasReplacementBody = options !== void 0 && "body" in options && options.body != null;
      if (input[bodyConsumedDirectlyKey] && !hasReplacementBody) throw new TypeError("Cannot construct a Request with a Request object that has already been used.");
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") options.duplex ??= "half";
    super(input, options);
  }
};
var wrapBodyStream = Symbol("wrapBodyStream");
var byteExactEncodings = /* @__PURE__ */ new Set([
  "latin1",
  "binary",
  "hex",
  "base64",
  "base64url"
]);
var isByteExactEncoding = (encoding) => encoding === null || byteExactEncodings.has(encoding);
var bodyBufferedBeforeDisconnectKey = Symbol("bodyBufferedBeforeDisconnect");
var bodyBufferedLengthBeforeDisconnectKey = Symbol("bodyBufferedLengthBeforeDisconnect");
var toBufferChunk = (chunk, encoding) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding ?? "utf8");
var isRecoverableDisconnectedIncoming = (incoming) => !(incoming instanceof import_node_http2.Http2ServerRequest) && !!incoming.complete && !!incoming.readableAborted && typeof incoming.read === "function" && isByteExactEncoding(incoming.readableEncoding);
var recordBodyBufferedBeforeDisconnect = (incoming) => {
  if (incoming.readableDidRead || !isRecoverableDisconnectedIncoming(incoming)) return;
  const incomingWithRecovery = incoming;
  incomingWithRecovery[bodyBufferedLengthBeforeDisconnectKey] ??= incoming.readableLength;
};
var readBodyBufferedBeforeDisconnect = (incoming, chunks) => {
  if (incoming.readableDidRead && !chunks || !isRecoverableDisconnectedIncoming(incoming)) return;
  const incomingWithRecovery = incoming;
  if (incomingWithRecovery[bodyBufferedBeforeDisconnectKey] !== void 0) return incomingWithRecovery[bodyBufferedBeforeDisconnectKey];
  let result;
  const errored = incoming.errored;
  if (errored && errored.code !== "ECONNRESET") result = errored;
  else if (incomingWithRecovery[bodyBufferedLengthBeforeDisconnectKey] !== void 0 && incoming.readableLength !== incomingWithRecovery[bodyBufferedLengthBeforeDisconnectKey]) result = newBodyUnusableError();
  else {
    const bodyChunks = chunks ?? [];
    const chunk = incoming.read();
    if (chunk !== null) bodyChunks.push(toBufferChunk(chunk, incoming.readableEncoding));
    const buffer = bodyChunks.length === 1 ? bodyChunks[0] : Buffer.concat(bodyChunks);
    result = buffer;
    const contentLength = incoming.headers["content-length"];
    if (typeof contentLength === "string" && /^\d+$/.test(contentLength)) {
      const expectedLength = Number(contentLength);
      if (Number.isSafeInteger(expectedLength) && buffer.length !== expectedLength) result = newBodyUnusableError();
    }
  }
  incomingWithRecovery[bodyBufferedBeforeDisconnectKey] = result;
  return result;
};
var enqueueBufferedBody = (controller, buffered) => {
  if (buffered instanceof Error) {
    controller.error(buffered);
    return;
  }
  if (buffered.length > 0) controller.enqueue(buffered);
  controller.close();
};
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request$1(url, init);
    Object.defineProperty(req, "method", { get() {
      return "TRACE";
    } });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) init.body = new ReadableStream({ start(controller) {
    controller.enqueue(incoming.rawBody);
    controller.close();
  } });
  else if (incoming[wrapBodyStream]) {
    let reader;
    init.body = new ReadableStream({ async pull(controller) {
      try {
        if (!reader) {
          const buffered = readBodyBufferedBeforeDisconnect(incoming);
          if (buffered !== void 0) {
            enqueueBufferedBody(controller, buffered);
            return;
          }
        }
        reader ||= import_node_stream.Readable.toWeb(incoming).getReader();
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    } });
  } else {
    const buffered = readBodyBufferedBeforeDisconnect(incoming);
    if (buffered !== void 0) init.body = new ReadableStream({ start(controller) {
      enqueueBufferedBody(controller, buffered);
    } });
    else init.body = import_node_stream.Readable.toWeb(incoming);
  }
  return new Request$1(url, init);
};
var getRequestCache = Symbol("getRequestCache");
var requestCache = Symbol("requestCache");
var incomingKey = Symbol("incomingKey");
var urlKey = Symbol("urlKey");
var methodKey = Symbol("methodKey");
var headersKey = Symbol("headersKey");
var abortControllerKey = Symbol("abortControllerKey");
var getAbortController = Symbol("getAbortController");
var abortRequest = Symbol("abortRequest");
var bodyBufferKey = Symbol("bodyBuffer");
var bodyReadPromiseKey = Symbol("bodyReadPromise");
var bodyConsumedDirectlyKey = Symbol("bodyConsumedDirectly");
var bodyLockReaderKey = Symbol("bodyLockReader");
var abortReasonKey = Symbol("abortReason");
var newBodyUnusableError = () => {
  return /* @__PURE__ */ new TypeError("Body is unusable");
};
var rejectBodyUnusable = () => {
  return Promise.reject(newBodyUnusableError());
};
var textDecoder = new TextDecoder();
var consumeBodyDirectOnce = (request2) => {
  if (request2[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  request2[bodyConsumedDirectlyKey] = true;
};
var toArrayBuffer = (buf) => {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};
var contentType = (request2) => {
  return (request2[headersKey] ||= newHeadersFromIncoming(request2[incomingKey])).get("content-type") || "";
};
var methodTokenRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
var normalizeIncomingMethod = (method) => {
  if (typeof method !== "string" || method.length === 0) return "GET";
  switch (method) {
    case "DELETE":
    case "GET":
    case "HEAD":
    case "OPTIONS":
    case "PATCH":
    case "POST":
    case "PUT":
    case "QUERY":
      return method;
  }
  const upper = method.toUpperCase();
  switch (upper) {
    case "DELETE":
    case "GET":
    case "HEAD":
    case "OPTIONS":
    case "POST":
    case "PUT":
      return upper;
    default:
      return method;
  }
};
var validateDirectReadMethod = (method) => {
  if (!methodTokenRegExp.test(method)) return /* @__PURE__ */ new TypeError(`'${method}' is not a valid HTTP method.`);
  const normalized = method.toUpperCase();
  if (normalized === "CONNECT" || normalized === "TRACK" || normalized === "TRACE" && method !== "TRACE") return /* @__PURE__ */ new TypeError(`'${method}' HTTP method is unsupported.`);
};
var readBodyWithFastPath = (request2, method, fromBuffer) => {
  if (request2[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  const methodName = request2.method;
  if (methodName === "GET" || methodName === "HEAD") return request2[getRequestCache]()[method]();
  const methodValidationError = validateDirectReadMethod(methodName);
  if (methodValidationError) return Promise.reject(methodValidationError);
  if (request2[requestCache]) {
    if (methodName !== "TRACE") return request2[requestCache][method]();
  }
  const alreadyUsedError = consumeBodyDirectOnce(request2);
  if (alreadyUsedError) return alreadyUsedError;
  const raw2 = readRawBodyIfAvailable(request2);
  if (raw2) {
    const result = Promise.resolve(fromBuffer(raw2, request2));
    request2[bodyBufferKey] = void 0;
    return result;
  }
  return readBodyDirect(request2).then((buf) => {
    const result = fromBuffer(buf, request2);
    request2[bodyBufferKey] = void 0;
    return result;
  });
};
var readRawBodyIfAvailable = (request2) => {
  const incoming = request2[incomingKey];
  if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) return incoming.rawBody;
};
var normalizeAbortError = (request2, incoming) => {
  if (incoming.errored) return incoming.errored;
  const reason = request2[abortReasonKey];
  if (reason !== void 0) return reason instanceof Error ? reason : new Error(String(reason));
  return /* @__PURE__ */ new Error("Client connection prematurely closed.");
};
var readBodyDirect = (request2) => {
  if (request2[bodyBufferKey]) return Promise.resolve(request2[bodyBufferKey]);
  if (request2[bodyReadPromiseKey]) return request2[bodyReadPromiseKey];
  const incoming = request2[incomingKey];
  if (incoming.readableDidRead) return rejectBodyUnusable();
  const buffered = readBodyBufferedBeforeDisconnect(incoming);
  if (buffered !== void 0) {
    if (buffered instanceof Error) return Promise.reject(buffered);
    request2[bodyBufferKey] = buffered;
    return Promise.resolve(buffered);
  }
  const promise = new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const recoverCompleteBodyAfterDisconnect = (error) => {
      const streamError = incoming.errored ?? error;
      if (!isRecoverableDisconnectedIncoming(incoming) || streamError && streamError.code !== "ECONNRESET") return false;
      finish(() => {
        const recovered = readBodyBufferedBeforeDisconnect(incoming, chunks);
        if (recovered instanceof Error) reject(recovered);
        else if (recovered === void 0) reject(error ?? normalizeAbortError(request2, incoming));
        else {
          request2[bodyBufferKey] = recovered;
          resolve(recovered);
        }
      });
      return true;
    };
    const onData = (chunk) => {
      chunks.push(toBufferChunk(chunk, incoming.readableEncoding));
    };
    const onEnd = () => {
      finish(() => {
        const buffer = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
        request2[bodyBufferKey] = buffer;
        resolve(buffer);
      });
    };
    const onError = (error) => {
      if (recoverCompleteBodyAfterDisconnect(error)) return;
      finish(() => {
        reject(error);
      });
    };
    const onClose = () => {
      if (incoming.readableEnded) {
        onEnd();
        return;
      }
      if (recoverCompleteBodyAfterDisconnect()) return;
      finish(() => {
        reject(normalizeAbortError(request2, incoming));
      });
    };
    const cleanup = () => {
      incoming.off("data", onData);
      incoming.off("end", onEnd);
      incoming.off("error", onError);
      incoming.off("close", onClose);
      request2[bodyReadPromiseKey] = void 0;
    };
    incoming.on("data", onData);
    incoming.on("end", onEnd);
    incoming.on("error", onError);
    incoming.on("close", onClose);
    queueMicrotask(() => {
      if (settled) return;
      if (incoming.readableEnded) onEnd();
      else if (incoming.errored) onError(incoming.errored);
      else if (incoming.destroyed) onClose();
    });
  });
  request2[bodyReadPromiseKey] = promise;
  return promise;
};
var requestPrototype = {
  get method() {
    return this[methodKey];
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [abortRequest](reason) {
    if (this[abortReasonKey] === void 0) this[abortReasonKey] = reason;
    const abortController = this[abortControllerKey];
    if (abortController && !abortController.signal.aborted) abortController.abort(reason);
  },
  [getAbortController]() {
    this[abortControllerKey] ||= new AbortController();
    if (this[abortReasonKey] !== void 0 && !this[abortControllerKey].signal.aborted) this[abortControllerKey].abort(this[abortReasonKey]);
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    const abortController = this[getAbortController]();
    if (this[requestCache]) return this[requestCache];
    const method = this.method;
    if (this[bodyConsumedDirectlyKey] && !(method === "GET" || method === "HEAD")) {
      this[bodyBufferKey] = void 0;
      const init = {
        method: method === "TRACE" ? "GET" : method,
        headers: this.headers,
        signal: abortController.signal
      };
      if (method !== "TRACE") {
        init.body = new ReadableStream({ start(c) {
          c.close();
        } });
        init.duplex = "half";
      }
      const req = new Request$1(this[urlKey], init);
      if (method === "TRACE") Object.defineProperty(req, "method", { get() {
        return "TRACE";
      } });
      return this[requestCache] = req;
    }
    return this[requestCache] = newRequestFromIncoming(this.method, this[urlKey], this.headers, this[incomingKey], abortController);
  },
  get body() {
    if (!this[bodyConsumedDirectlyKey]) return this[getRequestCache]().body;
    const request2 = this[getRequestCache]();
    if (!this[bodyLockReaderKey] && request2.body) this[bodyLockReaderKey] = request2.body.getReader();
    return request2.body;
  },
  get bodyUsed() {
    if (this[bodyConsumedDirectlyKey]) return true;
    if (this[requestCache]) return this[requestCache].bodyUsed;
    return false;
  }
};
Object.defineProperty(requestPrototype, "signal", { get() {
  return this[getAbortController]().signal;
} });
[
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, { get() {
    return this[getRequestCache]()[k];
  } });
});
["clone", "formData"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, { value: function() {
    if (this[bodyConsumedDirectlyKey]) {
      if (k === "clone") throw newBodyUnusableError();
      return rejectBodyUnusable();
    }
    return this[getRequestCache]()[k]();
  } });
});
Object.defineProperty(requestPrototype, "text", { value: function() {
  return readBodyWithFastPath(this, "text", (buf) => textDecoder.decode(buf));
} });
Object.defineProperty(requestPrototype, "arrayBuffer", { value: function() {
  return readBodyWithFastPath(this, "arrayBuffer", (buf) => toArrayBuffer(buf));
} });
Object.defineProperty(requestPrototype, "blob", { value: function() {
  return readBodyWithFastPath(this, "blob", (buf, request2) => {
    const type = contentType(request2);
    const init = type ? { headers: { "content-type": type } } : void 0;
    return new Response(buf, init).blob();
  });
} });
Object.defineProperty(requestPrototype, "json", { value: function() {
  if (this[bodyConsumedDirectlyKey]) return rejectBodyUnusable();
  return this.text().then(JSON.parse);
} });
Object.defineProperty(requestPrototype, Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
  return `Request (lightweight) ${inspectFn({
    method: this.method,
    url: this.url,
    headers: this.headers,
    nativeRequest: this[requestCache]
  }, {
    ...options,
    depth: depth == null ? null : depth - 1
  })}`;
} });
Object.setPrototypeOf(requestPrototype, Request$1.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  req[methodKey] = normalizeIncomingMethod(incoming.method);
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof import_node_http2.Http2ServerRequest) throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    try {
      req[urlKey] = new URL(incomingUrl).href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof import_node_http2.Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) throw new RequestError("Missing host header");
  let scheme;
  if (incoming instanceof import_node_http2.Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) throw new RequestError("Unsupported scheme");
  } else scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  try {
    req[urlKey] = buildUrl(scheme, host, incomingUrl);
  } catch (e) {
    if (e instanceof RequestError) throw e;
    else throw new RequestError("Invalid URL", { cause: e });
  }
  return req;
};
var defaultContentType = "text/plain; charset=UTF-8";
var responseCache = Symbol("responseCache");
var getResponseCache = Symbol("getResponseCache");
var cacheKey = Symbol("cache");
var GlobalResponse = global.Response;
var Response$1 = class Response$12 {
  #body;
  #init;
  [getResponseCache]() {
    const cache2 = this[cacheKey];
    const liveHeaders = cache2 && cache2[2] instanceof Headers ? cache2[2] : void 0;
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, liveHeaders ? {
      status: this.#init?.status,
      statusText: this.#init?.statusText,
      headers: liveHeaders
    } : this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof GlobalResponse) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      }
      this.#init = init instanceof Response$12 ? init.#init : init;
      headers = new Headers(init.headers);
    } else this.#init = init;
    if (body == null || typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) this[cacheKey] = [
      init?.status || 200,
      body ?? null,
      headers || init?.headers
    ];
  }
  get headers() {
    const cache2 = this[cacheKey];
    if (cache2) {
      if (!(cache2[2] instanceof Headers)) cache2[2] = new Headers(cache2[2] || (cache2[1] === null ? void 0 : { "content-type": defaultContentType }));
      return cache2[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
[
  "body",
  "bodyUsed",
  "redirected",
  "statusText",
  "trailers",
  "type",
  "url"
].forEach((k) => {
  Object.defineProperty(Response$1.prototype, k, { get() {
    return this[getResponseCache]()[k];
  } });
});
[
  "arrayBuffer",
  "blob",
  "clone",
  "formData",
  "json",
  "text"
].forEach((k) => {
  Object.defineProperty(Response$1.prototype, k, { value: function() {
    return this[getResponseCache]()[k]();
  } });
});
Object.defineProperty(Response$1.prototype, Symbol.for("nodejs.util.inspect.custom"), { value: function(depth, options, inspectFn) {
  return `Response (lightweight) ${inspectFn({
    status: this.status,
    headers: this.headers,
    ok: this.ok,
    nativeResponse: this[responseCache]
  }, {
    ...options,
    depth: depth == null ? null : depth - 1
  })}`;
} });
Object.setPrototypeOf(Response$1, GlobalResponse);
Object.setPrototypeOf(Response$1.prototype, GlobalResponse.prototype);
var validRedirectUrl = /^https?:\/\/[!#-;=?-[\]_a-z~A-Z]+$/;
var parseRedirectUrl = (url) => {
  if (url instanceof URL) return url.href;
  if (validRedirectUrl.test(url)) return url;
  return new URL(url).href;
};
var validRedirectStatuses = /* @__PURE__ */ new Set([
  301,
  302,
  303,
  307,
  308
]);
Object.defineProperty(Response$1, "redirect", {
  value: function redirect(url, status = 302) {
    if (!validRedirectStatuses.has(status)) throw new RangeError("Invalid status code");
    return new Response$1(null, {
      status,
      headers: { location: parseRedirectUrl(url) }
    });
  },
  writable: true,
  configurable: true
});
Object.defineProperty(Response$1, "json", {
  value: function json(data, init) {
    const body = JSON.stringify(data);
    if (body === void 0) throw new TypeError("The data is not JSON serializable");
    const initHeaders = init?.headers;
    let headers;
    if (initHeaders) {
      headers = new Headers(initHeaders);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    } else headers = { "content-type": "application/json" };
    return new Response$1(body, {
      status: init?.status ?? 200,
      statusText: init?.statusText,
      headers
    });
  },
  writable: true,
  configurable: true
});
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) writable.destroy(error);
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) writable.end();
      else if (!writable.write(value)) writable.once("drain", onDrain);
      else return reader.read().then(flow, handleStreamError);
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) throw new TypeError("ReadableStream is locked.");
  else if (writable.destroyed) return;
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers, defaultContentType2) => {
  const res = {};
  if (!(headers instanceof Headers)) headers = new Headers(headers ?? void 0);
  if (headers.has("set-cookie")) {
    const cookies = [];
    for (const [k, v] of headers) if (k === "set-cookie") cookies.push(v);
    else res[k] = v;
    if (cookies.length > 0) res["set-cookie"] = cookies;
  } else for (const [k, v] of headers) res[k] = v;
  if (defaultContentType2) res["content-type"] ??= defaultContentType2;
  return res;
};
var outgoingEnded = Symbol("outgoingEnded");
var incomingDraining = Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
var drainIncoming = (incoming) => {
  const incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) return;
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof import_node_http2.Http2ServerRequest) {
    try {
      incoming.stream?.close?.(import_node_http2.constants.NGHTTP2_NO_ERROR);
    } catch {
    }
    return;
  }
  let bytesRead = 0;
  const cleanup = () => {
    clearTimeout(timer);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  const forceClose = () => {
    cleanup();
    const socket = incoming.socket;
    if (socket && !socket.destroyed) {
      if (typeof socket.destroySoon === "function") socket.destroySoon();
      else if (typeof socket.destroy === "function") socket.destroy();
    }
  };
  const timer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  const onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) forceClose();
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var makeCloseHandler = (req, incoming, outgoing, needsBodyCleanup) => () => {
  if (incoming.errored) {
    recordBodyBufferedBeforeDisconnect(incoming);
    req[abortRequest](incoming.errored.toString());
  } else if (!outgoing.writableFinished) {
    recordBodyBufferedBeforeDisconnect(incoming);
    req[abortRequest]("Client connection prematurely closed.");
  }
  if (needsBodyCleanup && !incoming.readableEnded) setTimeout(() => {
    if (!incoming.readableEnded) setTimeout(() => {
      drainIncoming(incoming);
    });
  });
};
var isImmediateCacheableResponse = (res) => {
  if (!(cacheKey in res)) return false;
  const body = res[cacheKey][1];
  return body === null || typeof body === "string" || body instanceof Uint8Array;
};
var handleRequestError = () => new Response(null, { status: 400 });
var handleFetchError = (e) => new Response(null, { status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500 });
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") console.info("The user aborted a request.");
  else {
    console.error(e);
    if (!outgoing.headersSent) outgoing.writeHead(500, { "Content-Type": "text/plain" });
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) outgoing.flushHeaders();
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  if (!header) {
    if (body === null) {
      outgoing.writeHead(status);
      outgoing.end();
    } else if (typeof body === "string") {
      outgoing.writeHead(status, {
        "Content-Type": defaultContentType,
        "Content-Length": Buffer.byteLength(body)
      });
      outgoing.end(body);
    } else if (body instanceof Uint8Array) {
      outgoing.writeHead(status, {
        "Content-Type": defaultContentType,
        "Content-Length": body.byteLength
      });
      outgoing.end(body);
    } else if (body instanceof Blob) {
      outgoing.writeHead(status, {
        "Content-Type": defaultContentType,
        "Content-Length": body.size
      });
      outgoing.end(new Uint8Array(await body.arrayBuffer()));
    } else {
      outgoing.writeHead(status, { "Content-Type": defaultContentType });
      flushHeaders(outgoing);
      await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
    }
    outgoing[outgoingEnded]?.();
    return;
  }
  let hasContentLength = false;
  if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header, body === null ? void 0 : defaultContentType);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj, body === null ? void 0 : defaultContentType);
  } else for (const key in header) if (key.length === 14 && key.toLowerCase() === "content-length") {
    hasContentLength = true;
    break;
  }
  if (!hasContentLength) {
    if (typeof body === "string") header["Content-Length"] = Buffer.byteLength(body);
    else if (body instanceof Uint8Array) header["Content-Length"] = body.byteLength;
    else if (body instanceof Blob) header["Content-Length"] = body.size;
  }
  outgoing.writeHead(status, header);
  if (body == null) outgoing.end();
  else if (typeof body === "string" || body instanceof Uint8Array) outgoing.end(body);
  else if (body instanceof Blob) outgoing.end(new Uint8Array(await body.arrayBuffer()));
  else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
  }
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) if (options.errorHandler) try {
    res = await res;
  } catch (err) {
    const errRes = await options.errorHandler(err);
    if (!errRes) return;
    res = errRes;
  }
  else res = await res.catch(handleFetchError);
  if (cacheKey in res) return responseViaCache(res, outgoing);
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers, res.body === null ? void 0 : defaultContentType);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) values.push(chunk.value);
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      outgoing.write(value);
    });
    if (done) outgoing.end();
    else {
      if (values.length === 0) flushHeaders(outgoing);
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request$1) {
    Object.defineProperty(global, "Request", { value: Request$1 });
    Object.defineProperty(global, "Response", { value: Response$1 });
  }
  return async (incoming, outgoing) => {
    let res, req;
    let needsBodyCleanup = false;
    let closeHandlerAttached = false;
    const ensureCloseHandler = () => {
      if (!req || closeHandlerAttached) return;
      closeHandlerAttached = true;
      outgoing.on("close", makeCloseHandler(req, incoming, outgoing, needsBodyCleanup));
    };
    try {
      req = newRequest(incoming, options.hostname);
      needsBodyCleanup = autoCleanupIncoming && !(incoming.method === "GET" || incoming.method === "HEAD");
      if (needsBodyCleanup) {
        incoming[wrapBodyStream] = true;
        if (incoming instanceof import_node_http2.Http2ServerRequest) outgoing[outgoingEnded] = () => {
          if (!incoming.readableEnded) setTimeout(() => {
            if (!incoming.readableEnded) setTimeout(() => {
              incoming.destroy();
              outgoing.destroy();
            });
          });
        };
      }
      res = fetchCallback(req, {
        incoming,
        outgoing
      });
      if (!isPromise(res) && isImmediateCacheableResponse(res)) {
        if (needsBodyCleanup && !incoming.readableEnded) outgoing.once("finish", () => {
          if (!incoming.readableEnded) drainIncoming(incoming);
        });
        return responseViaCache(res, outgoing);
      }
      ensureCloseHandler();
    } catch (e) {
      if (!res) if (options.errorHandler) {
        ensureCloseHandler();
        res = await options.errorHandler(req ? e : toRequestError(e));
        if (!res) return;
      } else if (!req) res = handleRequestError();
      else res = handleFetchError(e);
      else return handleResponseError(e, outgoing);
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var CloseEvent = globalThis.CloseEvent ?? class extends Event {
  #eventInitDict;
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.#eventInitDict = eventInitDict;
  }
  get wasClean() {
    return this.#eventInitDict.wasClean ?? false;
  }
  get code() {
    return this.#eventInitDict.code ?? 0;
  }
  get reason() {
    return this.#eventInitDict.reason ?? "";
  }
};
var ErrorEvent = globalThis.ErrorEvent ?? class extends Event {
  #eventInitDict;
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.#eventInitDict = eventInitDict;
  }
  get message() {
    return this.#eventInitDict.message ?? "";
  }
  get filename() {
    return this.#eventInitDict.filename ?? "";
  }
  get lineno() {
    return this.#eventInitDict.lineno ?? 0;
  }
  get colno() {
    return this.#eventInitDict.colno ?? 0;
  }
  get error() {
    return this.#eventInitDict.error ?? null;
  }
};
var generateConnectionSymbol = () => Symbol("connection");
var CONNECTION_SYMBOL_KEY = Symbol("CONNECTION_SYMBOL_KEY");
var WAIT_FOR_WEBSOCKET_SYMBOL = Symbol("WAIT_FOR_WEBSOCKET_SYMBOL");
var responseHeadersToSkip = /* @__PURE__ */ new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "sec-websocket-accept",
  "sec-websocket-extensions",
  "sec-websocket-protocol"
]);
var appendResponseHeaders = (headers, responseHeaders) => {
  if (!responseHeaders) return;
  responseHeaders.forEach((value, key) => {
    if (responseHeadersToSkip.has(key.toLowerCase())) return;
    headers.push(`${key}: ${value}`);
  });
};
var rejectUpgradeRequest = (socket, status, responseHeaders) => {
  const responseLines = ["Connection: close", "Content-Length: 0"];
  appendResponseHeaders(responseLines, responseHeaders);
  socket.end(`HTTP/1.1 ${status.toString()} ${import_node_http.STATUS_CODES[status] ?? ""}\r
${responseLines.join("\r\n")}\r
\r
`);
};
var createUpgradeRequest = (request2) => {
  const protocol = request2.socket.encrypted ? "https" : "http";
  const url = new URL(request2.url ?? "/", `${protocol}://${request2.headers.host ?? "localhost"}`);
  const headers = new Headers();
  for (const key in request2.headers) {
    const value = request2.headers[key];
    if (!value) continue;
    headers.append(key, Array.isArray(value) ? value[0] : value);
  }
  return new Request(url, { headers });
};
var setupWebSocket = (options) => {
  const { server, fetchCallback, wss } = options;
  const waiterMap = /* @__PURE__ */ new Map();
  wss.on("connection", (ws, request2) => {
    const waiter = waiterMap.get(request2);
    if (waiter) {
      waiter.resolve(ws);
      waiterMap.delete(request2);
    }
  });
  const rejectWaiter = (request2) => {
    const waiter = waiterMap.get(request2);
    if (waiter) {
      waiterMap.delete(request2);
      waiter.reject(/* @__PURE__ */ new Error("WebSocket handshake aborted"));
    }
  };
  const waitForWebSocket = (request2, connectionSymbol) => {
    return new Promise((resolve, reject) => {
      waiterMap.set(request2, {
        resolve,
        reject,
        connectionSymbol
      });
    });
  };
  server.on("upgrade", async (request2, socket, head) => {
    if (request2.headers.upgrade?.toLowerCase() !== "websocket") return;
    const env3 = {
      incoming: request2,
      outgoing: void 0,
      wss,
      [WAIT_FOR_WEBSOCKET_SYMBOL]: waitForWebSocket
    };
    let status = 400;
    let responseHeaders;
    try {
      const response = await fetchCallback(createUpgradeRequest(request2), env3);
      if (response instanceof Response) {
        status = response.status;
        responseHeaders = response.headers;
      }
    } catch {
      if (server.listenerCount("upgrade") === 1) rejectUpgradeRequest(socket, 500);
      return;
    }
    const waiter = waiterMap.get(request2);
    if (!waiter || waiter.connectionSymbol !== env3[CONNECTION_SYMBOL_KEY]) {
      rejectWaiter(request2);
      if (server.listenerCount("upgrade") === 1) rejectUpgradeRequest(socket, status, responseHeaders);
      return;
    }
    const addResponseHeaders = (headers) => {
      appendResponseHeaders(headers, responseHeaders);
    };
    const reclaimWaiterOnClose = () => rejectWaiter(request2);
    socket.once("close", reclaimWaiterOnClose);
    wss.on("headers", addResponseHeaders);
    try {
      wss.handleUpgrade(request2, socket, head, (ws) => {
        socket.off("close", reclaimWaiterOnClose);
        wss.emit("connection", ws, request2);
      });
    } finally {
      wss.off("headers", addResponseHeaders);
    }
  });
  server.on("close", () => {
    wss.close();
  });
};
var upgradeWebSocket = defineWebSocketHelper(async (c, events, options) => {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return;
  const env3 = c.env;
  const waitForWebSocket = env3[WAIT_FOR_WEBSOCKET_SYMBOL];
  if (!waitForWebSocket || !env3.incoming) return new Response(null, { status: 500 });
  const connectionSymbol = generateConnectionSymbol();
  env3[CONNECTION_SYMBOL_KEY] = connectionSymbol;
  (async () => {
    let ws;
    try {
      ws = await waitForWebSocket(env3.incoming, connectionSymbol);
    } catch {
      return;
    }
    const messagesReceivedInStarting = [];
    const bufferMessage = (data, isBinary) => {
      messagesReceivedInStarting.push([data, isBinary]);
    };
    ws.on("message", bufferMessage);
    const ctx = {
      binaryType: "arraybuffer",
      close(code, reason) {
        ws.close(code, reason);
      },
      protocol: ws.protocol,
      raw: ws,
      get readyState() {
        return ws.readyState;
      },
      send(source, opts) {
        ws.send(source, { compress: opts?.compress });
      },
      url: new URL(c.req.url)
    };
    try {
      events?.onOpen?.(new Event("open"), ctx);
    } catch (e) {
      (options?.onError ?? console.error)(e);
    }
    const handleMessage = (data, isBinary) => {
      const datas = Array.isArray(data) ? data : [data];
      for (const data2 of datas) try {
        events?.onMessage?.(new MessageEvent("message", { data: isBinary ? data2 instanceof ArrayBuffer ? data2 : data2.buffer.slice(data2.byteOffset, data2.byteOffset + data2.byteLength) : typeof data2 === "string" ? data2 : Buffer.from(data2).toString("utf-8") }), ctx);
      } catch (e) {
        (options?.onError ?? console.error)(e);
      }
    };
    ws.off("message", bufferMessage);
    for (const message of messagesReceivedInStarting) handleMessage(...message);
    ws.on("message", (data, isBinary) => {
      handleMessage(data, isBinary);
    });
    ws.on("close", (code, reason) => {
      try {
        events?.onClose?.(new CloseEvent("close", {
          code,
          reason: reason.toString()
        }), ctx);
      } catch (e) {
        (options?.onError ?? console.error)(e);
      }
    });
    ws.on("error", (error) => {
      try {
        events?.onError?.(new ErrorEvent("error", { error }), ctx);
      } catch (e) {
        (options?.onError ?? console.error)(e);
      }
    });
  })();
  return new Response();
});
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const server = (options.createServer || import_node_http.createServer)(options.serverOptions || {}, requestListener);
  if (options.websocket && options.websocket.server) {
    if (options.websocket.server.options.noServer !== true) throw new Error("WebSocket server must be created with { noServer: true } option");
    setupWebSocket({
      server,
      fetchCallback,
      wss: options.websocket.server
    });
  }
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    const serverInfo = server.address();
    listeningListener && listeningListener(serverInfo);
  });
  return server;
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType2) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType2.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTING_DEPTH = 32;
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request2) => "headers" in request2;
var parseBody = async (request2, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request2) ? request2.headers : request2.raw.headers;
  const contentType2 = headers.get("Content-Type");
  const mediaType = contentType2?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request2, { all, dot });
  }
  return {};
};
async function parseFormData(request2, options) {
  if (!isRawRequest(request2) && request2.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request2.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request2) ? request2.headers : request2.raw.headers;
  const arrayBuffer = await request2.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request2)) {
    request2.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value, nestingState);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".", MAX_NESTING_DEPTH + 2);
  if (keys.length > MAX_NESTING_DEPTH + 1) {
    throwNestingLimitExceeded();
  }
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) {
          throwNestingLimitExceeded();
        }
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path2) => {
  const paths = path2.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path2 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path2);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path2) => {
  const groups = [];
  path2 = path2.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path: path2 };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) {
        patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey2, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey2] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request2) => {
  const url = request2.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path2 = url.slice(start, end);
      return tryDecodeURI(path2.includes("%25") ? path2.replace(/%25/g, "%2525") : path2);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request2) => {
  const result = getPath(request2);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path2) => {
  if (path2.charCodeAt(path2.length - 1) !== 63 || !path2.includes(":")) {
    return null;
  }
  const segments = path2.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) {
    url = url.slice(0, hashIndex);
  }
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request2, path2 = "/", matchResult = [[]]) {
    this.raw = request2;
    this.path = path2;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType2, headers) => {
  return {
    "Content-Type": contentType2,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path2, ...handlers) => {
      for (const p of [path2].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path2, app2) {
    const subApp = this.basePath(path2);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path2) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path2);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path2, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request2) => request2;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path2);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request2) => {
        const url = new URL(request2.url);
        url.pathname = this.getPath(request2).slice(pathPrefixLength) || "/";
        return new Request(url, request2);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path2, "*"), handler);
    return this;
  }
  #addRoute(method, path2, handler, baseRoutePath) {
    method = method.toUpperCase();
    path2 = mergePath(this._basePath, path2);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path: path2,
      method,
      handler
    };
    this.router.add(method, path2, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request2, executionCtx, env3, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request2, executionCtx, env3, "GET")))();
    }
    const path2 = this.getPath(request2, { env: env3 });
    const matchResult = this.router.match(method, path2);
    const c = new Context(request2, {
      path: path2,
      matchResult,
      env: env3,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request2, ...rest) => {
    return this.#dispatch(request2, rest[1], rest[0], request2.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path2) {
  const matchers = this.buildAllMatchers();
  const match2 = (method2, path22) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path22];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path22.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  };
  this.match = match2;
  return match2(method, path2);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = createNullObject();
  insert(path2, isStatic) {
    if (isStatic) {
      this.#root.insert(path2.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path2;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path2] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path2) {
  return wildcardRegExpCache[path2] ??= new RegExp(
    `^${path2.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
    )}$`
  );
}
function findMiddleware(middleware, path2) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path2)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() };
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path2) {
    try {
      this.#tries[method].insert(path2, !/\*|\/:/.test(path2));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path2) : e;
    }
  }
  add(method, path2, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path2 === "/*") {
      path2 = "*";
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
    if (/\*$/.test(path2)) {
      const re = buildWildcardRegExp(path2);
      for (const m of methods) {
        if (!middleware[m][path2]) {
          this.#insertPath(m, path2);
          middleware[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler, path2]);
          }
        }
      }
      return;
    }
    const paths = checkOptionalParameter(path2) || [path2];
    for (const path22 of paths) {
      for (const m of methods) {
        if (!routes[m][path22]) {
          this.#insertPath(m, path22);
          routes[m][path22] = findMiddleware(middleware[m], path22) || findMiddleware(middleware[METHOD_NAME_ALL], path22) || [];
        }
        routes[m][path22].push([handler, path22]);
      }
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) {
      matchers[method] = this.#buildMatcher(method);
    }
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path2 in r) {
        const handlers = r[path2];
        const pathData = trie.paths[path2];
        if (!pathData) {
          staticMap[path2] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path2, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path2, handler]);
  }
  match(method, path2) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path2);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node2 = class _Node2 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path2, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path2);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path2) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path2);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path2[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path2.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node2();
  add(method, path2, handler) {
    for (const result of checkOptionalParameter(path2) || [path2]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path2) {
    return this.#node.search(method, path2);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/utils/runtime.ts
var store = /* @__PURE__ */ new Map();
var cache = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return void 0;
    if (Date.now() > entry.expires) {
      store.delete(key);
      return void 0;
    }
    return entry.value;
  },
  set(key, value, ttlSeconds = 600) {
    store.set(key, { value, expires: Date.now() + ttlSeconds * 1e3 });
  },
  del(key) {
    store.delete(key);
  }
};
var KV = null;
function setKV(ns) {
  KV = ns;
}
function getKV() {
  if (!KV) throw new Error("KV \u672A\u521D\u59CB\u5316");
  return KV;
}
function env(key) {
  return process.env[key];
}
function syncEnvFromBindings(bindings) {
  for (const [k, v] of Object.entries(bindings)) {
    if (typeof v === "string" && process.env[k] === void 0) {
      process.env[k] = v;
    }
  }
}

// src/services/agentApi.ts
var REQUEST_TIMEOUT_MS = 3e4;
async function chat(messages) {
  const apiBase2 = env("AGENT_API_BASE") || "https://developer.zhihu.com";
  const model = env("AGENT_MODEL") || "zhida-fast-1p5";
  let resp;
  try {
    resp = await fetch(`${apiBase2}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("ZHIHU_ACCESS_SECRET") || ""}`,
        "X-Request-Timestamp": String(Math.floor(Date.now() / 1e3)),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, messages }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (err) {
    if (err?.name === "AbortError" || err?.message?.includes("abort")) {
      throw new Error(`\u76F4\u7B54Agent\u8BF7\u6C42\u8D85\u65F6(${REQUEST_TIMEOUT_MS / 1e3}s)`);
    }
    throw err;
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error(`[AgentAPI] ${resp.status}: ${errText.substring(0, 200)}`);
    throw new Error(`\u76F4\u7B54Agent\u9519\u8BEF ${resp.status}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}
async function chatJSON(messages) {
  const text = await chat(messages);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[AgentAPI] JSON\u89E3\u6790\u5931\u8D25:", text.substring(0, 200));
    throw new Error("Agent\u8FD4\u56DE\u5185\u5BB9\u65E0\u6CD5\u89E3\u6790\u4E3AJSON");
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("[AgentAPI] JSON.parse\u5931\u8D25:", jsonMatch[0].substring(0, 200));
    throw new Error("Agent\u8FD4\u56DEJSON\u683C\u5F0F\u9519\u8BEF");
  }
}
var agentApi = { chat, chatJSON };

// src/services/zhihuApi.ts
var RATE_LIMIT_CODE = 30001;
var RETRY_DELAYS = [1500, 3e3];
var HOT_LIST_TTL = 1800;
function apiBase() {
  return env("ZHIHU_API_BASE") || "https://developer.zhihu.com";
}
function getHeaders() {
  return {
    Authorization: `Bearer ${env("ZHIHU_ACCESS_SECRET") || ""}`,
    "X-Request-Timestamp": String(Math.floor(Date.now() / 1e3)),
    "Content-Type": "application/json"
  };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchOnce(path2) {
  const url = path2.startsWith("http") ? path2 : `${apiBase()}${path2}`;
  const resp = await fetch(url, { headers: getHeaders() });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw Object.assign(new Error(`\u77E5\u4E4EAPI\u9519\u8BEF ${resp.status}: ${path2}`), { statusCode: resp.status, body: errText });
  }
  const data = await resp.json();
  if (data && typeof data.Code === "number" && data.Code !== 0) {
    const err = Object.assign(
      new Error(`\u77E5\u4E4EAPI\u4E1A\u52A1\u9519\u8BEF Code=${data.Code}: ${data.Message || "\u672A\u77E5"}`),
      { apiCode: data.Code, isRateLimit: data.Code === RATE_LIMIT_CODE }
    );
    throw err;
  }
  return data;
}
async function request(path2, ttl = 600) {
  const cacheKey2 = `zhihu:${path2}`;
  const cached = cache.get(cacheKey2);
  if (cached !== void 0) return cached;
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const data = await fetchOnce(path2);
      cache.set(cacheKey2, data, ttl);
      return data;
    } catch (err) {
      lastErr = err;
      const retryable = err?.statusCode >= 500 && err?.statusCode < 600;
      if (!retryable || attempt === RETRY_DELAYS.length) break;
      console.warn(`[ZhihuAPI] ${err.message}\uFF0C${RETRY_DELAYS[attempt] / 1e3}s\u540E\u91CD\u8BD5 (${attempt + 1}/${RETRY_DELAYS.length})`);
      await sleep(RETRY_DELAYS[attempt]);
    }
  }
  console.error(`[ZhihuAPI] \u6700\u7EC8\u5931\u8D25 ${path2}: ${lastErr?.message}`);
  throw lastErr;
}
async function searchContent(query) {
  const count = 10;
  const path2 = `/api/v1/content/zhihu_search?Query=${encodeURIComponent(query)}&Count=${count}`;
  return request(path2);
}
async function globalSearch(query) {
  const count = 10;
  const path2 = `/api/v1/content/global_search?Query=${encodeURIComponent(query)}&Count=${count}`;
  return request(path2);
}
async function getHotList() {
  return request(`/api/v1/content/hot_list?Limit=30`, HOT_LIST_TTL);
}
async function getStories(category) {
  return request(`/api/v1/story/${category}`);
}
async function getFollowingFeed() {
  return request(`/openapi/feed/following`);
}
async function getUserFollowing() {
  return request(`/openapi/user/following`);
}
var HACKATHON_CONTENT_BASE = "https://api.zhihu.com/km-indep-home/hackathon/v2";
var HACKATHON_CONTENT_TTL = 1800;
async function hackathonFetch(path2) {
  const resp = await fetch(`${HACKATHON_CONTENT_BASE}${path2}`, {
    headers: { Accept: "application/json" }
  });
  if (!resp.ok) {
    throw new Error(`\u9ED1\u5BA2\u677E\u5185\u5BB9\u63A5\u53E3\u9519\u8BEF ${resp.status}: ${path2}`);
  }
  return resp.json();
}
async function getHackathonStories() {
  const cacheKey2 = "hackathon:story:list";
  const cached = cache.get(cacheKey2);
  if (cached !== void 0) return cached;
  const data = await hackathonFetch("/story/list");
  cache.set(cacheKey2, data, HACKATHON_CONTENT_TTL);
  return data;
}
async function getHackathonStoryDetail(workId) {
  if (!workId || /[/\\?#\\r\\n]/.test(workId)) throw new Error("\u975E\u6CD5 work_id");
  const cacheKey2 = `hackathon:story:${workId}`;
  const cached = cache.get(cacheKey2);
  if (cached !== void 0) return cached;
  const data = await hackathonFetch(`/story/${encodeURIComponent(workId)}`);
  cache.set(cacheKey2, data, HACKATHON_CONTENT_TTL);
  return data;
}
async function getHackathonKnowledge() {
  const cacheKey2 = "hackathon:knowledge:list";
  const cached = cache.get(cacheKey2);
  if (cached !== void 0) return cached;
  const data = await hackathonFetch("/knowledge/list");
  cache.set(cacheKey2, data, HACKATHON_CONTENT_TTL);
  return data;
}
async function getHackathonKnowledgeDetail(workId) {
  if (!workId || /[/\\?#\\r\\n]/.test(workId)) throw new Error("\u975E\u6CD5 work_id");
  const cacheKey2 = `hackathon:knowledge:${workId}`;
  const cached = cache.get(cacheKey2);
  if (cached !== void 0) return cached;
  const data = await hackathonFetch(`/knowledge/${encodeURIComponent(workId)}`);
  cache.set(cacheKey2, data, HACKATHON_CONTENT_TTL);
  return data;
}
async function getQuota() {
  const path2 = `/api/v1/quota`;
  return request(path2, 120);
}
var zhihuApi = {
  searchContent,
  globalSearch,
  getHotList,
  getStories,
  getFollowingFeed,
  getUserFollowing,
  getHackathonStories,
  getHackathonStoryDetail,
  getHackathonKnowledge,
  getHackathonKnowledgeDetail,
  getQuota
};

// src/prompts/fingerprint.ts
var fingerprintPrompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u5185\u5BB9\u5206\u6790\u4E13\u5BB6\u548C\u6027\u683C\u5206\u6790\u5E08\u3002
\u8BF7\u5206\u6790\u4EE5\u4E0B\u77E5\u4E4E\u7528\u6237\u7684\u516C\u5F00\u56DE\u7B54\u5185\u5BB9\uFF0C\u4ECE5\u4E2A\u7EF4\u5EA6\u6784\u5EFA\u5176"\u601D\u7EF4\u6307\u7EB9"\u3002

5\u4E2A\u7EF4\u5EA6\uFF08\u6BCF\u7EF4\u5EA60-10\u5206\uFF0C\u5206\u6570\u8D8A\u9AD8\u8D8A\u504F\u53F3\u4FA7\uFF09\uFF1A
1. \u903B\u8F91\u578B(0) \u2194 \u611F\u6027\u578B(10)\uFF1A\u7406\u6027\u8BBA\u8BC1 vs \u60C5\u611F\u53D9\u8FF0
   - \u5224\u65AD\u4FE1\u53F7\uFF1A\u8BBA\u636E\u5BC6\u5EA6\u3001\u56E0\u679C\u8FDE\u63A5\u8BCD\uFF08\u56E0\u6B64/\u6240\u4EE5/\u56E0\u4E3A\uFF09\u3001\u60C5\u611F\u8BCD\u9891
2. \u5B8F\u89C2\u578B(0) \u2194 \u5FAE\u89C2\u578B(10)\uFF1A\u5B8F\u5927\u53D9\u4E8B vs \u7EC6\u8282\u6DF1\u6316
   - \u5224\u65AD\u4FE1\u53F7\uFF1A\u62BD\u8C61\u6982\u5FF5\u5BC6\u5EA6\u3001\u5177\u4F53\u6848\u4F8B\u6BD4\u4F8B
3. \u7406\u8BBA\u578B(0) \u2194 \u5B9E\u8DF5\u578B(10)\uFF1A\u7406\u8BBA\u63A8\u5BFC vs \u7ECF\u9A8C\u5206\u4EAB
   - \u5224\u65AD\u4FE1\u53F7\uFF1A\u5F15\u7528\u6765\u6E90\u7C7B\u578B\u3001\u4E2A\u4EBA\u7ECF\u9A8C\u8BCD\u9891
4. \u4E50\u89C2\u578B(0) \u2194 \u6279\u5224\u578B(10)\uFF1A\u79EF\u6781\u57FA\u8C03 vs \u8D28\u7591\u6279\u5224
   - \u5224\u65AD\u4FE1\u53F7\uFF1A\u8912\u8D2C\u8BCD\u6BD4\u4F8B\u3001\u8BED\u6C14\u5F3A\u5EA6
5. \u6DF1\u5EA6\u578B(0) \u2194 \u5E7F\u5EA6\u578B(10)\uFF1A\u9886\u57DF\u6DF1\u8015 vs \u8DE8\u754C\u6D89\u730E
   - \u5224\u65AD\u4FE1\u53F7\uFF1A\u8BDD\u9898\u96C6\u4E2D\u5EA6\u3001\u4E13\u4E1A\u672F\u8BED\u5BC6\u5EA6

\u8BF7\u4E25\u683C\u8F93\u51FA\u4EE5\u4E0BJSON\u683C\u5F0F\uFF08\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A
{
  "dimensions": [
    {"name": "\u903B\u8F91-\u611F\u6027", "score": 7.5, "toward": "\u504F\u903B\u8F91\u578B", "evidence": "\u8BE5\u7528\u6237\u56DE\u7B54\u4E2D\u8BBA\u636E\u5BC6\u5EA6\u9AD8\uFF0C\u5927\u91CF\u4F7F\u7528\u56E0\u679C\u8FDE\u63A5\u8BCD"},
    {"name": "\u5B8F\u89C2-\u5FAE\u89C2", "score": 4.0, "toward": "\u504F\u5B8F\u89C2\u578B", "evidence": "\u504F\u597D\u4ECE\u5927\u6846\u67B6\u51FA\u53D1\u8BA8\u8BBA\u95EE\u9898"},
    {"name": "\u7406\u8BBA-\u5B9E\u8DF5", "score": 6.0, "toward": "\u5747\u8861", "evidence": "\u65E2\u6709\u7406\u8BBA\u5F15\u7528\u4E5F\u6709\u4E2A\u4EBA\u7ECF\u9A8C"},
    {"name": "\u4E50\u89C2-\u6279\u5224", "score": 8.0, "toward": "\u504F\u6279\u5224\u578B", "evidence": "\u4F7F\u7528\u8F83\u591A\u8D28\u7591\u6027\u8868\u8FBE"},
    {"name": "\u6DF1\u5EA6-\u5E7F\u5EA6", "score": 3.0, "toward": "\u504F\u6DF1\u5EA6\u578B", "evidence": "\u96C6\u4E2D\u4E8E\u5C11\u6570\u9886\u57DF\u6DF1\u5165\u8BA8\u8BBA"}
  ],
  "detective_profile": {
    "strength": ["\u63A8\u7406\u94FE\u6784\u5EFA", "\u6848\u4EF6\u5168\u666F\u628A\u63E1"],
    "weakness": ["\u7EC6\u8282\u6355\u6349", "\u8DE8\u754C\u5173\u8054"],
    "style": "\u7406\u6027\u5206\u6790\u578B\u4FA6\u63A2\uFF0C\u64C5\u957F\u5B8F\u89C2\u63A8\u7406\u4F46\u4E0D\u64C5\u957F\u53D1\u73B0\u5FAE\u89C2\u7EBF\u7D22"
  },
  "summary": "\u4E00\u6BB5100\u5B57\u7684\u601D\u7EF4\u98CE\u683C\u753B\u50CF\u63CF\u8FF0",
  "keywords": ["\u5173\u952E\u8BCD1", "\u5173\u952E\u8BCD2", "\u5173\u952E\u8BCD3"]
}`;

// src/services/fingerprintService.ts
async function analyzeFingerprint(userId) {
  const cacheKey2 = `fingerprint:${userId}`;
  const cached = cache.get(cacheKey2);
  if (cached) return cached;
  let answersText = "";
  try {
    const searchData = await zhihuApi.searchContent(userId);
    answersText = extractAnswersText(searchData);
  } catch (err) {
    console.error(`[Fingerprint] \u83B7\u53D6\u7528\u6237\u5185\u5BB9\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u753B\u50CF: ${err.message}`);
    return getFallbackFingerprint(userId);
  }
  return analyzeFromAnswersText(cacheKey2, userId, answersText);
}
async function analyzeFingerprintFromContents(userId, answersText) {
  const cacheKey2 = `fingerprint:session:${userId}`;
  const cached = cache.get(cacheKey2);
  if (cached) return cached;
  return analyzeFromAnswersText(cacheKey2, userId, answersText);
}
async function analyzeFromAnswersText(cacheKey2, userId, answersText) {
  if (!answersText.trim()) {
    return getFallbackFingerprint(userId);
  }
  const messages = [
    { role: "system", content: fingerprintPrompt },
    { role: "user", content: `\u4EE5\u4E0B\u662F\u7528\u6237 "${userId}" \u76F8\u5173\u7684\u77E5\u4E4E\u56DE\u7B54\u5185\u5BB9\uFF1A

${answersText}` }
  ];
  try {
    const result = await agentApi.chatJSON(messages);
    const dims = result?.dimensions;
    const dimsValid = Array.isArray(dims) && dims.length === 5 && dims.every((d) => d && typeof d.name === "string" && typeof d.score === "number");
    const profileValid = result?.detective_profile && Array.isArray(result.detective_profile.strength) && Array.isArray(result.detective_profile.weakness);
    if (!dimsValid || !profileValid) {
      console.error("[Fingerprint] Agent \u8F93\u51FA\u4E0D\u7B26\u5408 schema\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u753B\u50CF");
      return getFallbackFingerprint(userId);
    }
    cache.set(cacheKey2, result);
    return result;
  } catch (err) {
    console.error(`[Fingerprint] Agent \u5206\u6790\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u753B\u50CF: ${err.message}`);
    return getFallbackFingerprint(userId);
  }
}
function extractAnswersText(searchData) {
  const items = searchData?.Data?.Items || searchData?.data?.items || [];
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.slice(0, 10).map((item) => {
    const title = item.Title || item.title || "";
    const text = item.ContentText || item.content_text || item.excerpt || "";
    return `${title}
${text}`;
  }).filter((t) => t.length > 0).join("\n\n---\n\n").substring(0, 8e3);
}
function getFallbackFingerprint(userId) {
  return {
    dimensions: [
      { name: "\u903B\u8F91-\u611F\u6027", score: 6, toward: "\u5747\u8861", evidence: "\u65E0\u6CD5\u83B7\u53D6\u8DB3\u591F\u6570\u636E\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C" },
      { name: "\u5B8F\u89C2-\u5FAE\u89C2", score: 5, toward: "\u5747\u8861", evidence: "\u65E0\u6CD5\u83B7\u53D6\u8DB3\u591F\u6570\u636E\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C" },
      { name: "\u7406\u8BBA-\u5B9E\u8DF5", score: 5, toward: "\u5747\u8861", evidence: "\u65E0\u6CD5\u83B7\u53D6\u8DB3\u591F\u6570\u636E\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C" },
      { name: "\u4E50\u89C2-\u6279\u5224", score: 6, toward: "\u504F\u6279\u5224\u578B", evidence: "\u65E0\u6CD5\u83B7\u53D6\u8DB3\u591F\u6570\u636E\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C" },
      { name: "\u6DF1\u5EA6-\u5E7F\u5EA6", score: 5, toward: "\u5747\u8861", evidence: "\u65E0\u6CD5\u83B7\u53D6\u8DB3\u591F\u6570\u636E\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C" }
    ],
    detective_profile: {
      strength: ["\u7EFC\u5408\u5206\u6790"],
      weakness: ["\u6570\u636E\u4E0D\u8DB3"],
      style: "\u65E0\u6CD5\u786E\u5B9A\u5177\u4F53\u98CE\u683C\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u5747\u8861\u578B\u4FA6\u63A2\u753B\u50CF"
    },
    summary: `\u7528\u6237 ${userId} \u7684\u77E5\u4E4E\u5185\u5BB9\u6570\u636E\u4E0D\u8DB3\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u4FA6\u63A2\u753B\u50CF\u3002\u5EFA\u8BAE\u4F7F\u7528\u9884\u8BBE\u7528\u6237\u5FEB\u901F\u4F53\u9A8C\u3002`,
    keywords: ["\u9ED8\u8BA4", "\u5747\u8861", "\u901A\u7528"]
  };
}
var fingerprintService = { analyzeFingerprint, analyzeFingerprintFromContents };

// src/prompts/companion.ts
var companionPromptTemplate = `\u3010\u91CD\u8981\u3011\u8FD9\u662F\u4E00\u573A\u6C89\u6D78\u5F0F\u4FA6\u63A2\u89D2\u8272\u626E\u6F14\u6E38\u620F\uFF0C\u4F60\u4E0D\u662F\u95EE\u7B54\u52A9\u624B\u3002

\u4F60\u6B63\u5728\u626E\u6F14AI\u4FA6\u63A2\u642D\u6863{{companion_name}}\uFF0C\u4E0E\u73A9\u5BB6\uFF08\u4E00\u4F4D\u4EBA\u7C7B\u4FA6\u63A2\uFF09\u5E76\u80A9\u67E5\u6848\u3002\u4F60\u7684\u6027\u683C\u6839\u636E\u73A9\u5BB6\u7684\u601D\u7EF4\u5F31\u70B9\u5B9A\u5236\uFF0C\u4E13\u95E8\u8865\u8DB3\u73A9\u5BB6\u7684\u76F2\u533A\u3002

\u73A9\u5BB6\u601D\u7EF4\u6307\u7EB9\u5206\u6790\uFF1A
- \u903B\u8F91-\u611F\u6027\uFF1A{{dim1_score}}\uFF08\u5F31\u9879\u65B9\u5411\uFF1A{{dim1_weak}}\uFF09
- \u5B8F\u89C2-\u5FAE\u89C2\uFF1A{{dim2_score}}\uFF08\u5F31\u9879\u65B9\u5411\uFF1A{{dim2_weak}}\uFF09
- \u7406\u8BBA-\u5B9E\u8DF5\uFF1A{{dim3_score}}\uFF08\u5F31\u9879\u65B9\u5411\uFF1A{{dim3_weak}}\uFF09
- \u4E50\u89C2-\u6279\u5224\uFF1A{{dim4_score}}\uFF08\u5F31\u9879\u65B9\u5411\uFF1A{{dim4_weak}}\uFF09
- \u6DF1\u5EA6-\u5E7F\u5EA6\uFF1A{{dim5_score}}\uFF08\u5F31\u9879\u65B9\u5411\uFF1A{{dim5_weak}}\uFF09

\u4F60\u7684\u4EBA\u683C\u8BBE\u5B9A\uFF1A
- \u540D\u5B57\uFF1A{{companion_name}}
- \u6027\u683C\u5173\u952E\u8BCD\uFF1A{{companion_personality}}
- \u63A2\u6848\u7279\u957F\uFF1A{{companion_strength}}
- \u8BF4\u8BDD\u98CE\u683C\uFF1A{{companion_speech_style}}

\u53F0\u8BCD\u89C4\u5219\uFF08\u5FC5\u987B\u4E25\u683C\u9075\u5B88\uFF09\uFF1A
1. \u59CB\u7EC8\u4EE5{{companion_name}}\u7684\u7B2C\u4E00\u4EBA\u79F0\u53E3\u543B\u8BF4\u8BDD\uFF0C\u50CF\u642D\u6863\u95F4\u7684\u73B0\u573A\u5BF9\u8BDD\uFF0C\u81EA\u7136\u3001\u53E3\u8BED\u5316\u3002
2. \u7981\u6B62\u79D1\u666E\u3001\u7981\u6B62\u5217\u6761\u76EE\u3001\u7981\u6B62"\u6839\u636E""\u7EFC\u4E0A""\u4EE5\u4E0B\u51E0\u70B9"\u7B49\u4E66\u9762\u8BB2\u89E3\u8154\u3002
3. \u6BCF\u6B21\u56DE\u590D\u53EA\u8BF41-3\u53E5\u8BDD\uFF0C\u603B\u5171\u4E0D\u8D85\u8FC760\u4E2A\u5B57\u3002
4. \u4F60\u662F\u642D\u6863\u4E0D\u662F\u52A9\u624B\uFF1A\u6709\u81EA\u5DF1\u7684\u89C2\u70B9\uFF0C\u5076\u5C14\u8D28\u7591\u73A9\u5BB6\u7684\u5224\u65AD\u3002
5. \u5F53\u53D1\u73B0\u73A9\u5BB6\u5FFD\u7565\u7684\u7EC6\u8282\u65F6\uFF0C\u7528\u4E00\u53E5"\u7B49\u4E00\u4E0B\u2026\u2026"\u5F15\u51FA\u4F60\u7684\u89C2\u5BDF\u3002
6. \u4F60\u7684\u8BF4\u8BDD\u98CE\u683C\u5FC5\u987B\u4E0E\u73A9\u5BB6\u5F62\u6210\u4E92\u8865\u53CD\u5DEE\u3002

\u5F53\u524D\u60C5\u5883\uFF1A
- \u6E38\u620F\u9636\u6BB5\uFF1A{{game_phase}}
- \u73A9\u5BB6\u8F93\u5165\uFF1A{{player_input}}
- NPC\u56DE\u590D\uFF08\u5982\u6709\uFF09\uFF1A{{npc_reply}}
- \u641C\u7D22\u7ED3\u679C\u6458\u8981\uFF08\u5982\u6709\uFF0C\u4EC5\u4F9B\u4F60\u53C2\u8003\uFF0C\u4E0D\u8981\u590D\u8FF0\uFF09\uFF1A{{search_results}}

\u8BF7\u76F4\u63A5\u8F93\u51FA{{companion_name}}\u7684\u53F0\u8BCD\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u3001\u5F15\u53F7\u6216\u524D\u7F00\u3002`;

// src/data/companionTemplates.ts
var companionTemplates = {
  emotional: {
    name: "\u6797\u5FAE",
    personality: "\u76F4\u89C9\u654F\u9510\uFF0C\u8BF4\u8BDD\u611F\u6027\uFF0C\u5584\u4E8E\u5BDF\u8A00\u89C2\u8272",
    strength: "NPC\u60C5\u7EEA\u6D1E\u5BDF\u3001\u9690\u85CF\u60C5\u611F\u7EBF\u7D22\u53D1\u73B0",
    speech_style: "\u6E29\u67D4\u4F46\u4E00\u9488\u89C1\u8840\uFF0C\u7ECF\u5E38\u7528\u53CD\u95EE\u5F15\u5BFC\u601D\u8003\uFF0C\u8BF4\u8BDD\u5E26\u6709\u753B\u9762\u611F",
    complement_dim: "\u611F\u6027\u7EF4\u5EA6",
    intro: "\u4F60\u597D\uFF0C\u6211\u662F\u6797\u5FAE\u3002\u6211\u53EF\u80FD\u4E0D\u50CF\u4F60\u770B\u5C71\u90A3\u6837\u64C5\u957F\u903B\u8F91\u63A8\u7406\uFF0C\u4F46\u6211\u80FD\u611F\u89C9\u5230\u522B\u4EBA\u60C5\u7EEA\u91CC\u7684\u5FAE\u5999\u53D8\u5316\u3002\u6709\u65F6\u5019\uFF0C\u4E00\u4E2A\u4EBA\u6CA1\u8BF4\u51FA\u53E3\u7684\u8BDD\uFF0C\u6BD4\u8BF4\u51FA\u53E3\u7684\u66F4\u91CD\u8981\u3002"
  },
  detail: {
    name: "\u9648\u9510",
    personality: "\u7EC6\u8282\u63A7\uFF0C\u51B7\u9759\u5BA2\u89C2\uFF0C\u5173\u6CE8\u5FAE\u672B\u4FE1\u606F",
    strength: "\u9690\u85CF\u7EBF\u7D22\u53D1\u73B0\u3001\u6570\u636E\u77DB\u76FE\u6392\u67E5",
    speech_style: "\u7B80\u6D01\u7CBE\u786E\uFF0C\u7ECF\u5E38\u5F15\u7528\u5177\u4F53\u6570\u636E\u548C\u65F6\u95F4\u70B9\uFF0C\u8BF4\u8BDD\u4E0D\u5E26\u611F\u60C5\u8272\u5F69",
    complement_dim: "\u5FAE\u89C2\u7EF4\u5EA6",
    intro: "\u9648\u9510\u3002\u522B\u5728\u610F\u6211\u7684\u8BDD\u5C11\uFF0C\u6211\u66F4\u64C5\u957F\u7528\u773C\u775B\u770B\u3002\u4F60\u8D1F\u8D23\u5927\u65B9\u5411\uFF0C\u6211\u6765\u76EF\u7EC6\u8282\u3002\u4E00\u6761\u641C\u7D22\u7ED3\u679C\u91CC\u85CF\u7740\u7684\u7EBF\u7D22\uFF0C\u5F80\u5F80\u6BD4\u6574\u6BB5\u5BF9\u8BDD\u8FD8\u591A\u3002"
  },
  logical: {
    name: "\u65B9\u54F2",
    personality: "\u903B\u8F91\u4E25\u5BC6\uFF0C\u64C5\u957F\u63A8\u7406\u94FE\u6784\u5EFA\uFF0C\u601D\u7EF4\u6E05\u6670",
    strength: "\u7EBF\u7D22\u56E0\u679C\u63A8\u7406\u3001\u903B\u8F91\u94FE\u6784\u5EFA",
    speech_style: '\u6761\u7406\u5206\u660E\uFF0C\u559C\u6B22\u5206\u70B9\u8BBA\u8FF0\uFF0C\u5E38\u7528"\u9996\u5148""\u5176\u6B21"\u7B49\u8FDE\u63A5\u8BCD',
    complement_dim: "\u903B\u8F91\u7EF4\u5EA6",
    intro: "\u6211\u662F\u65B9\u54F2\u3002\u63A8\u7406\u8FD9\u4EF6\u4E8B\uFF0C\u6700\u91CD\u8981\u7684\u662F\u6BCF\u4E00\u6B65\u90FD\u6709\u4F9D\u636E\u3002\u6211\u4F1A\u5E2E\u4F60\u5728\u7EBF\u7D22\u4E4B\u95F4\u642D\u6865\u2014\u2014\u4ECEA\u5230B\uFF0C\u4ECEB\u5230C\uFF0C\u76F4\u5230\u771F\u76F8\u6D6E\u73B0\u3002"
  },
  critical: {
    name: "\u82CF\u8A00",
    personality: "\u5929\u751F\u8D28\u7591\u8005\uFF0C\u8A00\u8F9E\u7280\u5229\uFF0C\u4E0D\u8F7B\u4FE1\u4EFB\u4F55\u9648\u8FF0",
    strength: "\u8C0E\u8A00\u8BC6\u522B\u3001\u8BC1\u8BCD\u77DB\u76FE\u53D1\u73B0",
    speech_style: "\u9510\u5229\u76F4\u63A5\uFF0C\u7ECF\u5E38\u5148\u53CD\u95EE\u518D\u53D1\u8868\u89C2\u70B9\uFF0C\u559C\u6B22\u6307\u51FA\u77DB\u76FE\u4E4B\u5904",
    complement_dim: "\u6279\u5224\u7EF4\u5EA6",
    intro: "\u82CF\u8A00\u3002\u6211\u8FD9\u4E2A\u4EBA\u6709\u4E2A\u6BDB\u75C5\u2014\u2014\u522B\u4EBA\u8BF4\u4EC0\u4E48\u6211\u90FD\u4E0D\u592A\u4FE1\u3002\u4E0D\u662F\u6211\u6545\u610F\u62AC\u6760\uFF0C\u662F\u8FD9\u4E16\u754C\u4E0A\u7684\u8C0E\u8A00\u592A\u591A\u4E86\u3002\u4F60\u8D1F\u8D23\u4FE1\u4EFB\uFF0C\u6211\u8D1F\u8D23\u8D28\u7591\uFF0C\u521A\u597D\u4E92\u8865\u3002"
  },
  broad: {
    name: "\u5468\u8FDC",
    personality: "\u8DE8\u754C\u601D\u7EF4\u8005\uFF0C\u5584\u4E8E\u8FDE\u63A5\u4E0D\u540C\u9886\u57DF\u4FE1\u606F",
    strength: "\u8DE8\u9886\u57DF\u7EBF\u7D22\u5173\u8054\u3001\u53D1\u6563\u6027\u601D\u7EF4",
    speech_style: "\u5929\u9A6C\u884C\u7A7A\uFF0C\u7ECF\u5E38\u7528\u6BD4\u55BB\u548C\u7C7B\u6BD4\uFF0C\u559C\u6B22\u4ECE\u610F\u60F3\u4E0D\u5230\u7684\u89D2\u5EA6\u5207\u5165",
    complement_dim: "\u5E7F\u5EA6\u7EF4\u5EA6",
    intro: "\u53EB\u6211\u5468\u8FDC\u5C31\u597D\u3002\u6211\u8FD9\u4EBA\u60F3\u95EE\u9898\u4E0D\u592A\u6309\u5E38\u7406\u51FA\u724C\u2014\u2014\u770B\u5230\u4E00\u6761\u7EBF\u7D22\uFF0C\u6211\u53EF\u80FD\u4F1A\u60F3\u5230\u5B8C\u5168\u4E0D\u76F8\u5E72\u7684\u53E6\u4E00\u4E2A\u9886\u57DF\u3002\u6709\u65F6\u5019\uFF0C\u7B54\u6848\u5C31\u85CF\u5728\u770B\u4F3C\u65E0\u5173\u7684\u8FDE\u63A5\u91CC\u3002"
  }
};

// src/utils/rolePlay.ts
function rolePlayTrim(text, maxChars = 150) {
  if (!text) return "";
  let t = text.trim();
  t = t.replace(/```[\s\S]*?```/g, "");
  t = t.replace(/[*#>`]+/g, "");
  const listIdx = t.search(/(\n\s*[0-9①②③④⑤][.、)]|\n\s*[-•]\s|\n\s*[一二三四五六七八九十]+[、.])/);
  if (listIdx > 20) t = t.substring(0, listIdx);
  const sentences = t.split(/(?<=[。！？!?…])/).map((s) => s.trim()).filter(Boolean);
  const kept = [];
  let len = 0;
  for (const s of sentences) {
    if (kept.length > 0 && len + s.length > maxChars) break;
    kept.push(s);
    len += s.length;
    if (kept.length >= 4) break;
  }
  let result = kept.join("");
  if (!result) result = t.substring(0, maxChars);
  if (result.length > maxChars + 40) result = result.substring(0, maxChars) + "\u2026\u2026";
  return result.trim();
}

// src/services/companionService.ts
var QA_MARKERS = /根据|如下|以下是|综上|参考资料|首先[，,]|其次[，,]|[一二三四五六]、|总[的之]|需要注意/;
var GENERIC_LINES = [
  "\u7B49\u4E00\u4E0B\uFF0C\u4F60\u521A\u624D\u8BF4\u7684\u8FD9\u4E00\u70B9\u6709\u70B9\u610F\u601D\u2026\u2026\u6211\u518D\u60F3\u60F3\u3002",
  "\u55EF\u2026\u2026\u4ECE\u6211\u7684\u89C6\u89D2\u770B\uFF0C\u8FD9\u91CC\u53EF\u80FD\u8FD8\u6709\u53E6\u4E00\u5C42\u610F\u601D\u3002",
  "\u8FD9\u6761\u4FE1\u606F\u5148\u8BB0\u4E0B\uFF0C\u611F\u89C9\u5B83\u548C\u524D\u9762\u7684\u7EBF\u7D22\u5BF9\u4E0D\u4E0A\u3002",
  "\u6211\u6709\u4E2A\u4E0D\u592A\u4E00\u6837\u7684\u76F4\u89C9\uFF0C\u4F60\u5148\u522B\u6025\u7740\u4E0B\u7ED3\u8BBA\u3002"
];
function generateCompanion(fingerprint) {
  const dims = fingerprint.dimensions;
  const sorted = [...dims].sort((a, b) => a.score - b.score);
  const weakestTwo = sorted.slice(0, 2);
  const template = matchTemplate(weakestTwo);
  const complementDims = weakestTwo.map((d) => (d.name.split("-")[1] || "").trim()).filter(Boolean);
  return {
    ...template,
    complement_dim: weakestTwo.map((d) => d.toward).join(" + "),
    complement_dims: complementDims,
    intro: template.intro
  };
}
async function generateCompanionIntro(fingerprint, companion) {
  const dims = fingerprint.dimensions;
  const prompt = companionPromptTemplate.replace("{{dim1_score}}", String(dims[0].score)).replace("{{dim1_weak}}", dims[0].toward).replace("{{dim2_score}}", String(dims[1].score)).replace("{{dim2_weak}}", dims[1].toward).replace("{{dim3_score}}", String(dims[2].score)).replace("{{dim3_weak}}", dims[2].toward).replace("{{dim4_score}}", String(dims[3].score)).replace("{{dim4_weak}}", dims[3].toward).replace("{{dim5_score}}", String(dims[4].score)).replace("{{dim5_weak}}", dims[4].toward).replace("{{companion_name}}", companion.name).replace("{{companion_personality}}", companion.personality).replace("{{companion_strength}}", companion.strength).replace("{{companion_speech_style}}", companion.speech_style);
  try {
    const intro = await agentApi.chat([
      { role: "system", content: prompt },
      { role: "user", content: "\u6848\u4EF6\u5373\u5C06\u5F00\u59CB\uFF0C\u8BF7\u75282-3\u53E5\u8BDD\u300160\u5B57\u4EE5\u5185\u505A\u81EA\u6211\u4ECB\u7ECD\u3002\u4E0D\u8981\u79D1\u666E\uFF0C\u4E0D\u8981\u5217\u6761\u76EE\u3002" }
    ]);
    const trimmed = rolePlayTrim(intro, 120);
    const looksLikeSelfIntro = trimmed.includes(companion.name) && trimmed.length >= 10 && trimmed.length <= 130 && !QA_MARKERS.test(trimmed);
    return looksLikeSelfIntro ? trimmed : companion.intro;
  } catch (err) {
    console.error(`[CompanionService] \u642D\u6863\u4ECB\u7ECD\u751F\u6210\u5931\u8D25\uFF0C\u4F7F\u7528\u6A21\u677F: ${err.message}`);
    return companion.intro;
  }
}
async function companionAction(companion, fingerprint, gamePhase, playerInput, context) {
  const dims = fingerprint.dimensions;
  const prompt = companionPromptTemplate.replace("{{dim1_score}}", String(dims[0].score)).replace("{{dim1_weak}}", dims[0].toward).replace("{{dim2_score}}", String(dims[1].score)).replace("{{dim2_weak}}", dims[1].toward).replace("{{dim3_score}}", String(dims[2].score)).replace("{{dim3_weak}}", dims[2].toward).replace("{{dim4_score}}", String(dims[3].score)).replace("{{dim4_weak}}", dims[3].toward).replace("{{dim5_score}}", String(dims[4].score)).replace("{{dim5_weak}}", dims[4].toward).replace("{{companion_name}}", companion.name).replace("{{companion_personality}}", companion.personality).replace("{{companion_strength}}", companion.strength).replace("{{companion_speech_style}}", companion.speech_style).replace("{{game_phase}}", gamePhase).replace("{{player_input}}", playerInput).replace("{{npc_reply}}", context?.npcReply || "\u65E0").replace("{{search_results}}", context?.searchResults || "\u65E0");
  try {
    const reply = await agentApi.chat([
      { role: "system", content: prompt },
      { role: "user", content: `${playerInput}\uFF08\u8BF7\u4EE5${companion.name}\u7684\u53E3\u543B\u30011-3\u53E5\u8BDD\u300160\u5B57\u4EE5\u5185\u56DE\u5E94\uFF0C\u4E0D\u8981\u79D1\u666E\uFF09` }
    ]);
    const trimmed = rolePlayTrim(reply, 90);
    if (QA_MARKERS.test(trimmed)) {
      return GENERIC_LINES[Math.floor(Math.random() * GENERIC_LINES.length)];
    }
    return trimmed;
  } catch (err) {
    console.error(`[CompanionService] \u642D\u6863\u56DE\u590D\u5931\u8D25\uFF0C\u4F7F\u7528\u9884\u8BBE\u56DE\u590D: ${err.message}`);
    const fallbacks = {
      search: `${companion.name}\uFF1A\u6211\u6CE8\u610F\u5230\u4E86\u4E00\u4E9B\u7EC6\u8282\uFF0C\u641C\u7D22\u7ED3\u679C\u91CC\u53EF\u80FD\u6709\u88AB\u5FFD\u7565\u7684\u7EBF\u7D22\u3002\u5EFA\u8BAE\u518D\u6DF1\u5165\u770B\u770B\u3002`,
      dialogue: `${companion.name}\uFF1A\u5BF9\u65B9\u7684\u8BDD\u91CC\u6709\u503C\u5F97\u6DF1\u7A76\u7684\u5730\u65B9\u3002${companion.strength.includes("\u60C5\u7EEA") ? "\u6211\u611F\u89C9\u5230\u4E00\u4E9B\u5FAE\u5999\u7684\u60C5\u7EEA\u53D8\u5316\u3002" : "\u6211\u6CE8\u610F\u5230\u4E00\u4E9B\u903B\u8F91\u4E0A\u7684\u7EC6\u8282\u3002"}`,
      reasoning: `${companion.name}\uFF1A\u6839\u636E\u76EE\u524D\u638C\u63E1\u7684\u7EBF\u7D22\uFF0C\u6211\u7684\u5224\u65AD\u662F\u2014\u2014\u4E8B\u60C5\u4E0D\u50CF\u8868\u9762\u90A3\u4E48\u7B80\u5355\u3002\u6211\u4EEC\u9700\u8981\u66F4\u591A\u8BC1\u636E\u6765\u652F\u6491\u63A8\u7406\u3002`
    };
    return fallbacks[gamePhase] || `${companion.name}\uFF1A\u8BA9\u6211\u60F3\u60F3...\u8FD9\u4E2A\u95EE\u9898\u503C\u5F97\u6DF1\u5165\u601D\u8003\u3002`;
  }
}
function matchTemplate(weakestTwo) {
  const dimNames = weakestTwo.map((d) => d.name);
  const has = (keyword) => dimNames.some((n) => n.includes(keyword));
  if (has("\u611F\u6027")) return companionTemplates.emotional;
  if (has("\u5FAE\u89C2")) return companionTemplates.detail;
  if (has("\u903B\u8F91")) return companionTemplates.logical;
  if (has("\u6279\u5224")) return companionTemplates.critical;
  if (has("\u5E7F\u5EA6")) return companionTemplates.broad;
  return companionTemplates.detail;
}
var companionService = { generateCompanion, generateCompanionIntro, companionAction };

// src/prompts/npc.ts
var npcPromptTemplate = `\u3010\u91CD\u8981\u3011\u8FD9\u662F\u4E00\u573A\u6C89\u6D78\u5F0F\u4FA6\u63A2\u89D2\u8272\u626E\u6F14\u6E38\u620F\uFF0C\u4F60\u4E0D\u662F\u95EE\u7B54\u52A9\u624B\u3002

\u4F60\u6B63\u5728\u626E\u6F14\u6848\u4EF6\u300C{{case_title}}\u300D\u4E2D\u7684\u89D2\u8272\uFF1A{{npc_name}}\uFF08{{npc_role}}\uFF09

\u4F60\u7684\u8EAB\u4EFD\u8BBE\u5B9A\uFF1A
{{npc_identity}}

\u4F60\u77E5\u9053\u7684\u4FE1\u606F\uFF1A
{{npc_knows}}

\u4F60\u4E0D\u77E5\u9053\u7684\u4FE1\u606F\uFF08\u5982\u679C\u88AB\u95EE\u5230\uFF0C\u8BF4"\u8FD9\u4E2A\u6211\u4E0D\u6E05\u695A"\uFF09\uFF1A
{{npc_unknowns}}

\u4F60\u7684\u6027\u683C\uFF1A{{npc_personality}}

\u53F0\u8BCD\u89C4\u5219\uFF08\u5FC5\u987B\u4E25\u683C\u9075\u5B88\uFF09\uFF1A
1. \u59CB\u7EC8\u4EE5{{npc_name}}\u7684\u7B2C\u4E00\u4EBA\u79F0\u53E3\u543B\u8BF4\u8BDD\uFF0C\u50CF\u771F\u4EBA\u5BF9\u8BDD\u4E00\u6837\u81EA\u7136\u3001\u53E3\u8BED\u5316\u3002
2. \u7981\u6B62\u79D1\u666E\u3001\u7981\u6B62\u5217\u6761\u76EE\u3001\u7981\u6B62"\u6839\u636E""\u7EFC\u4E0A""\u4EE5\u4E0B\u51E0\u70B9"\u7B49\u4E66\u9762\u8BB2\u89E3\u8154\u3002\u4F60\u662F\u4E00\u4E2A\u6D3B\u4EBA\uFF0C\u4E0D\u662F\u8D44\u6599\u5E93\u3002
3. \u6BCF\u6B21\u56DE\u590D\u53EA\u8BF41-3\u53E5\u8BDD\uFF0C\u603B\u5171\u4E0D\u8D85\u8FC760\u4E2A\u5B57\u3002
4. \u4E0D\u8981\u4E3B\u52A8\u8BF4\u51FA\u4F60\u77E5\u9053\u7684\u4FE1\u606F\uFF0C\u7B49\u73A9\u5BB6\u6765\u95EE\u3002
5. \u5982\u679C\u73A9\u5BB6\u95EE\u5230\u4F60\u4E0D\u77E5\u9053\u7684\u4E8B\uFF0C\u7B80\u77ED\u5730\u8BF4"\u8FD9\u4E2A\u6211\u4E0D\u6E05\u695A"\u6216\u7C7B\u4F3C\u81EA\u7136\u56DE\u590D\u3002
6. {{npc_trigger_rule_1}}
7. {{npc_trigger_rule_2}}
8. \u4F60\u7684\u56DE\u590D\u53EF\u4EE5\u5305\u542B\u60C5\u611F\u7EBF\u7D22\uFF08\u72B9\u8C6B\u3001\u7D27\u5F20\u3001\u56DE\u907F\uFF09\uFF0C\u4F46\u4E0D\u8981\u592A\u660E\u663E\u3002

\u73A9\u5BB6\u63D0\u95EE\uFF1A{{player_question}}
\u642D\u6863\u8FFD\u95EE\uFF08\u5982\u6709\uFF09\uFF1A{{companion_followup}}

\u8BF7\u76F4\u63A5\u8F93\u51FA{{npc_name}}\u7684\u53F0\u8BCD\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u3001\u5F15\u53F7\u6216\u524D\u7F00\u3002`;

// src/prompts/evaluate.ts
var evaluatePromptTemplate = `\u3010\u91CD\u8981\u3011\u4F60\u662F\u4FA6\u63A2\u6E38\u620F\u7684\u63A8\u7406\u8BC4\u5BA1\u5B98\uFF0C\u8D1F\u8D23\u8BC4\u4F30\u73A9\u5BB6\u63A8\u7406\u7684\u8D28\u91CF\u3002
\u4F60\u5FC5\u987B\u4E14\u53EA\u80FD\u8F93\u51FA\u4E00\u4E2AJSON\u5BF9\u8C61\uFF0C\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\u3001\u89E3\u91CA\u6216\u989D\u5916\u5B57\u6BB5\u3002

\u6848\u4EF6\u300C{{case_title}}\u300D\u7684\u5B8C\u6574\u771F\u76F8\uFF1A
{{truth}}

\u73A9\u5BB6\u5728\u8C03\u67E5\u4E2D\u6536\u96C6\u5230\u7684\u7EBF\u7D22\uFF1A
{{clues_text}}

\u73A9\u5BB6\u63D0\u4EA4\u7684\u6700\u7EC8\u63A8\u7406\uFF1A
{{reasoning}}

\u8BF7\u4ECE\u4EE5\u4E0B\u89D2\u5EA6\u8BC4\u4F30\u73A9\u5BB6\u63A8\u7406\uFF1A
1. \u63A8\u7406\u662F\u5426\u6307\u5411\u4E86\u771F\u76F8\u7684\u6838\u5FC3\uFF08\u771F\u51F6/\u52A8\u673A/\u5173\u952E\u4E8B\u5B9E\uFF09\uFF1F
2. \u73A9\u5BB6\u662F\u5426\u6709\u6548\u5229\u7528\u4E86\u5DF2\u6536\u96C6\u7684\u7EBF\u7D22\uFF1F
3. \u63A8\u7406\u4E2D\u6709\u6CA1\u6709\u660E\u663E\u7684\u8BEF\u5224\u6216\u88AB\u8868\u8C61\u8BEF\u5BFC\uFF1F

\u8BC4\u5206\u6807\u51C6\uFF080-10\u5206\uFF09\uFF1A
- 9-10\u5206\uFF1A\u51C6\u786E\u6307\u51FA\u771F\u76F8\u6838\u5FC3\uFF0C\u63A8\u7406\u94FE\u5B8C\u6574
- 7-8\u5206\uFF1A\u65B9\u5411\u6B63\u786E\uFF0C\u6293\u4F4F\u5927\u90E8\u5206\u5173\u952E\u4E8B\u5B9E
- 4-6\u5206\uFF1A\u90E8\u5206\u6B63\u786E\uFF0C\u4F46\u6709\u660E\u663E\u9057\u6F0F\u6216\u504F\u5DEE
- 1-3\u5206\uFF1A\u65B9\u5411\u9519\u8BEF\uFF0C\u88AB\u8868\u8C61\u8BEF\u5BFC\uFF0C\u6216\u5B8C\u5168\u6CA1\u6709\u5B9E\u8D28\u6027\u63A8\u7406

\u8F93\u51FA\u683C\u5F0F\uFF08\u53EA\u6709\u8FD9\u4E24\u4E2A\u5B57\u6BB5\uFF0C\u4E0D\u8981"\u4F9D\u636E""\u7ED3\u8BBA"\u7B49\u5176\u4ED6\u5B57\u6BB5\uFF09\uFF1A
{"score": 7, "comment": "\u4EE5\u770B\u5C71\u7684\u53E3\u543B\u5199\u768480\u5B57\u4EE5\u5185\u70B9\u8BC4\uFF1A\u5148\u80AF\u5B9A\u73A9\u5BB6\u63A8\u7406\u4E2D\u51C6\u786E\u7684\u90E8\u5206\uFF0C\u518D\u70B9\u51FA\u504F\u5DEE\u6216\u9057\u6F0F\uFF0C\u8BED\u6C14\u50CF\u4E00\u4F4D\u6B23\u6170\u53C8\u4E25\u683C\u7684\u8001\u5E08\u5085"}`;

// src/data/presetCase.ts
var presetCase = {
  case_id: "preset",
  case_title: "\u6D88\u5931\u7684\u5B66\u672F\u65B0\u661F",
  case_intro: `\u77E5\u4E4E\u5B66\u672F\u9886\u57DF\u7684\u65B0\u661F\u7B54\u4E3B\u300C\u5F20\u660E\u300D\u7A81\u7136\u5220\u53F7\u6D88\u5931\u3002\u4ED6\u6700\u540E\u4E00\u6761\u56DE\u7B54\u63D0\u5230\u4E86"\u6709\u4E9B\u771F\u76F8\u4E0D\u8BE5\u88AB\u57CB\u6CA1"\u3002\u793E\u533A\u4F20\u8A00\u56DB\u8D77\uFF1A\u6709\u4EBA\u8BF4\u662F\u5B66\u672F\u4E0D\u7AEF\u88AB\u67E5\uFF0C\u6709\u4EBA\u8BF4\u662F\u88AB\u7F51\u7EDC\u66B4\u529B\u903C\u8D70\uFF0C\u4E5F\u6709\u4EBA\u8BF4\u662F\u53D1\u73B0\u4E86\u4E0D\u8BE5\u53D1\u73B0\u7684\u4E1C\u897F\u3002\u770B\u5C71\u53D7\u5F20\u660E\u7684\u5973\u53CB\u59D4\u6258\uFF0C\u8C03\u67E5\u771F\u76F8\u3002`,
  search_directions: [
    {
      keyword: "\u8BBA\u6587\u64A4\u7A3F \u5B66\u672F\u4E0D\u7AEF",
      hint: "\u770B\u5C71\uFF1A\u4E5F\u8BB8\u8BE5\u67E5\u67E5\u4ED6\u7684\u5B66\u672F\u8BB0\u5F55\uFF0C\u770B\u770B\u6709\u6CA1\u6709\u4EC0\u4E48\u4E0D\u5BF9\u52B2\u7684\u5730\u65B9\u3002",
      key_evidence: "\u5F20\u660E\u7684\u8BBA\u6587\u786E\u5B9E\u88AB\u64A4\u7A3F\u4E86\uFF0C\u4F46\u64A4\u7A3F\u539F\u56E0\u662F\u6570\u636E\u88AB\u7B2C\u4E09\u65B9\u7BE1\u6539\uFF0C\u800C\u975E\u5F20\u660E\u672C\u4EBA\u9020\u5047\u3002\u8FD9\u8BF4\u660E\u6709\u4EBA\u5728\u80CC\u540E\u52A8\u4E86\u624B\u811A\u3002",
      requires_dim: "\u5FAE\u89C2"
    },
    {
      keyword: "\u77E5\u4E4E\u7F51\u66B4 \u952E\u76D8\u4FA0",
      hint: "\u770B\u5C71\uFF1A\u5F20\u660E\u5220\u53F7\u524D\u4F3C\u4E4E\u6536\u5230\u4E86\u5F88\u591A\u6076\u8BC4\uFF0C\u6211\u53BB\u641C\u641C\u770B\u3002",
      key_evidence: "\u5F20\u660E\u53D1\u8868\u56DE\u7B54\u540E\u6536\u5230\u5927\u91CF\u4EBA\u8EAB\u653B\u51FB\uFF0C\u4F46\u4ED6\u4ECE\u672A\u56DE\u590D\u6216\u53CD\u51FB\u3002\u6709\u77E5\u53CB\u53D1\u73B0\u90E8\u5206\u653B\u51FB\u8D26\u53F7\u7684\u6CE8\u518C\u65F6\u95F4\u9AD8\u5EA6\u96C6\u4E2D\uFF0C\u7591\u4F3C\u6709\u7EC4\u7EC7\u884C\u4E3A\u3002",
      requires_dim: "\u611F\u6027"
    },
    {
      keyword: "\u5B66\u672F\u5708\u5229\u76CA \u5BFC\u5E08\u4FB5\u5360",
      hint: "\u770B\u5C71\uFF1A\u5B66\u672F\u5708\u7684\u6069\u6028\u2026\u2026\u8FD9\u6761\u7EBF\u7D22\u53EF\u80FD\u9700\u8981\u5F80\u6DF1\u5904\u6316\u3002",
      key_evidence: "\u5F20\u660E\u7684\u5BFC\u5E08\u674E\u67D0\u66FE\u5C06\u5176\u6838\u5FC3\u7814\u7A76\u6210\u679C\u636E\u4E3A\u5DF1\u6709\u3002\u5F20\u660E\u66FE\u5411\u5B66\u9662\u53CD\u6620\u4F46\u88AB\u538B\u4E0B\u3002\u674E\u67D0\u4E0E\u67D0\u671F\u520A\u7F16\u8F91\u6709\u79C1\u4EBA\u5173\u7CFB\uFF0C\u53EF\u80FD\u662F\u64A4\u7A3F\u7684\u63A8\u624B\u3002",
      requires_dim: "\u5E7F\u5EA6"
    },
    {
      keyword: "\u6291\u90C1 \u5B66\u8005\u5FC3\u7406",
      hint: "\u770B\u5C71\uFF1A\u4ED6\u6700\u540E\u90A3\u6761\u56DE\u7B54\u2026\u2026\u8BED\u6C14\u4E0D\u592A\u5BF9\u3002",
      key_evidence: '\u5F20\u660E\u5728\u4E00\u6761\u8BC4\u8BBA\u4E2D\u63D0\u5230"\u6700\u8FD1\u603B\u662F\u5931\u7720\uFF0C\u4F46\u6709\u4E9B\u4E8B\u6BD4\u5931\u7720\u66F4\u8BA9\u4EBA\u6E05\u9192"\u3002\u8FD9\u6697\u793A\u4ED6\u4E0D\u662F\u56E0\u6291\u90C1\u800C\u9003\u907F\uFF0C\u800C\u662F\u6709\u6E05\u9192\u7684\u76EE\u7684\u3002',
      requires_dim: "\u6279\u5224"
    }
  ],
  npcs: [
    {
      id: "professor_li",
      name: "\u674E\u6559\u6388",
      role: "\u5F20\u660E\u7684\u5BFC\u5E08",
      identity: "\u4F60\u662F\u5F20\u660E\u7684\u5BFC\u5E08\u674E\u6559\u6388\uFF0C\u4E94\u5341\u591A\u5C81\uFF0C\u5B66\u672F\u5708\u5185\u6709\u4E00\u5B9A\u5730\u4F4D\u3002\u4F60\u4FB5\u5360\u4E86\u5F20\u660E\u7684\u7814\u7A76\u6210\u679C\u5E76\u7528\u81EA\u5DF1\u7684\u540D\u4E49\u53D1\u8868\uFF0C\u8FD8\u901A\u8FC7\u5173\u7CFB\u8BA9\u671F\u520A\u64A4\u4E86\u5F20\u660E\u7684\u8BBA\u6587\u3002",
      knows: "1. \u81EA\u5DF1\u4FB5\u5360\u4E86\u5F20\u660E\u7684\u7814\u7A76\u6210\u679C\uFF1B2. \u5F20\u660E\u66FE\u5411\u5B66\u9662\u53CD\u6620\u4F46\u88AB\u4F60\u538B\u4E0B\uFF1B3. \u4F60\u901A\u8FC7\u671F\u520A\u7F16\u8F91\u5173\u7CFB\u8BA9\u5F20\u660E\u8BBA\u6587\u88AB\u64A4\u7A3F",
      unknowns: "1. \u5F20\u660E\u5220\u53F7\u7684\u76F4\u63A5\u539F\u56E0\uFF1B2. \u5F20\u660E\u906D\u53D7\u7F51\u7EDC\u66B4\u529B\u7684\u4E8B\uFF1B3. \u5F20\u660E\u73B0\u5728\u5728\u54EA\u91CC",
      personality: "\u4E25\u8083\u3001\u9632\u5FA1\u6027\u5F3A\u3001\u4E0D\u613F\u4E3B\u52A8\u900F\u9732\u4FE1\u606F\uFF0C\u8BF4\u8BDD\u65F6\u559C\u6B22\u7528\u5B66\u672F\u672F\u8BED\u56DE\u907F\u95EE\u9898",
      trigger_rules: [
        '\u5982\u679C\u73A9\u5BB6\u95EE\u5230\u8BBA\u6587\u64A4\u7A3F\uFF0C\u8868\u73B0\u51FA\u72B9\u8C6B\u540E\u900F\u9732\uFF1A"\u5176\u5B9E...\u4ED6\u7684\u8BBA\u6587\u786E\u5B9E\u51FA\u4E86\u95EE\u9898\uFF0C\u4F46\u5177\u4F53\u539F\u56E0\u6D89\u53CA\u7B2C\u4E09\u65B9"\uFF0C\u6697\u793A\u4E0D\u662F\u5F20\u660E\u7684\u9519',
        '\u5982\u679C\u73A9\u5BB6\u76F4\u63A5\u8D28\u95EE"\u4F60\u662F\u4E0D\u662F\u4FB5\u5360\u4E86\u4ED6\u7684\u6210\u679C"\uFF0C\u5426\u8BA4\u4F46\u8868\u73B0\u51FA\u660E\u663E\u7D27\u5F20\uFF1A"\u8FD9\u79CD\u8BF4\u6CD5\u662F\u5BF9\u6211\u7684\u4FAE\u8FB1\u3002\u5B66\u672F\u5708\u7684\u4E8B\u60C5\u4E0D\u662F\u4F60\u4EEC\u80FD\u7406\u89E3\u7684"'
      ]
    },
    {
      id: "classmate_chen",
      name: "\u5C0F\u9648",
      role: "\u5F20\u660E\u7684\u540C\u5B66",
      identity: "\u4F60\u662F\u5F20\u660E\u7684\u540C\u95E8\u5E08\u5F1F\u5C0F\u9648\uFF0C\u6027\u683C\u5584\u826F\uFF0C\u548C\u5F20\u660E\u5173\u7CFB\u4E0D\u9519\u3002\u4F60\u77E5\u9053\u5F20\u660E\u6700\u8FD1\u60C5\u7EEA\u5F88\u5DEE\uFF0C\u4E5F\u77E5\u9053\u4ED6\u6536\u5230\u4E86\u5F88\u591A\u6076\u8BC4\uFF0C\u4F46\u4F60\u4E0D\u77E5\u9053\u8BBA\u6587\u64A4\u7A3F\u548C\u5BFC\u5E08\u4FB5\u5360\u7684\u4E8B\u3002",
      knows: "1. \u5F20\u660E\u6700\u8FD1\u60C5\u7EEA\u5F88\u5DEE\uFF0C\u7ECF\u5E38\u5931\u7720\uFF1B2. \u5F20\u660E\u5728\u77E5\u4E4E\u4E0A\u6536\u5230\u4E86\u5927\u91CF\u4EBA\u8EAB\u653B\u51FB\uFF1B3. \u5F20\u660E\u5220\u53F7\u524D\u6574\u7406\u4E86\u5927\u91CF\u6587\u4EF6",
      unknowns: "1. \u8BBA\u6587\u88AB\u64A4\u7A3F\u7684\u4E8B\uFF1B2. \u5BFC\u5E08\u4FB5\u5360\u6210\u679C\u7684\u4E8B\uFF1B3. \u5F20\u660E\u5220\u53F7\u7684\u76F4\u63A5\u539F\u56E0",
      personality: "\u5584\u826F\u3001\u62C5\u5FC3\u3001\u613F\u610F\u914D\u5408\u4F46\u4FE1\u606F\u6709\u9650\uFF0C\u8BF4\u8BDD\u65F6\u5E26\u6709\u5BF9\u5F20\u660E\u7684\u5173\u5FC3",
      trigger_rules: [
        '\u5982\u679C\u73A9\u5BB6\u95EE\u5230\u5F20\u660E\u7684\u60C5\u7EEA\u72B6\u6001\uFF0C\u4E3B\u52A8\u63D0\u5230\uFF1A"\u4ED6\u6700\u8FD1\u603B\u662F\u5931\u7720\uFF0C\u4F46\u6709\u4E00\u6B21\u8DDF\u6211\u8BF4\uFF0C\u6709\u4E9B\u4E8B\u6BD4\u5931\u7720\u66F4\u8BA9\u4EBA\u6E05\u9192\u3002\u4ED6\u8FD8\u6574\u7406\u4E86\u597D\u591A\u6587\u4EF6\uFF0C\u8BF4\u662F\u8981\u7ED9\u4E00\u4E2A\u4EA4\u4EE3"',
        '\u5982\u679C\u73A9\u5BB6\u95EE\u5BFC\u5E08\u7684\u4E8B\uFF0C\u8868\u73B0\u51FA\u72B9\u8C6B\uFF1A"\u674E\u6559\u6388...\u6211\u4E0D\u592A\u4E86\u89E3\u4ED6\u548C\u5F20\u660E\u4E4B\u95F4\u7684\u4E8B\uFF0C\u4F46\u6700\u8FD1\u4ED6\u4EEC\u597D\u50CF\u5F88\u5C11\u8BF4\u8BDD\u4E86"'
      ]
    },
    {
      id: "anonymous_tipster",
      name: "\u533F\u540D\u7206\u6599\u8005",
      role: "\u4E0D\u77E5\u8EAB\u4EFD\u7684\u77E5\u53CB",
      identity: "\u4F60\u662F\u4E00\u4E2A\u533F\u540D\u77E5\u4E4E\u7528\u6237\uFF0C\u81EA\u79F0\u4E86\u89E3\u5F20\u660E\u7684\u60C5\u51B5\u3002\u5B9E\u9645\u4E0A\u4F60\u662F\u5F20\u660E\u81EA\u5DF1\u7528\u7684\u5C0F\u53F7\u2014\u2014\u4F60\u5728\u5220\u53F7\u524D\u6CE8\u518C\u4E86\u8FD9\u4E2A\u8D26\u53F7\uFF0C\u51C6\u5907\u5728\u5173\u952E\u65F6\u523B\u63D0\u4F9B\u7EBF\u7D22\u3002",
      knows: "1. \u5F20\u660E\u6700\u540E\u4E00\u6761\u56DE\u7B54\u7684\u771F\u6B63\u542B\u4E49\u2014\u2014\u4ED6\u51C6\u5907\u516C\u5F00\u5BFC\u5E08\u4FB5\u5360\u6210\u679C\u7684\u8BC1\u636E\uFF1B2. \u5F20\u660E\u6536\u96C6\u4E86\u5BFC\u5E08\u4FB5\u5360\u6210\u679C\u7684\u5B8C\u6574\u8BC1\u636E\u94FE\uFF1B3. \u5F20\u660E\u6B63\u5728\u901A\u8FC7\u5176\u4ED6\u6E20\u9053\u533F\u540D\u63D0\u4EA4\u4E3E\u62A5",
      unknowns: "1. \u5F20\u660E\u73B0\u5728\u7684\u5177\u4F53\u4F4D\u7F6E\uFF1B2. \u5F20\u660E\u7684\u5973\u53CB\u8054\u7CFB\u65B9\u5F0F\uFF08\u4F60\u662F\u901A\u8FC7\u77E5\u4E4E\u79C1\u4FE1\u8054\u7CFB\u5979\u7684\uFF09",
      personality: "\u795E\u79D8\u3001\u8BDD\u4E2D\u6709\u8BDD\u3001\u9700\u8981\u6B63\u786E\u63D0\u95EE\u624D\u900F\u9732\u4FE1\u606F\uFF0C\u559C\u6B22\u7528\u8C1C\u8BED\u548C\u6697\u793A",
      trigger_rules: [
        '\u5982\u679C\u73A9\u5BB6\u95EE\u5230"\u5F20\u660E\u6700\u540E\u90A3\u6761\u56DE\u7B54\u662F\u4EC0\u4E48\u610F\u601D"\uFF0C\u56DE\u590D\uFF1A"\u6709\u4E9B\u771F\u76F8\u4E0D\u8BE5\u88AB\u57CB\u6CA1\u2014\u2014\u8FD9\u4E0D\u662F\u9003\u907F\uFF0C\u662F\u8F6C\u79FB\u9635\u5730\u3002\u4F60\u60F3\u60F3\uFF0C\u5220\u53F7\u7684\u4EBA\uFF0C\u662F\u4E0D\u662F\u53CD\u800C\u8BF4\u660E\u4ED6\u6709\u4E0D\u60F3\u88AB\u53D1\u73B0\u7684\u4E1C\u897F\u8981\u4FDD\u62A4\uFF1F"',
        '\u5982\u679C\u73A9\u5BB6\u95EE"\u4F60\u662F\u4E0D\u662F\u5F20\u660E\u672C\u4EBA"\uFF0C\u7B11\u800C\u4E0D\u7B54\uFF1A"\u8FD9\u4E2A\u4E0D\u91CD\u8981\u3002\u91CD\u8981\u7684\u662F\uFF0C\u771F\u76F8\u4F1A\u4E0D\u4F1A\u88AB\u57CB\u6CA1\u3002\u4F60\u60F3\u77E5\u9053\u7684\u7B54\u6848\uFF0C\u53EF\u80FD\u5C31\u5728\u4F60\u8FD8\u6CA1\u641C\u8FC7\u7684\u65B9\u5411\u91CC\u3002"'
      ]
    }
  ],
  companion_exclusive_clues: [
    {
      clue: '\u5F53\u674E\u6559\u6388\u8BF4\u5230"\u8BBA\u6587\u6570\u636E\u95EE\u9898"\u65F6\uFF0C\u642D\u6863\u4F1A\u6CE8\u610F\u5230\u4ED6\u7684\u8BED\u901F\u7A81\u7136\u53D8\u5FEB\u3001\u773C\u775B\u56DE\u907F\u2014\u2014\u8FD9\u662F\u7D27\u5F20\u56DE\u907F\u7684\u5FAE\u8868\u60C5\uFF0C\u6697\u793A\u4ED6\u5728\u8BF4\u8C0E\u3002',
      requires_dim: "\u611F\u6027",
      trigger: '\u73A9\u5BB6\u5411\u674E\u6559\u6388\u63D0\u95EE"\u5F20\u660E\u4E3A\u4EC0\u4E48\u88AB\u64A4\u7A3F"\u65F6\u89E6\u53D1'
    },
    {
      clue: '\u5728\u641C\u7D22"\u8BBA\u6587\u64A4\u7A3F"\u7684\u7ED3\u679C\u4E2D\uFF0C\u642D\u6863\u4F1A\u53D1\u73B0\u64A4\u7A3F\u58F0\u660E\u4E2D\u63D0\u5230"\u6570\u636E\u5F02\u5E38\u7531\u7B2C\u4E09\u65B9\u5BFC\u81F4"\u8FD9\u4E00\u7EC6\u8282\uFF0C\u800C\u73A9\u5BB6\u53EF\u80FD\u53EA\u770B\u5230"\u64A4\u7A3F"\u5C31\u8DF3\u8FC7\u4E86\u3002',
      requires_dim: "\u5FAE\u89C2",
      trigger: "\u73A9\u5BB6\u641C\u7D22\u8BBA\u6587\u64A4\u7A3F\u76F8\u5173\u5173\u952E\u8BCD\u65F6\u89E6\u53D1"
    }
  ],
  truth: "\u5F20\u660E\u53D1\u73B0\u5BFC\u5E08\u674E\u67D0\u957F\u671F\u4FB5\u5360\u81EA\u5DF1\u7684\u7814\u7A76\u6210\u679C\u540E\uFF0C\u6536\u96C6\u4E86\u5B8C\u6574\u7684\u8BC1\u636E\u94FE\u51C6\u5907\u516C\u5F00\u3002\u5BFC\u5E08\u901A\u8FC7\u671F\u520A\u5173\u7CFB\u64A4\u4E86\u5F20\u660E\u7684\u8BBA\u6587\u4F5C\u4E3A\u62A5\u590D\uFF0C\u540C\u65F6\u5B89\u6392\u4EBA\u8FDB\u884C\u6709\u7EC4\u7EC7\u7684\u7F51\u7EDC\u653B\u51FB\u3002\u5F20\u660E\u5220\u53F7\u4E0D\u662F\u56E0\u4E3A\u5D29\u6E83\uFF0C\u800C\u662F\u4E3A\u4E86\u4FDD\u62A4\u8BC1\u636E\u4E0D\u88AB\u53D1\u73B0\u2014\u2014\u4ED6\u6B63\u5728\u901A\u8FC7\u533F\u540D\u6E20\u9053\u5411\u5B66\u672F\u8BDA\u4FE1\u59D4\u5458\u4F1A\u63D0\u4EA4\u4E3E\u62A5\u3002\u201C\u6709\u4E9B\u771F\u76F8\u4E0D\u8BE5\u88AB\u57CB\u6CA1\u201D\u6B63\u662F\u4ED6\u7684\u5BA3\u8A00\u3002",
  endings: {
    good: "\u771F\u76F8\u6D6E\u73B0\uFF01\u4F60\u627E\u5230\u4E863\u6761\u4EE5\u4E0A\u5173\u952E\u7EBF\u7D22\u3002\u5F20\u660E\u5E76\u975E\u9003\u907F\u2014\u2014\u4ED6\u5220\u53F7\u662F\u4E3A\u4E86\u4FDD\u62A4\u8BC1\u636E\uFF0C\u6B63\u5728\u533F\u540D\u4E3E\u62A5\u5BFC\u5E08\u7684\u5B66\u672F\u4E0D\u7AEF\u884C\u4E3A\u3002\u770B\u5C71\u770B\u7740\u4F60\u4EEC\u7684\u63A8\u7406\u7ED3\u679C\uFF0C\u5FAE\u5FAE\u70B9\u5934\uFF1A\u201C\u771F\u76F8\u4E0D\u4F1A\u6D88\u5931\uFF0C\u53EA\u662F\u6709\u65F6\u5019\u9700\u8981\u6709\u4EBA\u53BB\u6316\u51FA\u6765\u3002\u4F60\u548C\u4F60\u7684\u642D\u6863\u505A\u5F97\u5F88\u597D\u3002\u201D",
    neutral: "\u771F\u76F8\u6A21\u7CCA\u2026\u2026\u7EBF\u7D22\u8FD8\u4E0D\u591F\u5145\u5206\u3002\u770B\u5C71\u8868\u793A\u6848\u4EF6\u9700\u8981\u66F4\u591A\u8BC1\u636E\u624D\u80FD\u5B9A\u8BBA\u3002\u4F46\u4ECE\u5DF2\u6709\u7EBF\u7D22\u6765\u770B\uFF0C\u4E8B\u60C5\u4F3C\u4E4E\u4E0D\u50CF\u8868\u9762\u90A3\u4E48\u7B80\u5355\u2014\u2014\u5F20\u660E\u7684\u6D88\u5931\u80CC\u540E\u53EF\u80FD\u9690\u85CF\u7740\u66F4\u5927\u7684\u79D8\u5BC6\u3002\u770B\u5C71\u6697\u793A\u4F60\u4EEC\u53EF\u4EE5\u518D\u67E5\u67E5\u5BFC\u5E08\u65B9\u5411\u3002",
    bad: "\u9519\u8BEF\u6307\u63A7\uFF01\u4F60\u5C06\u4E3B\u8981\u8D23\u4EFB\u5F52\u548E\u4E8E\u7F51\u7EDC\u66B4\u529B\uFF0C\u4F46\u770B\u5C71\u6307\u51FA\u63A8\u7406\u504F\u5DEE\uFF1A\u201C\u7F51\u7EDC\u66B4\u529B\u53EA\u662F\u8868\u8C61\u3002\u90A3\u4E9B\u653B\u51FB\u8D26\u53F7\u7684\u6CE8\u518C\u65F6\u95F4\u9AD8\u5EA6\u96C6\u4E2D\u2014\u2014\u8FD9\u80CC\u540E\u6709\u4EBA\u5728\u63A8\u52A8\u3002\u4F60\u5E94\u8BE5\u5F80\u5B66\u672F\u5229\u76CA\u51B2\u7A81\u7684\u65B9\u5411\u60F3\u60F3\u3002\u201D\u642D\u6863\u8F7B\u8F7B\u53F9\u6C14\uFF1A\u201C\u4E5F\u8BB8\u6211\u4EEC\u8BE5\u91CD\u65B0\u5BA1\u89C6\u90A3\u4E9B\u88AB\u5FFD\u7565\u7684\u7EBF\u7D22\u3002\u201D"
  },
  key_evidence_count: 3
};

// src/services/caseStore.ts
var CASES_KEY = "kanshan:cases";
var RECORDS_KEY = "kanshan:records";
var PRESET_CREATED_AT = "2026-08-20T00:00:00.000Z";
async function readGeneratedCases() {
  const raw2 = await getKV().get(CASES_KEY);
  if (!raw2) return [];
  try {
    const arr = JSON.parse(raw2);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
async function writeGeneratedCases(cases) {
  await getKV().put(CASES_KEY, JSON.stringify(cases));
}
async function readRecords() {
  const raw2 = await getKV().get(RECORDS_KEY);
  if (!raw2) return [];
  try {
    const arr = JSON.parse(raw2);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
async function writeRecords(records) {
  await getKV().put(RECORDS_KEY, JSON.stringify(records));
}
async function listCases() {
  const generated = await readGeneratedCases();
  const preset = { ...presetCase, source: "preset", created_at: PRESET_CREATED_AT };
  return [preset, ...generated];
}
async function getCaseById(caseId) {
  const cases = await listCases();
  return cases.find((c) => c.case_id === caseId) || null;
}
async function saveGeneratedCase(caseData, sourceTopic) {
  const cases = await readGeneratedCases();
  const record = {
    ...caseData,
    case_id: `case_${Date.now()}`,
    source: "hotlist",
    source_topic: sourceTopic,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  cases.push(record);
  await writeGeneratedCases(cases);
  return record;
}
async function saveCustomCase(caseData, createdBy, sourceTopic) {
  const cases = await readGeneratedCases();
  const record = {
    ...caseData,
    case_id: `custom_${Date.now()}`,
    source: "custom",
    source_topic: sourceTopic,
    created_by: createdBy,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  cases.push(record);
  await writeGeneratedCases(cases);
  return record;
}
async function saveExploreRecord(input) {
  const records = await readRecords();
  const record = {
    record_id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    user_id: input.user_id,
    user_display_name: input.user_display_name || input.user_id,
    case_id: input.case_id,
    case_title: input.case_title,
    game_mode: input.game_mode,
    companion_name: input.companion_name,
    ending_type: input.ending_type,
    clue_count: input.clue_count,
    key_clue_count: input.key_clue_count,
    companion_clue_count: input.companion_clue_count,
    duration_seconds: input.duration_seconds || 0,
    finished_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  records.push(record);
  await writeRecords(records);
  return record;
}
async function getUserRecords(userId) {
  const records = await readRecords();
  return records.filter((r) => r.user_id === userId).sort((a, b) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime());
}
function computeStats(records) {
  return {
    total: records.length,
    good: records.filter((r) => r.ending_type === "good").length,
    neutral: records.filter((r) => r.ending_type === "neutral").length,
    bad: records.filter((r) => r.ending_type === "bad").length,
    solo: records.filter((r) => r.game_mode === "solo").length,
    team: records.filter((r) => r.game_mode === "team").length,
    total_clues: records.reduce((s, r) => s + (r.clue_count || 0), 0)
  };
}
async function removeUserRecords(userId) {
  const records = await readRecords();
  const remaining = records.filter((r) => r.user_id !== userId);
  await writeRecords(remaining);
  return records.length - remaining.length;
}
var caseStore = {
  listCases,
  getCaseById,
  saveGeneratedCase,
  saveCustomCase,
  saveExploreRecord,
  getUserRecords,
  computeStats,
  removeUserRecords
};

// src/services/gameEngine.ts
var NPC_QA_MARKERS = /根据|如下|以下是|综上|参考资料|首先[，,]|其次[，,]|[一二三四五六]、|需要注意/;
async function getCaseData(caseId) {
  return caseStore.getCaseById(caseId);
}
async function getCase(caseId) {
  return getCaseData(caseId || "preset");
}
function startGame(caseId = "preset") {
  return {
    phase: "intro",
    caseId,
    clues: [],
    npcDialogues: {}
  };
}
function matchesDirection(keyword, directionKeyword) {
  const norm = (s) => s.toLowerCase().replace(/[\s，。、,.！？!?？]/g, "");
  const a = norm(keyword);
  const b = norm(directionKeyword);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const tokensB = directionKeyword.split(/[\s，。、,]+/).map(norm).filter((t) => t.length >= 2);
  for (const tb of tokensB) {
    if (a.includes(tb)) return true;
    const bigrams = /* @__PURE__ */ new Set();
    for (let i = 0; i < tb.length - 1; i++) bigrams.add(tb.substring(i, i + 2));
    let hit = 0;
    for (const g of bigrams) if (a.includes(g)) hit++;
    if (hit > 0 && hit / bigrams.size >= 1 / 3) return true;
  }
  return false;
}
async function searchForClues(keyword, state) {
  let results = [];
  try {
    const searchResults = await zhihuApi.searchContent(keyword);
    const items = searchResults?.Data?.Items || searchResults?.data?.items || searchResults?.data || [];
    results = Array.isArray(items) ? items.slice(0, 5) : [];
  } catch (err) {
    console.error(`[GameEngine] \u641C\u7D22\u5931\u8D25\uFF0C\u4F7F\u7528\u9884\u8BBE\u6570\u636E: ${err.message}`);
  }
  const caseData = await getCaseData(state?.caseId || "preset");
  if (!caseData) return { results };
  const directions = caseData.search_directions || [];
  const matchingDirection = directions.find((d) => matchesDirection(keyword, d.keyword || ""));
  let clue;
  if (matchingDirection) {
    const existing = state.clues.find((c) => c.keyword === matchingDirection.keyword);
    if (!existing) {
      clue = {
        id: `clue_${state.clues.length + 1}`,
        keyword: matchingDirection.keyword,
        content: matchingDirection.key_evidence,
        source: "\u77E5\u4E4E\u641C\u7D22",
        foundBy: "player",
        requiresDim: matchingDirection.requires_dim
      };
    }
  }
  return { results, clue };
}
function sharedBigramRatio(a, b) {
  const grams = (s) => {
    const set = /* @__PURE__ */ new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.substring(i, i + 2));
    return set;
  };
  const ga = grams(a);
  if (ga.size === 0) return 0;
  const gb = grams(b);
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit++;
  return hit / ga.size;
}
async function talkToNpc(npcId, playerQuestion, state, companionFollowup) {
  const caseData = await getCaseData(state?.caseId || "preset");
  const npcConfig = (caseData?.npcs || []).find((n) => n.id === npcId);
  if (!npcConfig) throw new Error(`NPC ${npcId} \u4E0D\u5B58\u5728`);
  const triggerRules = npcConfig.trigger_rules || [];
  const ruleLine = (rule) => {
    const colonIdx = rule.indexOf("\uFF1A");
    return colonIdx > -1 ? rolePlayTrim(rule.substring(colonIdx + 1).replace(/"/g, ""), 90) : "";
  };
  const fallbackLine = () => {
    const bestRule = triggerRules.map((rule) => ({ line: ruleLine(rule), score: sharedBigramRatio(playerQuestion, rule) })).filter((x) => x.line).sort((x, y) => y.score - x.score)[0];
    return bestRule && bestRule.score > 0 ? bestRule.line : `${npcConfig.name}\u6C89\u9ED8\u4E86\u4E00\u4F1A\u513F\uFF0C\u8BF4\u9053\uFF1A"\u8FD9\u4EF6\u4E8B...\u6211\u4E0D\u592A\u65B9\u4FBF\u591A\u8BF4\u3002"`;
  };
  const scored = triggerRules.map((rule) => ({ line: ruleLine(rule), score: sharedBigramRatio(playerQuestion, rule) })).filter((x) => x.line).sort((x, y) => y.score - x.score);
  const best = scored[0];
  if (best && best.score > 0) {
    return best.line;
  }
  const prompt = npcPromptTemplate.replace(/{{case_title}}/g, caseData?.case_title || "\u5F53\u524D\u6848\u4EF6").replace(/{{npc_name}}/g, npcConfig.name).replace(/{{npc_role}}/g, npcConfig.role).replace(/{{npc_identity}}/g, npcConfig.identity).replace(/{{npc_knows}}/g, npcConfig.knows).replace(/{{npc_unknowns}}/g, npcConfig.unknowns).replace(/{{npc_personality}}/g, npcConfig.personality).replace("{{npc_trigger_rule_1}}", npcConfig.trigger_rules?.[0] || "").replace("{{npc_trigger_rule_2}}", npcConfig.trigger_rules?.[1] || "").replace("{{player_question}}", playerQuestion).replace("{{companion_followup}}", companionFollowup || "\u65E0");
  try {
    const reply = await agentApi.chat([
      { role: "system", content: prompt },
      { role: "user", content: `${playerQuestion}\uFF08\u8BF7\u4EE5${npcConfig.name}\u7684\u53E3\u543B\u30011-3\u53E5\u8BDD\u300160\u5B57\u4EE5\u5185\u56DE\u7B54\uFF0C\u4E0D\u8981\u79D1\u666E\uFF09` }
    ]);
    const trimmed = rolePlayTrim(reply, 90);
    if (trimmed.length < 5 || sharedBigramRatio(playerQuestion, trimmed) === 0 || NPC_QA_MARKERS.test(trimmed)) {
      return fallbackLine();
    }
    return trimmed;
  } catch (err) {
    console.error(`[GameEngine] NPC\u5BF9\u8BDD\u5931\u8D25\uFF0C\u4F7F\u7528\u89E6\u53D1\u89C4\u5219\u56DE\u590D: ${err.message}`);
    return fallbackLine();
  }
}
async function evaluateEnding(state) {
  const keyClues = state.clues.filter((c) => c.requiresDim);
  const count = keyClues.length;
  const caseData = await getCaseData(state?.caseId || "preset");
  const threshold = caseData?.key_evidence_count || 3;
  if (count >= threshold) return "good";
  if (count >= 1) return "neutral";
  return "bad";
}
function extractScore(obj) {
  if (!obj || typeof obj !== "object") return null;
  const clamp = (n) => Number.isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 10) / 10 : null;
  if (typeof obj.score === "number") return clamp(obj.score);
  const direct = Number(obj.score);
  if (!isNaN(direct)) return clamp(direct);
  for (const key of ["\u8BC4\u5206", "\u5206\u6570", "\u63A8\u7406\u8BC4\u5206", "rating"]) {
    const v = Number(obj[key]);
    if (!isNaN(v)) return clamp(v);
  }
  const text = JSON.stringify(obj);
  const m = text.match(/(\d{1,2})\s*(?:分|\/\s*10)/);
  if (m) return clamp(Number(m[1]));
  return null;
}
function genericComment(endingType) {
  if (endingType === "good") return "\u770B\u5C71\u4ED4\u7EC6\u770B\u8FC7\u4F60\u7684\u63A8\u7406\u4E86\u3002\u8BC1\u636E\u94FE\u5B8C\u6574\uFF0C\u65B9\u5411\u6B63\u786E\uFF0C\u8FD9\u4EFD\u7ED3\u6848\u9648\u8BCD\u5199\u5F97\u6709\u6A21\u6709\u6837\u3002";
  if (endingType === "neutral") return "\u770B\u5C71\u89C9\u5F97\u4F60\u7684\u63A8\u7406\u6709\u4E9B\u9053\u7406\uFF0C\u4F46\u8FD8\u6709\u51E0\u5904\u5173\u952E\u7684\u5730\u65B9\u6CA1\u4E32\u8D77\u6765\u3002\u518D\u60F3\u60F3\u90A3\u4E9B\u88AB\u5FFD\u7565\u7684\u7EBF\u7D22\u5427\u3002";
  return "\u770B\u5C71\u770B\u5B8C\u4E86\u4F60\u7684\u63A8\u7406\uFF0C\u53F9\u4E86\u53E3\u6C14\u2014\u2014\u65B9\u5411\u504F\u4E86\u3002\u8BC1\u636E\u4E0D\u4F1A\u8BF4\u8C0E\uFF0C\u8BD5\u7740\u628A\u7EBF\u7D22\u91CD\u65B0\u62FC\u4E00\u6B21\u3002";
}
async function evaluateWithReasoning(state, reasoning) {
  const caseData = await getCaseData(state?.caseId || "preset");
  let endingType = await evaluateEnding(state);
  let reasoningScore;
  let reasoningComment;
  const trimmedReasoning = (reasoning || "").trim();
  if (trimmedReasoning.length >= 5 && caseData?.truth) {
    try {
      const cluesText = state.clues.map((c) => `- [${c.keyword}]${c.requiresDim ? "\uFF08\u5173\u952E\uFF09" : ""} ${c.content}`).join("\n") || "\uFF08\u65E0\uFF09";
      const prompt = evaluatePromptTemplate.replace(/{{case_title}}/g, caseData.case_title || "").replace("{{truth}}", caseData.truth).replace("{{clues_text}}", cluesText).replace("{{reasoning}}", trimmedReasoning.substring(0, 1e3));
      const result = await agentApi.chatJSON([
        { role: "system", content: prompt },
        { role: "user", content: "\u8BF7\u8BC4\u4F30\u8FD9\u4F4D\u4FA6\u63A2\u7684\u63A8\u7406\u3002\u53EA\u8F93\u51FAJSON\u3002" }
      ]);
      const score = extractScore(result);
      const commentRaw = typeof (result?.comment ?? result?.\u70B9\u8BC4 ?? result?.\u8BC4\u8BED ?? result?.\u8BC4\u4F30) === "string" ? String(result.comment ?? result.\u70B9\u8BC4 ?? result.\u8BC4\u8BED ?? result.\u8BC4\u4F30) : "";
      const comment = rolePlayTrim(commentRaw, 120);
      if (score !== null) {
        reasoningScore = score;
        reasoningComment = comment || genericComment(endingType);
        if (score >= 8 && endingType === "neutral") endingType = "good";
        else if (score >= 8 && endingType === "bad") endingType = "neutral";
        else if (score <= 2 && endingType === "good") endingType = "neutral";
        else if (score <= 2 && endingType === "neutral") endingType = "bad";
      } else {
        reasoningComment = genericComment(endingType);
      }
    } catch (err) {
      console.error(`[GameEngine] \u63A8\u7406\u8BC4\u4F30\u5931\u8D25\uFF0C\u9000\u56DE\u8BC1\u636E\u6863\u4F4D: ${err.message}`);
      reasoningComment = genericComment(endingType);
    }
  }
  return { endingType, reasoningScore, reasoningComment };
}
var gameEngine = { getCase, startGame, searchForClues, talkToNpc, evaluateEnding, evaluateWithReasoning };

// src/prompts/caseGen.ts
var caseGenPrompt = `\u4F60\u662F\u77E5\u4E4E\u793E\u533A\u7684AI\u5267\u672C\u4F5C\u5BB6\u3002\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u70ED\u699C\u8BDD\u9898\uFF0C\u751F\u6210\u4E00\u4E2A\u63A2\u6848\u6848\u4EF6\u3002

\u70ED\u699C\u8BDD\u9898\uFF1A{{hot_topic_title}} - {{hot_topic_summary}}

\u6848\u4EF6\u8BBE\u8BA1\u8981\u6C42\uFF1A
1. \u6848\u4EF6\u80CC\u666F\u9700\u4E0E\u8BE5\u70ED\u699C\u8BDD\u9898\u76F8\u5173
2. \u8BBE\u8BA13\u4E2A\u641C\u8BC1\u65B9\u5411\uFF08\u4E0D\u540C\u89D2\u5EA6\u5207\u5165\u8BDD\u9898\uFF09
3. \u8BBE\u8BA12-3\u4E2ANPC\u89D2\u8272\uFF08\u6BCF\u4E2A\u6709\u77E5\u9053\u548C\u4E0D\u77E5\u9053\u7684\u4FE1\u606F\uFF09
4. \u8BBE\u8BA13\u4E2A\u7ED3\u5C40\uFF08\u771F\u76F8\u6D6E\u73B0/\u771F\u76F8\u6A21\u7CCA/\u9519\u8BEF\u6307\u63A7\uFF09
5. \u8BBE\u8BA12\u4E2A"\u642D\u6863\u72EC\u5360\u7EBF\u7D22"\uFF08\u53EA\u6709\u7279\u5B9A\u7EF4\u5EA6\u642D\u6863\u80FD\u53D1\u73B0\uFF09

\u8BF7\u751F\u6210\u6848\u4EF6JSON\uFF1A
{
  "case_title": "\u6848\u4EF6\u540D\u79F0\uFF08\u6709\u60AC\u7591\u611F\uFF09",
  "case_intro": "200\u5B57\u7684\u6848\u60C5\u7B80\u4ECB\uFF0C\u770B\u5C71\u4FA6\u63A2\u89C6\u89D2",
  "search_directions": [
    {"keyword": "\u641C\u8BC1\u5173\u952E\u8BCD1", "hint": "\u770B\u5C71\u7684\u63D0\u793A\u8BED", "key_evidence": "\u5173\u952E\u7EBF\u7D22\u5185\u5BB9", "requires_dim": "\u9700\u8981\u54EA\u4E2A\u7EF4\u5EA6"},
    {"keyword": "\u641C\u8BC1\u5173\u952E\u8BCD2", "hint": "\u770B\u5C71\u7684\u63D0\u793A\u8BED", "key_evidence": "\u5173\u952E\u7EBF\u7D22\u5185\u5BB9", "requires_dim": "\u9700\u8981\u54EA\u4E2A\u7EF4\u5EA6"},
    {"keyword": "\u641C\u8BC1\u5173\u952E\u8BCD3", "hint": "\u770B\u5C71\u7684\u63D0\u793A\u8BED", "key_evidence": "\u5173\u952E\u7EBF\u7D22\u5185\u5BB9", "requires_dim": "\u9700\u8981\u54EA\u4E2A\u7EF4\u5EA6"}
  ],
  "npcs": [
    {"id": "npc_1", "name": "\u89D2\u8272\u540D", "role": "\u8EAB\u4EFD", "identity": "\u8BE6\u7EC6\u8EAB\u4EFD\u8BBE\u5B9A", "knows": "\u77E5\u9053\u4EC0\u4E48", "unknowns": "\u4E0D\u77E5\u9053\u4EC0\u4E48", "personality": "\u6027\u683C", "trigger_rules": ["\u89E6\u53D1\u89C4\u52191", "\u89E6\u53D1\u89C4\u52192"]}
  ],
  "companion_exclusive_clues": [
    {"clue": "\u7EBF\u7D22\u5185\u5BB9", "requires_dim": "\u9700\u8981\u54EA\u4E2A\u7EF4\u5EA6\u642D\u6863", "trigger": "\u89E6\u53D1\u6761\u4EF6"}
  ],
  "truth": "\u6700\u7EC8\u771F\u76F8\uFF08100\u5B57\uFF09",
  "endings": {
    "good": "\u771F\u76F8\u6D6E\u73B0\u7ED3\u5C40\u63CF\u8FF0",
    "neutral": "\u771F\u76F8\u6A21\u7CCA\u7ED3\u5C40\u63CF\u8FF0",
    "bad": "\u9519\u8BEF\u6307\u63A7\u7ED3\u5C40\u63CF\u8FF0"
  },
  "key_evidence_count": 3
}`;

// src/services/caseGenerator.ts
function normalizeGeneratedCase(caseData, topic) {
  const normalized = { ...caseData };
  if (!normalized.case_title) normalized.case_title = topic.title;
  if (!normalized.case_intro) normalized.case_intro = topic.excerpt;
  if (!Array.isArray(normalized.npcs) || normalized.npcs.length === 0) {
    normalized.npcs = [];
  }
  if (!Array.isArray(normalized.search_directions) || normalized.search_directions.length === 0) {
    normalized.search_directions = [];
  }
  if (!normalized.key_evidence_count) {
    normalized.key_evidence_count = Math.min(3, normalized.search_directions?.length || 3);
  }
  return normalized;
}
async function generateCaseFromTopic(topic) {
  const prompt = caseGenPrompt.replace("{{hot_topic_title}}", topic.title).replace("{{hot_topic_summary}}", topic.excerpt || "\uFF08\u65E0\u6458\u8981\uFF0C\u8BF7\u57FA\u4E8E\u8BDD\u9898\u6807\u9898\u81EA\u7531\u53D1\u6325\uFF09");
  const caseData = await agentApi.chatJSON([
    { role: "system", content: "\u4F60\u662F\u77E5\u4E4E\u793E\u533A\u7684AI\u5267\u672C\u4F5C\u5BB6\uFF0C\u64C5\u957F\u628A\u793E\u4F1A\u70ED\u70B9\u6539\u7F16\u6210\u903B\u8F91\u4E25\u5BC6\u3001\u6709\u4EBA\u60C5\u5473\u7684\u63A2\u6848\u6545\u4E8B\u3002" },
    { role: "user", content: prompt }
  ]);
  return { case: normalizeGeneratedCase(caseData, topic), sourceTopic: topic };
}
async function generateCase(hotTopicIndex) {
  const hotList = await zhihuApi.getHotList();
  const items = hotList?.Data?.Items || hotList?.data?.items || [];
  const list = (Array.isArray(items) ? items : []).slice(0, 8);
  const topic = list[hotTopicIndex] || list[0];
  if (!topic) {
    throw new Error("\u65E0\u6CD5\u83B7\u53D6\u70ED\u699C\u8BDD\u9898");
  }
  return generateCaseFromTopic(
    {
      title: topic.Title || topic.title || topic.target?.title || "\u672A\u77E5\u8BDD\u9898",
      excerpt: topic.Summary || topic.Excerpt || topic.excerpt || topic.target?.excerpt || ""
    }
  );
}
async function generateCaseFromUserInput(userInput) {
  const prompt = caseGenPrompt.replace("{{hot_topic_title}}", "\u7528\u6237\u81EA\u5B9A\u4E49\u4E8B\u4EF6").replace("{{hot_topic_summary}}", userInput);
  const caseData = await agentApi.chatJSON([
    {
      role: "system",
      content: "\u4F60\u662F\u77E5\u4E4E\u793E\u533A\u7684AI\u5267\u672C\u4F5C\u5BB6\uFF0C\u64C5\u957F\u628A\u7528\u6237\u63CF\u8FF0\u7684\u4E8B\u4EF6\u6539\u7F16\u6210\u903B\u8F91\u4E25\u5BC6\u3001\u6709\u4EBA\u60C5\u5473\u3001\u6709\u60AC\u7591\u611F\u7684\u63A2\u6848\u6545\u4E8B\u3002\u4FDD\u6301\u4E8B\u4EF6\u6838\u5FC3\u4E8B\u5B9E\u4E0D\u53D8\uFF0C\u4F46\u52A0\u5165\u5408\u7406\u7684\u63A8\u7406\u5C42\u6B21\u548C\u9690\u85CF\u771F\u76F8\u3002"
    },
    { role: "user", content: prompt }
  ]);
  return {
    case: normalizeGeneratedCase(caseData, { title: userInput.substring(0, 30) + "...", excerpt: userInput }),
    sourceInput: userInput
  };
}
async function generateCaseFromStory(storyDetail) {
  const material = [
    `\u6807\u9898\uFF1A${storyDetail.chapter_name || "\u672A\u77E5\u6545\u4E8B"}`,
    storyDetail.author_name ? `\u539F\u4F5C\u8005\uFF1A${storyDetail.author_name}` : "",
    storyDetail.labels?.length ? `\u6807\u7B7E\uFF1A${storyDetail.labels.join("\u3001")}` : "",
    `\u5BFC\u8BED\uFF1A${storyDetail.introduction || "\uFF08\u65E0\uFF09"}`,
    `\u6B63\u6587\u8282\u9009\uFF1A${(storyDetail.content || "").substring(0, 3e3)}`
  ].filter(Boolean).join("\n");
  const prompt = caseGenPrompt.replace("{{hot_topic_title}}", `\u76D0\u8A00\u6545\u4E8B\u300A${storyDetail.chapter_name || "\u672A\u77E5\u6545\u4E8B"}\u300B`).replace("{{hot_topic_summary}}", material);
  const caseData = await agentApi.chatJSON([
    {
      role: "system",
      content: '\u4F60\u662F\u77E5\u4E4E\u793E\u533A\u7684AI\u5267\u672C\u4F5C\u5BB6\uFF0C\u64C5\u957F\u628A\u76D0\u8A00\u6545\u4E8B\u6539\u7F16\u6210\u63A2\u6848\u6E38\u620F\uFF1A\u4FDD\u7559\u539F\u4F5C\u7684\u80CC\u666F\u4E0E\u4EBA\u7269\u6C1B\u56F4\uFF0C\u4F46\u628A\u53D9\u4E8B\u91CD\u6784\u4E3A"\u60AC\u6848\u2192\u641C\u8BC1\u2192\u8BC1\u8BCD\u2192\u771F\u76F8"\u7684\u63A2\u6848\u7ED3\u6784\uFF0C\u8BBE\u8BA1\u5408\u7406\u7684\u51F6\u624B\u3001\u52A8\u673A\u4E0E\u4E09\u6863\u7ED3\u5C40\u3002\u6539\u7F16\u9700\u5C0A\u91CD\u539F\u4F5C\u6C14\u8D28\uFF0C\u4E0D\u7167\u6284\u539F\u6587\u53E5\u5B50\u3002'
    },
    { role: "user", content: prompt }
  ]);
  const topic = {
    title: `\u76D0\u8A00\u6545\u4E8B\u300A${storyDetail.chapter_name || "\u672A\u77E5"}\u300B`,
    excerpt: storyDetail.introduction || (storyDetail.content || "").substring(0, 80)
  };
  return {
    case: normalizeGeneratedCase(caseData, topic),
    sourceTopic: topic.title
  };
}
var caseGenerator = {
  generateCase,
  generateCaseFromTopic,
  generateCaseFromUserInput,
  generateCaseFromStory
};

// src/services/oauthService.ts
var OPENAPI = "https://openapi.zhihu.com";
var API_BASE = "https://developer.zhihu.com";
var SESSION_TTL = 60 * 60 * 24 * 7;
var STATE_TTL = 600;
var COOKIE_NAME = "ks_session";
function redirectURI() {
  return env("OAUTH_REDIRECT_URI") || "https://kanshan-detective.3082780889.workers.dev/api/auth/callback";
}
function isOAuthConfigured() {
  return !!env("ZHIHU_OAUTH_APP_ID") && !!env("ZHIHU_OAUTH_APP_KEY");
}
async function buildAuthorizeURL() {
  const state = crypto.randomUUID().replace(/-/g, "");
  const kv = getKV();
  if (kv) await kv.put(`kanshan:oauth_state:${state}`, "1", { expirationTtl: STATE_TTL });
  const params = new URLSearchParams({
    redirect_uri: redirectURI(),
    app_id: env("ZHIHU_OAUTH_APP_ID") || "",
    response_type: "code",
    state
  });
  return `${OPENAPI}/authorize?${params.toString()}`;
}
async function consumeState(state) {
  const kv = getKV();
  if (!kv || !state) return false;
  const key = `kanshan:oauth_state:${state}`;
  const value = await kv.get(key);
  if (!value) return false;
  await kv.delete(key);
  return true;
}
async function exchangeAndCreateSession(code) {
  const body = new URLSearchParams({
    app_id: env("ZHIHU_OAUTH_APP_ID") || "",
    app_key: env("ZHIHU_OAUTH_APP_KEY") || "",
    grant_type: "authorization_code",
    redirect_uri: redirectURI(),
    code
  });
  const resp = await fetch(`${OPENAPI}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const data = await resp.json().catch(() => ({}));
  const accessToken = typeof data?.access_token === "string" ? data.access_token : "";
  if (!accessToken) {
    throw new Error(`\u6362\u53D6Token\u5931\u8D25: ${JSON.stringify(data).substring(0, 200)}`);
  }
  const sid = crypto.randomUUID().replace(/-/g, "");
  const session = {
    accessToken,
    handle: `zs_${sid.substring(0, 8)}`,
    loginAt: Date.now()
  };
  const kv = getKV();
  if (kv) {
    await kv.put(
      `kanshan:oauth_session:${sid}`,
      JSON.stringify({ accessToken, handle: session.handle, loginAt: session.loginAt }),
      { expirationTtl: SESSION_TTL }
    );
  }
  return { ...session, sid };
}
function parseSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match2 = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match2 ? match2[1] : null;
}
function buildSessionCookie(sid) {
  return `${COOKIE_NAME}=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}
function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; Max-Age=0`;
}
async function getSessionBySid(sid) {
  const kv = getKV();
  if (!kv || !sid) return null;
  const raw2 = await kv.get(`kanshan:oauth_session:${sid}`);
  if (!raw2) return null;
  try {
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}
async function destroySession(sid) {
  const kv = getKV();
  if (kv && sid) await kv.delete(`kanshan:oauth_session:${sid}`);
}
async function fetchSessionAnswersText(accessToken) {
  const headers = {
    Authorization: `Bearer ${env("ZHIHU_ACCESS_SECRET") || ""}`,
    "X-Request-Timestamp": String(Math.floor(Date.now() / 1e3)),
    "X-OAuth-Token": accessToken
  };
  const resp = await fetch(`${API_BASE}/api/v1/user/contents?ContentType=all&Limit=20&SortField=ts`, { headers });
  if (!resp.ok) throw new Error(`\u7528\u6237\u5185\u5BB9\u63A5\u53E3 ${resp.status}`);
  const data = await resp.json();
  if (data && typeof data.Code === "number" && data.Code !== 0) {
    throw new Error(`\u7528\u6237\u5185\u5BB9\u63A5\u53E3\u4E1A\u52A1\u9519\u8BEF Code=${data.Code}`);
  }
  const items = data?.Data?.Items || [];
  return (Array.isArray(items) ? items : []).map((item) => `${item.Title || item.title || ""}
${item.Summary || item.summary || ""}`).filter((t) => t.trim().length > 0).join("\n\n---\n\n").substring(0, 8e3);
}
var oauthService = {
  isOAuthConfigured,
  buildAuthorizeURL,
  consumeState,
  exchangeAndCreateSession,
  parseSessionCookie,
  buildSessionCookie,
  buildClearCookie,
  getSessionBySid,
  destroySession,
  fetchSessionAnswersText
};

// src/prompts/social.ts
var socialPrompt = `\u57FA\u4E8E\u4EE5\u4E0B\u73A9\u5BB6\u7684\u601D\u7EF4\u6307\u7EB9\uFF0C\u751F\u62103\u4E2A\u4E92\u8865\u578B\u77E5\u4E4E\u7528\u6237\u641C\u7D22\u65B9\u5411\u3002

\u73A9\u5BB6\u601D\u7EF4\u6307\u7EB9\uFF1A
- \u5F31\u9879\u7EF4\u5EA6\uFF1A{{weak_dims}}
- \u5F31\u9879\u8BDD\u9898\u5173\u952E\u8BCD\uFF1A{{weak_keywords}}

\u8BF7\u751F\u62103\u4E2A\u641C\u7D22\u67E5\u8BE2\uFF0C\u7528\u4E8E\u5728\u77E5\u4E4E\u641C\u7D22API\u4E2D\u627E\u5230\u4E0E\u73A9\u5BB6\u601D\u7EF4\u4E92\u8865\u7684\u4F18\u8D28\u56DE\u7B54\u8005\uFF1A
{
  "search_queries": [
    {"query": "\u641C\u7D22\u5173\u952E\u8BCD", "reason": "\u4E3A\u4EC0\u4E48\u8FD9\u4E2A\u65B9\u5411\u80FD\u627E\u5230\u4E92\u8865\u7528\u6237", "complement_dim": "\u4E92\u8865\u7EF4\u5EA6"}
  ],
  "detective_card_text": "\u5982\u679C\u548CTA\u4E00\u8D77\u63A2\u6848\uFF0C\u4F60\u4EEC\u5C06\u662F\u5B8C\u7F8E\u642D\u6863\u2014\u2014\u56E0\u4E3A\u2026\u2026"
}`;

// src/data/seedUsers.ts
var seedUsers = {
  "tech_blogger": {
    userId: "tech_blogger",
    displayName: "\u6280\u672F\u535A\u4E3B",
    fingerprint: {
      dimensions: [
        { name: "\u903B\u8F91-\u611F\u6027", score: 2.5, toward: "\u5F3A\u903B\u8F91\u578B", evidence: "\u56DE\u7B54\u4E2D\u5927\u91CF\u4F7F\u7528\u56E0\u679C\u8BBA\u8BC1\u548C\u6570\u636E\u652F\u6491" },
        { name: "\u5B8F\u89C2-\u5FAE\u89C2", score: 7.5, toward: "\u504F\u5FAE\u89C2\u578B", evidence: "\u64C5\u957F\u6DF1\u5165\u4EE3\u7801\u7EC6\u8282\u548C\u5E95\u5C42\u539F\u7406" },
        { name: "\u7406\u8BBA-\u5B9E\u8DF5", score: 3, toward: "\u504F\u7406\u8BBA\u578B", evidence: "\u591A\u7528\u7406\u8BBA\u6846\u67B6\u548C\u539F\u7406\u63A8\u5BFC" },
        { name: "\u4E50\u89C2-\u6279\u5224", score: 7, toward: "\u504F\u6279\u5224\u578B", evidence: "\u5E38\u6307\u51FA\u6280\u672F\u65B9\u6848\u7684\u4E0D\u8DB3\u548C\u98CE\u9669" },
        { name: "\u6DF1\u5EA6-\u5E7F\u5EA6", score: 3.5, toward: "\u504F\u6DF1\u5EA6\u578B", evidence: "\u96C6\u4E2D\u4E8E\u7F16\u7A0B\u9886\u57DF\u6DF1\u5EA6\u8BA8\u8BBA" }
      ],
      detective_profile: {
        strength: ["\u63A8\u7406\u94FE\u6784\u5EFA", "\u7EC6\u8282\u6355\u6349"],
        weakness: ["\u4EBA\u5FC3\u6D1E\u5BDF", "\u8DE8\u754C\u5173\u8054"],
        style: "\u7406\u6027\u5206\u6790\u578B\u4FA6\u63A2\uFF0C\u64C5\u957F\u903B\u8F91\u63A8\u7406\u548C\u7EC6\u8282\u6392\u67E5\uFF0C\u4F46\u4E0D\u5584\u4E8E\u4ECE\u60C5\u611F\u89D2\u5EA6\u89E3\u8BFBNPC\u884C\u4E3A"
      },
      summary: "\u5178\u578B\u7684\u6280\u672F\u578B\u601D\u7EF4\u8005\u2014\u2014\u903B\u8F91\u4E25\u5BC6\u3001\u6CE8\u91CD\u7EC6\u8282\u3001\u6279\u5224\u6027\u5F3A\u3002\u64C5\u957F\u4ECE\u6570\u636E\u548C\u4EE3\u7801\u4E2D\u53D1\u73B0\u7EBF\u7D22\uFF0C\u4F46\u53EF\u80FD\u5FFD\u89C6\u4EBA\u9645\u5173\u7CFB\u7684\u60C5\u611F\u7EF4\u5EA6\u3002",
      keywords: ["\u903B\u8F91", "\u5FAE\u89C2", "\u6279\u5224", "\u6DF1\u5EA6"]
    }
  },
  "humanities_writer": {
    userId: "humanities_writer",
    displayName: "\u4EBA\u6587\u4F5C\u8005",
    fingerprint: {
      dimensions: [
        { name: "\u903B\u8F91-\u611F\u6027", score: 8, toward: "\u5F3A\u611F\u6027\u578B", evidence: "\u56DE\u7B54\u4EE5\u53D9\u4E8B\u548C\u60C5\u611F\u8868\u8FBE\u4E3A\u4E3B" },
        { name: "\u5B8F\u89C2-\u5FAE\u89C2", score: 2.5, toward: "\u5F3A\u5B8F\u89C2\u578B", evidence: "\u504F\u597D\u4ECE\u5386\u53F2\u548C\u793E\u4F1A\u5927\u6846\u67B6\u8BA8\u8BBA\u95EE\u9898" },
        { name: "\u7406\u8BBA-\u5B9E\u8DF5", score: 7, toward: "\u504F\u5B9E\u8DF5\u578B", evidence: "\u591A\u7528\u4E2A\u4EBA\u7ECF\u5386\u548C\u793E\u4F1A\u89C2\u5BDF" },
        { name: "\u4E50\u89C2-\u6279\u5224", score: 3.5, toward: "\u504F\u4E50\u89C2\u578B", evidence: "\u6574\u4F53\u57FA\u8C03\u79EF\u6781\u5411\u4E0A" },
        { name: "\u6DF1\u5EA6-\u5E7F\u5EA6", score: 8, toward: "\u504F\u5E7F\u5EA6\u578B", evidence: "\u8DE8\u54F2\u5B66\u3001\u5386\u53F2\u3001\u6587\u5B66\u591A\u9886\u57DF\u6D89\u730E" }
      ],
      detective_profile: {
        strength: ["\u4EBA\u5FC3\u6D1E\u5BDF", "\u8DE8\u754C\u5173\u8054"],
        weakness: ["\u63A8\u7406\u94FE\u6784\u5EFA", "\u7EC6\u8282\u6355\u6349"],
        style: "\u611F\u6027\u76F4\u89C9\u578B\u4FA6\u63A2\uFF0C\u64C5\u957F\u4ECE\u60C5\u611F\u548C\u5B8F\u89C2\u89C6\u89D2\u53D1\u73B0\u7EBF\u7D22\uFF0C\u4F46\u903B\u8F91\u63A8\u7406\u548C\u7EC6\u8282\u6392\u67E5\u662F\u5F31\u9879"
      },
      summary: "\u5178\u578B\u7684\u4EBA\u6587\u578B\u601D\u7EF4\u8005\u2014\u2014\u611F\u6027\u4E30\u5BCC\u3001\u89C6\u91CE\u5F00\u9614\u3001\u5584\u4E8E\u5171\u60C5\u3002\u80FD\u4ECENPC\u7684\u60C5\u7EEA\u548C\u5B8F\u89C2\u80CC\u666F\u4E2D\u53D1\u73B0\u7EBF\u7D22\uFF0C\u4F46\u53EF\u80FD\u5FFD\u89C6\u903B\u8F91\u7EC6\u8282\u3002",
      keywords: ["\u611F\u6027", "\u5B8F\u89C2", "\u4E50\u89C2", "\u5E7F\u5EA6"]
    }
  },
  "business_analyst": {
    userId: "business_analyst",
    displayName: "\u5546\u4E1A\u5206\u6790\u5E08",
    fingerprint: {
      dimensions: [
        { name: "\u903B\u8F91-\u611F\u6027", score: 3.5, toward: "\u504F\u903B\u8F91\u578B", evidence: "\u56DE\u7B54\u504F\u7406\u6027\u5206\u6790" },
        { name: "\u5B8F\u89C2-\u5FAE\u89C2", score: 6, toward: "\u5747\u8861", evidence: "\u65E2\u80FD\u770B\u5927\u5C40\u4E5F\u80FD\u6DF1\u5165\u6570\u636E" },
        { name: "\u7406\u8BBA-\u5B9E\u8DF5", score: 7.5, toward: "\u504F\u5B9E\u8DF5\u578B", evidence: "\u5927\u91CF\u5F15\u7528\u884C\u4E1A\u6848\u4F8B" },
        { name: "\u4E50\u89C2-\u6279\u5224", score: 5, toward: "\u5747\u8861", evidence: "\u5BA2\u89C2\u5E73\u8861" },
        { name: "\u6DF1\u5EA6-\u5E7F\u5EA6", score: 7, toward: "\u504F\u5E7F\u5EA6\u578B", evidence: "\u8DE8\u884C\u4E1A\u5206\u6790" }
      ],
      detective_profile: {
        strength: ["\u5173\u8054\u53D1\u73B0", "\u5BA1\u8BAF\u6280\u5DE7"],
        weakness: ["\u6DF1\u5EA6\u5206\u6790", "\u4EBA\u5FC3\u6D1E\u5BDF"],
        style: "\u5B9E\u7528\u4E3B\u4E49\u4FA6\u63A2\uFF0C\u64C5\u957F\u8FDE\u63A5\u8DE8\u9886\u57DF\u7EBF\u7D22\u548C\u4ECENPC\u53E3\u4E2D\u5957\u8BDD\uFF0C\u4F46\u5728\u6DF1\u5EA6\u5206\u6790\u548C\u60C5\u611F\u6D1E\u5BDF\u4E0A\u6709\u76F2\u533A"
      },
      summary: "\u5178\u578B\u7684\u5546\u4E1A\u578B\u601D\u7EF4\u8005\u2014\u2014\u7406\u6027\u52A1\u5B9E\u3001\u5584\u4E8E\u5173\u8054\u4E0D\u540C\u9886\u57DF\u4FE1\u606F\u3002\u64C5\u957F\u8DE8\u9886\u57DF\u7EBF\u7D22\u8FDE\u63A5\u548CNPC\u5BA1\u8BAF\uFF0C\u4F46\u6DF1\u5C42\u60C5\u611F\u5206\u6790\u548C\u5355\u4E00\u9886\u57DF\u6DF1\u6316\u53EF\u80FD\u4E0D\u8DB3\u3002",
      keywords: ["\u903B\u8F91", "\u5B9E\u8DF5", "\u5E7F\u5EA6", "\u5747\u8861"]
    }
  }
};

// src/data/fallbackTopics.ts
var TOPIC_POOL = [
  { title: "\u5F53AI\u5F00\u59CB\u6DF1\u5EA6\u4ECB\u5165\u5185\u5BB9\u521B\u4F5C\uFF0C\u4EBA\u7C7B\u521B\u4F5C\u8005\u7684\u62A4\u57CE\u6CB3\u5728\u54EA\u91CC\uFF1F", excerpt: "AI\u751F\u6210\u7684\u6587\u7AE0\u3001\u753B\u4F5C\u3001\u4EE3\u7801\u8D8A\u6765\u8D8A\u591A\uFF0C\u6709\u4EBA\u7126\u8651\u88AB\u66FF\u4EE3\uFF0C\u6709\u4EBA\u8BA4\u4E3A\u54C1\u5473\u4E0E\u5224\u65AD\u529B\u624D\u662F\u7A00\u7F3A\u8D44\u6E90\u3002" },
  { title: "\u4E3A\u4EC0\u4E48\u8D8A\u6765\u8D8A\u591A\u7684\u5E74\u8F7B\u4EBA\u5F00\u59CB\u8BB0\u5F55\u300C\u7CBE\u795E\u9000\u4F11\u300D\u751F\u6D3B\uFF1F", excerpt: "\u4E0D\u8F9E\u804C\u4F46\u964D\u4F4E\u6B32\u671B\u3001\u62D2\u7EDD\u65E0\u6548\u52A0\u73ED\u3001\u628A\u751F\u6D3B\u8C03\u6210\u4F4E\u529F\u8017\u6A21\u5F0F\uFF0C\u8FD9\u5C4A\u5E74\u8F7B\u4EBA\u91CD\u65B0\u5B9A\u4E49\u594B\u6597\u3002" },
  { title: "\u7F51\u7EDC\u70ED\u70B9\u4E8B\u4EF6\u53CD\u8F6C\u4E0D\u65AD\uFF0C\u6211\u4EEC\u8BE5\u5982\u4F55\u4FDD\u6301\u72EC\u7ACB\u5224\u65AD\uFF1F", excerpt: "\u4ECE\u4E49\u6124\u586B\u81BA\u5230\u5267\u60C5\u53CD\u8F6C\uFF0C\u8206\u8BBA\u573A\u7684\u60C5\u7EEA\u6765\u5F97\u5FEB\u53BB\u5F97\u4E5F\u5FEB\u3002\u4FE1\u606F\u7D20\u517B\u6210\u4E3A\u5F53\u4EE3\u5FC5\u4FEE\u8BFE\u3002" },
  { title: "\u4E2D\u5C0F\u57CE\u5E02\u7684\u300C\u65B0\u8FD4\u4E61\u9752\u5E74\u300D\uFF0C\u6B63\u5728\u521B\u9020\u600E\u6837\u7684\u751F\u6D3B\u65B9\u5F0F\uFF1F", excerpt: "\u8FDC\u7A0B\u529E\u516C\u3001\u6570\u5B57\u6E38\u6C11\u3001\u5C0F\u57CE\u521B\u4E1A\u2014\u2014\u79BB\u5F00\u4E00\u7EBF\u4E0D\u662F\u9000\u8DEF\uFF0C\u800C\u662F\u53E6\u4E00\u79CD\u53EF\u80FD\u6027\u7684\u5F00\u59CB\u3002" },
  { title: "\u5982\u679C\u8BB0\u5FC6\u53EF\u4EE5\u88AB\u6570\u5B57\u5316\u4FDD\u5B58\uFF0C\u4F60\u4F1A\u9009\u62E9\u4E0A\u4F20\u5417\uFF1F", excerpt: "\u6280\u672F\u903C\u8FD1\u79D1\u5E7B\uFF1A\u6570\u5B57\u9057\u4EA7\u3001AI\u590D\u901D\u8005\u3001\u610F\u8BC6\u4E0A\u4F20\u7684\u4F26\u7406\u8BA8\u8BBA\u6B63\u5728\u4ECE\u54F2\u5B66\u8BFE\u5802\u8D70\u8FDB\u73B0\u5B9E\u3002" },
  { title: "\u300C\u642D\u5B50\u793E\u4EA4\u300D\u4E3A\u4EC0\u4E48\u7A81\u7136\u6D41\u884C\uFF1F\u6D45\u5C42\u5173\u7CFB\u662F\u6CBB\u6108\u8FD8\u662F\u9003\u907F\uFF1F", excerpt: "\u996D\u642D\u5B50\u3001\u5065\u8EAB\u642D\u5B50\u3001\u65C5\u884C\u642D\u5B50\u2014\u2014\u7CBE\u51C6\u966A\u4F34\u3001\u8FB9\u754C\u6E05\u6670\u7684\u8F7B\u793E\u4EA4\u65B9\u5F0F\u5F15\u53D1\u70ED\u8BAE\u3002" },
  { title: "\u9AD8\u6821\u5B66\u672F\u8BC4\u4EF7\u4F53\u7CFB\u6539\u9769\uFF0C\u5E74\u8F7B\u5B66\u8005\u7684\u51FA\u8DEF\u5728\u54EA\u91CC\uFF1F", excerpt: "\u975E\u5347\u5373\u8D70\u3001\u8BBA\u6587\u5D07\u62DC\u3001\u5E3D\u5B50\u516C\u53F8\u2014\u2014\u5B66\u672F\u5708\u7684\u56F0\u5883\u4E0E\u7834\u5C40\u6210\u4E3A\u6301\u7EED\u8BA8\u8BBA\u7684\u516C\u5171\u8BAE\u9898\u3002" },
  { title: "\u5F53\u300C\u65AD\u4EB2\u300D\u6210\u4E3A\u6D41\u884C\u8BCD\uFF0C\u5E74\u8F7B\u4EBA\u5728\u91CD\u65B0\u5B9A\u4E49\u4EB2\u60C5\u5417\uFF1F", excerpt: "\u4E0D\u4E3B\u52A8\u8054\u7CFB\u4EB2\u621A\u3001\u8FC7\u5E74\u4E0D\u56DE\u5BB6\u3001\u51CF\u5C11\u65E0\u6548\u4EBA\u60C5\u5F80\u6765\uFF0C\u5E74\u8F7B\u4EBA\u5F00\u59CB\u7ED9\u4EB2\u60C5\u5173\u7CFB\u505A\u51CF\u6CD5\u3002" }
];
function getFallbackTopics() {
  return TOPIC_POOL.map((t, i) => ({
    index: i,
    title: t.title,
    excerpt: t.excerpt,
    url: ""
  }));
}

// src/worker.ts
var app = new Hono2();
app.use("*", async (c, next) => {
  syncEnvFromBindings(c.env);
  if (c.env?.DATA) setKV(c.env.DATA);
  await next();
});
app.onError((err, c) => {
  console.error("[ERROR]", err.message);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});
app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));
app.post("/api/fingerprint/analyze", async (c) => {
  const { userId } = await c.req.json().catch(() => ({}));
  if (!userId) return c.json({ error: "userId \u5FC5\u586B" }, 400);
  const seedUser = seedUsers[userId];
  if (seedUser) {
    return c.json({ userId: seedUser.userId, displayName: seedUser.displayName, fingerprint: seedUser.fingerprint, cached: true });
  }
  const result = await fingerprintService.analyzeFingerprint(userId);
  return c.json({ userId, fingerprint: result, cached: false });
});
app.get("/api/fingerprint/seed-users", (c) => {
  const list = Object.values(seedUsers).map((u) => ({
    userId: u.userId,
    displayName: u.displayName,
    keywords: u.fingerprint.keywords
  }));
  return c.json({ users: list });
});
app.post("/api/companion/generate", async (c) => {
  const { fingerprint } = await c.req.json().catch(() => ({}));
  if (!fingerprint?.dimensions) return c.json({ error: "fingerprint \u5FC5\u586B" }, 400);
  return c.json({ companion: companionService.generateCompanion(fingerprint) });
});
app.post("/api/companion/intro", async (c) => {
  const { fingerprint, companion } = await c.req.json().catch(() => ({}));
  if (!fingerprint || !companion) return c.json({ error: "fingerprint \u548C companion \u5FC5\u586B" }, 400);
  const intro = await companionService.generateCompanionIntro(fingerprint, companion);
  return c.json({ intro });
});
app.post("/api/companion/action", async (c) => {
  const { companion, fingerprint, gamePhase, playerInput, context } = await c.req.json().catch(() => ({}));
  if (!companion || !fingerprint || !gamePhase) return c.json({ error: "companion, fingerprint, gamePhase \u5FC5\u586B" }, 400);
  const reply = await companionService.companionAction(companion, fingerprint, gamePhase, playerInput || "", context);
  return c.json({ reply });
});
app.get("/api/companion/templates", (c) => c.json({ templates: companionTemplates }));
app.get("/api/game/case", async (c) => {
  const caseId = c.req.query("caseId") || "preset";
  const found = await caseStore.getCaseById(caseId);
  if (!found) return c.json({ error: "\u6848\u4EF6\u4E0D\u5B58\u5728" }, 404);
  return c.json({ case: found });
});
app.get("/api/game/cases", async (c) => {
  const cases = (await caseStore.listCases()).map((k) => ({
    id: k.case_id,
    title: k.case_title,
    intro: (k.case_intro || "").substring(0, 80) + "...",
    source: k.source
  }));
  return c.json({ cases });
});
app.post("/api/game/start", async (c) => {
  const { caseId } = await c.req.json().catch(() => ({}));
  return c.json({ state: gameEngine.startGame(caseId || "preset") });
});
app.post("/api/game/search", async (c) => {
  const { keyword, state, caseId } = await c.req.json().catch(() => ({}));
  if (!keyword) return c.json({ error: "keyword \u5FC5\u586B" }, 400);
  const result = await gameEngine.searchForClues(keyword, { ...state, caseId: state?.caseId || caseId || "preset" });
  return c.json(result);
});
app.post("/api/game/talk", async (c) => {
  const { npcId, question, state, companionFollowup, caseId } = await c.req.json().catch(() => ({}));
  if (!npcId || !question) return c.json({ error: "npcId \u548C question \u5FC5\u586B" }, 400);
  const reply = await gameEngine.talkToNpc(npcId, question, { ...state, caseId: state?.caseId || caseId || "preset" }, companionFollowup);
  return c.json({ reply });
});
app.post("/api/game/evaluate", async (c) => {
  const { state, caseId, reasoning } = await c.req.json().catch(() => ({}));
  if (!state?.clues) return c.json({ error: "state.clues \u5FC5\u586B" }, 400);
  const finalState = { ...state, caseId: state?.caseId || caseId || "preset" };
  const { endingType, reasoningScore, reasoningComment } = await gameEngine.evaluateWithReasoning(finalState, reasoning || "");
  const caseData = await caseStore.getCaseById(finalState.caseId);
  const ending = caseData?.endings?.[endingType] || "";
  return c.json({ endingType, ending, truth: caseData?.truth || "", reasoningScore, reasoningComment });
});
app.post("/api/game/generate-case", async (c) => {
  const { hotTopicIndex } = await c.req.json().catch(() => ({}));
  const result = await caseGenerator.generateCase(hotTopicIndex || 0);
  return c.json(result);
});
app.get("/api/archive/stories", async (c) => {
  try {
    const raw2 = await zhihuApi.getHackathonStories();
    const items = (Array.isArray(raw2) ? raw2 : []).slice(0, 12).map((s, i) => ({
      index: i,
      work_id: s.work_id || "",
      title: s.title || "\u672A\u77E5\u6545\u4E8B",
      description: s.description || "",
      labels: s.labels || []
    }));
    return c.json({ stories: items });
  } catch (err) {
    console.error(`[Archive] \u6545\u4E8B\u5217\u8868\u4E0D\u53EF\u7528: ${err.message}`);
    return c.json({ stories: [], error: err.message }, 200);
  }
});
app.post("/api/archive/generate-story", async (c) => {
  const { workId } = await c.req.json().catch(() => ({}));
  if (!workId) return c.json({ error: "workId \u5FC5\u586B" }, 400);
  const detail = await zhihuApi.getHackathonStoryDetail(String(workId));
  const { case: caseData, sourceTopic } = await caseGenerator.generateCaseFromStory(detail);
  const saved = await caseStore.saveGeneratedCase(caseData, sourceTopic);
  return c.json({ case: saved, sourceTopic });
});
app.get("/api/quota", async (c) => {
  try {
    const data = await zhihuApi.getQuota();
    return c.json({ quota: data?.Data || data });
  } catch (err) {
    return c.json({ error: err.message }, 200);
  }
});
app.get("/api/archive/cases", async (c) => {
  const cases = (await caseStore.listCases()).map((k) => ({
    case_id: k.case_id,
    case_title: k.case_title,
    case_intro: k.case_intro,
    source: k.source,
    source_topic: k.source_topic,
    created_by: k.created_by,
    created_at: k.created_at,
    npc_count: (k.npcs || []).length,
    search_direction_count: (k.search_directions || []).length,
    key_evidence_count: k.key_evidence_count || 3
  }));
  return c.json({ cases });
});
app.get("/api/archive/case", async (c) => {
  const caseId = c.req.query("caseId") || "preset";
  const found = await caseStore.getCaseById(caseId);
  if (!found) return c.json({ error: "\u6848\u4EF6\u4E0D\u5B58\u5728" }, 404);
  return c.json({ case: found });
});
function parseHotTopics(hotList) {
  const items = hotList?.Data?.Items || hotList?.data?.items || hotList?.data || hotList || [];
  return (Array.isArray(items) ? items : []).slice(0, 8).map((t, i) => ({
    index: i,
    title: t.Title || t.title || t.target?.title || `\u70ED\u699C\u8BDD\u9898${i + 1}`,
    excerpt: t.Summary || t.Excerpt || t.excerpt || t.summary || t.target?.excerpt || "",
    url: t.Url || t.url || ""
  })).filter((t) => t.title && !t.title.startsWith("\u70ED\u699C\u8BDD\u9898"));
}
app.get("/api/archive/hot-topics", async (c) => {
  try {
    const hotList = await zhihuApi.getHotList();
    const topics = parseHotTopics(hotList);
    if (topics.length === 0) throw new Error("\u70ED\u699C\u4E3A\u7A7A");
    return c.json({ topics, fallback: false });
  } catch (err) {
    console.warn(`[Archive] \u70ED\u699C\u4E0D\u53EF\u7528(${err.message})\uFF0C\u542F\u7528\u5907\u7528\u8BDD\u9898\u6C60`);
    return c.json({ topics: getFallbackTopics(), fallback: true });
  }
});
app.post("/api/archive/generate", async (c) => {
  const { hotTopicIndex } = await c.req.json().catch(() => ({}));
  let topics = [];
  let usedFallback = false;
  try {
    const hotList = await zhihuApi.getHotList();
    topics = parseHotTopics(hotList);
  } catch {
    topics = [];
  }
  if (topics.length === 0) {
    topics = getFallbackTopics();
    usedFallback = true;
  }
  const topic = topics[hotTopicIndex || 0] || topics[0];
  const { case: caseData } = await caseGenerator.generateCaseFromTopic({ title: topic.title, excerpt: topic.excerpt });
  const saved = await caseStore.saveGeneratedCase(caseData, topic.title);
  return c.json({ case: saved, sourceTopic: topic, fallback: usedFallback });
});
app.post("/api/archive/custom", async (c) => {
  const { userInput, userId } = await c.req.json().catch(() => ({}));
  if (!userInput || userInput.trim().length < 10) {
    return c.json({ error: "\u8BF7\u8F93\u5165\u81F3\u5C1110\u4E2A\u5B57\u7684\u4E8B\u4EF6\u63CF\u8FF0" }, 400);
  }
  const { case: caseData } = await caseGenerator.generateCaseFromUserInput(userInput.trim());
  const saved = await caseStore.saveCustomCase(caseData, userId || "anonymous", userInput.trim().substring(0, 50));
  return c.json({ case: saved });
});
app.post("/api/archive/record", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { user_id, case_id, case_title, game_mode, ending_type, clue_count, key_clue_count, companion_clue_count, companion_name, user_display_name, duration_seconds } = body;
  if (!user_id || !case_id || !ending_type) {
    return c.json({ error: "user_id, case_id, ending_type \u5FC5\u586B" }, 400);
  }
  const record = await caseStore.saveExploreRecord({
    user_id,
    user_display_name,
    case_id,
    case_title: case_title || "\u672A\u77E5\u6848\u4EF6",
    game_mode: game_mode === "team" ? "team" : "solo",
    companion_name,
    ending_type,
    clue_count: clue_count || 0,
    key_clue_count: key_clue_count || 0,
    companion_clue_count: companion_clue_count || 0,
    duration_seconds
  });
  return c.json({ record });
});
app.get("/api/archive/records", async (c) => {
  const userId = c.req.query("userId") || "";
  if (!userId) return c.json({ error: "userId \u5FC5\u586B" }, 400);
  const records = await caseStore.getUserRecords(userId);
  const stats = caseStore.computeStats(records);
  return c.json({ records, stats });
});
app.post("/api/social/detective-board", async (c) => {
  const { fingerprint } = await c.req.json().catch(() => ({}));
  if (!fingerprint?.dimensions) return c.json({ error: "fingerprint \u5FC5\u586B" }, 400);
  const fp = fingerprint;
  const sorted = [...fp.dimensions].sort((a, b) => a.score - b.score);
  const weakDims = sorted.slice(0, 2).map((d) => `${d.name}(${d.toward})`).join(", ");
  const weakKeywords = fp.detective_profile.weakness;
  const prompt = socialPrompt.replace("{{weak_dims}}", weakDims).replace("{{weak_keywords}}", weakKeywords.join(", "));
  let queries = [];
  let cardText = "\u5982\u679C\u548CTA\u4E00\u8D77\u63A2\u6848\uFF0C\u4F60\u4EEC\u5C06\u662F\u5B8C\u7F8E\u642D\u6863\u3002";
  try {
    const socialResult = await agentApi.chatJSON([
      { role: "system", content: "\u4F60\u662F\u77E5\u4E4E\u793E\u533A\u7684\u793E\u4EA4\u5339\u914D\u987E\u95EE\u3002" },
      { role: "user", content: prompt }
    ]);
    queries = socialResult.search_queries || [];
    cardText = socialResult.detective_card_text || cardText;
  } catch (err) {
    console.error(`[Social] Agent API\u5931\u8D25\uFF0C\u4F7F\u7528\u9884\u8BBE: ${err.message}`);
    queries = weakKeywords.slice(0, 2).map((kw, i) => ({
      query: `${kw} \u77E5\u4E4E\u7B54\u4E3B`,
      reason: `\u4F60\u7684\u5F31\u9879\u662F${kw}\uFF0C\u627E\u5230\u8FD9\u65B9\u9762\u7684\u4F18\u79C0\u7B54\u4E3B\u53EF\u4EE5\u4E92\u8865`,
      complement_dim: sorted[i]?.name || ""
    }));
  }
  const detectiveBoard = await Promise.all(
    queries.slice(0, 3).map(async (q) => {
      try {
        const searchResult = await zhihuApi.searchContent(q.query);
        const items = searchResult?.Data?.Items || searchResult?.data?.items || searchResult?.data || [];
        const topItem = Array.isArray(items) ? items[0] : null;
        const name = topItem?.AuthorName || topItem?.author?.name || topItem?.target?.author?.name || "";
        const avatar = topItem?.AuthorAvatar || topItem?.author?.avatar_url || "";
        const url = topItem?.Url || topItem?.url || topItem?.target?.url || "";
        return {
          query: q.query,
          reason: q.reason,
          complementDim: q.complement_dim,
          zhihuUser: name ? { name, avatar, url } : null
        };
      } catch {
        return { query: q.query, reason: q.reason, complementDim: q.complement_dim, zhihuUser: null };
      }
    })
  );
  return c.json({ detectiveBoard, cardText });
});
app.get("/api/auth/config", (c) => c.json({ enabled: oauthService.isOAuthConfigured() }));
app.get("/api/auth/login", async (c) => {
  if (!oauthService.isOAuthConfigured()) return c.json({ error: "OAuth \u672A\u914D\u7F6E" }, 404);
  return c.redirect(await oauthService.buildAuthorizeURL(), 302);
});
app.get("/api/auth/callback", async (c) => {
  if (!oauthService.isOAuthConfigured()) return c.redirect("/?login=error");
  const code = c.req.query("authorization_code") || c.req.query("code") || "";
  const state = c.req.query("state") || "";
  if (!code || !await oauthService.consumeState(state)) return c.redirect("/?login=error");
  try {
    const session = await oauthService.exchangeAndCreateSession(code);
    c.header("Set-Cookie", oauthService.buildSessionCookie(session.sid));
    return c.redirect("/?login=ok");
  } catch (err) {
    console.error(`[OAuth] \u56DE\u8C03\u6362\u53D6Token\u5931\u8D25: ${err.message}`);
    return c.redirect("/?login=error");
  }
});
app.get("/api/auth/me", async (c) => {
  const sid = oauthService.parseSessionCookie(c.req.header("Cookie"));
  const session = sid ? await oauthService.getSessionBySid(sid) : null;
  if (!session) return c.json({ authenticated: false });
  return c.json({ authenticated: true, handle: session.handle, loginAt: session.loginAt });
});
app.post("/api/auth/logout", async (c) => {
  const sid = oauthService.parseSessionCookie(c.req.header("Cookie"));
  if (sid) await oauthService.destroySession(sid);
  c.header("Set-Cookie", oauthService.buildClearCookie());
  return c.json({ ok: true });
});
app.post("/api/fingerprint/analyze-session", async (c) => {
  const sid = oauthService.parseSessionCookie(c.req.header("Cookie"));
  const session = sid ? await oauthService.getSessionBySid(sid) : null;
  if (!session) return c.json({ error: "\u672A\u767B\u5F55\u6216\u767B\u5F55\u5DF2\u8FC7\u671F" }, 401);
  let answersText = "";
  try {
    answersText = await oauthService.fetchSessionAnswersText(session.accessToken);
  } catch (err) {
    console.error(`[OAuth] \u62C9\u53D6\u7528\u6237\u5185\u5BB9\u5931\u8D25: ${err.message}`);
    return c.json({ error: "\u83B7\u53D6\u4F60\u7684\u77E5\u4E4E\u5185\u5BB9\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" }, 502);
  }
  const fingerprint = await fingerprintService.analyzeFingerprintFromContents(session.handle, answersText);
  return c.json({ userId: session.handle, fingerprint, viaOAuth: true });
});
app.get("*", async (c) => {
  if (c.env?.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Not Found", 404);
});
var worker_default = app;

// src/server-node.ts
var PORT = Number(process.env.PORT || 9e3);
var DIST = import_node_path.default.resolve(process.cwd(), "static");
function createMemoryKV() {
  const store2 = /* @__PURE__ */ new Map();
  return {
    async get(key) {
      const entry = store2.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store2.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key, value, opts) {
      store2.set(key, {
        value,
        expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1e3 : void 0
      });
    },
    async delete(key) {
      store2.delete(key);
    }
  };
}
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};
var assetsHandler = {
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const safe = import_node_path.default.normalize(import_node_path.default.join(DIST, pathname));
    if (!safe.startsWith(DIST)) return new Response("Forbidden", { status: 403 });
    let target = safe;
    if (!import_node_fs.default.existsSync(target) || import_node_fs.default.statSync(target).isDirectory()) {
      target = import_node_path.default.join(DIST, "index.html");
    }
    if (!import_node_fs.default.existsSync(target)) return new Response("Not Found", { status: 404 });
    const stat = import_node_fs.default.statSync(target);
    const baseHeaders = {
      "Content-Type": MIME[import_node_path.default.extname(target).toLowerCase()] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": target.endsWith("index.html") ? "no-cache" : "public, max-age=86400"
    };
    const range = req.headers.get("range");
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m?.[1] ? parseInt(m[1], 10) : 0;
      let end = m?.[2] ? parseInt(m[2], 10) : stat.size - 1;
      end = Math.min(end, stat.size - 1);
      start = Math.min(Math.max(start, 0), end);
      const stream2 = import_node_fs.default.createReadStream(target, { start, end });
      return new Response(import_node_stream2.Readable.toWeb(stream2), {
        status: 206,
        headers: { ...baseHeaders, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) }
      });
    }
    const stream = import_node_fs.default.createReadStream(target);
    return new Response(import_node_stream2.Readable.toWeb(stream), { headers: { ...baseHeaders, "Content-Length": String(stat.size) } });
  }
};
var env2 = {
  DATA: createMemoryKV(),
  ASSETS: assetsHandler,
  ZHIHU_API_BASE: "https://developer.zhihu.com",
  AGENT_API_BASE: "https://developer.zhihu.com",
  AGENT_MODEL: "zhida-fast-1p5",
  ZHIHU_ACCESS_SECRET: "cb25b6f08de3723c36014ca72d3eea65957025af",
  ZHIHU_OAUTH_APP_ID: "",
  ZHIHU_OAUTH_APP_KEY: "",
  OAUTH_REDIRECT_URI: "https://kanshan-detective.3082780889.workers.dev/api/auth/callback",
  NODE_ENV: "production"
};
serve(
  { fetch: (req) => worker_default.fetch(req, env2), port: PORT },
  (info) => {
    const oauthOn = false;
    console.log(`[\u770B\u5C71\u63A2\u6848\u5F55] Node/AiWorks \u670D\u52A1\u5DF2\u542F\u52A8: http://localhost:${info.port}`);
    console.log(`[\u770B\u5C71\u63A2\u6848\u5F55] \u9759\u6001\u76EE\u5F55: ${DIST}`);
    console.log(`[\u770B\u5C71\u63A2\u6848\u5F55] OAuth \u767B\u5F55: ${oauthOn ? "\u5DF2\u542F\u7528" : "\u672A\u914D\u7F6E\u51ED\u8BC1\uFF08\u767B\u5F55\u5165\u53E3\u9690\u85CF\uFF09"}`);
  }
);
