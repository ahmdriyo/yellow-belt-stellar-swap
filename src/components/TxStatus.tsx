import { explorerTx } from "../config";
import type { TxnState } from "../hooks/useSwap";

const STATUS_LABEL: Record<TxnState["status"], string> = {
  idle: "",
  pending: "Pending…",
  success: "Success",
  fail: "Failed",
};

const STATUS_CLASS: Record<TxnState["status"], string> = {
  idle: "",
  pending: "status-pending",
  success: "status-success",
  fail: "status-fail",
};

export function TxStatus({ tx }: { tx: TxnState }) {
  if (!tx.hash && tx.status === "idle") return null;
  return (
    <div className={`tx-card ${STATUS_CLASS[tx.status]}`}>
      <div className="tx-row">
        <span className="tx-dot" />
        <strong>{STATUS_LABEL[tx.status] || "Submitted"}</strong>
        {tx.label && <span className="tx-label">{tx.label}</span>}
      </div>
      {tx.hash && (
        <a
          className="tx-hash"
          href={explorerTx(tx.hash)}
          target="_blank"
          rel="noreferrer"
        >
          {tx.hash.slice(0, 12)}…{tx.hash.slice(-8)}
        </a>
      )}
    </div>
  );
}
