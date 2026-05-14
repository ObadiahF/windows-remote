import SwiftUI

struct KeyboardScreen: View {
    @Environment(RemoteClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var buffer = ""
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            TextField("Type to laptop…", text: $buffer, axis: .vertical)
                .font(.title2)
                .focused($focused)
                .textInputAutocapitalization(.sentences)
                .autocorrectionDisabled()
                .padding(20)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .background(.regularMaterial)
                .navigationTitle("Keyboard")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { dismiss() }
                    }
                }
                .onAppear { focused = true }
                .onChange(of: buffer, forwardDelta)
        }
    }

    private func forwardDelta(oldValue: String, newValue: String) {
        if newValue.count > oldValue.count, newValue.hasPrefix(oldValue) {
            let added = String(newValue.dropFirst(oldValue.count))
            client.send(.typeText(added))
        } else if newValue.count < oldValue.count, oldValue.hasPrefix(newValue) {
            let removed = oldValue.count - newValue.count
            for _ in 0..<removed {
                client.send(.backspace)
            }
        } else {
            client.send(.typeText(newValue))
        }
    }
}
