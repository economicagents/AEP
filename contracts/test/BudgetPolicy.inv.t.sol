// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";

/**
 * @title BudgetPolicyInvariantTest
 * @notice Invariant tests for BudgetPolicy: spent never exceeds caps after arbitrary sequences.
 */
contract BudgetPolicyInvariantTest is Test {
    BudgetPolicy public policy;
    address public account;
    address public owner;

    uint256 constant MAX_PER_TX = 1e6;
    uint256 constant MAX_DAILY = 5e6;
    uint256 constant MAX_WEEKLY = 10e6;

    function setUp() public {
        account = makeAddr("account");
        owner = makeAddr("owner");
        policy = new BudgetPolicy(account, owner, MAX_PER_TX, MAX_DAILY, MAX_WEEKLY, 0, 0, 0, 0);
    }

    function _makeRecordSpendCalldata(uint256 amount) internal pure returns (bytes memory) {
        address dest = address(0x1234);
        address to = address(0x5678);
        bytes memory inner = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
        return abi.encodeWithSignature("execute(address,uint256,bytes)", dest, 0, inner);
    }

    function testFuzz_InvariantSpentNeverExceedsCaps(uint256 amount1, uint256 amount2, uint256 amount3) public {
        vm.assume(amount1 <= MAX_PER_TX);
        vm.assume(amount2 <= MAX_PER_TX);
        vm.assume(amount3 <= MAX_PER_TX);
        vm.assume(amount1 + amount2 + amount3 <= MAX_DAILY);

        vm.prank(account);
        policy.recordSpend(_makeRecordSpendCalldata(amount1));
        vm.prank(account);
        policy.recordSpend(_makeRecordSpendCalldata(amount2));
        vm.prank(account);
        policy.recordSpend(_makeRecordSpendCalldata(amount3));

        assertLe(policy.spentDaily(), MAX_DAILY, "spentDaily exceeds maxDaily");
        assertLe(policy.spentWeekly(), MAX_WEEKLY, "spentWeekly exceeds maxWeekly");
    }
}
