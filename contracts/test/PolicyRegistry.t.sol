// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {PolicyRegistry} from "../src/PolicyRegistry.sol";
import {AEPAccountFactory} from "../src/AEPAccountFactory.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";
import {MockEntryPoint} from "./AEPAccount.t.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";

contract PolicyRegistryTest is Test {
    PolicyRegistry public registry;
    AEPAccountFactory public factory;
    MockEntryPoint public entryPoint;
    address public owner;

    function setUp() public {
        owner = makeAddr("owner");
        registry = new PolicyRegistry(owner);
        entryPoint = new MockEntryPoint();
        AEPAccount implementation = new AEPAccount(IEntryPoint(address(entryPoint)));
        factory = new AEPAccountFactory(IEntryPoint(address(entryPoint)), address(implementation));
    }

    function test_RegisterAndGetTemplate() public {
        vm.prank(owner);
        registry.registerTemplate(keccak256("default"), 1e6, 2e6, 5e6);

        (uint256 maxPerTx, uint256 maxDaily, uint256 maxWeekly,,,,) = registry.getTemplate(keccak256("default"));
        assertEq(maxPerTx, 1e6);
        assertEq(maxDaily, 2e6);
        assertEq(maxWeekly, 5e6);
        assertTrue(registry.hasTemplate(keccak256("default")));
    }

    function test_DeployFromTemplate() public {
        vm.prank(owner);
        registry.registerTemplate(keccak256("custom"), 100, 1000, 5000);

        address account = factory.deployFromTemplate(address(registry), keccak256("custom"), owner, bytes32(uint256(1)));

        assertTrue(account != address(0));
        address[] memory modules = _getModules(account);
        assertEq(modules.length, 2);

        BudgetPolicy budgetPolicy = BudgetPolicy(payable(modules[0]));
        assertEq(budgetPolicy.maxPerTx(), 100);
        assertEq(budgetPolicy.maxDaily(), 1000);
        assertEq(budgetPolicy.maxWeekly(), 5000);
    }

    function test_TemplateNotFoundReverts() public {
        vm.expectRevert(PolicyRegistry.PolicyRegistryTemplateNotFound.selector);
        registry.getTemplate(keccak256("nonexistent"));
    }

    function test_OnlyOwnerCanRegister() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert();
        registry.registerTemplate(keccak256("hack"), 1, 1, 1);
    }

    function test_Ownable2Step_TransferRequiresAccept() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        registry.transferOwnership(newOwner);
        assertEq(registry.owner(), owner);
        assertEq(registry.pendingOwner(), newOwner);

        vm.prank(newOwner);
        registry.acceptOwnership();
        assertEq(registry.owner(), newOwner);
        assertEq(registry.pendingOwner(), address(0));

        vm.prank(newOwner);
        registry.registerTemplate(keccak256("after"), 1, 2, 3);
        assertTrue(registry.hasTemplate(keccak256("after")));
    }

    function _getModules(address account) internal view returns (address[] memory) {
        uint256 len = AEPAccount(payable(account)).getPolicyModulesLength();
        address[] memory mods = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            mods[i] = AEPAccount(payable(account)).policyModules(i);
        }
        return mods;
    }
}
