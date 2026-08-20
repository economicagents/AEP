// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {AEPTestBase} from "./helpers/AEPTestHelpers.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";
import {CounterpartyPolicy} from "../src/policies/CounterpartyPolicy.sol";
import {RateLimitPolicy} from "../src/policies/RateLimitPolicy.sol";

/**
 * @title AEPAccountFactoryDefaultsTest
 * @notice Assert default factory account policy configuration.
 */
contract AEPAccountFactoryDefaultsTest is AEPTestBase {
    function setUp() public {
        _deployCore();
    }

    function test_DeployAccountBudgetPolicyDefaults() public {
        address account = _deployAccount(bytes32(uint256(500)));
        BudgetPolicy budget = _budgetPolicy(account);

        assertEq(budget.maxPerTx(), 0);
        assertEq(budget.maxDaily(), factory.DEFAULT_DAILY_CAP());
        assertEq(budget.maxWeekly(), 0);
        assertEq(budget.maxPerTask(), 0);
        assertEq(budget.taskWindowSeconds(), 0);
        assertEq(budget.dailyWindowSeconds(), 0);
        assertEq(budget.weeklyWindowSeconds(), 0);
    }

    function test_DeployAccountCounterpartyPolicyDefaults() public {
        address account = _deployAccount(bytes32(uint256(501)));
        CounterpartyPolicy counterparty = _counterpartyPolicy(account);

        assertFalse(counterparty.useAllowList());
        assertFalse(counterparty.useGlobalMinReputation());
        assertTrue(counterparty.checkPolicy(0, makeAddr("anyRecipient")));
    }

    function test_DeployAccountModuleOrder() public {
        address account = _deployAccount(bytes32(uint256(502)));
        assertTrue(AEPAccount(payable(account)).isPolicyModule(address(_budgetPolicy(account))));
        assertTrue(AEPAccount(payable(account)).isPolicyModule(address(_counterpartyPolicy(account))));
    }

    function test_DeployAccountNoRateLimitModule() public {
        address account = _deployAccount(bytes32(uint256(503)));
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), 2);

        for (uint256 i = 0; i < 2; i++) {
            address mod = AEPAccount(payable(account)).policyModules(i);
            assertFalse(_isRateLimitModule(mod));
        }
    }

    function test_DefaultDailyCapIsOneUsdc() public view {
        assertEq(factory.DEFAULT_DAILY_CAP(), 1e6);
    }

    function _isRateLimitModule(address mod) internal view returns (bool) {
        try RateLimitPolicy(mod).maxTxPerWindow() returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }
}
