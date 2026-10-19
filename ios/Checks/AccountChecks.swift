import Foundation

func runAccountChecks() {
    check(cleanName("  Ada   Lovelace ") == "Ada Lovelace" && cleanName(String(repeating: "x", count: 90)).count == 40, "account: names are cleaned and capped")
    check(displayName(AccountUser(id: "1", email: "ada@example.com", name: "")) == "ada"
          && displayName(AccountUser(id: "1", email: "ada@example.com", name: "Ada")) == "Ada" && displayName(nil) == "", "account: display name falls back to the email")
    check(validEmail("a@b.co") && !validEmail("nope") && !validPassword("1234567") && validPassword("12345678"), "account: email and password checked before sending")
    // {"exp":2000000000} as a JWT payload
    let payload = Data(#"{"sub":"1","exp":2000000000}"#.utf8).base64EncodedString().replacingOccurrences(of: "=", with: "")
    check(tokenExpiry("h.\(payload).s") == 2_000_000_000 && tokenExpiry("garbage") == nil, "account: token expiry read from the payload")
    check(authProblem(AccountError(status: 400, message: "Invalid login credentials")) == "That email and password do not match."
          && authProblem(AccountError(status: 429, message: "slow down")).hasPrefix("Too many")
          && authProblem(AccountError(status: 0, message: "offline")).hasPrefix("Could not reach"), "account: server reasons become messages")
    let s = parseSession(["access_token": "a", "refresh_token": "r", "user": ["id": "u", "email": "e@x.co", "user_metadata": ["display_name": " Ada "]]])
    check(s?.user.name == "Ada" && s?.refresh == "r" && parseSession(["access_token": "a"]) == nil, "account: sessions parse, broken ones do not")
}
