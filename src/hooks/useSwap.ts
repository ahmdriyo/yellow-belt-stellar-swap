import { useCallback, useEffect, useRef, useState } from "react";
import { StellarWalletsKit } from "../lib/kit";
import {
  getOrders,
  tokenBalance,
  getNativeBalance,
  fundWithFriendbot,
  submitOperation,
  waitForTransaction,
  buildPlaceOrderOp,
  buildFillOrderOp,
  buildCancelOrderOp,
  buildFaucetOp,
  fetchContractEvents,
  type Order,
  type TxnStatus,
} from "../lib/stellar";
import type { AppError } from "../lib/errors";
import { TOKENS } from "../config";

export interface TxnState {
  hash: string | null;
  status: TxnStatus;
  label: string;
}

export interface LogEntry {
  key: string;
  topic: string;
  ledger: number;
  at: number;
}

const ZERO_BALANCE_MSG = "Account not funded / insufficient balance to pay fees";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectWith = useCallback(async (moduleId: string) => {
    setConnecting(true);
    try {
      StellarWalletsKit.setWallet(moduleId);
      const { address } = await StellarWalletsKit.authModal();
      setAddress(address);
      return address;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      /* ignore */
    }
    setAddress(null);
  }, []);

  return { address, connecting, connectWith, disconnect, setAddress };
}

export function useSwap(address: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [tx, setTx] = useState<TxnState>({
    hash: null,
    status: "idle",
    label: "",
  });
  const [error, setError] = useState<AppError | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const cursorRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());

  const refreshOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (e) {
      setError({ kind: "UNKNOWN", message: String((e as Error).message) });
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!address) {
      setBalances({});
      setNativeBalance("0");
      return;
    }
    const native = await getNativeBalance(address);
    setNativeBalance(native);
    const entries = await Promise.all(
      [TOKENS.SWAP1.contract, TOKENS.SWAP2.contract].map(
        async (id) => [id, await tokenBalance(id, address)] as const
      )
    );
    setBalances(Object.fromEntries(entries));
  }, [address]);

  const runTx = useCallback(
    async (label: string, build: (user: string) => any) => {
      if (!address) {
        setError({
          kind: "WALLET_NOT_FOUND",
          message: "Connect a wallet before sending a transaction.",
        });
        return;
      }
      setError(null);
      try {
        const native = await getNativeBalance(address);
        if (parseFloat(native) < 1) {
          throw new Error(ZERO_BALANCE_MSG);
        }
        const op = build(address);
        const { hash } = await submitOperation(op, address);
        setTx({ hash, status: "pending", label });
        const status = await waitForTransaction(hash, (s) =>
          setTx((prev) => ({ ...prev, status: s }))
        );
        if (status === "success") {
          await refreshOrders();
          await refreshBalances();
        }
      } catch (e) {
        setError({ kind: "UNKNOWN", message: String((e as Error).message) });
        setTx((prev) => ({ ...prev, status: "fail" }));
      }
    },
    [address, refreshBalances, refreshOrders]
  );

  const faucet = useCallback(() => {
    return runTx("Faucet (mint test tokens)", (user) => buildFaucetOp(user));
  }, [runTx]);

  const placeOrder = useCallback(
    (
      sellToken: string,
      buyToken: string,
      sellHuman: string,
      buyHuman: string
    ) => {
      const sell = toBase(sellHuman);
      const buy = toBase(buyHuman);
      return runTx("Place order", (user) =>
        buildPlaceOrderOp(user, sellToken, buyToken, sell, buy)
      );
    },
    [runTx]
  );

  const fillOrder = useCallback(
    (orderId: number) => {
      return runTx(`Fill order #${orderId}`, (user) =>
        buildFillOrderOp(orderId, user)
      );
    },
    [runTx]
  );

  const cancelOrder = useCallback(
    (orderId: number) => {
      return runTx(`Cancel order #${orderId}`, (user) =>
        buildCancelOrderOp(orderId, user)
      );
    },
    [runTx]
  );

  const fundWallet = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      await fundWithFriendbot(address);
      await refreshBalances();
    } catch (e) {
      setError({ kind: "UNKNOWN", message: String((e as Error).message) });
    }
  }, [address, refreshBalances]);

  // Keep the orderbook + balances in sync with on-chain events.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        let start = cursorRef.current;
        if (start === 0) {
          const latest = await getLatestLedgerSafe();
          start = Math.max(1, latest - 200);
        }
        const events = await fetchContractEvents(start);
        for (const ev of events) {
          const key = `${ev.ledger}:${ev.topic}`;
          if (!seenRef.current.has(key)) {
            seenRef.current.add(key);
            setLog((prev) =>
              [{ key, topic: ev.topic, ledger: ev.ledger, at: Date.now() }, ...prev].slice(
                0,
                30
              )
            );
          }
          cursorRef.current = Math.max(cursorRef.current, ev.ledger + 1);
        }
        if (events.length > 0 && alive) {
          await refreshOrders();
        }
      } catch {
        /* transient, retry next tick */
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [refreshOrders]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  return {
    orders,
    loadingOrders,
    balances,
    nativeBalance,
    tx,
    error,
    log,
    setError,
    faucet,
    placeOrder,
    fillOrder,
    cancelOrder,
    fundWallet,
    refreshOrders,
    refreshBalances,
  };
}

// local helper
function toBase(human: string): string {
  const n = parseFloat(human);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.round(n * 10 ** 7).toString();
}

async function getLatestLedgerSafe(): Promise<number> {
  try {
    const res = await fetch(
      "https://soroban-testnet.stellar.org/GetLatestLedger",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }
    );
    const data = await res.json();
    return Number(data?.result?.sequence ?? 0);
  } catch {
    return 1;
  }
}
