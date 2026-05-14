import Foundation

enum DirectionKey: String, Codable {
    case up, down, left, right, select
}

enum MediaAction: String, Codable {
    case playPause = "play_pause"
    case volumeUp = "volume_up"
    case volumeDown = "volume_down"
    case mute
}

enum SystemAction: String, Codable {
    case sleep
    case back
}

enum RemoteCommand: CustomStringConvertible {
    case direction(DirectionKey)
    case media(MediaAction)
    case system(SystemAction)
    case typeText(String)
    case backspace

    var description: String {
        switch self {
        case .direction(let key): "direction(\(key.rawValue))"
        case .media(let action):  "media(\(action.rawValue))"
        case .system(let action): "system(\(action.rawValue))"
        case .typeText(let text): "typeText(\(text.debugDescription))"
        case .backspace:          "backspace"
        }
    }
}
