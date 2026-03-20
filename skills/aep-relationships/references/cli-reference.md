# AEP Relationships — CLI Reference

## Credit Facility

```bash
aep credit create --lender 0x... --borrower 0x... --limit 1000000000 --min-reputation 80 --borrower-agent-id 1
aep credit deposit -f 0x... -a 500000000
aep credit draw -f 0x... -a 200000000
aep credit repay -f 0x... -a 200000000
aep credit freeze -f 0x...          # Lender freezes facility
aep credit unfreeze -f 0x...         # Lender unfreezes
aep credit default -f 0x...         # Lender declares default after deadline
aep credit withdraw -f 0x... -a 500000000
aep credit state -f 0x...
```

## Escrow

```bash
aep escrow create --consumer 0x... --provider 0x... --provider-agent-id 1 --validator 0x...
aep escrow fund -e 0x... -a 500000000
aep escrow acknowledge -e 0x...
aep escrow submit-validation -e 0x... --request-hash 0x...
aep escrow release -e 0x...
aep escrow dispute -e 0x...          # Consumer disputes (validation failed or timeout)
aep escrow state -e 0x...
```

## Revenue Splitter

```bash
aep splitter create --recipients 0x...,0x...,0x... --weights 5000,3000,2000
aep splitter distribute -s 0x...
aep splitter state -s 0x...
```

## SLA

```bash
aep sla create --provider 0x... --consumer 0x... --provider-agent-id 1 --stake-amount 100000000
aep sla stake -s 0x...
aep sla breach -s 0x... --request-hash 0x...
aep sla unstake -s 0x...             # Provider recovers stake if no breach
aep sla state -s 0x...
```
