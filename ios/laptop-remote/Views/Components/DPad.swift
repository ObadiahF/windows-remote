import SwiftUI

struct DPad: View {
    let onPress: (DirectionKey) -> Void

    var body: some View {
        ZStack {
            Circle()
                .fill(.regularMaterial)
                .overlay(Circle().strokeBorder(.secondary.opacity(0.2), lineWidth: 1))

            VStack(spacing: 0) {
                arrow("chevron.up", direction: .up)
                HStack(spacing: 0) {
                    arrow("chevron.left", direction: .left)
                    selectButton
                    arrow("chevron.right", direction: .right)
                }
                arrow("chevron.down", direction: .down)
            }
            .padding(16)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func arrow(_ systemImage: String, direction: DirectionKey) -> some View {
        Button {
            Haptics.tap()
            onPress(direction)
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: 28, weight: .semibold))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(.primary)
    }

    private var selectButton: some View {
        Button {
            Haptics.tap()
            onPress(.select)
        } label: {
            Circle()
                .fill(.tint)
                .overlay(
                    Text("OK")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                )
                .padding(-4)
        }
        .buttonStyle(.plain)
    }
}
