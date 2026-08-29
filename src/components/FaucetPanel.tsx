export function FaucetPanel({
  address,
  onFaucet,
  onFund,
  nativeBalance,
}: {
  address: string | null;
  onFaucet: () => void;
  onFund: () => void;
  nativeBalance: string;
}) {
  const needFunds = parseFloat(nativeBalance) < 1;
  return (
    <div className="card">
      <h3>Get test funds</h3>
      {!address && <p className="hint">Connect a wallet to receive test tokens.</p>}
      <div className="btn-row">
        <button className="btn" disabled={!address} onClick={onFaucet}>
          Mint SWAP1 + SWAP2
        </button>
        <button
          className="btn btn-ghost"
          disabled={!address}
          onClick={onFund}
          title="Fund your account with testnet XLM via Friendbot"
        >
          Fund with Friendbot
        </button>
      </div>
      {needFunds && address && (
        <p className="hint warn">
          Your XLM balance is low — fund the account before placing orders.
        </p>
      )}
    </div>
  );
}
