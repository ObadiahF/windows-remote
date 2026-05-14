# Laptop Remote — Backend API

Contract between the iOS app and the Node backend.

## Connection

- **Base URL (LAN dev):** `http://<laptop-ip>:3000`
- **Socket.IO URL:** same host, default path `/socket.io/`
- **Transport:** Socket.IO v4 (use `socket.io-client-swift` ~16.x). HTTP long-poll fallback is enabled, WebSocket upgrade automatic.
- **Auth:** none yet. LAN-only assumption.

User configures the laptop's LAN IP in the app settings.

## HTTP

### `GET /health`
Liveness check before opening a socket.
```json
{ "status": "ok", "uptime": 12.34, "timestamp": "2026-05-13T23:25:54.583Z" }
```

## Platform behavior

- **Windows** is the real target — events actually press keys / paste text.
- **macOS** runs as a stub — every action just logs to the console and acks success. Useful for dev.

## Socket.IO Events

All client→server events accept an optional ack. Server replies with `{ok: true, ...}` on success or `{error: "<reason>"}` on validation/action failure. Always pass an ack so the phone knows the command landed.

### server → client

#### `welcome`
Sent on connect. `{ "clientId": "..." }`

#### `mute:state`
Pushed after every successful `media` action so the iOS UI stays in sync with the laptop's real audio state. Payload: `{ "muted": <bool> }`. On macOS this reflects a backend-side fake (toggle on `mute`, false on `volume_up`/`volume_down`); on Windows it's queried from the real audio endpoint via COM.

### client → server

#### `ping:echo`
Latency probe. Payload: anything. Ack: `{timestamp: <Date.now()>}`.

#### `paste`
Drop a final voice transcript into the focused window. Use this for the SFSpeechRecognizer flow.

| | |
|---|---|
| Payload | `{"text": "<string>"}` (bare string also accepted) |
| Ack ok | `{"ok": true, "length": N}` |
| Ack err | `{"error": "Missing \"text\" string"}` |

#### `direction`
Arrow keys + return for "select".

| | |
|---|---|
| Payload | `{"key": "up" \| "down" \| "left" \| "right" \| "select"}` |
| Ack ok | `{"ok": true}` |
| Ack err | `{"error": "Invalid \"key\". Must be one of: up, down, left, right, select"}` |

#### `media`
Media keys.

| | |
|---|---|
| Payload | `{"action": "play_pause" \| "volume_up" \| "volume_down" \| "mute"}` |
| Ack ok | `{"ok": true}` |
| Ack err | `{"error": "Invalid \"action\". Must be one of: play_pause, volume_up, volume_down, mute"}` |

#### `system`
System actions. `sleep` = lock/sleep the machine. `back` = Esc / browser-back equivalent.

| | |
|---|---|
| Payload | `{"action": "sleep" \| "back"}` |
| Ack ok | `{"ok": true}` |
| Ack err | `{"error": "Invalid \"action\". Must be one of: sleep, back"}` |

#### `keyboard:type`
Type a string into the focused window. Designed to be streamed per-character as the user types, but any non-empty string is valid.

| | |
|---|---|
| Payload | `{"text": "<non-empty string>"}` |
| Ack ok | `{"ok": true}` |
| Ack err | `{"error": "Missing \"text\" string"}` |

#### `keyboard:backspace`
Press Backspace.

| | |
|---|---|
| Payload | `{}` (or none) |
| Ack ok | `{"ok": true}` |

#### `mute:state:query`
Pull the current mute state from the laptop. Fire on app foreground / socket reconnect to resync after the app was backgrounded.

| | |
|---|---|
| Payload | `{}` (or none) |
| Ack ok | `{"ok": true, "muted": <bool>}` |
| Ack err | `{"error": "<reason>"}` |

## Swift quickstart (socket.io-client-swift)

```swift
import SocketIO

let manager = SocketManager(
    socketURL: URL(string: "http://192.168.1.42:3000")!,
    config: [.log(false), .compress]
)
let socket = manager.defaultSocket

socket.on(clientEvent: .connect) { _, _ in print("connected") }
socket.on("welcome") { data, _ in print("welcome:", data) }
socket.connect()

// emit with ack
socket.emitWithAck("direction", ["key": "up"]).timingOut(after: 2) { ack in
    print("direction ack:", ack)
}

socket.emitWithAck("paste", ["text": transcript]).timingOut(after: 5) { ack in
    print("paste ack:", ack)
}
```

## iOS-side notes

- Run `SFSpeechRecognizer` on-device. Send only the **final** transcript via `paste`, one emit per utterance.
- For `keyboard:type` streaming, debounce isn't required — Socket.IO handles ordering. But coalesce when possible (one emit per keystroke is fine; one per paragraph is fine too).
- Persist the laptop IP. socket.io-client auto-reconnects.
- Reflect ack `ok`/`error` in the UI so the user sees when an action lands or fails.
