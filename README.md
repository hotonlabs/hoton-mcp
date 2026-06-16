# hoton-mcp

An MCP server that lets an AI agent buy Telegram **Stars**, **Premium**, and **TON top-ups** (single + bulk) on hoton.tg from a prompt.

It is **keyless**: it only builds unsigned orders and confirms them. Paying is done by TON's official **`@ton/mcp`** agentic wallet. You run both side by side.

## How it works

```
agent → hoton_buy_stars(...)        → { summary, messages, historyId, purchaseId }
agent → @ton/mcp.send_raw_transaction(messages)  → txHash   (signs + pays)
agent → hoton_confirm(historyId, purchaseId, txHash)         → recorded + referral credited
```

## Install

```bash
cd mcp
yarn install
yarn build
```

## Configure your agent client (Claude Desktop / Cursor / Windsurf)

Add **both** servers:

```json
{
  "mcpServers": {
    "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] },
    "hoton": {
      "command": "node",
      "args": ["/absolute/path/to/hoton/mcp/dist/index.js"],
      "env": { "HOTON_BACKEND_URL": "https://hoton.up.railway.app" }
    }
  }
}
```

Env vars:

| Var | Default | Meaning |
|---|---|---|
| `HOTON_BACKEND_URL` | `https://hoton.up.railway.app` | Backend to call. Use `http://localhost:3000` for local dev. |
| `HOTON_MAX_ORDER` | (unset) | Optional per-order cap (GRAM for GRAM orders, USDT for USDT). Orders above it are refused. |

> Bulk Premium and bulk top-up require the `dev` branch backend until merged to `main`. Point `HOTON_BACKEND_URL` at a dev/local backend to use them before then.

## Tools

`hoton_use_wallet`, `hoton_use_referrer`, `hoton_find_recipient`, `hoton_buy_stars`, `hoton_buy_stars_bulk`, `hoton_buy_premium`, `hoton_buy_premium_bulk`, `hoton_topup_ton`, `hoton_topup_ton_bulk`, `hoton_confirm`, `hoton_status`.

## Referrals

The referrer comes from the user's prompt. "buy 50 stars for @damx **on hoton.tg/jeribond**" → jeribond earns 35% of the fee. No link → no commission. First-referrer-wins is enforced by the backend.

## Manual end-to-end check (run once before calling it done)

Prerequisites: a backend running with a healthy Fragment session (local `cd backend && yarn dev`, or the dev deployment), and `@ton/mcp` configured with a funded **testnet** agentic wallet.

1. In the agent client, prompt: **"Set up my hoton wallet"** → agent gets the wallet account from `@ton/mcp` and calls `hoton_use_wallet`.
2. Prompt: **"Is hoton online?"** → `hoton_status` returns `healthy: true`.
3. Prompt: **"Buy 50 stars for @<your_test_username>"** → agent calls `hoton_buy_stars`, shows the summary/price.
4. Approve → agent calls `@ton/mcp.send_raw_transaction` → returns a txHash.
5. Agent calls `hoton_confirm` → returns `{ historyConfirmed: true }`.
6. Verify the purchase appears in the backend transaction history for the wallet.

Record: ✅ if stars arrive and history shows the purchase; otherwise note where it broke (most likely the `account.walletStateInit` shape — see the design spec §6).
