// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title SnapVault - Simplified Snapchat-like POC for Hackathon
 * @dev Minimal viable product focusing on core features
 */
contract SnapVault {
    
    // Simplified structs for POC
    struct SnapData {
        uint256 id;
        string senderUsername;
        string recipientUsername;
        string ipfsCID;
        string message;
        uint256 flowAmount;
        uint256 createdAt;
        uint256 unlockAt; // 0 for instant snaps
        bool isOpened;
        SnapType snapType;
    }
    
    enum SnapType { Instant, Timed }
    
    // Essential state variables only
    mapping(string => address) public usernames; // username => address
    mapping(address => string) public addressToUsername; // address => username
    mapping(uint256 => SnapData) public snaps; // snapId => snap data
    mapping(address => uint256[]) public userReceivedSnaps; // user => received snap IDs
    
    uint256 public nextSnapId = 1;
    uint256 public totalUsers = 0;
    
    // Essential events for demo
    event UsernameRegistered(string indexed username, address indexed userAddress);
    event SnapSent(uint256 indexed snapId, string indexed senderUsername, string indexed recipientUsername, SnapType snapType);
    event SnapOpened(uint256 indexed snapId, string indexed recipientUsername);
    
    // Simplified modifiers
    modifier onlyRegisteredUser() {
        require(bytes(addressToUsername[msg.sender]).length > 0, "Register username first");
        _;
    }
    
    modifier validUsername(string memory username) {
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Username 3-20 chars");
        require(usernames[_toLowerCase(username)] == address(0), "Username taken");
        _;
    }
    
    /**
     * @dev Register username - core feature for POC
     */
    function registerUsername(string memory username) external validUsername(username) returns (bool) {
        require(bytes(addressToUsername[msg.sender]).length == 0, "Already registered");
        
        string memory lowerUsername = _toLowerCase(username);
        
        usernames[lowerUsername] = msg.sender;
        addressToUsername[msg.sender] = lowerUsername;
        totalUsers++;
        
        emit UsernameRegistered(lowerUsername, msg.sender);
        return true;
    }
    
    /**
     * @dev Send snap - main feature for demo
     * @notice FLOW payment is required for every snap
     */
    function sendSnap(
        string memory recipientUsername,
        string memory ipfsCID,
        string memory message,
        uint256 unlockDelaySeconds,
        SnapType snapType
    ) external payable onlyRegisteredUser returns (uint256) {
        require(msg.value > 0, "FLOW payment required to send snap");
        
        string memory lowerRecipientUsername = _toLowerCase(recipientUsername);
        address recipientAddress = usernames[lowerRecipientUsername];
        require(recipientAddress != address(0), "Recipient not found");
        require(recipientAddress != msg.sender, "Can't send to yourself");
        
        string memory senderUsername = addressToUsername[msg.sender];
        uint256 unlockAt = 0;
        
        if (snapType == SnapType.Timed) {
            require(unlockDelaySeconds > 0, "Need unlock delay for timed snaps");
            unlockAt = block.timestamp + unlockDelaySeconds;
        }
        
        uint256 snapId = nextSnapId;
        
        snaps[snapId] = SnapData({
            id: snapId,
            senderUsername: senderUsername,
            recipientUsername: lowerRecipientUsername,
            ipfsCID: ipfsCID,
            message: message,
            flowAmount: msg.value,
            createdAt: block.timestamp,
            unlockAt: unlockAt,
            isOpened: false,
            snapType: snapType
        });
        
        userReceivedSnaps[recipientAddress].push(snapId);
        nextSnapId++;
        
        emit SnapSent(snapId, senderUsername, lowerRecipientUsername, snapType);
        return snapId;
    }
    
    /**
     * @dev Open snap and claim FLOW - demo the unlock mechanism
     */
    function openSnap(uint256 snapId) external onlyRegisteredUser returns (uint256) {
        require(snapId > 0 && snapId < nextSnapId, "Invalid snap ID");
        
        SnapData storage snap = snaps[snapId];
        string memory recipientUsername = addressToUsername[msg.sender];
        
        require(
            keccak256(bytes(snap.recipientUsername)) == keccak256(bytes(recipientUsername)), 
            "Not your snap"
        );
        require(!snap.isOpened, "Already opened");
        
        // Check unlock time for timed snaps
        if (snap.snapType == SnapType.Timed) {
            require(block.timestamp >= snap.unlockAt, "Still locked");
        }
        
        snap.isOpened = true;
        uint256 flowAmount = snap.flowAmount;
        
        if (flowAmount > 0) {
            payable(msg.sender).transfer(flowAmount);
        }
        
        emit SnapOpened(snapId, recipientUsername);
        return flowAmount;
    }
    
    // Essential view functions for demo
    
    function isUsernameAvailable(string memory username) external view returns (bool) {
        return usernames[_toLowerCase(username)] == address(0);
    }
    
    function getAddressByUsername(string memory username) external view returns (address) {
        return usernames[_toLowerCase(username)];
    }
    
    function getUsernameByAddress(address userAddress) external view returns (string memory) {
        return addressToUsername[userAddress];
    }
    
    function getSnapData(uint256 snapId) external view returns (SnapData memory) {
        require(snapId > 0 && snapId < nextSnapId, "Invalid snap ID");
        return snaps[snapId];
    }
    
    function canOpenSnap(uint256 snapId) external view returns (bool) {
        require(snapId > 0 && snapId < nextSnapId, "Invalid snap ID");
        
        SnapData memory snap = snaps[snapId];
        if (snap.isOpened) return false;
        if (snap.snapType == SnapType.Instant) return true;
        return block.timestamp >= snap.unlockAt;
    }
    
    function getUserReceivedSnaps(address userAddress) external view returns (uint256[] memory) {
        return userReceivedSnaps[userAddress];
    }
    
    function getStats() external view returns (uint256 totalUsers_, uint256 totalSnaps_) {
        return (totalUsers, nextSnapId - 1);
    }
    
    // Utility function
    function _toLowerCase(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        
        for (uint i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
    
    // Accept FLOW payments
    receive() external payable {}
}