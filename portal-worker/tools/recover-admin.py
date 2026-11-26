"""Offline recovery for an existing portal administrator. Run only on a trusted local computer.
No network access; do not paste the pepper or password into chat or GitHub.
Disable member/publication access and stop the Worker before applying generated SQL.
The selected password KDF must match the tested Worker configuration (v19).
"""
import getpass
import hashlib
import hmac
import re
import secrets
import uuid

def main():
    account_id = str(uuid.UUID(input("Existing administrator account ID: ").strip()))
    pepper = getpass.getpass("Current PASSWORD_PEPPER (64 hex digits): ").strip()
    if not re.fullmatch(r"[0-9a-fA-F]{64}", pepper):
        raise SystemExit("Invalid pepper format")
    iterations_text = input("Tested KDF iterations (100000 or 600000): ").strip()
    if iterations_text not in ("100000", "600000"):
        raise SystemExit("Invalid iteration count")
    iterations = int(iterations_text)
    password = getpass.getpass("New password (20+ characters, password-manager generated): ")
    confirm = getpass.getpass("Confirm new password: ")
    if password != confirm or len(password.encode("utf-16-le")) // 2 < 20 or len(password.encode("utf-8")) > 1024:
        raise SystemExit("Invalid password")
    salt = secrets.token_hex(32)
    pre = hmac.new(bytes.fromhex(pepper), password.encode("utf-8"), hashlib.sha256).hexdigest()
    derived = hashlib.pbkdf2_hmac("sha256", pre.encode("ascii"), salt.encode("ascii"), iterations).hex()
    stored = f"pbkdf2-sha256-hmac-v1${iterations}${salt}${derived}"
    print("\nRun only against the correct D1 database, after backing it up and stopping the Worker.")
    print(f"UPDATE accounts SET password_hash='{stored}', status='active', updated_at=CURRENT_TIMESTAMP WHERE id='{account_id}' AND role='admin';")
    print(f"DELETE FROM sessions WHERE account_id='{account_id}' AND EXISTS(SELECT 1 FROM accounts WHERE id='{account_id}' AND role='admin' AND password_hash='{stored}');")
    print("Confirm exactly one administrator was updated before re-enabling access. Treat output as sensitive.")

if __name__ == "__main__":
    main()
