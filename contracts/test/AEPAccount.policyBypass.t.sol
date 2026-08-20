// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {AEPTestBase} from "./helpers/AEPTestHelpers.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";
import {CounterpartyPolicy} from "../src/policies/CounterpartyPolicy.sol";
import {RateLimitPolicy} from "../src/policies/RateLimitPolicy.sol";
import {SIG_VALIDATION_FAILED} from "../src/vendor/core/Helpers.sol";

/**
 * @title AEPAccountPolicyBypassTest
 * @notice Documents that owner execute/executeBatch skip policy check() but still recordSpend.
 */
contract AEPAccountPolicyBypassTest is AEPTestBase {
    address public account;

    function setUp() public {
        _deployCore();
        account = _deployAccount(bytes32(uint256(100)));
    }

    function test_OwnerExecuteBypassesBudgetCheckButRecordsSpend() public {
        BudgetPolicy budget = _budgetPolicy(account);
        assertEq(budget.maxDaily(), factory.DEFAULT_DAILY_CAP());

        address recipient = makeAddr("recipient");
        bytes memory callData = _makeTransferExecuteCalldata(makeAddr("token"), recipient, 2e6);

        assertFalse(AEPAccount(payable(account)).checkPolicy(2e6, recipient));

        vm.prank(owner);
        AEPAccount(payable(account)).execute(makeAddr("token"), 0, _innerTransfer(recipient, 2e6));

        assertEq(budget.spentDaily(), 2e6);
    }

    function test_EntryPointValidateUserOpRejectsOverBudget() public {
        address recipient = makeAddr("recipient");
        bytes memory callData = _makeTransferExecuteCalldata(makeAddr("token"), recipient, 2e6);
        bytes32 userOpHash = keccak256("over-budget");

        uint256 validationData = _validateUserOp(account, _makeExecuteUserOp(account, callData), userOpHash);
        _expectValidationFailed(validationData);
    }

    function test_OwnerExecuteBypassesCounterpartyAllowList() public {
        CounterpartyPolicy counterparty = _counterpartyPolicy(account);
        address blocked = makeAddr("blockedRecipient");

        vm.prank(owner);
        counterparty.setUseAllowList(true);
        vm.prank(owner);
        counterparty.addToAllowList(makeAddr("allowedOnly"));

        assertFalse(counterparty.checkPolicy(0, blocked));

        vm.deal(account, 1 ether);
        vm.prank(owner);
        AEPAccount(payable(account)).execute(blocked, 0.01 ether, "");
    }

    function test_OwnerExecuteBatchBypassesRateLimitCheck() public {
        RateLimitPolicy rateLimit = new RateLimitPolicy(account, owner);
        vm.prank(owner);
        rateLimit.setLimits(1, 3600);
        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(address(rateLimit));

        vm.prank(address(account));
        rateLimit.recordSpend("");

        address[] memory dests = new address[](2);
        dests[0] = makeAddr("r1");
        dests[1] = makeAddr("r2");
        uint256[] memory values = new uint256[](2);
        values[0] = 0.01 ether;
        values[1] = 0.01 ether;
        bytes[] memory funcs = new bytes[](2);
        funcs[0] = "";
        funcs[1] = "";

        vm.deal(account, 1 ether);
        vm.prank(owner);
        AEPAccount(payable(account)).executeBatch(dests, values, funcs);

        assertEq(rateLimit.txCount(), 2);
    }

    function test_EntryPointValidateUserOpEnforcesRateLimit() public {
        RateLimitPolicy rateLimit = new RateLimitPolicy(account, owner);
        vm.prank(owner);
        rateLimit.setLimits(1, 3600);
        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(address(rateLimit));

        vm.prank(address(account));
        rateLimit.recordSpend("");

        bytes memory callData = abi.encodeWithSignature("execute(address,uint256,bytes)", makeAddr("dest"), 0, "");
        bytes32 userOpHash = keccak256("rate-limited");
        uint256 validationData = _validateUserOp(account, _makeExecuteUserOp(account, callData), userOpHash);
        assertEq(validationData, SIG_VALIDATION_FAILED);
    }

    function _innerTransfer(address to, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address,uint256)", to, amount);
    }
}
