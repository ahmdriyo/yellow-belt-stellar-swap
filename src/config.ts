export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const NETWORK_NAME = "TESTNET";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

// Deployed swap / orderbook contract (testnet)
export const CONTRACT_ID =
  "CBMNSJTJ7DE2M3ZAP4MN67F4T2UKOQ5DJ5JYOA3PV3AGCXV56M4GIKGR";

// Test tokens minted by the contract faucet (7 decimals, Stellar Asset Contracts)
export const TOKENS = {
  SWAP1: {
    code: "SWAP1",
    contract: "CAAMC4NL67YQPCBMRUPIDD4HJBYIKS77YDRGIO3PB24KPAUOULRSYIBB",
    decimals: 7,
  },
  SWAP2: {
    code: "SWAP2",
    contract: "CC2A476ZMZQV2LG5MYOJUX5BOJNTQBGXVLSQWWGRUPW42NR3NWIVFTE4",
    decimals: 7,
  },
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
