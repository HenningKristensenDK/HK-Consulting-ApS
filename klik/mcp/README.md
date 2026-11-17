# klik-mcp: Klik for Claude

A local MCP server that lets Claude
1. see your Klik screenshots, and
2. pass work between Claude sessions through a shared inbox, with no copy-paste.

Everything stays on your PC. Screenshots are only read. The inbox is plain Markdown files.

## Tools

| Tool | What it does |
|---|---|
| `klik_latest_capture` | Your newest screenshot, as an image Claude can see |
| `klik_list_captures` | Your recent screenshots |
| `klik_get_capture` | One screenshot by file name |
| `handoff_write` | Saves a handoff (title, Markdown text, optionally your latest screenshot) |
| `handoff_list` | Lists the inbox, newest first |
| `handoff_read` | Reads a handoff, the newest by default |

Folders:
- Screenshots: `Pictures\Klik` (change with the `KLIK_CAPTURES_DIR` environment variable)
- Inbox: `Documents\Klik\Inbox` (change with `KLIK_INBOX_DIR`, or the "Inbox folder" setting in Claude Desktop)

## Connect

**Claude Desktop:** download `Klik-Claude-extension` from the latest "Klik - Windows build" run on GitHub, unzip it and double-click `Klik.mcpb`. Or: Settings > Extensions > Advanced settings > Install Extension.

**Claude Code on your PC** (after installing Klik):

```
claude mcp add --scope user klik -- "%LOCALAPPDATA%\Klik\klik-mcp.exe"
```

Check the path first: the installer is expected to put Klik in `%LOCALAPPDATA%\Klik`.

**claude.ai in a browser, the phone app, Claude Code in the cloud:** these can't reach your PC. A possible bridge (not tested) is to set the inbox folder to a OneDrive folder and read it with the Microsoft 365 connector.

## Try it

- "What does my latest screenshot show?"
- "Write a handoff to Klik with what we decided, and attach my latest screenshot."
- In a new session: "Read the latest handoff in Klik and continue."

## Develop

```
cargo test
cargo build --release
```

`src/store.rs` holds the files and folders (with unit tests), and `src/main.rs` the MCP tools. Built on `rmcp`, the official Rust MCP SDK.
