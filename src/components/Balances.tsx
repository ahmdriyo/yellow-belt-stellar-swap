import { TOKEN_LIST } from "../config";
import { formatAmount } from "../lib/format";

export function Balances({
  nativeBalance,
  balances,
}: {
  nativeBalance: string;
  balances: Record<string, string>;
}) {
  return (
    <div className="card">
      <h3>Your balances</h3>
      <ul className="balance-list">
        <li>
          <span>XLM (native)</span>
          <strong>{nativeBalance}</strong>
        </li>
        {TOKEN_LIST.map((t) => (
          <li key={t.code}>
            <span>{t.code}</span>
            <strong>{formatAmount(balances[t.code], t.decimals)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
