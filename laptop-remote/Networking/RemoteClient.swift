import Foundation
import OSLog
import SocketIO

private let log = Logger(subsystem: "com.obadiahfusco.laptop-remote", category: "remote")

enum ConnectionStatus: Equatable {
    case unknown
    case connecting
    case connected
    case failed(String)
}

@MainActor
@Observable
final class RemoteClient {
    var config: ServerConfig {
        didSet {
            config.save()
            if config != oldValue { rebuildSocket() }
        }
    }

    var status: ConnectionStatus = .unknown

    private var manager: SocketManager?
    private var socket: SocketIOClient?
    private let httpSession: URLSession

    init(config: ServerConfig = .load()) {
        self.config = config
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 5
        self.httpSession = URLSession(configuration: cfg)
        rebuildSocket()
        socket?.connect()
    }

    // MARK: - Public API

    func send(_ command: RemoteCommand) {
        let (event, payload) = wire(for: command)
        log.info("→ \(command, privacy: .public) emit \(event, privacy: .public) body=\(String(describing: payload), privacy: .public)")

        guard let socket, socket.status == .connected else {
            log.error("✗ \(command, privacy: .public) — socket not connected")
            return
        }

        socket.emitWithAck(event, payload).timingOut(after: 5) { ack in
            log.info("ack \(event, privacy: .public): \(String(describing: ack), privacy: .public)")
        }
    }

    /// Health check via HTTP. Also reconnects the socket so the UI status reflects reality.
    func ping() async {
        log.info("→ ping GET /health")
        status = .connecting

        guard let url = config.healthURL else {
            status = .failed("Invalid server")
            return
        }

        do {
            let (_, response) = try await httpSession.data(from: url)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                status = .failed("Server returned non-2xx")
                log.error("✗ /health non-2xx")
                return
            }
            log.info("✓ /health ok")
            // Reconnect socket; final state will be set via socket events.
            socket?.disconnect()
            socket?.connect()
        } catch {
            status = .failed(error.localizedDescription)
            log.error("✗ /health — \(error.localizedDescription, privacy: .public)")
        }
    }

    // MARK: - Socket lifecycle

    private func rebuildSocket() {
        socket?.disconnect()
        manager = nil
        socket = nil

        guard let url = config.socketURL else { return }

        let manager = SocketManager(socketURL: url, config: [.log(false), .compress, .reconnects(true)])
        let socket = manager.defaultSocket
        self.manager = manager
        self.socket = socket

        socket.on(clientEvent: .connect) { [weak self] _, _ in
            Task { @MainActor in
                self?.status = .connected
                log.info("socket connected")
            }
        }
        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            Task { @MainActor in
                self?.status = .unknown
                log.info("socket disconnected")
            }
        }
        socket.on(clientEvent: .error) { [weak self] data, _ in
            Task { @MainActor in
                let msg = (data.first as? String) ?? "socket error"
                self?.status = .failed(msg)
                log.error("socket error: \(msg, privacy: .public)")
            }
        }
        socket.on("welcome") { data, _ in
            log.info("welcome: \(String(describing: data), privacy: .public)")
        }
    }

    // MARK: - Wire mapping

    private func wire(for command: RemoteCommand) -> (String, [String: Any]) {
        switch command {
        case .direction(let dir):
            return ("direction", ["key": dir.rawValue])
        case .media(let action):
            return ("media", ["action": action.rawValue])
        case .system(let action):
            return ("system", ["action": action.rawValue])
        case .typeText(let text):
            return ("keyboard:type", ["text": text])
        case .backspace:
            return ("keyboard:backspace", [:])
        }
    }
}
