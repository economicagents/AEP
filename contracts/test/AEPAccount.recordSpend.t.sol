// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {AEPTestBase, RevertingRecordSpendPolicy, CountingRecordSpendPolicy} from "./helpers/AEPTestHelpers.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";

/**
 * @title AEPAccountRecordSpendTest
 * @notice Documents fail-open recordSpend: execution succeeds, event emitted, budget may desync.
 */
contract AEPAccountRecordSpendTest is AEPTestBase {
    address public account;

    function setUp() public {
        _deployCore();
        account = _deployAccount(bytes32(uint256(200)));
    }

    function test_RecordSpendFailOpenEmitsEvent() public {
        RevertingRecordSpendPolicy reverting = new RevertingRecordSpendPolicy();
        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(address(reverting));

        vm.expectEmit(true, true, true, true);
        emit AEPAccount.PolicyRecordSpendFailed(address(reverting));

        vm.prank(owner);
        AEPAccount(payable(account)).execute(makeAddr("dest"), 0, "");
    }

    function test_RecordSpendFailOpenExecutionSucceeds() public {
        RevertingRecordSpendPolicy reverting = new RevertingRecordSpendPolicy();
        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(address(reverting));

        address dest = makeAddr("dest");
        vm.deal(account, 1 ether);
        vm.prank(owner);
        AEPAccount(payable(account)).execute(dest, 0.1 ether, "");
        assertEq(dest.balance, 0.1 ether);
    }

    function test_RecordSpendFailOpenOtherModulesStillCalled() public {
        RevertingRecordSpendPolicy reverting = new RevertingRecordSpendPolicy();
        CountingRecordSpendPolicy counting = new CountingRecordSpendPolicy();

        vm.startPrank(owner);
        AEPAccount(payable(account)).addPolicyModule(address(reverting));
        AEPAccount(payable(account)).addPolicyModule(address(counting));
        vm.stopPrank();

        BudgetPolicy budget = _budgetPolicy(account);
        uint256 spentBefore = budget.spentDaily();

        vm.prank(owner);
        AEPAccount(payable(account))
            .execute(makeAddr("token"), 0, abi.encodeWithSignature("transfer(address,uint256)", makeAddr("to"), 0.5e6));

        assertEq(counting.callCount(), 1);
        assertEq(budget.spentDaily(), spentBefore + 0.5e6);
    }

    function test_RecordSpendFailOpenBudgetDesyncAllowsStaleCheck() public {
        BudgetPolicy budget = _budgetPolicy(account);
        vm.prank(owner);
        budget.setCaps(0, 1e6, 0);

        address token = makeAddr("token");
        address to = makeAddr("to");
        bytes memory inner = abi.encodeWithSignature("transfer(address,uint256)", to, 1e6);
        bytes memory executeCalldata = abi.encodeWithSignature("execute(address,uint256,bytes)", token, 0, inner);

        vm.mockCallRevert(
            address(budget),
            abi.encodeWithSelector(BudgetPolicy.recordSpend.selector, executeCalldata),
            "budget recordSpend failed"
        );

        vm.prank(owner);
        AEPAccount(payable(account)).execute(token, 0, inner);

        assertEq(budget.spentDaily(), 0);
        assertTrue(AEPAccount(payable(account)).checkPolicy(1e6, to));
    }
}
