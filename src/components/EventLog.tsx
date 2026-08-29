import type { LogEntry } from "../hooks/useSwap";

const TOPIC_LABEL: Record<string, string> = {
  order_placed: "Order placed",
  order_filled: "Order filled",
  order_cancelled: "Order cancelled",
};

export function EventLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="card">
      <h3>
        Live events <span className="live-dot" title="streaming" />
      </h3>
      {log.length === 0 ? (
        <p className="hint">Listening for contract events…</p>
      ) : (
        <ul className="event-log">
          {log.map((e) => (
            <li key={e.key}>
              <span className={`evt-tag evt-${e.topic}`}>
                {TOPIC_LABEL[e.topic] ?? e.topic}
              </span>
              <span className="evt-ledger">ledger {e.ledger}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
