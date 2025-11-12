---
title: "使用 Swift 泛型与 Codable 编写 API 客户端库（一）"
description: "介绍如何借助泛型、Codable 及 Swift 并发，在 Swift 中优雅地编写 API 客户端库。"
date: 2025-11-10
lang: "zh-CN"
translationSlug: "swift-api-client-part-1"
author: "konakona"
---

使用 RESTful API 的 Web 服务常常是现代应用程序的基础。在本文中，我们将探讨如何利用 Swift 强大的泛型、Codable 以及 Swift 并发特性，来编写一个简洁且可扩展的 API 客户端库。

## HTTPClient

为了实现与 Web 服务的通信以及对 API 返回的 JSON 数据进行搞笑解码，我们首先需要创建 `HTTPClient` 类。这个类将负责发送请求，处理相应并解码数据。

首先，我们定义 HTTP 的请求方法：

```swift
public enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}
```

接下来，定义一个 `APIRequest` 结构体，用于封装请求以及