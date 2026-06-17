# hoton-mcp

Buy Telegram **Stars**, **Premium**, and **TON top-ups** from a single prompt — *"buy 100 stars for @alice"* — with any AI agent.

`hoton-mcp` is a small, **keyless** MCP server: it builds the order, and your agent's TON wallet pays. It never holds your keys or your money.

---

## How it works

Three steps, all driven by your agent:

```
you:    "buy 100 stars for @alice"
agent:  hoton  → builds the order (shows the price + an unsigned transaction)
agent:  wallet → signs & pays  →  txHash
agent:  hoton  → confirms it settled on-chain, returns a tonviewer link  ✅
```

## What you need

Two MCP servers, running side by side:

| Server | Does | From |
|---|---|---|
| **`hoton`** | builds the order | this repo (you run it) |
| **`ton`** | the wallet that signs & pays | TON's official [`@ton/mcp`](https://github.com/ton-connect/kit) |

> **Teleton users:** Teleton has its own built-in TON wallet, so you likely only need **`hoton`** — Teleton signs the transaction itself.

---

## 1. Install

```bash
git clone https://github.com/hotonlabs/hoton-mcp.git
cd hoton-mcp
yarn install
yarn build
```

This produces `dist/index.js` — the file your agent will run. Note its full path.

## 2. The config (identical for every agent)

MCP is a standard, so every agent uses the **same** two servers. Only *where you paste this* changes (step 3).

```json
{
  "mcpServers": {
    "hoton": {
      "command": "node",
      "args": ["/absolute/path/to/hoton-mcp/dist/index.js"],
      "env": { "HOTON_BACKEND_URL": "https://hoton.up.railway.app" }
    },
    "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] }
  }
}
```

## 3. Add it to your agent

### Telegram agents

**OpenClaw** — add the two servers to the `mcpServers` section of your `openclaw.json`, then restart. ([MCP guide](https://openclaw-ai.online/mcp/))

**Hermes** — run `hermes mcp add`, or paste this into your config's `mcp_servers:` block ([docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)):

```yaml
mcp_servers:
  hoton:
    command: node
    args: ["/absolute/path/to/hoton-mcp/dist/index.js"]
    env:
      HOTON_BACKEND_URL: "https://hoton.up.railway.app"
  ton:
    command: npx
    args: ["-y", "@ton/mcp@alpha"]
```

**Teleton** — run `teleton mcp add` (or `teleton setup --ui`) and point it at `node /absolute/path/to/hoton-mcp/dist/index.js`. Teleton's built-in wallet handles signing, so you can skip the `ton` server. ([teletonagent.dev](https://teletonagent.dev))

### Desktop / coding agents

**Claude** — Claude Code: `claude mcp add hoton -- node /absolute/path/to/hoton-mcp/dist/index.js` and `claude mcp add ton -- npx -y @ton/mcp@alpha`. Claude Desktop: paste the JSON above into `claude_desktop_config.json`.

**Codex** — add the servers to `~/.codex/config.toml` under `[mcp_servers]`.

**Cursor** — paste the JSON above into `.cursor/mcp.json`.

---

## Then just talk to it

- *"is hoton online?"*
- *"buy 100 stars for @alice"*
- *"gift @bob 3 months of premium"*
- *"top up @carol with 5 GRAM"*
- *"buy 50 stars each for @a, @b and @c"* — bulk, up to 10 in one signature

## Tools

`hoton_use_wallet` · `hoton_use_referrer` · `hoton_find_recipient` · `hoton_buy_stars` (+`_bulk`) · `hoton_buy_premium` (+`_bulk`) · `hoton_topup_gram` (+`_bulk`) · `hoton_confirm` · `hoton_status`

## Settings

| Env var | Default | What it does |
|---|---|---|
| `HOTON_BACKEND_URL` | `https://hoton.up.railway.app` | The hoton backend the server talks to. |
| `HOTON_MAX_ORDER` | (unset) | Optional safety cap — orders above it are refused. |

## Referrals

The referrer comes from your prompt. *"buy 50 stars for @monk **on hoton.tg/damx**"* → **damx earns 35%** of the fee. No link → no commission. (First-referrer-wins, enforced by the backend.)

## Safety

- **Keyless.** `hoton-mcp` only builds orders — it never holds keys or funds. Your wallet signs.
- Fund the agent wallet with only what you're willing to spend. You keep the master key and can revoke the agent anytime — see [agents.ton.org](https://agents.ton.org).
- `HOTON_MAX_ORDER` caps any single order.

## License

MIT — see [LICENSE](LICENSE).
