import SwiftUI

struct SettingsView: View {
    @Environment(RemoteClient.self) private var client
    @Environment(ProfileStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var editing: Profile?
    @State private var adding = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Profiles") {
                    ForEach(store.profiles) { profile in
                        ProfileRow(
                            profile: profile,
                            isActive: profile.id == store.activeID,
                            onSelect: { store.setActive(profile.id) },
                            onEdit: { editing = profile }
                        )
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            if store.profiles.count > 1 {
                                Button(role: .destructive) {
                                    store.delete(profile.id)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }

                    Button {
                        adding = true
                    } label: {
                        Label("Add Profile", systemImage: "plus.circle.fill")
                    }
                }

                Section("Connection") {
                    Button("Test Connection") {
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
            .navigationDestination(item: $editing) { profile in
                ProfileEditView(mode: .edit(profile))
                    .environment(store)
            }
            .navigationDestination(isPresented: $adding) {
                ProfileEditView(mode: .add)
                    .environment(store)
            }
        }
    }

    @ViewBuilder
    private var statusRow: some View {
        switch client.status {
        case .unknown:
            Label("Not connected", systemImage: "questionmark.circle")
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
}

private struct ProfileRow: View {
    let profile: Profile
    let isActive: Bool
    let onSelect: () -> Void
    let onEdit: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: isActive ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isActive ? Color.accentColor : Color.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(profile.name)
                    .foregroundStyle(.primary)
                Text(profile.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button(action: onEdit) {
                Image(systemName: "pencil")
                    .padding(.vertical, 8)
                    .padding(.horizontal, 4)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onSelect)
    }
}
