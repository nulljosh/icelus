import SwiftUI

@main
struct IcelusApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        // ponytail: sized for the default 100x50 grid at the default font size. On iOS
        // it is a no-op, so no #if is needed.
        .defaultSize(width: 1000, height: 760)
    }
}
