---
title: "Building a Swift API Client Library: Part 1"
description: "Learn how to build a clean, layered API client in Swift using powerful features like Generics, Codable, and Swift Concurrency."
date: 2025-11-12
lang: "en"
translationSlug: "swift-api-client-part-1"
author: "konakona"
---

Web services that utilize RESTful APIs are often the backbone of modern applications, and efficiently interacting with them in a native manner is crucial. That's where API client libraries come into play. In this post, we'll explore how to leverage Swift's powerful features, such as Generics, Codable, and Swift Concurrency, to create a clean, layered, and extensible API client library.

In this first part of the series, we will focus on building the foundational layers of our API client:

1. **HTTP Layer**: Generic HTTP transport (reusable for any API)
2. **API Layer**: Business-specific logic (authentication, encoding/decoding)

This separation of concerns gives us better testability, reusability, and maintainability.

## Architecture Overview

Our API client follows a **layered architecture**:

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

**Benefits of this approach:**

With this setup, we achieve several key benefits:

- **Testability**: Each layer can be tested independently with mocks/stubs.
- **Reusability**: The HTTP layer can be reused across different APIs.
- **Maintainability**: Clear separation of concerns makes it easier to reason about and modify.

Now let's build each layer from the ground up.

## HTTP Layer

The HTTP layer is responsible for **pure HTTP transport**: sending requests, handling responses, and validating status codes. It knows nothing about your specific API's authentication or business logic.

### HTTP Infrastructure

First, we define the building blocks for HTTP requests and responses.

#### HTTP Method

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

#### HTTP Request & Response

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

#### HTTP Error

HTTP errors represent **transport-level failures**:

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

### HTTPClient Implementation

Now we can implement the HTTP client. Although you can certainly implement a concrete class directly, we start with a protocol for **better testability and abstraction**:

```swift
/// Protocol for executing HTTP requests.
public protocol HTTPClient: Sendable {
    /// Performs an HTTP request and returns the raw HTTP response.
    func perform(_ request: HTTPRequest) async throws -> HTTPResponse
}
```

The protocol not only allows for easy mocking in tests, but it also makes underlying networking implementations interchangeable. Here, we provide a `URLSession`-based implementation:

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

> **Tip**: You can extend this HTTP layer with logging, or swapping out the networking backend (e.g., using `URLSession`, `Alamofire`, etc.) without affecting the API layer.

**And that's our HTTP layer! It provides a clean, reusable abstraction over HTTP transport.**

## API Layer

The API layer sits on top of the HTTP layer and adds **business logic**: authentication, request building, JSON encoding/decoding, and API-specific error handling.

### API Infrastructure

#### API Configuration

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

#### API Request Protocol

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

This protocol allows us to define type-safe API requests with **associated types** for responses, enabling automatic JSON decoding based on the expected response type.

#### API Error

API errors represent **business-level failures**:

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

> **Note**: HTTP errors (401, 404, etc.) are thrown as `HTTPError`, not `APIError`. This keeps the separation clean.

### APIClient Implementation

Again, we start with a protocol:

```swift
/// Protocol for executing API-level requests.
public protocol APIClient: Sendable {
    /// Performs an API request and returns the decoded response.
    func perform<Request: APIRequest>(_ request: Request) async throws -> Request.Response
}
```

Now the implementation that uses any `HTTPClient`:

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

With this implementaion of `APIClient`, we now have a reusable layer that can handle any API request defined by the `APIRequest` protocol. It handles authentication, request construction, and JSON decoding, **streamlining the following process of implementing specific API services**.

## What's Next

So far, we have built a solid foundation for our library. In the next part of this series, we focus on implementing specific API services that utilize `APIClient` to perform real API calls.

Stay tuned!
