import UIKit

enum Haptics {
    static func tap() {
        let gen = UIImpactFeedbackGenerator(style: .light)
        gen.impactOccurred()
    }

    static func warn() {
        let gen = UINotificationFeedbackGenerator()
        gen.notificationOccurred(.warning)
    }
}
