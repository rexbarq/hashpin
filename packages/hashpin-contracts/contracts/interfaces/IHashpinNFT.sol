// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHashpinNFT
 * @dev Interface for NFT adapters that can mint tokens for claimed hashes
 */
interface IHashpinNFT {
    /**
     * @dev Mints an NFT representing the claimed hash
     * @param to The address that will receive the NFT
     * @param hash The hash being claimed
     * @param metadata Additional metadata for the NFT (e.g., token URI for ERC-721)
     * @return tokenId The ID of the newly minted NFT
     */
    function mint(address to, bytes32 hash, bytes calldata metadata) external returns (uint256 tokenId);
    
    /**
     * @dev Checks if the contract supports a given interface
     * @param interfaceId The interface identifier
     * @return bool True if the contract supports the interface
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
} 