// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC20} from "../src/interfaces/IERC20.sol";

/// @dev ERC-20 that deducts a fixed fee on every transfer (fee-on-transfer semantics).
contract MockFeeOnTransferERC20 is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public feeBps;

    constructor(uint256 _feeBps) {
        feeBps = _feeBps;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function _deductFee(uint256 amount) internal view returns (uint256) {
        if (feeBps == 0) return amount;
        return amount - (amount * feeBps / 10_000);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        uint256 net = _deductFee(amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += net;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        uint256 net = _deductFee(amount);
        balanceOf[from] -= amount;
        balanceOf[to] += net;
        return true;
    }
}
