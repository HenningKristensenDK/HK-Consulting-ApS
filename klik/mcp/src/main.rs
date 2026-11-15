//! klik-mcp: a local MCP server (stdio) that lets Claude
//! 1. read Klik's screenshots, and
//! 2. use a shared handoff inbox, so results move between AI sessions
//!    without copy-paste.
//!
//! Read-only on captures. Writes only new files in the inbox.
//! Logs go to stderr; stdout carries the MCP protocol.

mod store;

use std::sync::Arc;

use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, ContentBlock};
use rmcp::{tool, tool_handler, tool_router, ErrorData, ServerHandler, ServiceExt};
use schemars::JsonSchema;
use serde::Deserialize;

use store::{image_for_claude, Store};

const DEFAULT_MAX_SIZE: u32 = 1600;

#[derive(Clone)]
struct Klik {
    store: Arc<Store>,
}

#[derive(Deserialize, JsonSchema, Default)]
struct ImageArgs {
    /// Longest side in pixels of the image returned (default 1600, max 4000). Use a larger value only when small text must be read.
    max_size: Option<u32>,
}

#[derive(Deserialize, JsonSchema)]
struct GetCaptureArgs {
    /// The capture's file name, as shown by klik_list_captures.
    id: String,
    /// Longest side in pixels of the image returned (default 1600, max 4000).
    max_size: Option<u32>,
}

#[derive(Deserialize, JsonSchema, Default)]
struct ListArgs {
    /// How many to list, newest first (default 10, max 50).
    limit: Option<u32>,
}

#[derive(Deserialize, JsonSchema)]
struct HandoffWriteArgs {
    /// Short title, e.g. "Klik spec decisions" or "Bug analysis for login page".
    title: String,
    /// The handoff in Markdown: goal, what is done (delivered/built/prototyped/planned),
    /// decisions, open points, where things live, and a first line for the next session.
    text: String,
    /// Where this comes from, e.g. "Claude Desktop chat" or "Claude Code, repo X".
    source: Option<String>,
    /// Attach the user's latest Klik screenshot to the handoff.
    attach_latest_capture: Option<bool>,
}

#[derive(Deserialize, JsonSchema, Default)]
struct HandoffReadArgs {
    /// The handoff's file name from handoff_list. Leave empty for the newest one.
    id: Option<String>,
}

fn fail(msg: impl Into<String>) -> Result<CallToolResult, ErrorData> {
    Ok(CallToolResult::error(vec![ContentBlock::text(msg.into())]))
}

fn max_size(v: Option<u32>) -> u32 {
    v.unwrap_or(DEFAULT_MAX_SIZE).clamp(200, 4000)
}

fn image_blocks(store_entry: &store::Entry, max: u32) -> Result<Vec<ContentBlock>, String> {
    let img = image_for_claude(&store_entry.path, max)?;
    let scaled = if (img.width, img.height) != (img.orig_width, img.orig_height) {
        format!(", shown at {}×{}", img.width, img.height)
    } else {
        String::new()
    };
    let meta = format!(
        "Capture: {}\nTaken: {}\nSize: {}×{}{}\nFile: {}",
        store_entry.id,
        store_entry.modified.format("%Y-%m-%d %H:%M:%S"),
        img.orig_width,
        img.orig_height,
        scaled,
        store_entry.path.display()
    );
    Ok(vec![ContentBlock::text(meta), ContentBlock::image(img.base64, img.mime)])
}

#[tool_router]
impl Klik {
    #[tool(description = "Get the user's most recent Klik screenshot as an image. Use when the user refers to \
        'my screenshot', 'what I just captured', 'this screen' or similar.")]
    async fn klik_latest_capture(&self, Parameters(a): Parameters<ImageArgs>) -> Result<CallToolResult, ErrorData> {
        let e = match self.store.latest_capture() {
            Ok(e) => e,
            Err(m) => return fail(m),
        };
        match image_blocks(&e, max_size(a.max_size)) {
            Ok(b) => Ok(CallToolResult::success(b)),
            Err(m) => fail(m),
        }
    }

    #[tool(description = "List the user's recent Klik screenshots (name, time, size), newest first.")]
    async fn klik_list_captures(&self, Parameters(a): Parameters<ListArgs>) -> Result<CallToolResult, ErrorData> {
        let limit = a.limit.unwrap_or(10).clamp(1, 50) as usize;
        let list = self.store.captures(limit);
        if list.is_empty() {
            return fail(format!("No captures yet in {}.", self.store.captures.display()));
        }
        let mut out = format!("{} newest capture(s) in {}:\n", list.len(), self.store.captures.display());
        for e in list {
            out += &format!("- {}  ({}, {} KB)\n", e.id, e.modified.format("%Y-%m-%d %H:%M"), e.bytes / 1024);
        }
        Ok(CallToolResult::success(vec![ContentBlock::text(out)]))
    }

