// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IntelLog {

    address public owner;

    struct Log {
        string dataHash;
        uint256 timestamp;
    }

    Log[] public logs;

    event LogStored(string dataHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function storeLog(string memory _hash) public onlyOwner {
        logs.push(Log(_hash, block.timestamp));
        emit LogStored(_hash, block.timestamp);
    }

    function getLog(uint index) public view returns (string memory, uint256) {
        Log memory l = logs[index];
        return (l.dataHash, l.timestamp);
    }

    function totalLogs() public view returns (uint256) {
        return logs.length;
    }
}