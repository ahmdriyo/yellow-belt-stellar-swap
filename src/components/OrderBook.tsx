import type { Order } from "../lib/stellar";
import { tokenCode, shortAddr, formatAmount } from "../lib/format";

export function OrderBook({
  orders,
  loading,
  address,
  onFill,
  onCancel,
}: {
  orders: Order[];
  loading: boolean;
  address: string | null;
  onFill: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  return (
    <div className="card">
      <h3>
        Order book {loading && <span className="spinner" />}
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const isMine = address && o.seller === address;
              return (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td title={o.seller}>{shortAddr(o.seller)}</td>
                  <td>
                    {formatAmount(o.sell_amount)} {tokenCode(o.sell_token)}
                  </td>
                  <td>
                    {formatAmount(o.buy_amount)} {tokenCode(o.buy_token)}
                  </td>
                  <td className="actions">
                    {isMine ? (
                      <button
                        className="btn btn-sm"
                        onClick={() => onCancel(o.id)}
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onFill(o.id)}
                      >
                        Fill
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
