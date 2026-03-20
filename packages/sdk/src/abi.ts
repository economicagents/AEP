export const AEP_ACCOUNT_FACTORY_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "bytes32" },
    ],
    name: "deployAccount",
    outputs: [{ name: "account", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "bytes32" },
    ],
    name: "getAccountAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const AEP_ACCOUNT_ABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "checkPolicy",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDeposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "frozen",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_frozen", type: "bool" }],
    name: "setFrozen",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "index", type: "uint256" }],
    name: "policyModules",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPolicyModulesLength",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Minimal ERC20 approve for factory fee payments */
export const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ERC8004_REPUTATION_ABI = [
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getClients",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    name: "getSummary",
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const COUNTERPARTY_POLICY_ABI = [
  {
    inputs: [{ name: "_registry", type: "address" }],
    name: "setReputationRegistry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_minReputation", type: "int128" },
      { name: "_decimals", type: "uint8" },
    ],
    name: "setMinReputation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_registry", type: "address" }],
    name: "setIdentityRegistry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_use", type: "bool" }],
    name: "setUseAllowList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_use", type: "bool" }],
    name: "setUseAgentAllowList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "addToAllowList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "removeFromAllowList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "addToBlockList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "removeFromBlockList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "addAgentToAllowList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "clearAgentAllowList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_use", type: "bool" }],
    name: "setUseGlobalMinReputation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "addVerifiedAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "wallet", type: "address" }],
    name: "removeVerifiedAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "getDenyReason",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Minimal ABI for policy check - all policy modules implement this */
