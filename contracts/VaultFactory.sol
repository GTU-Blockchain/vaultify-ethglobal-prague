// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Vault.sol";

contract VaultFactory {
    mapping(address => address[]) public userVaults;

    event VaultCreated(address indexed creator, address vault);

    function createVault(address recipient, uint unlockTimestamp, string memory cid) public payable returns (address) {
        require(msg.value > 0, "Must lock ETH");

        Vault vault = new Vault{value: msg.value}(msg.sender, recipient, unlockTimestamp, cid);
        userVaults[msg.sender].push(address(vault));

        emit VaultCreated(msg.sender, address(vault));
        return address(vault);
    }

    function getVaults(address user) external view returns (address[] memory) {
        return userVaults[user];
    }
}
