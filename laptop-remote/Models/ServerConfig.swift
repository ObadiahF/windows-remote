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

extension ServerConfig {
    private static let storageKey = "laptop-remote.server-config"

    static func load() -> ServerConfig {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let config = try? JSONDecoder().decode(ServerConfig.self, from: data)
        else { return .default }
        return config
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }
}
