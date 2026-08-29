import { useCallback, useEffect, useRef, useState } from "react";
import { Keypair } from "@stellar/stellar-sdk";
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
import { StellarWalletsKit } from "../lib/kit";
import type { AppError } from "../lib/errors";
import { TOKENS } from "../config";
import {
  type Signer,
  walletSigner,
  keypairSigner,
  generateTestKeypair,
} from "../lib/signer";

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

const TEST_SECRET_KEY = "swap_test_secret";

export function useWallet() {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [connecting, setConnecting] = useState(false);
  const kpRef = useRef<Keypair | null>(null);

  // Restore a previously generated test account across reloads.
  useEffect(() => {
    const secret = sessionStorage.getItem(TEST_SECRET_KEY);
    if (secret) {
      try {
        const kp = Keypair.fromSecret(secret);
        kpRef.current = kp;
        setSigner(keypairSigner(kp));
      } catch {
        sessionStorage.removeItem(TEST_SECRET_KEY);
      }
    }
  }, []);

  const connectWith = useCallback(async (moduleId: string) => {
    setConnecting(true);
    try {
      StellarWalletsKit.setWallet(moduleId);
      const { address } = await StellarWalletsKit.authModal();
      setSigner(walletSigner(address));
      return address;
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectTestAccount = useCallback(async () => {
    setConnecting(true);
    try {
      const kp = generateTestKeypair();
      const res = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(kp.publicKey())}`
      );
      if (!res.ok) throw new Error("Friendbot failed to fund the test account");
      sessionStorage.setItem(TEST_SECRET_KEY, kp.secret());
      kpRef.current = kp;
      setSigner(keypairSigner(kp));
      return kp.publicKey();
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
    sessionStorage.removeItem(TEST_SECRET_KEY);
    kpRef.current = null;
    setSigner(null);
  }, []);

  const address = signer?.address ?? null;
  return { address, signer, connecting, connectWith, connectTestAccount, disconnect };
}

export function useSwap(signer: Signer | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [nativeBalance, setNativeBalance] = useState<string>("0");
  const [tx, setTx] = useState<TxnState>({ hash: null, status: "idle", label: "" });
  const [error, setError] = useState<AppError | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const address = signer?.address ?? null;
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
      [TOKENS.SWAP1.code, TOKENS.SWAP2.code].map(
        async (code) => [code, await tokenBalance(code, address)] as const
      )
    );
    setBalances(Object.fromEntries(entries));
  }, [address]);

  const runTx = useCallback(
    async (label: string, build: (user: string) => any) => {
      if (!signer) {
        setError({
          kind: "WALLET_NOT_FOUND",
          message: "Connect a wallet (or use a test account) before sending a transaction.",
        });
        return;
      }
      setError(null);
      try {
        const native = await getNativeBalance(signer.address);
        if (parseFloat(native) < 1) {
          throw new Error(ZERO_BALANCE_MSG);
        }
        const op = build(signer.address);
        const { hash } = await submitOperation(op, signer);
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
    [signer, refreshBalances, refreshOrders]
  );

  const faucet = useCallback(() => {
    return runTx("Faucet (mint test tokens)", (user) => buildFaucetOp(user));
  }, [runTx]);

  const placeOrder = useCallback(
    (sellToken: string, buyToken: string, sellHuman: string, buyHuman: string) => {
      const sell = toBase(sellHuman);
      const buy = toBase(buyHuman);
      if (!sell || !buy) return;
      const have = BigInt(balances[sellToken] || "0");
      if (BigInt(sell) > have) {
        setError({
          kind: "INSUFFICIENT_BALANCE",
          message:
            "You do not hold enough tokens to place this sell order. Use the faucet to mint test tokens first.",
        });
        return;
      }
      return runTx("Place order", (user) =>
        buildPlaceOrderOp(user, sellToken, buyToken, sell, buy)
      );
    },
    [runTx, balances]
  );

  const fillOrder = useCallback(
    (orderId: number) => {
      return runTx(`Fill order #${orderId}`, (user) => buildFillOrderOp(orderId, user));
    },
    [runTx]
  );

  const cancelOrder = useCallback(
    (orderId: number) => {
      return runTx(`Cancel order #${orderId}`, (user) => buildCancelOrderOp(orderId, user));
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
              [{ key, topic: ev.topic, ledger: ev.ledger, at: Date.now() }, ...prev].slice(0, 30)
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
    address,
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
    const res = await fetch("https://soroban-testnet.stellar.org/GetLatestLedger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    return Number(data?.result?.sequence ?? 0);
  } catch {
    return 1;
  }
}
