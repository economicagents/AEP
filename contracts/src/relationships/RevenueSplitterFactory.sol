// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {RevenueSplitter} from "./RevenueSplitter.sol";

/**
 * @title RevenueSplitterFactory
 * @notice Deploys RevenueSplitter instances.
 */
contract RevenueSplitterFactory {
    error RevenueSplitterFactoryZeroAddress();

    event SplitterCreated(address indexed splitter, address indexed token);

    function createSplitter(address[] calldata recipients, uint256[] calldata weights, address token)
        external
        returns (address splitter)
    {
        if (token == address(0)) revert RevenueSplitterFactoryZeroAddress();
        splitter = address(new RevenueSplitter(recipients, weights, token));
        emit SplitterCreated(splitter, token);
    }
}
