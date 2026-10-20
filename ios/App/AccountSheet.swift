import SwiftUI

/// Settings, with Profile one row in (like the account row in iOS Settings), a port of src/components/AccountPanel.jsx. Signed out you can sign in, create
/// an account or ask for a reset link (the link finishes on the web, then you sign in here). Signed in you can
/// set your name, sign out, or delete the account for good.
struct AccountSheet: View {
    @Binding var session: AccountSession?
    @Binding var showMore: Bool
    var tab = "settings" // "profile" opens straight on Profile
    let onTutorial: () -> Void
    var client = AccountClient()
    @Environment(\.dismiss) private var dismiss
    @AppStorage("glyphbox-look") private var look = "real"
    @State private var view = "signin" // signin | signup | forgot | sent
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var problem: String?
    @State private var notice: String?
    @State private var busy = false
    @State private var deleting = false
    @State private var path: [String] = []

    var body: some View {
        NavigationStack(path: $path) {
            Form { settings }
                .navigationTitle("Settings")
                .navigationDestination(for: String.self) { _ in
                    Form { profile }.navigationTitle("Profile")
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                }
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .onAppear { name = displayName(session?.user); if tab == "profile" && path.isEmpty { path = ["profile"] } }
        }
    }

    @ViewBuilder private var profile: some View {
        if let s = session {
            Section {
                Text("Signed in as \(s.user.email)").foregroundStyle(Theme.muted)
                TextField("Name", text: $name).textContentType(.nickname)
                Button("Save") { rename(s) }.disabled(busy || cleanName(name) == displayName(s.user))
            }
            messages
            Section {
                Button("Sign out") { signOut(s) }.disabled(busy)
                if deleting {
                    Text("This deletes your account for good. Your sketches stay on this device.")
                    Button("Delete for good", role: .destructive) { delete(s) }.disabled(busy)
                    Button("Cancel") { deleting = false }
                } else {
                    Button("Delete account", role: .destructive) { deleting = true }
                }
            }
        } else {
            Section {
                Text("An account keeps your name with your work. Everything works without one.").foregroundStyle(Theme.muted)
                if view != "sent" {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        #endif
                    if view != "forgot" {
                        SecureField("Password", text: $password).textContentType(view == "signin" ? .password : .newPassword)
                        if view == "signup" { Text("At least 8 characters.").font(.footnote).foregroundStyle(Theme.muted) }
                    }
                    Button(view == "signin" ? "Sign in" : view == "signup" ? "Create account" : "Send reset link", action: submit)
                        .disabled(busy)
                }
            }
            messages
            Section {
                if view == "signin" {
                    Button("Create an account") { switchTo("signup") }
                    Button("Forgot password?") { switchTo("forgot") }
                } else {
                    Button("I have an account") { switchTo("signin") }
                }
            }
        }
    }

    @ViewBuilder private var messages: some View {
        if let problem { Text(LocalizedStringKey(problem)).foregroundStyle(.red) }
        if let notice { Text(LocalizedStringKey(notice)).foregroundStyle(Theme.accent) }
    }

    @ViewBuilder private var settings: some View {
        Section {
            NavigationLink(value: "profile") {
                HStack(spacing: 12) {
                    Image(systemName: "person.crop.circle.fill").font(.system(size: 44)).foregroundStyle(session == nil ? Theme.muted : Theme.accent)
                    VStack(alignment: .leading, spacing: 2) {
                        let n = displayName(session?.user)
                        Text(session == nil ? "Sign in" : n.isEmpty ? "Profile" : n).font(.headline).foregroundStyle(Theme.ink)
                        Text(verbatim: session?.user.email ?? String(localized: "Keep your name with your work")).font(.footnote).foregroundStyle(Theme.muted)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        Section("Canvas") {
            Picker("Look", selection: $look) {
                Text("Real").tag("real")
                Text("Text").tag("text")
            }
            Toggle("Show all controls", isOn: $showMore)
        }
        Section("Help") {
            Button("Tutorial") { dismiss(); onTutorial() }
            #if os(iOS)
            Button("Language") { if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) } }
            #endif
        }
        Section {
            LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")
        }
    }

    private func switchTo(_ next: String) { view = next; problem = nil; notice = nil }

    private func run(_ work: @escaping () async -> Void) {
        busy = true; problem = nil; notice = nil
        Task { await work(); busy = false }
    }

    private func submit() {
        guard validEmail(email) else { problem = "Enter a valid email address."; return }
        if view != "forgot" && !validPassword(password) { problem = "Passwords need at least 8 characters."; return }
        run {
            switch view {
            case "signin":
                switch await client.signIn(email, password) {
                case .success(let s): session = s; password = ""; name = displayName(s.user)
                case .failure(let e): problem = authProblem(e)
                }
            case "signup":
                switch await client.signUp(email, password) {
                case .success: password = ""; view = "sent"; notice = "We sent a link to confirm your account. Open it, then sign in here."
                case .failure(let e): problem = authProblem(e)
                }
            default:
                switch await client.recover(email) {
                case .success: view = "sent"; notice = "If that address has an account, a reset link is on its way."
                case .failure(let e): problem = authProblem(e)
                }
            }
        }
    }

    /// Every signed-in call starts from a fresh token. A dead session just signs you out.
    private func signedIn(_ s: AccountSession, _ work: @escaping (AccountSession) async -> Void) {
        run {
            guard let live = await client.fresh(s) else { session = nil; return }
            if live != s { session = live }
            await work(live)
        }
    }
    private func rename(_ s: AccountSession) {
        signedIn(s) { live in
            switch await client.rename(live, name) {
            case .success(let user): session?.user = user; name = displayName(user); notice = "Name saved."
            case .failure(let e): problem = authProblem(e)
            }
        }
    }
    private func signOut(_ s: AccountSession) {
        run { await client.signOut(s); session = nil; view = "signin" }
    }
    private func delete(_ s: AccountSession) {
        signedIn(s) { live in
            switch await client.delete(live) {
            case .success: session = nil; deleting = false; view = "signin"; notice = "Your account is deleted."
            case .failure(let e): problem = authProblem(e)
            }
        }
    }
}
