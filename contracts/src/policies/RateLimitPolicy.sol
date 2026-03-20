// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IPolicyModule} from "../interfaces/IPolicyModule.sol";
import {PackedUserOperation} from "../vendor/interfaces/PackedUserOperation.sol";

/**
 * @title RateLimitPolicy
 * @notice Limits transactions per time window to prevent runaway micro-payment spam.
 */
contract RateLimitPolicy is IPolicyModule, Initializable {
    error RateLimitPolicyNotOwner();
    error RateLimitPolicyNotAccount();
    error RateLimitPolicyAlreadyInitialized();
    error RateLimitPolicyZeroOwner();
    error RateLimitPolicyZeroAccount();
    /// @dev When maxTxPerWindow > 0, windowSeconds must be > 0 or check/recordSpend window math treats every tx as a new window (limit ineffective).
    error RateLimitPolicyInvalidWindow();

    address public account;
    address public owner;

    uint256 public txCount;
    uint256 public windowStart;
    uint256 public maxTxPerWindow;
    uint256 public windowSeconds;

    event PolicyUpdated(uint256 maxTxPerWindow, uint256 windowSeconds);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event PolicyAccountUpdated(address indexed previousAccount, address indexed newAccount);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyAccount() {
        _onlyAccount();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert RateLimitPolicyNotOwner();
    }

    function _onlyAccount() internal view {
        if (msg.sender != account) revert RateLimitPolicyNotAccount();
    }

    constructor(address _account, address _owner) {
        if (_account == address(0)) revert RateLimitPolicyZeroAccount();
        if (_owner == address(0)) revert RateLimitPolicyZeroOwner();
        account = _account;
        owner = _owner;
    }

    /// @dev Policy modules must be deployed via factory or initialize called atomically in same tx as deployment.
    function initialize(address _account, address _owner) external initializer {
        if (account != address(0)) revert RateLimitPolicyAlreadyInitialized();
        if (_account == address(0)) revert RateLimitPolicyZeroAccount();
        if (_owner == address(0)) revert RateLimitPolicyZeroOwner();
        account = _account;
        owner = _owner;
    }

    function setAccount(address _account) external onlyOwner {
        if (_account == address(0)) revert RateLimitPolicyZeroAccount();
        emit PolicyAccountUpdated(account, _account);
        account = _account;
    }

    function setOwner(address _owner) external onlyOwner {
        if (_owner == address(0)) revert RateLimitPolicyZeroOwner();
        emit OwnerChanged(owner, _owner);
        owner = _owner;
    }

    function setLimits(uint256 _maxTxPerWindow, uint256 _windowSeconds) external onlyOwner {
        if (_maxTxPerWindow > 0 && _windowSeconds == 0) revert RateLimitPolicyInvalidWindow();
        maxTxPerWindow = _maxTxPerWindow;
        windowSeconds = _windowSeconds;
        emit PolicyUpdated(_maxTxPerWindow, _windowSeconds);
    }

    function check(PackedUserOperation calldata userOp) external view override returns (uint256 validationData) {
        if (userOp.sender != account) return 1;
        if (maxTxPerWindow == 0) return 0;

        uint256 _txCount = txCount;
        uint256 _windowStart = windowStart;
        uint256 now_ = block.timestamp;

        if (_windowStart == 0) _windowStart = now_;
        if (now_ >= _windowStart + windowSeconds) {
            _txCount = 0;
            _windowStart = now_;
        }

        if (_txCount >= maxTxPerWindow) return 1;
        return 0;
    }

    function checkPolicy(uint256, address) external view override returns (bool) {
        if (maxTxPerWindow == 0) return true;

        uint256 _txCount = txCount;
        uint256 _windowStart = windowStart;
        uint256 now_ = block.timestamp;

        if (_windowStart == 0) _windowStart = now_;
        if (now_ >= _windowStart + windowSeconds) _txCount = 0;

        return _txCount < maxTxPerWindow;
    }

    function recordSpend(bytes calldata) external override onlyAccount {
        if (maxTxPerWindow == 0) return;

        uint256 now_ = block.timestamp;

        if (windowStart == 0) windowStart = now_;
        if (now_ >= windowStart + windowSeconds) {
            txCount = 0;
            windowStart = now_;
        }

        txCount += 1;
    }
}
