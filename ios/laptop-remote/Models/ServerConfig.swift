import Foundation

struct ServerConfig: Codable, Equatable {
    var host: String
    var port: Int

    static let `default` = ServerConfig(host: "192.168.1.100", port: 3000)

    var socketURL: URL? {
        var components = URLComponents()
        components.scheme = "http"
        components.host = host
        components.port = port
        return components.url
    }

    var healthURL: URL? {
        socketURL?.appendingPathComponent("health")
    }
}
