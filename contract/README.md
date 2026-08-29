# Swap / Orderbook Contract

A single-file Soroban smart contract that implements a tiny on-chain orderbook
for swapping Stellar Asset Contract (SAC) tokens on the Stellar DEX.

## Functions

| Function | Description |
| --- | --- |
| `initialize(admin, token_a, token_b)` | One-time setup: stores the admin and the two demo token addresses used by the faucet. |
| `faucet(user)` | Mints demo `SWAP1` + `SWAP2` test tokens to the caller (contract is admin of the SACs). |
| `place_order(seller, sell_token, buy_token, sell_amount, buy_amount)` | Seller deposits `sell_amount` of `sell_token` into the contract and creates a limit order. Emits `order_placed`. |
| `fill_order(order_id, filler)` | Filler pays `buy_amount` of `buy_token` to the seller and receives `sell_amount` of `sell_token` from the contract. Emits `order_filled`. |
| `cancel_order(order_id, seller)` | Returns the deposited tokens to the seller and closes the order. Emits `order_cancelled`. |
| `get_orders()` / `get_order(id)` | Read the active orderbook / a single order. |

## Build

```bash
# requires Rust + wasm32v1-none target (soroban-sdk 27 requires wasm32v1-none)
cargo build --target wasm32v1-none --release
# output: target/wasm32v1-none/release/swap_contract.wasm
```

A ready-to-deploy wasm is committed at `swap_contract.wasm`.

## Deploy to testnet

See `scripts/deploy-testnet.sh`. It deploys the contract plus two demo token
SACs, hands SAC admin to the contract (so the faucet can mint), and calls
`initialize`.
