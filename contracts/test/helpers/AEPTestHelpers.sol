// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {AEPAccount} from "../../src/AEPAccount.sol";
import {AEPAccountFactory} from "../../src/AEPAccountFactory.sol";
import {BudgetPolicy} from "../../src/policies/BudgetPolicy.sol";
import {CounterpartyPolicy} from "../../src/policies/CounterpartyPolicy.sol";
import {RateLimitPolicy} from "../../src/policies/RateLimitPolicy.sol";
import {IPolicyModule} from "../../src/interfaces/IPolicyModule.sol";
import {IEntryPoint} from "../../src/vendor/interfaces/IEntryPoint.sol";
import {IStakeManager} from "../../src/vendor/interfaces/IStakeManager.sol";
import {PackedUserOperation} from "../../src/vendor/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_FAILED} from "../../src/vendor/core/Helpers.sol";

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

/// @dev Policy module that always reverts on recordSpend (tests fail-open behavior).
contract RevertingRecordSpendPolicy is IPolicyModule {
    function check(PackedUserOperation calldata) external pure returns (uint256) {
        return 0;
    }

    function checkPolicy(uint256, address) external pure returns (bool) {
        return true;
    }

    function recordSpend(bytes calldata) external pure {
        revert("recordSpend failed");
    }
}

/// @dev Tracks recordSpend calls for ordering tests.
contract CountingRecordSpendPolicy is IPolicyModule {
    uint256 public callCount;

    function check(PackedUserOperation calldata) external pure returns (uint256) {
        return 0;
    }

    function checkPolicy(uint256, address) external pure returns (bool) {
        return true;
    }

    function recordSpend(bytes calldata) external {
        callCount++;
    }
}

abstract contract AEPTestBase is Test {
    AEPAccount public implementation;
    AEPAccountFactory public factory;
    MockEntryPoint public entryPoint;

    uint256 internal ownerKey;
    address internal owner;

    function _deployCore() internal {
        ownerKey = 0xA11CE;
        owner = vm.addr(ownerKey);
        entryPoint = new MockEntryPoint();
        implementation = new AEPAccount(IEntryPoint(address(entryPoint)));
        factory = new AEPAccountFactory(IEntryPoint(address(entryPoint)), address(implementation));
        vm.deal(address(entryPoint), 100 ether);
    }

    function _deployAccount(bytes32 salt) internal returns (address account) {
        account = factory.deployAccount(owner, salt);
    }

    function _budgetPolicy(address account) internal view returns (BudgetPolicy) {
        return BudgetPolicy(payable(AEPAccount(payable(account)).policyModules(0)));
    }

    function _counterpartyPolicy(address account) internal view returns (CounterpartyPolicy) {
        return CounterpartyPolicy(AEPAccount(payable(account)).policyModules(1));
    }

    function _signUserOp(PackedUserOperation memory userOp, bytes32 userOpHash) internal view returns (bytes memory) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _validateUserOp(address account, PackedUserOperation memory userOp, bytes32 userOpHash)
        internal
        returns (uint256)
    {
        userOp.signature = _signUserOp(userOp, userOpHash);
        vm.prank(address(entryPoint));
        return AEPAccount(payable(account)).validateUserOp(userOp, userOpHash, 0);
    }

    function _makeExecuteUserOp(address account, bytes memory callData)
        internal
        pure
        returns (PackedUserOperation memory)
    {
        return PackedUserOperation({
            sender: account,
            nonce: 0,
            initCode: "",
            callData: callData,
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });
    }

    function _makeTransferExecuteCalldata(address token, address to, uint256 amount)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory inner = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
        return abi.encodeWithSignature("execute(address,uint256,bytes)", token, 0, inner);
    }

    function _expectValidationFailed(uint256 validationData) internal pure {
        assertEq(validationData, SIG_VALIDATION_FAILED);
    }
}
