import {
  Contract,
  Address,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { server } from "./rpc";
import { StellarWalletsKit, NETWORK_PASSPHRASE } from "./kit";
import {
  CONTRACT_ID,
  READ_SOURCE,
  HORIZON_URL,
  FRIENDBOT_URL,
} from "../config";

export type TxnStatus = "idle" | "pending" | "success" | "fail";

export interface Order {
  id: number;
  seller: string;
  sell_token: string;
  buy_token: string;
  sell_amount: string;
  buy_amount: string;
  active: boolean;
}

const contract = new Contract(CONTRACT_ID);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function i128(value: string | number) {
  return nativeToScVal(value.toString(), { type: "i128" });
}

function addr(address: string) {
  return new Address(address).toScVal();
}

async function readCall(op: any): Promise<any> {
  const account = await server.getAccount(READ_SOURCE);
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sim: any = await server.simulateTransaction(tx);
  if (sim.error) throw new Error(String(sim.error));
  const retval = sim.result?.retval;
  if (!retval) return null;
  return scValToNative(retval);
}

export async function getOrders(): Promise<Order[]> {
  const raw = await readCall(contract.call("get_orders"));
  if (!Array.isArray(raw)) return [];
  return raw.map((o: any) => ({
    id: Number(o.id),
    seller: String(o.seller),
    sell_token: String(o.sell_token),
    buy_token: String(o.buy_token),
    sell_amount: String(o.sell_amount),
    buy_amount: String(o.buy_amount),
    active: Boolean(o.active),
  }));
}

export async function tokenBalance(
  tokenId: string,
  user: string
): Promise<string> {
  try {
    const c = new Contract(tokenId);
    const raw = await readCall(c.call("balance", addr(user)));
    return raw == null ? "0" : String(raw);
  } catch {
    return "0";
  }
}

export async function getNativeBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) return "0";
    const data = await res.json();
    const xlm = data.balances?.find(
      (b: any) => b.asset_type === "native"
    );
    return xlm ? xlm.balance : "0";
  } catch {
    return "0";
  }
}

export function fundWithFriendbot(address: string): Promise<Response> {
  return fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
}

/**
 * Simulate, sign (via the connected wallet) and submit a contract operation.
 * Returns the transaction hash so the caller can track its status.
 */
export async function submitOperation(
  op: any,
  userAddress: string
): Promise<{ hash: string }> {
  const account = await server.getAccount(userAddress);
  let tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();

  // prepareTransaction simulates the tx and applies auth + resource fees.
  tx = (await server.prepareTransaction(tx)) as any;

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(tx.toXDR(), {
    address: userAddress,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const send: any = await server.sendTransaction(signed);

  if (send.status !== "PENDING" && send.status !== "DUPLICATE") {
    throw new Error(`Transaction rejected by network: ${send.status}`);
  }
  return { hash: send.hash };
}

export async function waitForTransaction(
  hash: string,
  onUpdate: (status: TxnStatus) => void
): Promise<TxnStatus> {
  const start = Date.now();
  onUpdate("pending");
  while (Date.now() - start < 60000) {
    await sleep(1500);
    try {
      const res = await server.getTransaction(hash);
      if (res.status === "SUCCESS") {
        onUpdate("success");
        return "success";
      }
      if (res.status === "FAILED" || res.status === "NOT_FOUND") {
        onUpdate("fail");
        return "fail";
      }
    } catch {
      /* keep polling */
    }
    onUpdate("pending");
  }
  onUpdate("pending");
  return "pending";
}

export function buildPlaceOrderOp(
  seller: string,
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  buyAmount: string
) {
  return contract.call(
    "place_order",
    addr(seller),
    addr(sellToken),
    addr(buyToken),
    i128(sellAmount),
    i128(buyAmount)
  );
}

export function buildFillOrderOp(orderId: number, filler: string) {
  return contract.call("fill_order", i128(orderId), addr(filler));
}

export function buildCancelOrderOp(orderId: number, seller: string) {
  return contract.call("cancel_order", i128(orderId), addr(seller));
}

export function buildFaucetOp(user: string) {
  return contract.call("faucet", addr(user));
}

export interface DecodedEvent {
  topic: string;
  data: any;
  ledger: number;
  contractId: string;
}

function toNative(v: any) {
  if (typeof v === "string") {
    try {
      return scValToNative(xdr.ScVal.fromXDR(v, "base64"));
    } catch {
      return v;
    }
  }
  return scValToNative(v);
}

export function decodeEvent(e: any): DecodedEvent {
  let topic = "unknown";
  try {
    topic = String(toNative(e.topic?.[0]));
  } catch {
    topic = "unknown";
  }
  let data: any = null;
  try {
    if (e.data) data = toNative(e.data);
  } catch {
    data = null;
  }
  return {
    topic,
    data,
    ledger: e.ledger,
    contractId: e.contractId,
  };
}

/**
 * Fetch events emitted by our contract since `startLedger`, filtered to the
 * three lifecycle topics we care about (client-side for maximum compatibility).
 */
export async function fetchContractEvents(
  startLedger: number
): Promise<DecodedEvent[]> {
  const res = await server.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [CONTRACT_ID],
      },
    ],
    limit: 100,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (res as any).events ?? [];
  const wanted = ["order_placed", "order_filled", "order_cancelled"];
  return events.map(decodeEvent).filter((ev: DecodedEvent) => wanted.includes(ev.topic));
}
