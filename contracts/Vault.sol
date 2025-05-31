// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Vault {
    address public creator;
    address public recipient;
    uint public unlockTimestamp;
    bool public unlocked;
    string public cid;

    constructor(address _creator, address _recipient, uint _unlockTimestamp, string memory _cid) payable {
        creator = _creator;
        recipient = _recipient;
        unlockTimestamp = _unlockTimestamp;
        cid = _cid;
        unlocked = false;
    }

    function unlock() external {
        require(block.timestamp >= unlockTimestamp, "Not yet unlocked");
        require(msg.sender == recipient, "Not recipient");
        require(!unlocked, "Already unlocked");

        unlocked = true;
        payable(recipient).transfer(address(this).balance);
    }

    function getCID() external view returns (string memory) {
        require(unlocked, "Vault locked");
        return cid;
    }

    receive() external payable {}
}
