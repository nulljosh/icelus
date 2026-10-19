import SwiftUI

// The tutorial card and the first-launch sheet. The steps themselves live in Tutorial.swift.

/// One short step at a time, at the bottom of the screen, never in the way of the grid.
struct TutorialCard: View {
    let step: Int
    let onClose: () -> Void

    var body: some View {
        let name = tutorialSteps[step], last = name == "done"
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                if !last { Text("Step \(step + 1) of \(tutorialSteps.count - 1)").font(.footnote).foregroundStyle(Theme.muted) }
                Text(LocalizedStringKey(lessonText(name))).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Button(last ? "Got it" : "Skip", action: onClose).buttonStyle(.bordered).buttonBorderShape(.capsule)
        }
        .padding(16)
        .frame(maxWidth: 440)
        .background(RoundedRectangle(cornerRadius: 28).fill(Theme.background).shadow(color: .black.opacity(0.18), radius: 16, y: 8))
        .padding(16)
        .accessibilityElement(children: .combine)
    }

    private func lessonText(_ name: String) -> String {
        switch name {
        case "pick": return "Pick Button in the parts below."
        #if os(macOS)
        case "place": return "Click the grid to put the button there."
        #else
        case "place": return "Tap the grid to put the button there."
        #endif
        case "edit": return "Choose Edit text, type new words like Sign up, then Save."
        case "move": return "Now drag the button to a new spot."
        case "copy": return "Open Export and choose Copy text."
        default: return "Done. Your screen is plain text now. Paste it into a chat, a doc or a pull request."
        }
    }
}

/// The first launch: one line and two ways in.
struct WelcomeSheet: View {
    let onStart: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Sketch a screen in plain text").font(.title2.bold()).multilineTextAlignment(.center)
            Text("Put a screen together from parts, then copy it as plain text. Want a quick walk through?")
                .foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            Button(action: onStart) { Text("Show me how").frame(maxWidth: .infinity) }
                .buttonStyle(.borderedProminent).buttonBorderShape(.capsule).controlSize(.large)
            Button(action: onSkip) { Text("I’ll look around").frame(maxWidth: .infinity) }
                .buttonStyle(.bordered).buttonBorderShape(.capsule).controlSize(.large)
        }
        .tint(Theme.accent)
        .padding(32)
        .frame(maxWidth: 440)
        .presentationDetents([.medium])
    }
}
