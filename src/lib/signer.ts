import { TransactionBuilder, Keypair } from "@stellar/stellar-sdk";
import { StellarWalletsKit, NETWORK_PASSPHRASE } from "./kit";

export interface Signer {
  address: string;
  /** Returns the base64 XDR of the signed transaction. */
  sign(txXdr: string): Promise<string>;
}

/** Signs transactions through a real Stellar wallet (StellarWalletsKit). */
export function walletSigner(address: string): Signer {
  return {
    address,
    async sign(txXdr: string) {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(txXdr, {
        address,
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      return signedTxXdr;
    },
  };
}

/** Signs transactions locally with a generated testnet keypair (no extension). */
export function keypairSigner(kp: Keypair): Signer {
  return {
    address: kp.publicKey(),
    async sign(txXdr: string) {
      const tx = TransactionBuilder.fromXDR(txXdr, NETWORK_PASSPHRASE);
      tx.sign(kp);
      return tx.toXDR();
    },
  };
}

export function generateTestKeypair(): Keypair {
  return Keypair.random();
}
