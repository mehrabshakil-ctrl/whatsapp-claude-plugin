# Codex from WhatsApp on Windows

This fork adds a host bridge using `codex app-server`. The bridge waits for
WhatsApp messages without calling the model while idle. It starts a Codex turn
when a message arrives, sends completed agent messages back, and relays command
and file-change approval requests through the existing channel reaction handler.

## First installation

1. Install Node.js 22+, Bun, Git, and the official Codex CLI. For an npm install,
   run `npm install -g @openai/codex`, then `codex login` in your own terminal.
   Existing account limits and access still apply; this is not free API access.
2. Clone this fork into a NEW directory, separate from the working Claude install:

   ```powershell
   git clone https://github.com/mehrabshakil-ctrl/whatsapp-claude-plugin.git D:\oracle_cloud_instance\tools\whatsapp-codex-channel
   cd D:\oracle_cloud_instance\tools\whatsapp-codex-channel
   ```

3. Double-click `setup-whatsapp-codex.bat`. Enter your WhatsApp number with
   country code and digits only. It installs the existing locked dependencies
   and configures your number as the sole allowed owner. If setup fails midway,
   review `access.json` locally rather than repeatedly running setup.
4. Double-click `start-whatsapp-codex.bat`. The terminal prints connection status
   and the phone linking code. In WhatsApp, open Linked Devices, Link a Device,
   then Link with phone number instead, and enter that code. Use a NEW linked
   device; do not copy Claude's authentication files.
   Stop Claude's WhatsApp launcher during this test so both agents do not answer
   the same self-message. Your existing Claude files remain unchanged.
5. Message your own WhatsApp number with a harmless task, such as asking for the
   filenames in the working folder. Keep the launcher running and the PC awake.

The default state is `%USERPROFILE%\.whatsapp-codex`, and the workspace is
`%USERPROFILE%\Codex-WhatsApp-Workspace`. Nothing changes the existing Claude
configuration or Codex global configuration. To choose another workspace, set
`WA_CODEX_WORKSPACE` in the launching terminal. `WHATSAPP_STATE_DIR` can override
state; never point it at the state of an active Claude installation.

## WhatsApp approvals

- A command or file-change approval requested by Codex sends its complete details
  followed by a permission message with a matching five-letter identifier.
- React **to that permission message** with 👍 to approve once, or 👎 to decline.
  Typed `yes <code>` and `no <code>` are fallback options.
- The existing channel checks the reacting owner and the requested message.
  The host maps that verdict back to the exact Codex JSON-RPC request.
- No response within five minutes means decline. Duplicate, resolved, expired
  and previous-process requests cannot approve a new task. Approval never grants
  permission for the whole session.
- The bridge uses `on-request` approvals and the `workspaceWrite` sandbox.
  This means approval prompts appear when Codex's policy requires them, not
  before every ordinary read or workspace edit. It does not bypass managed rules.
- Structured user-input dialogs and additional permission-profile requests are
  not implemented; they are rejected without granting permissions. Browser and
  desktop automation need separately installed tools; this bridge alone does
  not provide complete computer control.

This first bridge is owner-only: extra contacts and groups cause startup to stop.
Tasks run sequentially. New messages received during a task stay outstanding for
the next turn. The `reply` tool's optional `mark_replied_ids` keeps newer messages
from being accidentally cleared by progress, approval previews, or final replies.
Thread IDs persist outside the repository so restarting can resume context.
Do not restart during a task just to replay it; an interrupted command may already
have changed files. Review the thread and the PC state first.

## Local checks

```powershell
node scripts/codex-whatsapp.mjs --check
node --test scripts/codex-approvals.test.mjs
$env:WHATSAPP_STATE_DIR = "$env:USERPROFILE\.whatsapp-codex"
bun scripts/doctor.ts
```

To review access locally in that same terminal, run `bun scripts/access.ts status`.
For an actual acceptance test, confirm all of these on the Windows PC: linking,
self-message receipt, a successful ordinary task, an actual Codex approval request,
👍 allowing that exact request, 👎 declining a second request, expiration, and a
second message sent while the first task is busy. Automated relay tests are not
proof that the live Windows/WhatsApp/Codex combination works.

Stop with Ctrl+C or close the launcher. The bridge does not install an autostart
service. Account disconnections or process exits need local attention. Baileys is
an unofficial linked-device transport, with the upstream project's account risks.

## Implementation references

- [Codex App Server](https://developers.openai.com/codex/app-server/)
- [Codex CLI](https://developers.openai.com/codex/cli/reference/)
- [Upstream project](https://github.com/Rich627/whatsapp-claude-plugin)

## Validation scope for this change

- Ten targeted approval and message-preservation tests passed. Node syntax checks
  and `git diff --check` passed.
- The broader suite ran before the final snapshot-helper extraction: 854 passed,
  two skipped, 24 failed. The unchanged upstream checkout produced the same 24
  failures (848 passed, two skipped). Failures involve live process identities,
  locks and related integration tests in this runtime; the failure-name sets match.
- The strict TypeScript check reports the same four errors on the unchanged base:
  missing Bun declarations, an inferred request type and `ImportMeta.dir`. A clean
  full type check is therefore not claimed.
- Live authentication, Windows process launching, WhatsApp reactions and actual
  Codex execution require the user's PC and have not been verified by these tests.
