// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {AEPAccountFactory} from "../src/AEPAccountFactory.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "../src/vendor/interfaces/PackedUserOperation.sol";
import {IStakeManager} from "../src/vendor/interfaces/IStakeManager.sol";

contract MockEntryPoint is IEntryPoint {
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public nonces;

    function getNonce(address sender, uint192) external view override returns (uint256) {
        return nonces[sender];
    }

    function incrementNonce(uint192) external override {}

    function handleOps(PackedUserOperation[] calldata, address payable) external override {}

    function handleAggregatedOps(IEntryPoint.UserOpsPerAggregator[] calldata, address payable) external override {}

    function getUserOpHash(PackedUserOperation calldata) external pure override returns (bytes32) {
        return bytes32(0);
    }

    function getSenderAddress(bytes memory) external pure override {
        revert("getSenderAddress");
    }

    function delegateAndRevert(address, bytes calldata) external pure override {
        revert("delegateAndRevert");
    }

    function depositTo(address account) external payable override {
        balanceOf[account] += msg.value;
    }

    function withdrawTo(address payable dest, uint256 amount) external override {
        balanceOf[msg.sender] -= amount;
        (bool ok,) = dest.call{value: amount}("");
        require(ok, "withdraw failed");
    }

    function addStake(uint32) external payable override {}

    function unlockStake() external override {}

    function withdrawStake(address payable) external override {}

    function getDepositInfo(address account) external view override returns (IStakeManager.DepositInfo memory) {
        return IStakeManager.DepositInfo({
            deposit: balanceOf[account], staked: false, stake: 0, unstakeDelaySec: 0, withdrawTime: 0
        });
    }

    receive() external payable {}
}

