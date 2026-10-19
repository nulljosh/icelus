import SwiftUI

/// Capture a page, a port of the web dialog: icelus.jaybulb.com/api/capture reads the page (capture.js) and
/// its typed lines land in the Type it sheet, to check before drawing.
struct CaptureSheet: View {
    let onCaptured: (String) -> Void
    @State private var address = "https://"
    @State private var busy = false
    @State private var failed = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                TextField("Page address", text: $address)
                    .textContentType(.URL)
                    .autocorrectionDisabled()
                    #if os(iOS)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    #endif
                    .onSubmit(capture)
                Text("Icelus reads the page and writes it as typed lines. Change them if you like, then draw.")
                    .font(.footnote).foregroundStyle(Theme.muted)
                if failed { Text("Could not read that page.").foregroundStyle(Theme.accent) }
            }
            .navigationTitle("Capture a page")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button(busy ? "Reading the page…" : "Capture", action: capture).disabled(busy) }
            }
        }
    }

    private func capture() {
        guard let endpoint = URL(string: "https://icelus.jaybulb.com/api/capture"),
              let body = try? JSONSerialization.data(withJSONObject: ["url": address]) else { return }
        var request = URLRequest(url: endpoint, timeoutInterval: 15)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = body
        busy = true; failed = false
        Task {
            let data = try? await URLSession.shared.data(for: request).0
            let source = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }?["source"] as? String
            busy = false
            if let source, !source.isEmpty { onCaptured(source) } else { failed = true }
        }
    }
}
