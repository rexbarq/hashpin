// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IHashpinNFT.sol";

/**
 * @title MockHashpinNFT
 * @dev A mock implementation of IHashpinNFT for testing purposes
 */
contract MockHashpinNFT is IHashpinNFT {
    mapping(bytes32 => bool) public minted;
    mapping(bytes32 => address) public hashOwners;
    
    /**
     * @dev Mock implementation of mint function
     */
    function mint(address to, bytes32 hash, bytes calldata) external override returns (uint256) {
        minted[hash] = true;
        hashOwners[hash] = to;
        
        // Return the hash as the token ID for simplicity
        return uint256(hash);
    }
    
    /**
     * @dev Mock implementation of supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
        return interfaceId == type(IHashpinNFT).interfaceId;
    }
} 