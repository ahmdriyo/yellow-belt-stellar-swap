import { rpc } from "@stellar/stellar-sdk";
import { RPC_URL } from "../config";

export const server = new rpc.Server(RPC_URL, { allowHttp: false });
