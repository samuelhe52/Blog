---
title: "Building a Swift API Client Library: Part 2"
description: "Learn how to build a clean, layered API client in Swift using powerful features like Generics, Codable, and Swift Concurrency."
date: 2025-11-20
lang: "en"
translationSlug: "swift-api-client-part-2"
author: "konakona"
---

In the [previous post](/en/posts/swift-api-client-part-1/), we laid the groundwork for our Swift API client library by defining `HTTPClient` and `APIClient`. Now, we'll dive into how to leverage these components to create clean, focused service layers.

For demonstration purposes, we'll introduce a hypothetical `UserService` that interacts with a user management API, demonstrating best practices for designing a service layer; and then we discuss testing strategies for our library.

## UserService Design

### Endpoints & APIRequest types

In our architecture, every API endpoint corresponds to a specific struct that conforms to the `APIRequest` protocol. This design pattern separates the *definition* of a request from its *execution*.

These request structs are lightweight and declarative. They don't perform network calls themselves; they simply hold the data required to make one (path, method, parameters). This leaves the heavy lifting of authentication, URL construction, and JSON decoding to the shared `APIClient`.

Crucially, each request defines its own `Response` type via an associated type. This tells the compiler exactly what kind of object to expect when this request completes, providing end-to-end type safety.

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

> **Tip**: The definition of the `APIRequest` protocol can be found in the previous post.

By keeping the request logic isolated in these structs, our service code becomes incredibly clean, as we'll see later.

### Models & CodingKeys

Next, we define the data models that match our API responses. We use Swift's `Codable` protocol to handle JSON serialization and deserialization automatically.

A common pain point about mapping JSON to native structs is that Swift follows `camelCase` naming conventions, while many web APIs use `snake_case`. We can bridge this gap using `CodingKeys`. This allows us to keep our Swift code idiomatic (e.g., `avatarURL`) while correctly mapping to the API's JSON keys (e.g., `avatar_url`).

> **Tip**: Foundation's `JSONDecoder` is versatile and provides functionality to automatically convert snake_case to camelCase via its `keyDecodingStrategy`. While we could use a customized serializer to handle this globally, configuring that is beyond the scope of this post, so we'll stick to explicit `CodingKeys` here.

We also conform our models to `Sendable`, which is essential for strict concurrency safety in Swift 6.

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

Pagination is widely used in web APIs, so we create a generic `Page<T>` model to represent paginated responses. You can use it with any Codable model, like `User` in this case.

Now we have models that can be used as responses for our requests!

### UserService Implementation

We now go on to implement the `UserService` class. Notice that we don't define a `UserServiceProtocol`. In many Swift projects, developers instinctively create protocols for every service to enable mocking. However, since we already have a protocol-based `APIClient` (from Part 1), we can mock the *network layer* instead of the *service layer*. This saves us from maintaining protocol definitions for every service we define, and still preserves testability.

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

## The Client Entry Point

To make our library easy to use, we provide a single entry point: the `MyServiceClient` class. This class manages the configuration and holds instances of all our services. This pattern aids discoverability—users just type `client.` and see all available services.

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

## Testing the Service

Testing is critical for an API client. We want to ensure our requests are built correctly and our response parsing works. There are two main types of tests we can and should write: **unit tests and integration tests.**

### Mocking the APIClient

Since our services depend on `APIClient`, we can inject a mock that captures requests and returns predefined responses.

```swift
final class MockAPIClient: APIClient, @unchecked Sendable {
    private var mockResponse: Any?
    private(set) var lastPath: String?
    private(set) var lastQueryItems: [URLQueryItem]?
    private var mockError: Error?

    func perform<Request: APIRequest>(_ request: Request) async throws -> Request.Response {
        lastPath = request.path
        lastQueryItems = request.queryItems
        
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
}
```

### Unit Tests

To keep our tests organized, we should create a `Suite` for each service. Since Swift Testing runs tests in parallel by default, we should create a fresh `MockAPIClient` instance inside each test case to ensure isolation.

We verify that `UserService` calls the correct endpoint and returns the expected model.

