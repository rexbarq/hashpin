// This file will export ABIs and other utilities once the contract is compiled
// For now, we'll export a placeholder

// Import contract artifacts (will be available after compilation)
// import HashpinArtifact from '../../hashpin-contracts/artifacts/contracts/Hashpin.sol/Hashpin.json';

// Export contract ABI
// export const HashpinABI = HashpinArtifact.abi;

// Utility function to format hash with 0x prefix if needed
export function formatHash(hash: string): string {
  if (!hash.startsWith('0x')) {
    return `0x${hash}`;
  }
  return hash;
}

// Utility function to validate hash format (32 bytes)
export function isValidHash(hash: string): boolean {
  const hexPattern = /^0x[0-9a-fA-F]{64}$/;
  return hexPattern.test(hash);
}

// Utility function to get current timestamp in seconds
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// Types
export interface HashpinData {
  hash: string;
  pinner: string;
  metadata: string;
  timestamp: number;
}

// Constants
export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'; 