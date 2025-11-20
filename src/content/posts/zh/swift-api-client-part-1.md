---
title: "编写 Swift API 客户端库（一）"
description: "学习如何利用泛型、Swift Concurrency 以及 Codable 协议，优雅高效地编写 Web API 客户端。"
date: 2025-11-12
lang: "zh-CN"
translationSlug: "swift-api-client-part-1"
author: "konakona"
---

本系列将探讨如何利用泛型（Generics）、Codable 协议以及 Swift Concurrency 等 Swift 特性，高效地编写 Web API 客户端库。

本文中，我们将关注于构建 API 客户端的基础层 —— 网络传输层和 API 抽象层。

1. **HTTP 层**：通用 HTTP 传输层（可复用于任何 API）
2. **API 层**：业务逻辑层（处理认证、编码/解码等）

## 架构概览

我们的 API 客户端采用一种分层架构：

```txt
┌─────────────────────────────────┐
│      Services Layer             │
│ (SearchService, UserService...) │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│       API Layer                 │
│  • APIClient protocol           │
│  • Business logic (auth, JSON)  │
│  • API-specific errors          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│       HTTP Layer                │
│  • HTTPClient protocol          │
│  • Generic HTTP transport       │
│  • HTTP-level errors            │
└─────────────────────────────────┘
```

**这种分层架构带来的优势：**

- **可测试性**：每一层都可以通过创建 mock 或 stub 独立测试
- **可复用性**：HTTP 层可以跨不同 API 项目复用
- **可维护性**：每一层职责单一，便于理解和修改

接下来，让我们从 HTTP 层开始构建。

## HTTP 层

HTTP 层只负责处理 网络底层传输，包括发送请求，处理响应并校验状态码。它不涉及具体 API 的认证机制或业务逻辑。

### HTTP 基础设施

首先，我们定义 HTTP 请求和响应的基础组件。

#### HTTP 请求方法

```swift
/// HTTP methods supported by the HTTP client.
public enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}
```

#### HTTP 请求与响应

```swift
/// A generic HTTP request.
public struct HTTPRequest: Sendable {
    public let url: URL
    public let method: HTTPMethod
    public let headers: [String: String]
    public let body: Data?
    public let timeoutInterval: TimeInterval
    
    public init(
        url: URL,
        method: HTTPMethod,
        headers: [String: String] = [:],
        body: Data? = nil,
        timeoutInterval: TimeInterval = 30
    ) {
        self.url = url
        self.method = method
        self.headers = headers
        self.body = body
        self.timeoutInterval = timeoutInterval
    }
}

/// A generic HTTP response.
public struct HTTPResponse: Sendable {
    public let statusCode: Int
    public let headers: [String: String]
    public let data: Data
}
```

#### HTTPError

`HTTPError` 定义了在传输层发生的错误：

```swift
/// Errors that can occur at the HTTP transport layer.
public enum HTTPError: LocalizedError, Sendable {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case badRequest(statusCode: Int, data: Data?)
    case unauthorized(statusCode: Int, data: Data?)
    case forbidden(statusCode: Int, data: Data?)
    case notFound(statusCode: Int, data: Data?)
    case serverError(statusCode: Int, data: Data?)
    case httpError(statusCode: Int, data: Data?)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid HTTP response"
        case .badRequest(let statusCode, _):
            return "Bad request (HTTP \(statusCode))"
        case .unauthorized(let statusCode, _):
            return "Unauthorized (HTTP \(statusCode))"
        case .forbidden(let statusCode, _):
            return "Forbidden (HTTP \(statusCode))"
        case .notFound(let statusCode, _):
            return "Not found (HTTP \(statusCode))"
        case .serverError(let statusCode, _):
            return "Server error (HTTP \(statusCode))"
        case .httpError(let statusCode, _):
            return "HTTP error (\(statusCode))"
        }
    }
}
```

### HTTPClient

虽然现在我们已经可以直接实现一个具体的类，但为了保持灵活性和可测试性，我们先定义一个协议：

```swift
/// Protocol for executing HTTP requests.
public protocol HTTPClient: Sendable {
    /// Performs an HTTP request and returns the raw HTTP response.
    func perform(_ request: HTTPRequest) async throws -> HTTPResponse
}
```

协议不仅便于在测试中进行 mock，还使传输层的实现可以灵活替换。我们在这里给出一种基于 `URLSession` 的实现：

```swift
/// URLSession-based implementation of HTTPClient.
public final class URLSessionHTTPClient: HTTPClient, Sendable {
    private let session: URLSession
    
    public init(session: URLSession = .shared) {
        self.session = session
    }
    
    public func perform(_ request: HTTPRequest) async throws -> HTTPResponse {
        var urlRequest = URLRequest(url: request.url)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.httpBody = request.body
        urlRequest.timeoutInterval = request.timeoutInterval
        
        for (key, value) in request.headers {
            urlRequest.setValue(value, forHTTPHeaderField: key)
        }
        
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            throw HTTPError.networkError(error)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw HTTPError.invalidResponse
        }
        
        let headers = httpResponse.allHeaderFields.reduce(into: [String: String]()) { result, entry in
            if let key = entry.key as? String, let value = entry.value as? String {
                result[key] = value
            }
        }
        
        let httpResponseData = HTTPResponse(
            statusCode: httpResponse.statusCode,
            headers: headers,
            data: data
        )
        
        // Validate status code and throw appropriate errors
        try validateResponse(httpResponseData)
        
        return httpResponseData
    }
    
    private func validateResponse(_ response: HTTPResponse) throws {
        switch response.statusCode {
        case 200...299:
            return
        case 400:
            throw HTTPError.badRequest(statusCode: response.statusCode, data: response.data)
        case 401:
            throw HTTPError.unauthorized(statusCode: response.statusCode, data: response.data)
        case 403:
            throw HTTPError.forbidden(statusCode: response.statusCode, data: response.data)
        case 404:
            throw HTTPError.notFound(statusCode: response.statusCode, data: response.data)
        case 500...599:
            throw HTTPError.serverError(statusCode: response.statusCode, data: response.data)
        default:
            throw HTTPError.httpError(statusCode: response.statusCode, data: response.data)
        }
    }
}
```

