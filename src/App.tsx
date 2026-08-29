import { useState } from "react";
import "./App.css";
import { initKit } from "./lib/kit";
import { useWallet, useSwap } from "./hooks/useSwap";
import { classifyError } from "./lib/errors";
import { CONTRACT_ID, explorerContract } from "./config";
import { shortAddr } from "./lib/format";
import { ErrorBanner } from "./components/ErrorBanner";
import { TxStatus } from "./components/TxStatus";
import { WalletModal } from "./components/WalletModal";
import { Balances } from "./components/Balances";
import { FaucetPanel } from "./components/FaucetPanel";
import { SwapForm } from "./components/SwapForm";
import { OrderBook } from "./components/OrderBook";
import { EventLog } from "./components/EventLog";

initKit();

export default function App() {
  const wallet = useWallet();
  const swap = useSwap(wallet.address);
  const [modal, setModal] = useState(false);

  const handleConnect = async (moduleId: string) => {
    try {
      await wallet.connectWith(moduleId);
      setModal(false);
    } catch (e) {
      swap.setError(classifyError(e));
    }
  };

  const handleDisconnect = async () => {
    await wallet.disconnect();
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◆</span>
          <div>
            <h1>Stellar Swap</h1>
            <a
              className="contract-link"
              href={explorerContract()}
              target="_blank"
              rel="noreferrer"
            >
              contract {shortAddr(CONTRACT_ID)} ↗
            </a>
          </div>
        </div>
        <div className="wallet-area">
          {wallet.address ? (
            <div className="connected">
              <span className="dot" /> {shortAddr(wallet.address)}
              <button className="btn btn-sm" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setModal(true)}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <main className="layout">
        <section className="col">
          <ErrorBanner error={swap.error} onDismiss={() => swap.setError(null)} />
          <TxStatus tx={swap.tx} />
          <Balances
            nativeBalance={swap.nativeBalance}
            balances={swap.balances}
          />
          <FaucetPanel
            address={wallet.address}
            onFaucet={swap.faucet}
            onFund={swap.fundWallet}
            nativeBalance={swap.nativeBalance}
          />
          <SwapForm address={wallet.address} onPlace={swap.placeOrder} />
        </section>
        <section className="col">
          <OrderBook
            orders={swap.orders}
            loading={swap.loadingOrders}
            address={wallet.address}
            onFill={swap.fillOrder}
            onCancel={swap.cancelOrder}
            onRefresh={swap.refreshOrders}
          />
          <EventLog log={swap.log} />
        </section>
      </main>

      {modal && (
        <WalletModal
          onSelect={handleConnect}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}
