import SwiftUI

struct ContentView: View {
    @State private var store = ProfileStore()
    @State private var client = RemoteClient()
    @State private var showSettings = false
    @State private var showKeyboard = false
    @State private var confirmPower = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 36) {
                DPad { dir in send(.direction(dir)) }
                    .frame(maxWidth: 280)

                VolumeRow { send(.media($0)) }

                MediaRow(
                    onPlayPause: { send(.media(.playPause)) },
                    onBack: { send(.system(.back)) },
                    onKeyboard: {
                        Haptics.tap()
                        showKeyboard = true
                    }
                )
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle(store.active.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Haptics.warn()
                        confirmPower = true
                    } label: {
                        Image(systemName: "power")
                    }
                    .tint(.red)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape.fill")
                    }
                }
            }
            .confirmationDialog(
                "Are you sure?",
                isPresented: $confirmPower,
                titleVisibility: .visible
            ) {
                Button("Sleep laptop", role: .destructive) {
                    send(.system(.sleep))
                }
                Button("Cancel", role: .cancel) { }
            }
        }
        .environment(client)
        .environment(store)
        .onAppear(perform: applyActiveProfile)
        .onChange(of: store.active) { _, _ in applyActiveProfile() }
        .task { await client.ping() }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environment(client)
                .environment(store)
        }
        .fullScreenCover(isPresented: $showKeyboard) {
            KeyboardScreen().environment(client)
        }
    }

    private func send(_ command: RemoteCommand) {
        Haptics.tap()
        client.send(command)
    }

    private func applyActiveProfile() {
        client.config = store.active.serverConfig
    }
}

#Preview {
    ContentView()
}
