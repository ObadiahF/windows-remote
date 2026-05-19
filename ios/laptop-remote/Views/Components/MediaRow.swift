import SwiftUI

struct MediaRow: View {
    let onPlayPause: () -> Void
    let onBack: () -> Void
    let onKeyboard: () -> Void
    let onPrevTrack: () -> Void
    let onNextTrack: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                pill("backward.fill", action: onPrevTrack)
                pill("playpause.fill", action: onPlayPause, prominent: true)
                pill("forward.fill", action: onNextTrack)
            }
            HStack(spacing: 12) {
                pill("arrow.uturn.backward", action: onBack)
                pill("keyboard", action: onKeyboard)
            }
        }
    }

    private func pill(_ systemImage: String, action: @escaping () -> Void, prominent: Bool = false) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
        }
        .buttonStyle(prominent ? AnyButtonStyleBox(.glassProminent) : AnyButtonStyleBox(.glass))
    }
}

private struct AnyButtonStyleBox: PrimitiveButtonStyle {
    enum Kind { case glass, glassProminent }
    let kind: Kind
    init(_ k: Kind) { kind = k }

    func makeBody(configuration: Configuration) -> some View {
        switch kind {
        case .glass:           Button(configuration).buttonStyle(.glass)
        case .glassProminent:  Button(configuration).buttonStyle(.glassProminent)
        }
    }
}