/// @dev Fresh ETH recipient for fork-safe tests (makeAddr may have prior state on fork)
contract ReceiveHelper {
    receive() external payable {}
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract AEPAccountTest is Test {
    AEPAccount public implementation;
    AEPAccountFactory public factory;
    MockEntryPoint public entryPoint;

    address public owner;
    address public account;

    function setUp() public {
        owner = makeAddr("owner");
        entryPoint = new MockEntryPoint();
        entryPoint.depositTo{value: 1 ether}(address(0));

        implementation = new AEPAccount(IEntryPoint(address(entryPoint)));
        factory = new AEPAccountFactory(IEntryPoint(address(entryPoint)), address(implementation));

        vm.deal(address(entryPoint), 100 ether);
    }

    function test_DeployAccount() public {
        account = factory.deployAccount(owner, bytes32(uint256(1)));

        assertTrue(account != address(0));
        assertEq(AEPAccount(payable(account)).owner(), owner);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), 2);
    }

    function test_GetAccountAddress() public {
        address predicted = factory.getAccountAddress(owner, bytes32(uint256(1)));
        account = factory.deployAccount(owner, bytes32(uint256(1)));
        assertEq(predicted, account);
    }

    function test_ExecuteDirect() public {
        account = factory.deployAccount(owner, bytes32(uint256(1)));
        vm.deal(account, 1 ether);

        ReceiveHelper recipient = new ReceiveHelper();
        vm.prank(owner);
        AEPAccount(payable(account)).execute(address(recipient), 0.1 ether, "");

        assertEq(address(recipient).balance, 0.1 ether);
    }

    function test_BudgetPolicyCheckPolicy() public {
        account = factory.deployAccount(owner, bytes32(uint256(1)));

        assertTrue(AEPAccount(payable(account)).checkPolicy(0.5e6, makeAddr("recipient")));
        assertFalse(AEPAccount(payable(account)).checkPolicy(2e6, makeAddr("recipient")));
    }

    function test_Freeze() public {
        account = factory.deployAccount(owner, bytes32(uint256(1)));
        vm.deal(account, 1 ether);

        vm.prank(owner);
        AEPAccount(payable(account)).setFrozen(true);

        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountFrozen.selector);
        AEPAccount(payable(account)).execute(makeAddr("recipient"), 0.1 ether, "");
    }

    function test_FactoryRevertsZeroEntryPoint() public {
        vm.expectRevert(AEPAccountFactory.AEPAccountFactoryZeroAddress.selector);
        new AEPAccountFactory(IEntryPoint(address(0)), address(implementation));
    }

    function test_FactoryRevertsZeroImplementation() public {
        vm.expectRevert(AEPAccountFactory.AEPAccountFactoryZeroAddress.selector);
        new AEPAccountFactory(IEntryPoint(address(entryPoint)), address(0));
    }

    function test_InitializeRevertsOnZeroOwner() public {
        bytes memory initData = abi.encodeWithSelector(AEPAccount.initialize.selector, address(0));
        vm.expectRevert(AEPAccount.AEPAccountZeroOwner.selector);
        new ERC1967Proxy(address(implementation), initData);
    }

    function test_InitializeWithModulesRevertsOnZeroOwner() public {
        address[] memory modules;
        // Zero owner causes initializeWithModules to revert; CREATE2 fails, factory reverts with Create2Failed
        vm.expectRevert(AEPAccountFactory.AEPAccountFactoryCreate2Failed.selector);
        factory.deployAccountWithModules(address(0), bytes32(uint256(2)), modules);
    }

    function test_ExecuteBatch() public {
        account = factory.deployAccount(owner, bytes32(uint256(3)));
        vm.deal(account, 2 ether);

        address r1 = makeAddr("r1");
        address r2 = makeAddr("r2");

        address[] memory dests = new address[](2);
        dests[0] = r1;
        dests[1] = r2;
        uint256[] memory values = new uint256[](2);
        values[0] = 0.3 ether;
        values[1] = 0.5 ether;
        bytes[] memory funcs = new bytes[](2);
        funcs[0] = "";
        funcs[1] = "";

        vm.prank(owner);
        AEPAccount(payable(account)).executeBatch(dests, values, funcs);

        assertEq(r1.balance, 0.3 ether);
        assertEq(r2.balance, 0.5 ether);
    }

    function test_ExecuteBatchLengthMismatchReverts() public {
        account = factory.deployAccount(owner, bytes32(uint256(4)));
        address[] memory dests = new address[](2);
        dests[0] = makeAddr("d1");
        dests[1] = makeAddr("d2");
        uint256[] memory values = new uint256[](1);
        values[0] = 1 ether;
        bytes[] memory funcs = new bytes[](2);
        funcs[0] = "";
        funcs[1] = "";

        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountWrongArrayLengths.selector);
        AEPAccount(payable(account)).executeBatch(dests, values, funcs);
    }

    function test_NonOwnerCannotExecute() public {
        account = factory.deployAccount(owner, bytes32(uint256(5)));
        vm.deal(account, 1 ether);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(AEPAccount.AEPAccountNotEntryPointOrOwner.selector);
        AEPAccount(payable(account)).execute(makeAddr("recipient"), 0.1 ether, "");
    }

    function test_NonOwnerCannotSetFrozen() public {
        account = factory.deployAccount(owner, bytes32(uint256(6)));

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(AEPAccount.AEPAccountNotOwner.selector);
        AEPAccount(payable(account)).setFrozen(true);
    }

    function test_NonOwnerCannotSetOwner() public {
        account = factory.deployAccount(owner, bytes32(uint256(7)));

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(AEPAccount.AEPAccountNotOwner.selector);
        AEPAccount(payable(account)).setOwner(makeAddr("attacker"));
    }

    function test_NonOwnerCannotAddPolicyModule() public {
        account = factory.deployAccount(owner, bytes32(uint256(8)));
        address module = address(new MockERC20());

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(AEPAccount.AEPAccountNotOwner.selector);
        AEPAccount(payable(account)).addPolicyModule(module);
    }

    function test_SetOwner() public {
        account = factory.deployAccount(owner, bytes32(uint256(9)));
        address newOwner = makeAddr("newOwner");

        vm.prank(owner);
        AEPAccount(payable(account)).setOwner(newOwner);

        assertEq(AEPAccount(payable(account)).owner(), newOwner);

        vm.prank(newOwner);
        AEPAccount(payable(account)).setFrozen(true);
        assertTrue(AEPAccount(payable(account)).frozen());
    }

    function test_SetOwnerZeroReverts() public {
        account = factory.deployAccount(owner, bytes32(uint256(10)));

        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountZeroOwner.selector);
        AEPAccount(payable(account)).setOwner(address(0));
    }

    function test_AddRemovePolicyModule() public {
        account = factory.deployAccount(owner, bytes32(uint256(11)));
        uint256 initialLen = AEPAccount(payable(account)).getPolicyModulesLength();

        address module = address(new MockERC20());
        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(module);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), initialLen + 1);
        assertTrue(AEPAccount(payable(account)).isPolicyModule(module));

        vm.prank(owner);
        AEPAccount(payable(account)).removePolicyModule(module);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), initialLen);
        assertFalse(AEPAccount(payable(account)).isPolicyModule(module));
    }

    function test_AddPolicyModuleZeroReverts() public {
        account = factory.deployAccount(owner, bytes32(uint256(12)));

        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountZeroModule.selector);
        AEPAccount(payable(account)).addPolicyModule(address(0));
    }

    function test_AddPolicyModuleDuplicateReverts() public {
        account = factory.deployAccount(owner, bytes32(uint256(13)));
        address module = address(new MockERC20());

        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(module);
        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountAlreadyAdded.selector);
        AEPAccount(payable(account)).addPolicyModule(module);
    }

    function test_RemovePolicyModuleNotAddedReverts() public {
        account = factory.deployAccount(owner, bytes32(uint256(14)));

        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountNotModule.selector);
        AEPAccount(payable(account)).removePolicyModule(makeAddr("random"));
    }

    function test_UnfreezeRestoresExecution() public {
        account = factory.deployAccount(owner, bytes32(uint256(15)));
        vm.deal(account, 1 ether);

        vm.prank(owner);
        AEPAccount(payable(account)).setFrozen(true);
        vm.prank(owner);
        vm.expectRevert(AEPAccount.AEPAccountFrozen.selector);
        AEPAccount(payable(account)).execute(makeAddr("r"), 0.1 ether, "");

        vm.prank(owner);
        AEPAccount(payable(account)).setFrozen(false);
        vm.prank(owner);
        AEPAccount(payable(account)).execute(makeAddr("r"), 0.1 ether, "");
        assertEq(makeAddr("r").balance, 0.1 ether);
    }

    function test_DeployAccountWithModulesEmpty() public {
        address[] memory modules;
        account = factory.deployAccountWithModules(owner, bytes32(uint256(16)), modules);

        assertTrue(account != address(0));
        assertEq(AEPAccount(payable(account)).owner(), owner);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), 0);
    }

    function test_DeployAccountWithModulesThenAddModule() public {
        address[] memory modules;
        account = factory.deployAccountWithModules(owner, bytes32(uint256(17)), modules);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), 0);

        address newModule = address(new MockERC20());
        vm.prank(owner);
        AEPAccount(payable(account)).addPolicyModule(newModule);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), 1);
    }

    function test_GetAccountAddressDeterministic() public {
        bytes32 salt = bytes32(uint256(18));
        address p1 = factory.getAccountAddress(owner, salt);
        address p2 = factory.getAccountAddress(makeAddr("other"), salt);
        assertEq(p1, p2); // owner param ignored per spec
    }

    function test_DifferentSaltsDifferentAddresses() public {
        address a1 = factory.deployAccount(owner, bytes32(uint256(19)));
        address a2 = factory.deployAccount(owner, bytes32(uint256(20)));
        assertTrue(a1 != a2);
    }

    function test_AddDepositWithdrawDeposit() public {
        // Use fresh contract as owner for fork-safe test (vm.addr/makeAddr may have code on fork)
        ReceiveHelper depositOwner = new ReceiveHelper();
        vm.deal(address(depositOwner), 2 ether);

        account = factory.deployAccount(address(depositOwner), bytes32(uint256(21)));

        vm.prank(address(depositOwner));
        AEPAccount(payable(account)).addDeposit{value: 1 ether}();
        assertEq(entryPoint.balanceOf(account), 1 ether);
        assertEq(AEPAccount(payable(account)).getDeposit(), 1 ether);

        uint256 ownerBalanceBefore = address(depositOwner).balance;
        vm.prank(address(depositOwner));
        AEPAccount(payable(account)).withdrawDepositTo(payable(address(depositOwner)), 0.5 ether);
        assertEq(entryPoint.balanceOf(account), 0.5 ether);
        assertEq(address(depositOwner).balance, ownerBalanceBefore + 0.5 ether);
    }

    function test_NonOwnerCannotWithdrawDeposit() public {
        account = factory.deployAccount(owner, bytes32(uint256(22)));
        vm.deal(owner, 1 ether);
        vm.prank(owner);
        AEPAccount(payable(account)).addDeposit{value: 1 ether}();

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(AEPAccount.AEPAccountNotOwner.selector);
        AEPAccount(payable(account)).withdrawDepositTo(payable(makeAddr("attacker")), 0.5 ether);
    }
}