export const POLICY_CHECK_ABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "checkPolicy",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Detect BudgetPolicy by reading maxPerTx */
export const BUDGET_POLICY_DETECT_ABI = [
  { inputs: [], name: "maxPerTx", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

/** Detect CounterpartyPolicy by reading identityRegistry */
export const COUNTERPARTY_POLICY_DETECT_ABI = [
  {
    inputs: [],
    name: "identityRegistry",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "getDenyReason",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Detect RateLimitPolicy by reading maxTxPerWindow */
export const RATE_LIMIT_POLICY_DETECT_ABI = [
  {
    inputs: [],
    name: "maxTxPerWindow",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const RATE_LIMIT_POLICY_ABI = [
  {
    inputs: [
      { name: "_maxTxPerWindow", type: "uint256" },
      { name: "_windowSeconds", type: "uint256" },
    ],
    name: "setLimits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const BUDGET_POLICY_ABI = [
  {
    inputs: [
      { name: "_maxPerTx", type: "uint256" },
      { name: "_maxDaily", type: "uint256" },
      { name: "_maxWeekly", type: "uint256" },
    ],
    name: "setCaps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_maxPerTx", type: "uint256" },
      { name: "_maxDaily", type: "uint256" },
      { name: "_maxWeekly", type: "uint256" },
      { name: "_maxPerTask", type: "uint256" },
      { name: "_taskWindowSeconds", type: "uint256" },
      { name: "_dailyWindowSeconds", type: "uint256" },
      { name: "_weeklyWindowSeconds", type: "uint256" },
    ],
    name: "setCapsFull",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "maxPerTx", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxDaily", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxWeekly", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxPerTask", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [],
    name: "taskWindowSeconds",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "dailyWindowSeconds",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "weeklyWindowSeconds",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "spentDaily", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "spentWeekly", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "spentInTask", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

/** Phase 3: CreditFacility */
export const CREDIT_FACILITY_ABI = [
  { inputs: [{ name: "amount", type: "uint256" }], name: "deposit", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amount", type: "uint256" }], name: "draw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amount", type: "uint256" }], name: "repay", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "freeze", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unfreeze", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "declareDefault", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amount", type: "uint256" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [],
    name: "getState",
    outputs: [
      { name: "_limit", type: "uint256" },
      { name: "_drawn", type: "uint256" },
      { name: "_balance", type: "uint256" },
      { name: "_frozen", type: "bool" },
      { name: "_defaulted", type: "bool" },
      { name: "_repaymentDeadline", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Phase 3: CreditFacilityFactory */
export const CREDIT_FACILITY_FACTORY_ABI = [
  {
    inputs: [
      { name: "lender", type: "address" },
      { name: "borrower", type: "address" },
      { name: "token", type: "address" },
      { name: "limit", type: "uint256" },
      { name: "minReputation", type: "uint256" },
      { name: "repaymentInterval", type: "uint256" },
      { name: "reputationRegistry", type: "address" },
      { name: "identityRegistry", type: "address" },
      { name: "borrowerAgentId", type: "uint256" },
      { name: "originationFee", type: "uint256" },
    ],
    name: "createFacility",
    outputs: [{ name: "facility", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Phase 3: ConditionalEscrow */
export const CONDITIONAL_ESCROW_ABI = [
  { inputs: [{ name: "_amount", type: "uint256" }], name: "fund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "acknowledge", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [
      { name: "_requestHash", type: "bytes32" },
      { name: "_milestoneIndex", type: "uint256" },
    ],
    name: "submitForValidation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [{ name: "_milestoneIndex", type: "uint256" }], name: "release", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "dispute", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [],
    name: "getState",
    outputs: [
      { name: "_state", type: "uint8" },
      { name: "_amount", type: "uint256" },
      { name: "_requestHash", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Phase 3: ConditionalEscrowFactory */
export const CONDITIONAL_ESCROW_FACTORY_ABI = [
  {
    inputs: [
      { name: "consumer", type: "address" },
      { name: "provider", type: "address" },
      { name: "providerAgentId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "validationRegistry", type: "address" },
      { name: "validatorAddress", type: "address" },
      { name: "releaseThreshold", type: "uint8" },
      { name: "setupFee", type: "uint256" },
    ],
    name: "createEscrow",
    outputs: [{ name: "escrow", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "consumer", type: "address" },
      { name: "provider", type: "address" },
      { name: "providerAgentId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "validationRegistry", type: "address" },
      { name: "validatorAddress", type: "address" },
      { name: "releaseThreshold", type: "uint8" },
      { name: "milestoneAmounts", type: "uint256[]" },
      { name: "setupFee", type: "uint256" },
    ],
    name: "createEscrowWithMilestones",
    outputs: [{ name: "escrow", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Phase 3: RevenueSplitter */
export const REVENUE_SPLITTER_ABI = [
  { inputs: [], name: "distribute", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [],
    name: "getState",
    outputs: [
      { name: "_recipients", type: "address[]" },
      { name: "_weights", type: "uint256[]" },
      { name: "_balance", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Phase 3: RevenueSplitterFactory */
export const REVENUE_SPLITTER_FACTORY_ABI = [
  {
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "weights", type: "uint256[]" },
      { name: "token", type: "address" },
    ],
    name: "createSplitter",
    outputs: [{ name: "splitter", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Phase 3: SLAContract */
export const SLA_CONTRACT_ABI = [
  { inputs: [], name: "stake", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "requestHash", type: "bytes32" }], name: "declareBreach", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unstake", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [],
    name: "getState",
    outputs: [
      { name: "_staked", type: "bool" },
      { name: "_breached", type: "bool" },
      { name: "_balance", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** Phase 3: SLAContractFactory */
export const SLA_CONTRACT_FACTORY_ABI = [
  {
    inputs: [
      { name: "provider", type: "address" },
      { name: "consumer", type: "address" },
      { name: "providerAgentId", type: "uint256" },
      { name: "stakeToken", type: "address" },
      { name: "stakeAmount", type: "uint256" },
      { name: "validationRegistry", type: "address" },
      { name: "breachThreshold", type: "uint8" },
      { name: "setupFee", type: "uint256" },
    ],
    name: "createSLA",
    outputs: [{ name: "sla", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
