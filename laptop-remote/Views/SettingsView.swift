import SwiftUI

struct SettingsView: View {
    @Environment(RemoteClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var host = ""
    @State private var portText = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Server") {
                    LabeledContent("Host") {
                        TextField("192.168.1.100", text: $host)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Port") {
                        TextField("3000", text: $portText)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                }

                Section {
                    Button("Save & Test Connection") {
                        save()
                        Task { await client.ping() }
                    }
                    statusRow
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear(perform: load)
        }
    }

    @ViewBuilder
    private var statusRow: some View {
        switch client.status {
        case .unknown:
            Label("Not tested yet", systemImage: "questionmark.circle")
                .foregroundStyle(.secondary)
        case .connecting:
            Label("Connecting…", systemImage: "arrow.triangle.2.circlepath")
                .foregroundStyle(.secondary)
        case .connected:
            Label("Connected", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .failed(let msg):
            Label(msg, systemImage: "xmark.octagon.fill")
                .foregroundStyle(.red)
        }
    }

    private func load() {
        host = client.config.host
        portText = String(client.config.port)
    }

    private func save() {
        let port = Int(portText) ?? client.config.port
        client.config = ServerConfig(
            host: host.trimmingCharacters(in: .whitespaces),
            port: port
        )
    }
}
