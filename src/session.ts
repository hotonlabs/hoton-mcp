export interface WalletAccount {
  address: string;
  publicKey?: string;
  walletStateInit?: string;
  chain?: string;
}

export interface Session {
  getWallet(): WalletAccount | null;
  setWallet(w: WalletAccount): void;
  getReferrer(): string | null;
  setReferrer(addr: string | null): void;
}

export function createSession(): Session {
  let wallet: WalletAccount | null = null;
  let referrer: string | null = null;
  return {
    getWallet: () => wallet,
    setWallet: (w) => { wallet = w; },
    getReferrer: () => referrer,
    setReferrer: (addr) => { referrer = addr; },
  };
}
