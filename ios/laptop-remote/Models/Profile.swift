import Foundation

struct Profile: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var name: String
    var host: String
    var port: Int

    init(id: UUID = UUID(), name: String, host: String, port: Int) {
        self.id = id
        self.name = name
        self.host = host
        self.port = port
    }

    static let defaultProfile = Profile(name: "Laptop", host: "192.168.1.100", port: 3000)

    var serverConfig: ServerConfig {
        ServerConfig(host: host, port: port)
    }

    var subtitle: String {
        "\(host):\(port)"
    }
}
