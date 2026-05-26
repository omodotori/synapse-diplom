# A0 CLI Connector

Synapse lives in Docker for a reason. That keeps it safer. The problem is that people see Docker and assume the agent can never really touch the code on their computer.

A0 CLI is the answer to that.

Synapse stays in Docker. A0 CLI installs on the host machine. That is what lets Synapse finally work on the real files on your real computer.

For now, use the install commands below.

## Quick Install

**macOS / Linux:**
```bash
curl -LsSf https://raw.githubusercontent.com/synapseai/synapse-connector/main/install.sh | sh
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/synapseai/synapse-connector/main/install.ps1 | iex
```

**Manual fallback when uv is already installed or if URLs give 404:**
```bash
uv tool install git+https://github.com/synapseai/synapse-connector
```

Run these on the host machine, not inside the Synapse container.

The installer uses `uv`, and `uv` will select or download a compatible Python if needed.

## Open it and start working

1. Make sure Synapse is already running.
2. Launch A0 CLI on the host machine:

```bash
a0
```

3. If Synapse is running on the same machine, A0 CLI will usually find it for you.
4. If Synapse is somewhere else, enter the exact web address or set `SYNAPSE_HOST` as env variable before launching `a0`.
5. Open or create a chat and confirm you can talk to Synapse from the host machine.

> [!NOTE]
> Current Synapse builds starting from v1.9 include the builtin connector support that A0 CLI expects. If you see a connector-specific `404`, update Synapse first.

## Give this to another agent

If another agent is helping with setup, do not paste a whole checklist. Paste one line:

```text
Set up the A0 CLI connector for Synapse on this machine using the synapse-setup-cli Skill.
```

## Troubleshooting

- **Nothing appears locally:** Enter the Synapse web address manually or export `SYNAPSE_HOST`.
- **You tried to install from inside Docker:** A0 CLI belongs on the host machine. Synapse stays in Docker.
- **Function keys do nothing:** Some terminals and IDEs capture function keys. Use `Ctrl+P`.
- **Connector route returns `404`:** Update Synapse to a build with builtin connector support.

## Related links

- [Quick Start](../quickstart.md)
- [Installation Guide](../setup/installation.md)
