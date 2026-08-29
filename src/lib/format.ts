import { TOKENS } from "../config";

export function formatAmount(base: string | undefined, decimals = 7): string {
  if (!base) return "0";
  const n = Number(base);
  if (!Number.isFinite(n)) return "0";
  return (n / 10 ** decimals).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "";
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

export function tokenCode(value: string): string {
  // New contracts store tokens as Symbol strings ("SWAP1"/"SWAP2"); older
  // deployed contracts stored SAC contract addresses. Handle both.
  if (value === TOKENS.SWAP1.code || value === TOKENS.SWAP2.code) return value;
  // Legacy: value was a SAC contract address → map to the readable code.
  if (value === "CAAMC4NL67YQPCBMRUPIDD4HJBYIKS77YDRGIO3PB24KPAUOULRSYIBB") return "SWAP1";
  if (value === "CC2A476ZMZQV2LG5MYOJUX5BOJNTQBGXVLSQWWGRUPW42NR3NWIVFTE4") return "SWAP2";
  return shortAddr(value);
}
