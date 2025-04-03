export interface WatchAssetParams {
  address: string;
  tokenId?: string;
  symbol?: string;
  decimals?: number;
}

export interface WatchAssetRequest {
  type: string;
  options: WatchAssetParams;
} 