import SwiftUI

struct VolumeRow: View {
    let onAction: (MediaAction) -> Void

    @State private var isMuted = false

    var body: some View {
        HStack(spacing: 12) {
            pill("speaker.wave.1.fill", action: .volumeDown) {
                isMuted = false
            }
            muteButton
            pill("speaker.wave.3.fill", action: .volumeUp) {
                isMuted = false
            }
        }
    }

    private var muteButton: some View {
        Button {
            Haptics.tap()
            isMuted.toggle()
            onAction(.mute)
        } label: {
            Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.fill")
                .font(.system(size: 22, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .contentTransition(.symbolEffect(.replace))
        }
        .tint(isMuted ? .red : .accentColor)
        .buttonStyle(.glass)
    }

    private func pill(_ systemImage: String, action: MediaAction, sideEffect: @escaping () -> Void = {}) -> some View {
        Button {
            Haptics.tap()
            sideEffect()
            onAction(action)
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
        }
        .buttonStyle(.glass)
    }
}
