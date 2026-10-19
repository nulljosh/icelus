// Accounts through jaybulb-api (api.jaybulb.com), a port of src/lib/account.js and the parts of spark.js the
// app uses: email and password, a display name, sign out, delete. Signed out is first class: every feature
// works without an account. The session lives in the Keychain, never in UserDefaults.

import Foundation
import Security

let accountAPI = URL(string: "https://api.jaybulb.com")!
/// Where confirm and reset links send people: the web app, which finishes the step. Then they sign in here.
let accountReturn = "https://icelus.jaybulb.com/app/"
let nameMax = 40

struct AccountUser: Equatable { let id: String; let email: String; var name: String }
struct AccountSession: Equatable { var access: String; var refresh: String; var user: AccountUser }

func cleanName(_ name: String) -> String {
    String(name.split(whereSeparator: \.isWhitespace).joined(separator: " ").prefix(nameMax))
}
func displayName(_ user: AccountUser?) -> String {
    guard let user else { return "" }
    return user.name.isEmpty ? String(user.email.split(separator: "@").first ?? "") : user.name
}
func validEmail(_ email: String) -> Bool {
    email.trimmingCharacters(in: .whitespaces).range(of: #"^[^@\s]+@[^@\s]+\.[^@\s]+$"#, options: .regularExpression) != nil
}
func validPassword(_ password: String) -> Bool { password.count >= 8 }

/// Seconds since 1970 when an access token stops working, read from its payload. Nil if it is not a JWT.
func tokenExpiry(_ token: String) -> Double? {
    let parts = token.split(separator: ".")
    guard parts.count == 3 else { return nil }
    var b64 = parts[1].replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    while b64.count % 4 != 0 { b64 += "=" }
    guard let data = Data(base64Encoded: b64),
          let claims = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    return claims["exp"] as? Double ?? (claims["exp"] as? Int).map(Double.init)
}

struct AccountError: Error, Equatable { let status: Int; let message: String }

/// The server's English reasons, as the messages the sheet shows.
func authProblem(_ error: AccountError) -> String {
    if error.status == 0 { return "Could not reach the server. Check your connection." }
    if error.status == 429 { return "Too many tries. Wait a minute and try again." }
    if error.message.range(of: "invalid login", options: .caseInsensitive) != nil { return "That email and password do not match." }
    if error.message.range(of: "not confirmed", options: .caseInsensitive) != nil { return "Confirm your email first. The link is in your inbox." }
    return "Something went wrong. Try again."
}

func parseUser(_ d: [String: Any]?) -> AccountUser? {
    guard let d, let id = d["id"] as? String else { return nil }
    let meta = d["user_metadata"] as? [String: Any]
    return AccountUser(id: id, email: d["email"] as? String ?? "", name: cleanName(meta?["display_name"] as? String ?? ""))
}
func parseSession(_ d: [String: Any]?) -> AccountSession? {
    guard let d, let access = d["access_token"] as? String, let refresh = d["refresh_token"] as? String,
          let user = parseUser(d["user"] as? [String: Any]) else { return nil }
    return AccountSession(access: access, refresh: refresh, user: user)
}

/// The session in the Keychain: one generic password item, this device only.
enum SessionStore {
    static let service = "glyphbox-session"
    static func save(_ s: AccountSession?) {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
        SecItemDelete(query as CFDictionary)
        guard let s, let data = try? JSONSerialization.data(withJSONObject: [
            "access_token": s.access, "refresh_token": s.refresh,
            "user": ["id": s.user.id, "email": s.user.email, "user_metadata": ["display_name": s.user.name]],
        ]) else { return }
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }
    static func load() -> AccountSession? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                    kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return parseSession(try? JSONSerialization.jsonObject(with: data) as? [String: Any])
    }
}

/// Calls to jaybulb-api. `base` is a parameter so the checks can point it at a local copy.
struct AccountClient {
    var base = accountAPI

    func call(_ method: String, _ path: String, _ body: [String: Any]? = nil, token: String? = nil) async -> Result<[String: Any], AccountError> {
        guard let url = URL(string: base.absoluteString + path) else { return .failure(AccountError(status: 0, message: "bad url")) }
        var req = URLRequest(url: url, timeoutInterval: 15)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.setValue("https://icelus.jaybulb.com", forHTTPHeaderField: "Origin") // names the app in confirm and reset mail
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { req.httpBody = try? JSONSerialization.data(withJSONObject: body) }
        guard let (data, res) = try? await URLSession.shared.data(for: req), let http = res as? HTTPURLResponse else {
            return .failure(AccountError(status: 0, message: "offline"))
        }
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        return (200..<300).contains(http.statusCode) ? .success(json)
            : .failure(AccountError(status: http.statusCode, message: json["error"] as? String ?? "failed"))
    }

    func signIn(_ email: String, _ password: String) async -> Result<AccountSession, AccountError> {
        await call("POST", "/auth/token?grant_type=password", ["email": email.trimmingCharacters(in: .whitespaces), "password": password])
            .flatMap { parseSession($0).map { .success($0) } ?? .failure(AccountError(status: 500, message: "bad session")) }
    }
    func signUp(_ email: String, _ password: String) async -> Result<Void, AccountError> {
        await call("POST", "/auth/signup", ["email": email.trimmingCharacters(in: .whitespaces), "password": password, "redirect_to": accountReturn]).map { _ in () }
    }
    func recover(_ email: String) async -> Result<Void, AccountError> {
        await call("POST", "/auth/recover", ["email": email.trimmingCharacters(in: .whitespaces), "redirect_to": accountReturn]).map { _ in () }
    }
    /// A session whose access token is still good for 30 seconds, refreshed if not. Nil means signed out.
    func fresh(_ s: AccountSession) async -> AccountSession? {
        if let exp = tokenExpiry(s.access), exp - 30 > Date().timeIntervalSince1970 { return s }
        guard case .success(let d) = await call("POST", "/auth/token?grant_type=refresh_token", ["refresh_token": s.refresh]) else { return nil }
        return parseSession(d)
    }
    func rename(_ s: AccountSession, _ name: String) async -> Result<AccountUser, AccountError> {
        await call("PUT", "/auth/user", ["data": ["display_name": cleanName(name)]], token: s.access)
            .flatMap { parseUser($0).map { .success($0) } ?? .failure(AccountError(status: 500, message: "bad user")) }
    }
    func signOut(_ s: AccountSession) async { _ = await call("POST", "/auth/logout", [:], token: s.access) }
    func delete(_ s: AccountSession) async -> Result<Void, AccountError> {
        await call("DELETE", "/auth/user", nil, token: s.access).map { _ in () }
    }
}