    #[tool(description = "Get one Klik screenshot by its file name (from klik_list_captures) as an image.")]
    async fn klik_get_capture(&self, Parameters(a): Parameters<GetCaptureArgs>) -> Result<CallToolResult, ErrorData> {
        let e = match self.store.capture(&a.id) {
            Ok(e) => e,
            Err(m) => return fail(m),
        };
        match image_blocks(&e, max_size(a.max_size)) {
            Ok(b) => Ok(CallToolResult::success(b)),
            Err(m) => fail(m),
        }
    }

    #[tool(description = "Save a handoff in the user's Klik inbox so another AI session can continue from it \
        without copy-paste. Use when the user asks to hand off, save the result for later, or move the work \
        to another session (chat, Project or Claude Code). Leave out passwords, API keys and personal data.")]
    async fn handoff_write(&self, Parameters(a): Parameters<HandoffWriteArgs>) -> Result<CallToolResult, ErrorData> {
        let attach = if a.attach_latest_capture.unwrap_or(false) {
            match self.store.latest_capture() {
                Ok(e) => Some(e.path),
                Err(m) => return fail(m),
            }
        } else {
            None
        };
        match self.store.handoff_write(&a.title, &a.text, a.source.as_deref(), attach.as_deref()) {
            Ok(id) => Ok(CallToolResult::success(vec![ContentBlock::text(format!(
                "Saved to the Klik inbox as \"{id}\" ({}).\nIn the next session the user can say: \
                 \"Read the latest handoff in Klik and continue.\"",
                self.store.inbox.display()
            ))])),
            Err(m) => fail(m),
        }
    }

    #[tool(description = "List handoffs in the user's Klik inbox, newest first.")]
    async fn handoff_list(&self, Parameters(a): Parameters<ListArgs>) -> Result<CallToolResult, ErrorData> {
        let limit = a.limit.unwrap_or(10).clamp(1, 50) as usize;
        let list = self.store.handoffs(limit);
        if list.is_empty() {
            return fail(format!("The inbox is empty ({}).", self.store.inbox.display()));
        }
        let mut out = String::from("Handoffs, newest first:\n");
        for h in list {
            let first = h.body.lines().find(|l| !l.trim().is_empty()).unwrap_or("").trim();
            let first: String = first.chars().take(100).collect();
            out += &format!("- {}\n  title: {} | created: {}", h.id, h.title, h.created);
            if let Some(s) = &h.source {
                out += &format!(" | from: {s}");
            }
            out += &format!("\n  {first}\n");
        }
        Ok(CallToolResult::success(vec![ContentBlock::text(out)]))
    }

    #[tool(description = "Read a handoff from the user's Klik inbox (the newest one if no id is given), \
        including its screenshot if it has one. Use when the user asks to continue from another session or \
        to read the latest handoff.")]
    async fn handoff_read(&self, Parameters(a): Parameters<HandoffReadArgs>) -> Result<CallToolResult, ErrorData> {
        let (h, img) = match self.store.handoff(a.id.as_deref()) {
            Ok(x) => x,
            Err(m) => return fail(m),
        };
        let mut head = format!("Handoff: {}\nTitle: {}\nCreated: {}\n", h.id, h.title, h.created);
        if let Some(s) = &h.source {
            head += &format!("From: {s}\n");
        }
        let mut blocks = vec![ContentBlock::text(format!("{head}\n{}", h.body))];
        if let Some(p) = img {
            match image_for_claude(&p, DEFAULT_MAX_SIZE) {
                Ok(i) => blocks.push(ContentBlock::image(i.base64, i.mime)),
                Err(m) => blocks.push(ContentBlock::text(format!("(attached image could not be read: {m})"))),
            }
        }
        Ok(CallToolResult::success(blocks))
    }
}

#[tool_handler(name = "klik-mcp", version = "0.1.0", instructions = "Klik is the user's screenshot tool on their own PC. \
    Use klik_latest_capture when the user mentions a screenshot or screen they just captured. \
    Use handoff_read when the user wants to continue work from another AI session, and handoff_write \
    when they want to hand work over to another session. Everything stays on the user's PC.")]
impl ServerHandler for Klik {}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let store = Store::from_env();
    eprintln!(
        "klik-mcp {}: captures = {}, inbox = {}",
        env!("CARGO_PKG_VERSION"),
        store.captures.display(),
        store.inbox.display()
    );
    let service = Klik { store: Arc::new(store) }.serve(rmcp::transport::stdio()).await?;
    service.waiting().await?;
    Ok(())
}
