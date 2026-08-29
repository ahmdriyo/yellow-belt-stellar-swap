export type ErrorKind =
  | "WALLET_NOT_FOUND"
  | "REJECTED"
  | "INSUFFICIENT_BALANCE"
  | "UNKNOWN";

export interface AppError {
  kind: ErrorKind;
  message: string;
}

/**
 * Maps raw wallet / RPC errors into the three categories the project must
 * handle explicitly. The user-facing message is intentionally friendly.
 */
export function classifyError(err: unknown): AppError {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const msg = raw.toLowerCase();

  if (
    msg.includes("rejected") ||
    msg.includes("denied") ||
    msg.includes("declined") ||
    msg.includes("user closed") ||
    msg.includes("cancelled by user")
  ) {
    return {
      kind: "REJECTED",
      message: "Transaction rejected in the wallet. Connect again and approve to continue.",
    };
  }

  if (
    msg.includes("not found") ||
    msg.includes("no wallet") ||
    msg.includes("wallet not") ||
    msg.includes("installed") ||
    msg.includes("extension") ||
    msg.includes("unsupported") ||
    msg.includes("no provider")
  ) {
    return {
      kind: "WALLET_NOT_FOUND",
      message:
        "No Stellar wallet found. Install a wallet such as Freighter, Albedo, Lobstr or Rabet, then reload.",
    };
  }

  if (
    msg.includes("insufficient") ||
    msg.includes("balance") ||
    msg.includes("underfunded") ||
    msg.includes("op_underfunded") ||
    msg.includes("not funded") ||
    msg.includes("low reserve")
  ) {
    return {
      kind: "INSUFFICIENT_BALANCE",
      message:
        "Insufficient balance to pay the network fee. Fund your account with Friendbot first.",
    };
  }

  return { kind: "UNKNOWN", message: raw || "Something went wrong. Please retry." };
}
