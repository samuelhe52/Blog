---
title: "编写 Swift API 客户端库（二）"
description: "学习如何利用泛型、Swift Concurrency 以及 Codable 协议，优雅高效地编写 Web API 客户端。"
date: 2025-11-16
lang: "zh-CN"
translationSlug: "swift-api-client-part-2"
author: "konakona"
---

在[上一篇文章](/zh/posts/swift-api-client-part-1/)中，我们通过定义 `HTTPClient` 和 `APIClient` 为 Swift API 客户端库奠定了基础。现在，我们将深入探讨如何利用这些基础组件来创建具体的 API 客户端，以便与特定的 Web API 进行交互。

## 概览与目标

在这篇文章中，我们将把第一部分中通用的 `HTTPClient`/`APIClient` 为轻量、职责专一的服务层，并提供一个聚合所有服务的 API 供上层业务调用。首先，我们引入一个假想的 `UserService` 来演示设计服务层的最佳实践，然后讨论如何为我们的库编写测试。

## UserService 设计

### Endpoint 与 APIRequest 类型

在我们的架构中，每个 API Endpoint 都对应一个遵循 `APIRequest` 协议的特定结构体。这种设计模式将请求的*定义*与其*执行*分离开来。

这些请求结构体是轻量且声明式的。它们不执行网络调用，仅保存发起调用所需的数据（路径、方法、参数）。这使得身份验证、URL 构建和 JSON 解码等繁重工作交由共享的 `APIClient` 处理。

至关重要的是，每个请求都通过 `associatedtype` 定义了自己的 `Response` 类型。这告诉编译器当请求完成时应期望什么样的对象，从而提供端到端的类型安全。

```swift
struct GetUserRequest: APIRequest {
    // This request will always return a 'User' object
    typealias Response = User
    
    let id: String
    
    var path: String { "/v1/users/\(id)" }
    var method: HTTPMethod { .get }
    
    // We can use default implementations for these, 
    // but here we show them for clarity.
    var headers: [String: String]? { nil }
    var body: Data? { nil }
    var queryItems: [URLQueryItem]? { nil }
}

struct ListUsersRequest: APIRequest {
    // This request returns a paginated list of users
    typealias Response = Page<User>
    
    let page: Int
    let perPage: Int
    let query: String?
    
    var path: String { "/v1/users" }
    var method: HTTPMethod { .get }
    var headers: [String: String]? { nil }
    var body: Data? { nil }
    
    var queryItems: [URLQueryItem]? {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "per_page", value: String(perPage))
        ]
        if let q = query, !q.isEmpty { 
            items.append(URLQueryItem(name: "q", value: q)) 
        }
        return items
    }
}
```

通过将请求逻辑隔离在这些结构体中，我们的服务层代码变得非常整洁，稍后我们将看到这一点。

### 模型与 CodingKeys

接下来，我们定义与 API 响应匹配的数据模型。我们使用 Swift 的 `Codable` 协议来自动处理 JSON 的序列化和反序列化。

Swift 遵循 `camelCase`，而许多 Web API 使用 `snake_case`。我们使用 `CodingKeys` 来解决这一差异。这允许我们保持 Swift 代码的惯用风格（例如 `avatarURL`），同时正确映射到 API 的 JSON Key（例如 `avatar_url`）。

> **提示**：Foundation 的 `JSONDecoder` 十分强大，用户可以通过 `keyDecodingStrategy` 自动将 `snake_case` 转换为 `camelCase`。虽然我们可以使用自定义 `JSONDecoder` 在全局范围内处理此问题，但这超出了本文的讨论范围，因此我们将在此处采用显式的 `CodingKeys`。

我们还让模型遵循 `Sendable`，这对于 Swift 6 中的严格并发安全至关重要。

```swift
public struct User: Codable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let email: String
    public let avatarURL: URL?
    public let createdAt: Int
    public let updatedAt: Int

    enum CodingKeys: String, CodingKey {
        case id, name, email
        // Map JSON keys to Swift property names
        case avatarURL = "avatar_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

```swift
public struct Page<T: Codable & Sendable>: Codable, Sendable {
    public let page: Int
    public let results: [T]
    public let totalPages: Int
    public let totalResults: Int

    enum CodingKeys: String, CodingKey {
        case page, results
        case totalPages = "total_pages"
        case totalResults = "total_results"
    }
}
```

分页在 Web API 中广泛使用，因此我们创建了一个通用的 `Page<T>` 模型来表示分页响应。你可以将其与任何 Codable 模型一起使用，例如本例中的 `User`。

至此，我们的响应模型已准备就绪！

### UserService 实现

现在我们继续实现 `UserService` 本身。我们并没有定义 `UserServiceProtocol`。在许多 Swift 项目中，开发者会本能地为每个服务创建协议以支持 Mock。然而，由于我们已经有了一个基于协议的 `APIClient`（来自第一部分），我们可以 mock *网络层*而不是*服务层*。这使我们免于为每个服务维护一个协议，同时仍然保留了可测试性。

```swift
public final class UserService: Sendable {
    private let apiClient: any APIClient

    // Internal init: Users should access this via the main Client
    init(apiClient: some APIClient) {
        self.apiClient = apiClient
    }

    public func getUser(id: String) async throws -> User {
        let request = GetUserRequest(id: id)
        return try await apiClient.perform(request)
    }

