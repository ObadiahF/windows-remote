import Foundation

@MainActor
@Observable
final class ProfileStore {
    var profiles: [Profile] {
        didSet { persist() }
    }

    var activeID: UUID {
        didSet { persist() }
    }

    var active: Profile {
        profiles.first(where: { $0.id == activeID }) ?? profiles[0]
    }

    init() {
        let snapshot = Self.loadSnapshot()
        self.profiles = snapshot.profiles
        self.activeID = snapshot.activeID
    }

    // MARK: - Mutations

    func add(_ profile: Profile, activate: Bool = true) {
        profiles.append(profile)
        if activate { activeID = profile.id }
    }

    func update(_ profile: Profile) {
        guard let idx = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        profiles[idx] = profile
    }

    func delete(_ id: UUID) {
        guard profiles.count > 1 else { return }
        profiles.removeAll { $0.id == id }
        if activeID == id { activeID = profiles[0].id }
    }

    func setActive(_ id: UUID) {
        guard profiles.contains(where: { $0.id == id }) else { return }
        activeID = id
    }

    // MARK: - Persistence

    private static let storageKey = "laptop-remote.profile-store"

    private struct Snapshot: Codable {
        var profiles: [Profile]
        var activeID: UUID
    }

    private func persist() {
        let snapshot = Snapshot(profiles: profiles, activeID: activeID)
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }

    private static func loadSnapshot() -> Snapshot {
        if
            let data = UserDefaults.standard.data(forKey: storageKey),
            let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data),
            !snapshot.profiles.isEmpty
        {
            return snapshot
        }
        let seed = Profile.defaultProfile
        return Snapshot(profiles: [seed], activeID: seed.id)
    }
}
