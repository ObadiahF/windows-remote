import SwiftUI

struct ProfileEditView: View {
    enum Mode {
        case add
        case edit(Profile)
    }

    @Environment(ProfileStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let mode: Mode

    @State private var name = ""
    @State private var host = ""
    @State private var portText = ""

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
        && !host.trimmingCharacters(in: .whitespaces).isEmpty
        && Int(portText) != nil
    }

    private var title: String {
        switch mode {
        case .add: "New Profile"
        case .edit: "Edit Profile"
        }
    }

    var body: some View {
        Form {
            Section {
                LabeledContent("Name") {
                    TextField("Desktop", text: $name)
                        .multilineTextAlignment(.trailing)
                }
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

            if case .edit(let profile) = mode, store.profiles.count > 1 {
                Section {
                    Button("Delete Profile", role: .destructive) {
                        store.delete(profile.id)
                        dismiss()
                    }
                }
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(!isValid)
            }
        }
        .onAppear(perform: load)
    }

    private func load() {
        switch mode {
        case .add:
            name = ""
            host = ""
            portText = "3000"
        case .edit(let profile):
            name = profile.name
            host = profile.host
            portText = String(profile.port)
        }
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        let trimmedHost = host.trimmingCharacters(in: .whitespaces)
        let port = Int(portText) ?? 3000

        switch mode {
        case .add:
            let new = Profile(name: trimmedName, host: trimmedHost, port: port)
            store.add(new)
        case .edit(let existing):
            store.update(Profile(id: existing.id, name: trimmedName, host: trimmedHost, port: port))
        }
        dismiss()
    }
}
