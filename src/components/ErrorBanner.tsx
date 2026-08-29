import type { AppError } from "../lib/errors";

const TITLES: Record<AppError["kind"], string> = {
  WALLET_NOT_FOUND: "Wallet not found",
  REJECTED: "Transaction rejected",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  UNKNOWN: "Error",
};

const COLORS: Record<AppError["kind"], string> = {
  WALLET_NOT_FOUND: "#a855f7",
  REJECTED: "#f59e0b",
  INSUFFICIENT_BALANCE: "#ef4444",
  UNKNOWN: "#64748b",
};

export function ErrorBanner({
  error,
  onDismiss,
}: {
  error: AppError | null;
  onDismiss: () => void;
}) {
  if (!error) return null;
  const color = COLORS[error.kind];
  return (
    <div className="banner" style={{ borderColor: color }}>
      <div className="banner-body">
        <strong style={{ color }}>{TITLES[error.kind]}</strong>
        <p>{error.message}</p>
      </div>
      <button className="banner-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
