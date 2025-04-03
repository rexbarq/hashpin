interface WatchAssetParams {
  type: string;
  options: {
    address: string;
    tokenId?: string;
    symbol?: string;
    decimals?: number;
  };
}

interface EthereumProvider {
  request: (args: { method: string; params?: WatchAssetParams | unknown[] }) => Promise<unknown>;
  on: (eventName: string, handler: (params: unknown) => void) => void;
  removeListener: (eventName: string, handler: (params: unknown) => void) => void;
  selectedAddress?: string;
  networkVersion?: string;
  chainId?: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {}; 