```swift
@Suite("UserService Tests")
struct UserServiceTests {
    @Test("List users sends correct parameters")
    func listUsers() async throws {
        let mock = MockAPIClient()
        let service = UserService(apiClient: mock)
        
        mock.setMockResponse(Page<User>(page: 1, results: [], totalPages: 1, totalResults: 0))
        
        _ = try await service.listUsers(page: 2, query: "swift")
        
        #expect(mock.lastPath == "/v1/users")
        
        let items = try #require(mock.lastQueryItems)
        #expect(items.contains { $0.name == "page" && $0.value == "2" })
        #expect(items.contains { $0.name == "q" && $0.value == "swift" })
    }
    
    @Test("Get user returns correct user")
    func getUser() async throws {
        let mock = MockAPIClient()
        let service = UserService(apiClient: mock)
        
        let user = User(
            id: "123", 
            name: "Swift", 
            email: "swift@example.com", 
            avatarURL: nil, 
            createdAt: 0, 
            updatedAt: 0
        )
        mock.setMockResponse(user)
        
        let response = try await service.getUser(id: "123")
        
        #expect(response.id == "123")
        #expect(mock.lastPath == "/v1/users/123")
    }
}
```

### Integration Tests

While unit tests are great for verifying logic, nothing beats hitting the real API to ensure your client actually works with the server. This is where integration tests come in. However, integration tests come with challenges: they are slower, require network access, and need valid credentials.

To handle credentials safely, we can read them from environment variables. This prevents accidental VCS commits of API keys.

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

Then, we can write a test that uses the real network. Note that we should be using the real `URLSession`-based client here, not the mock.

Also, **disabling parallel execution for integration tests is strongly recommended**. Unlike isolated unit tests, integration tests often share external resources (like a database on a staging server). Running them in parallel can cause race conditions (e.g., one test deleting a user while another tries to fetch it), leading to flaky tests. In Swift Testing, we can enforce this using the `.serialized` trait.

Furthermore, we should create a separate integration test Suite for each service. This allows us to check the configuration and initialize the `APIClient` once in the `init`, reusing the instance across multiple test cases.

```swift
@Suite("UserService Integration Tests", .serialized)
struct UserServiceIntegrationTests {
    let client: MyServiceClient

    init() throws {
        // Skip if no API key is present (e.g. in CI without secrets)
        try #require(!IntegrationTestConfig.apiKey.isEmpty)
        
        self.client = MyServiceClient(
            baseURL: IntegrationTestConfig.baseURL, 
            apiKey: IntegrationTestConfig.apiKey
        )
    }

    @Test("List Users")
    func listUsers() async throws {
        let page = try await client.users.listUsers(page: 1)
        #expect(!page.results.isEmpty)
    }

    @Test("Get User")
    func getUser() async throws {
        // First get a user ID from the list
        let page = try await client.users.listUsers(page: 1)
        let firstUser = try #require(page.results.first)
        
        // Then verify we can fetch specific details
        let user = try await client.users.getUser(id: firstUser.id)
        #expect(user.id == firstUser.id)
    }
}
```

These tests give you the final seal of approval that your code works in the real world.

## Conclusion

Over the course of these two posts, we've built a robust Swift API client from the ground up.

In **Part 1**, we established a strong foundation with a generic `HTTPClient` and a protocol-based `APIClient` that handles the heavy lifting of authentication and decoding.

In **Part 2**, we built upon that foundation to create a clean, user-friendly service layer. We saw how to:

- Define type-safe `APIRequest` structs.
- Map JSON to Swift models using `Codable`.
- Group related functionality into `Service` classes.
- Unify everything under a single `MyServiceClient`.
- Verify our logic with both unit and integration tests.

This layered architecture might seem like a lot of boilerplate for a small app, but it pays dividends as your project grows. By separating *how* a request is sent/handled from *what* the request is, you gain the flexibility to swap out networking stacks, mock responses for testing, and add new endpoints with minimal effort.

I hope this series can be a source of inspiration for building your own Swift API clients. Happy coding!
