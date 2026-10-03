# common-passwords.txt

List of the ~100 000 most used passwords (one per line), used to reject common passwords (FR-007).

- Source: SecLists — `Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt`
  (https://github.com/danielmiessler/SecLists), derived from the UK NCSC / Have I Been Pwned top list.
- License: SecLists is distributed under the MIT License.
- Downloaded: 2026-10-02.

The file is loaded once at boot into an in-memory Set (lowercased). It is copied to `dist/` via
the `assets` entry in `apps/api/nest-cli.json`.
