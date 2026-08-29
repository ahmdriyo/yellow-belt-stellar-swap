export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const NETWORK_NAME = "TESTNET";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

// Deployed swap / orderbook contract (testnet) — internal token balances,
// no SAC trustlines required. The faucet mints contract-native demo tokens.
export const CONTRACT_ID =
  "CBMWVFURV5P4KA5MRHRU62D63C2S6F3SPOQ3RPBFTJNFNB65VHA3NMYA";

// Demo tokens: identified by a Symbol passed to the contract (7 decimals).
export const TOKENS = {
  SWAP1: { code: "SWAP1", decimals: 7 },
  SWAP2: { code: "SWAP2", decimals: 7 },
} as const;

export type TokenMeta = (typeof TOKENS)[keyof typeof TOKENS];

export const TOKEN_LIST: TokenMeta[] = [TOKENS.SWAP1, TOKENS.SWAP2];

// A funded testnet account used only as a "read" source for simulations.
export const READ_SOURCE =
  "GDDX6TH3GG4VGLYW6E7MAJORXPPNRO6DZ24FPRXJKWOOON3P2GHCQF32";

export function explorerTx(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function explorerContract() {
  return `${EXPLORER_BASE}/contract/${CONTRACT_ID}`;
}
