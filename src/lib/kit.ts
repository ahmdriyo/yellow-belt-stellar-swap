import {
  StellarWalletsKit,
  Networks,
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { NETWORK_PASSPHRASE } from "../config";

// Human readable metadata for the wallets we support. The `id` values must
// match the module ids used by StellarWalletsKit so we can deep-link a click
// straight into the kit's auth flow.
export const SUPPORTED_WALLETS = [
  { id: "freighter", name: "Freighter", module: "freighter", color: "#6c5ce7" },
  { id: "albedo", name: "Albedo", module: "albedo", color: "#0a8bd6" },
  { id: "lobstr", name: "Lobstr", module: "lobstr", color: "#ffb300" },
  { id: "rabet", name: "Rabet", module: "rabet", color: "#2d9bf0" },
  { id: "hana", name: "Hana", module: "hana", color: "#e0457b" },
  { id: "xbull", name: "xBull", module: "xbull", color: "#16a34a" },
] as const;

let initialized = false;

export function initKit(): void {
  if (initialized) return;
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: [
      new FreighterModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
      new xBullModule(),
    ],
  });
  initialized = true;
}

export { StellarWalletsKit, NETWORK_PASSPHRASE };
