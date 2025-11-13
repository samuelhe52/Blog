---
title: "构建 Swift API 客户端库：第一部分"
description: "学习如何利用 Swift 的 Generics、Codable 和并发，构建整洁、分层、可扩展的 API 客户端。"
date: 2025-11-12
lang: "zh-CN"
translationSlug: "swift-api-client-part-1"
author: "konakona"
---

RESTful API 驱动的 Web 服务是现代应用的基石，如何以原生方式高效地与其交互至关重要。API 客户端库正是解决这一问题的关键。本文将深入探讨如何利用 Swift 的强大特性——泛型（Generics）、Codable 协议以及 Swift 并发——构建一个清晰、分层、可扩展的 API 客户端库。

本系列的第一部分将重点讲解如何搭建 API 客户端的基础层：

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

- **可测试性**：每一层都可以通过 mock 或 stub 独立测试
- **可复用性**：HTTP 层可以跨不同 API 项目复用
- **可维护性**：清晰的职责分离使代码更易理解和修改

接下来，让我们自底向上逐层构建。

## HTTP 层

HTTP 层负责“纯粹的 HTTP 传输”：发送请求、处理响应并校验状态码。它对具体 API 的认证或业务逻辑一无所知。

### HTTP 基础设施

首先，我们定义 HTTP 请求和响应的基础组件。

#### HTTP 方法枚举

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

#### HTTP 错误

HTTP 错误代表“传输层失败”：

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

### HTTPClient 实现

虽然可以直接实现一个具体的类，但我们从协议入手，以获得**更好的可测试性和抽象能力**：

```swift
/// Protocol for executing HTTP requests.
public protocol HTTPClient: Sendable {
    /// Performs an HTTP request and returns the raw HTTP response.
    func perform(_ request: HTTPRequest) async throws -> HTTPResponse
}
```

协议不仅便于在测试中进行 mock，还使底层网络实现可以灵活替换。下面是基于 `URLSession` 的实现：

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

> **提示**：你可以在 HTTP 层中添加日志记录功能，或替换底层网络实现（如 `URLSession`、`Alamofire` 等），而无需改动 API 层的代码。

**至此，我们的 HTTP 层已经完成！它提供了一个简洁、可复用的 HTTP 传输抽象。**

## API 层

API 层构建在 HTTP 层之上，增加了**业务逻辑**：身份认证、请求构建、JSON 编解码，以及 API 特定的错误处理。

### API 基础设施

#### API 配置

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

#### API 请求协议

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

通过这个协议，我们可以使用**关联类型（Associated Types）**定义类型安全的 API 请求，并根据期望的响应类型自动完成 JSON 解码。

#### API 错误

API 错误代表“业务层失败”：

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

> **注意**：HTTP 错误（如 401、404 等）会抛出 `HTTPError`，而非 `APIError`，这样保持了层次间的清晰分离。

### APIClient 实现

同样地，我们从协议开始：

```swift
/// Protocol for executing API-level requests.
public protocol APIClient: Sendable {
    /// Performs an API request and returns the decoded response.
    func perform<Request: APIRequest>(_ request: Request) async throws -> Request.Response
}
```

使用任意 `HTTPClient` 的具体实现如下：

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

通过这个 `APIClient` 实现，我们获得了一个高度可复用的层：它可以处理所有遵循 `APIRequest` 协议的请求，统一负责身份认证、请求构建和 JSON 解码，**从而大幅简化具体业务 Service 的实现**。

## 下一步

至此，我们已经为客户端库搭建了坚实的基础。在本系列的下一篇文章中，我们将聚焦于实现具体的 API 服务层，利用 `APIClient` 发起真实的 API 调用。

敬请期待！
