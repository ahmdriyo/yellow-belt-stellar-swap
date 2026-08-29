import { SUPPORTED_WALLETS } from "../lib/kit";

export function WalletModal({
  onSelect,
  onTestAccount,
  onClose,
}: {
  onSelect: (moduleId: string) => void;
  onTestAccount: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Connect a wallet</h3>
          <button className="banner-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-sub">
          Choose one of the supported Stellar wallets to continue.
        </p>
        <div className="wallet-grid">
          {SUPPORTED_WALLETS.map((w) => (
            <button
              key={w.id}
              className="wallet-option"
              style={{ borderColor: w.color }}
              onClick={() => onSelect(w.module)}
            >
              <span className="wallet-badge" style={{ background: w.color }}>
                {w.name.charAt(0)}
              </span>
              <span>{w.name}</span>
            </button>
          ))}
        </div>
        <div className="modal-divider">
          <span>or</span>
        </div>
        <button className="btn btn-ghost test-account" onClick={onTestAccount}>
          Use a test account (no extension needed)
        </button>
        <p className="hint">
          A throwaway testnet keypair is generated and funded via Friendbot so
          you can try the full flow without installing a wallet.
        </p>
      </div>
    </div>
  );
}