> **提示**：你可以在 HTTP 层中添加 Logging，或替换传输层实现（如 `URLSession`、`Alamofire` 等），而无需改动 API 层的代码。

现在我们将基于这个 HTTP 层，构建 API 层。

## API 层

API 层建立在 HTTP 层之上，增加了**具体业务逻辑**：身份认证、HTTP 请求构建、JSON 编解码，以及 API 相关的错误处理。

### API 基础设施

#### APIConfiguration

```swift
/// Configuration for the API client.
public struct APIConfiguration: Sendable {
    /// The base URL of the API instance.
    public let baseURL: URL
    /// API key for authentication.
    public let apiKey: String
    /// Request timeout interval in seconds.
    public let timeoutInterval: TimeInterval
    /// Whether to validate SSL certificates.
    public let validateSSL: Bool
    /// Additional headers to include with every request.
    public let additionalHeaders: [String: String]
    
    public init(
        baseURL: URL,
        apiKey: String,
        timeoutInterval: TimeInterval = 30,
        validateSSL: Bool = true,
        additionalHeaders: [String: String] = [:]
    ) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.timeoutInterval = timeoutInterval
        self.validateSSL = validateSSL
        self.additionalHeaders = additionalHeaders
    }
}
```

#### APIRequest 协议

```swift
/// Protocol defining an API request.
public protocol APIRequest: Sendable {
    associatedtype Response: Decodable & Sendable
    
    var path: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String]? { get }
    var body: Data? { get }
    var queryItems: [URLQueryItem]? { get }
}
```

我们可以为每个具体的 API 请求定义相应的响应类型，并创建符合 `APIRequest` 协议的类型。这使得我们能够通过泛型十分方便地实现通用 JSON 解码。

#### APIError

`APIError` 定义了在 API 层可能发生的错误：

```swift
/// Errors that can occur at the API layer (business logic).
public enum APIError: LocalizedError, Sendable {
    case decodingError(Error)
    case invalidURL
    
    public var errorDescription: String? {
        switch self {
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .invalidURL:
            return "Invalid URL"
        }
    }
}
```

> HTTP 错误（如 401、404 等）应该在 HTTP 层被抛出为 `HTTPError`，然后传递到 API 层进行处理。

### APIClient 实现

同样地，我们从协议开始：

```swift
/// Protocol for executing API-level requests.
public protocol APIClient: Sendable {
    /// Performs an API request and returns the decoded response.
    func perform<Request: APIRequest>(_ request: Request) async throws -> Request.Response
}
```

接下来是符合 `APIClient` 的具体实现，它将能够使用任意类型的 `HTTPClient`：

```swift
public final class YourAPIClient: APIClient, Sendable {
    // HTTPClient for transport
    private let httpClient: any HTTPClient
    // API configuration for base URL, API key, etc.
    private let configuration: APIConfiguration
    
    public init(httpClient: some HTTPClient, configuration: APIConfiguration) {
        self.httpClient = httpClient
        self.configuration = configuration
    }
    
    public func perform<Request: APIRequest>(_ request: Request) async throws -> Request.Response {
        // 1. Build HTTPRequest
        let httpRequest = try buildHTTPRequest(request)

        // 2. Execute HTTPRequest
        let httpResponse = try await httpClient.perform(httpRequest)
        
        // 3. Decode response
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(Request.Response.self, from: httpResponse.data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    private func buildHTTPRequest<Request: APIRequest>(_ request: Request) throws -> HTTPRequest {
        // 1. Construct full URL
        var components = URLComponents(url: configuration.baseURL, resolvingAgainstBaseURL: false)
        components?.path = request.path
        components?.queryItems = request.queryItems
        
        guard let url = components?.url else {
            throw APIError.invalidURL
        }
        
        // 2. Build headers with API key authorization
        var headers: [String: String] = [:]
        
        // 3. Add API key authorization
        headers["Authorization"] = "Bearer \(configuration.apiKey)"
        
        // 4. Add configuration headers
        for (key, value) in configuration.additionalHeaders {
            headers[key] = value
        }
        
        // 5. Add request-specific headers (can override)
        if let requestHeaders = request.headers {
            for (key, value) in requestHeaders {
                headers[key] = value
            }
        }
        
        return HTTPRequest(
            url: url,
            method: request.method,
            headers: headers,
            body: request.body,
            timeoutInterval: configuration.timeoutInterval
        )
    }
}
```

> **提示**: 我们在此处使用了无状态的设计，使得这个 `APIClient` 的实现可以安全地在多线程环境中使用。
> 我们还将 API 密钥等配置的管理交由用户负责，以提升灵活性和安全性。

`APIClient` 让我们拥有了通用的 API 处理能力：它可以处理所有遵循 `APIRequest` 协议的请求，统一负责身份认证、请求构建和 JSON 解码，**大幅简化了具体业务 (`Service`) 的实现**。

## 下一步

至此，我们已经为客户端库搭建了坚实的基础。下一篇文章中，我们将实现具体的 API 业务，他们将利用 `APIClient` 发起真实的 API 调用并向外提供易用的接口。

[阅读第 2 部分：编写服务层](/zh/posts/swift-api-client-part-2/)
