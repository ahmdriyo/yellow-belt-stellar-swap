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
          <strong>{formatAmount(nativeBalance, 7)}</strong>
        </li>
        {TOKEN_LIST.map((t) => (
          <li key={t.contract}>
            <span>{t.code}</span>
            <strong>{formatAmount(balances[t.contract], t.decimals)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
