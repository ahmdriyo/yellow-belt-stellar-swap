#!/usr/bin/env bash
#
# Deploy the swap / orderbook contract and its two demo token Stellar Asset
# Contracts to the Stellar testnet.
#
# Prerequisites:
#   * Rust toolchain with the wasm32v1-none target
#   * The `stellar` CLI (https://github.com/stellar/stellar-cli)
#   * A funded testnet identity named `deployer` (`stellar keys generate deployer`
#     then `stellar keys fund deployer --network testnet`)
#
# Usage:
#   bash scripts/deploy-testnet.sh
#
set -euo pipefail

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
PASSPHRASE="Test SDF Network ; September 2015"
DEPLOYER="deployer"

echo "== Building wasm =="
( cd contract && cargo build --target wasm32v1-none --release )

WASM="contract/target/wasm32v1-none/release/swap_contract.wasm"

echo "== Deploying swap contract =="
SWAP=$(stellar contract deploy \
  --wasm "$WASM" \
  --source-account "$DEPLOYER" \
  --network "$NETWORK" \
  --ignore-checks)
echo "SWAP_CONTRACT=$SWAP"

DEPLOYER_ADDRESS=$(stellar keys public-key "$DEPLOYER")

echo "== Deploying demo token SACs =="
TOKEN_A=$(stellar contract asset deploy \
  --asset "SWAP1:$DEPLOYER_ADDRESS" \
  --source-account "$DEPLOYER" --network "$NETWORK")
TOKEN_B=$(stellar contract asset deploy \
  --asset "SWAP2:$DEPLOYER_ADDRESS" \
  --source-account "$DEPLOYER" --network "$NETWORK")
echo "TOKEN_A=$TOKEN_A"
echo "TOKEN_B=$TOKEN_B"

echo "== Handing SAC admin to the swap contract =="
stellar contract invoke --id "$TOKEN_A" --source "$DEPLOYER" --network "$NETWORK" \
  -- set_admin --new_admin "$SWAP"
stellar contract invoke --id "$TOKEN_B" --source "$DEPLOYER" --network "$NETWORK" \
  -- set_admin --new_admin "$SWAP"

echo "== Initializing swap contract =="
stellar contract invoke --id "$SWAP" --source "$DEPLOYER" --network "$NETWORK" \
  -- initialize --admin "$DEPLOYER_ADDRESS" --token_a "$TOKEN_A" --token_b "$TOKEN_B"

echo "DONE. Update src/config.ts with:"
echo "  CONTRACT_ID = $SWAP"
echo "  TOKENS.SWAP1.contract = $TOKEN_A"
echo "  TOKENS.SWAP2.contract = $TOKEN_B"
