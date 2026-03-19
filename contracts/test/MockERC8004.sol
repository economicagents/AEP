// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC8004Identity} from "../src/interfaces/IERC8004Identity.sol";
import {IERC8004Reputation} from "../src/interfaces/IERC8004Reputation.sol";

contract MockERC8004Identity is IERC8004Identity {
    mapping(uint256 => address) public agentWallets;

    function setAgentWallet(uint256 agentId, address wallet) external {
        agentWallets[agentId] = wallet;
    }

    function getAgentWallet(uint256 agentId) external view override returns (address) {
        return agentWallets[agentId];
    }
}

contract MockERC8004Reputation is IERC8004Reputation {
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => int128) private _summaryValue;
    mapping(uint256 => uint8) private _summaryDecimals;

    function setReputation(uint256 agentId, address client, int128 value, uint8 decimals) external {
        if (_clients[agentId].length == 0) {
            _clients[agentId].push(client);
        }
        _summaryValue[agentId] = value;
        _summaryDecimals[agentId] = decimals;
    }

    function getClients(uint256 agentId) external view override returns (address[] memory) {
        return _clients[agentId];
    }

    function getSummary(uint256 agentId, address[] calldata, string calldata, string calldata)
        external
        view
        override
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        if (_clients[agentId].length == 0) return (0, 0, 0);
        return (1, _summaryValue[agentId], _summaryDecimals[agentId]);
    }
}
