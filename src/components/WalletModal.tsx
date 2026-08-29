import { SUPPORTED_WALLETS } from "../lib/kit";

export function WalletModal({
  onSelect,
  onClose,
}: {
  onSelect: (moduleId: string) => void;
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
      </div>
    </div>
  );
}
