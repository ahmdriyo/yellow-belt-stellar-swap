import { useState } from "react";
import { TOKEN_LIST } from "../config";

export function SwapForm({
  address,
  onPlace,
}: {
  address: string | null;
  onPlace: (
    sellToken: string,
    buyToken: string,
    sellAmt: string,
    buyAmt: string
  ) => void;
}) {
  const [sellToken, setSellToken] = useState<string>(TOKEN_LIST[0].contract);
  const [buyToken, setBuyToken] = useState<string>(TOKEN_LIST[1].contract);
  const [sellAmt, setSellAmt] = useState("");
  const [buyAmt, setBuyAmt] = useState("");

  const switchSide = () => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    onPlace(sellToken, buyToken, sellAmt, buyAmt);
  };

  const disabled = !address || !sellAmt || !buyAmt || parseFloat(sellAmt) <= 0;

  return (
    <div className="card">
      <h3>Place an order</h3>
      <form onSubmit={submit} className="swap-form">
        <label>
          <span>You sell</span>
          <div className="row">
            <input
              type="number"
              min="0"
              step="0.0000001"
              placeholder="0.0"
              value={sellAmt}
              onChange={(e) => setSellAmt(e.target.value)}
            />
            <select
              value={sellToken}
              onChange={(e) => setSellToken(e.target.value)}
            >
              {TOKEN_LIST.map((t) => (
                <option key={t.contract} value={t.contract}>
                  {t.code}
                </option>
              ))}
            </select>
          </div>
        </label>

        <button type="button" className="switch" onClick={switchSide} aria-label="Switch">
          ↑↓
        </button>

        <label>
          <span>You buy</span>
          <div className="row">
            <input
              type="number"
              min="0"
              step="0.0000001"
              placeholder="0.0"
              value={buyAmt}
              onChange={(e) => setBuyAmt(e.target.value)}
            />
            <select
              value={buyToken}
              onChange={(e) => setBuyToken(e.target.value)}
            >
              {TOKEN_LIST.map((t) => (
                <option key={t.contract} value={t.contract}>
                  {t.code}
                </option>
              ))}
            </select>
          </div>
        </label>

        <button className="btn btn-primary" type="submit" disabled={disabled}>
          Place order
        </button>
        {!address && <p className="hint">Connect a wallet to place orders.</p>}
      </form>
    </div>
  );
}