    public func listUsers(
        page: Int = 1,
        perPage: Int = 20,
        query: String? = nil
    ) async throws -> Page<User> {
        let request = ListUsersRequest(page: page, perPage: perPage, query: query)
        return try await apiClient.perform(request)
    }
}
```

## 客户端入口

为了使我们的库易于使用，我们提供一个单一的服务入口：`MyServiceClient`。这个类管理 API 相关配置并持有我们所有服务的实例。这种模式让 API 更加易于探索（便于代码提示）——用户只需输入 `client.` 即可查看所有可用服务。

```swift
public final class MyServiceClient: Sendable {
    public let configuration: APIConfiguration
    private let apiClient: any APIClient

    // Services
    public let users: UserService

    // 1. Convenience init for simple usage
    public convenience init(baseURL: URL, apiKey: String) {
        let config = APIConfiguration(baseURL: baseURL, apiKey: apiKey)
        self.init(configuration: config)
    }

    // 2. Init that builds the default stack
    public convenience init(configuration: APIConfiguration) {
        // Create a URLSession configuration that respects our API settings
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = configuration.timeoutInterval
        sessionConfig.timeoutIntervalForResource = configuration.timeoutInterval
        
        let session = URLSession(configuration: sessionConfig)
        let httpClient = URLSessionHTTPClient(session: session)
        let client = TokenAuthAPIClient(httpClient: httpClient, configuration: configuration)
        
        self.init(apiClient: client, configuration: configuration)
    }
    
    // 3. Designated init for dependency injection
    // This allows us to inject a MockAPIClient or a custom implementation
    public init(apiClient: some APIClient, configuration: APIConfiguration) {
        self.apiClient = apiClient
        self.configuration = configuration
        
        // Initialize services
        self.users = UserService(apiClient: apiClient)
        // And any future services go here...
    }
}
```

## 测试服务

测试对于 API 客户端至关重要。我们要确保在不访问真实 API 的情况下，请求能被正确构建并且响应能被正确解析。

### Mock APIClient

由于我们的服务依赖于 `APIClient`，我们可以注入一个 Mock 对象来模拟请求并返回预定义的响应。

```swift
final class MockAPIClient: APIClient, @unchecked Sendable {
    private var mockResponse: Any?
    private var lastRequest: String?
    private var mockError: Error?

    func perform<Request: APIRequest>(_ request: Request) async throws -> Request.Response {
        lastRequest = request.path
        if let error = mockError {
            throw error
        }
        guard let response = mockResponse as? Request.Response else {
            throw URLError(.badServerResponse)
        }
        return response
    }

    func setMockResponse<Response>(_ response: Response) {
        self.mockResponse = response
    }

    func setMockError(_ error: Error) {
        self.mockError = error
    }

    func getLastRequest() -> String? {
        return lastRequest
    }
}
```

### 单元测试

接下来我们使用 `MockAPIClient` 验证 `UserService` 是否调用了正确的 API Endpoint 并返回了预期的模型。

```swift
@Test("List users sends correct parameters")
func testListUsers() async throws {
    let mock = MockAPIClient()
    mock.setMockResponse(Page<User>(page: 1, results: [], totalPages: 1, totalResults: 0))
    
    let service = UserService(apiClient: mock)
    _ = try await service.listUsers(page: 2, query: "swift")
    
    // Verify the request path/query was correct (implementation details of MockAPIClient may vary)
    #expect(mock.getLastRequest() == "/v1/users")
}
```

### 集成测试

虽然单元测试非常适合验证逻辑，但没有什么比访问真实 API 更能确保客户端与服务器实际协同工作了。然而，编写集成测试也有一些痛点：速度较慢，需要网络访问，并且需要有效的身份验证凭据。

为了安全地处理凭据，我们可以从环境变量中读取它们。这可以防止在 VCS 中意外提交 API 密钥。

```swift
struct IntegrationTestConfig {
    static var baseURL: URL {
        URL(string: ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://api.example.com")!
    }
    
    static var apiKey: String {
        ProcessInfo.processInfo.environment["API_KEY"] ?? ""
    }
}
```

然后，我们可以编写一个使用真实网络的测试。注意，这里我们使用的是基于真实 `URLSession` 的客户端，而不是 Mock。

```swift
@Test("Real API: List Users")
func testLiveFetch() async throws {
    // Skip if no API key is present (e.g. in CI without secrets)
    try #require(!IntegrationTestConfig.apiKey.isEmpty)
    
    let client = MyServiceClient(
        baseURL: IntegrationTestConfig.baseURL, 
        apiKey: IntegrationTestConfig.apiKey
    )
    
    let page = try await client.users.listUsers(page: 1)
    
    #expect(!page.results.isEmpty)
}
```

这些测试确保代码在真实环境中也能正常工作。

## 总结

在这两篇文章中，我们从零开始构建了一个健壮的 Swift API 客户端。

在**第一部分**中，我们建立了一个坚实的基础，包括通用的 `HTTPClient` 和基于协议的 `APIClient`，用于处理身份验证和解码等繁重、重复性高的工作。

在**第二部分**中，我们在此基础上构建了一个易于扩展、用户友好的服务层。我们讨论了如何：

- 定义类型安全的 `APIRequest` 结构体。
- 使用 `Codable` 将 JSON 映射到 Swift 模型。
- 将相互关联的功能分组到 `Service` 类中。
- 将所有 `Service` 统一在单个 `MyServiceClient` 下。
- 通过单元测试和集成测试验证逻辑正确性。

对于小型应用来说，这种分层架构可能看起来有些繁琐，但随着项目规模扩大，这样的设计将带来回报。通过将请求的发送、请求的处理与请求的实际内容分离开来，你可以随意更换底层网络实现、通过 Mock 响应编写测试、并在添加新 Endpoint 的实现免去了大部分模版代码。

希望本系列能对你有所启发。Happy coding!
