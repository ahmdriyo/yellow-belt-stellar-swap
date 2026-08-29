import type { Order } from "../lib/stellar";
import { tokenCode, shortAddr, formatAmount } from "../lib/format";

export function OrderBook({
  orders,
  loading,
  onRefresh,
}: {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="card">
      <h3>
        Order book {loading && <span className="spinner" />}
        <button
          className="btn btn-sm btn-ghost refresh"
          onClick={onRefresh}
          title="Refresh orderbook"
        >
          ↻
        </button>
      </h3>
      {orders.length === 0 ? (
        <p className="hint">No open orders yet. Place the first one above.</p>
      ) : (
        <table className="orderbook">
          <thead>
            <tr>
              <th>#</th>
              <th>Seller</th>
              <th>Sell</th>
              <th>Buy</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td title={o.seller}>{shortAddr(o.seller)}</td>
                <td>
                  {formatAmount(o.sell_amount)} {tokenCode(o.sell_token)}
                </td>
                <td>
                  {formatAmount(o.buy_amount)} {tokenCode(o.buy_token)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
