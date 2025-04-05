# Hashpin Deployment Guide

This document outlines the deployment process for the Hashpin protocol across different environments.

## Environment Overview

The Hashpin protocol uses three environments:
- Development (Local)
- System Integration Testing (SIT)
- Production

## Prerequisites

- GitHub account with repository access
- Vercel account with deployment permissions
- Access to environment secrets and configurations
- Node.js >= 16
- npm >= 8

## Branch Strategy

- `master` - Main development branch
- `sit` - System Integration Testing branch
- `production` - Production deployment branch

## Deployment Process

### 1. Development Deployment

Development is done locally and doesn't require deployment to external servers.

```bash
# Start local blockchain
cd packages/hashpin-contracts
npx hardhat node

# In a new terminal, deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Start the frontend
cd ../../apps/hashpin-ui
npm run dev
```

### 2. SIT Deployment

SIT deployments are automated through GitHub Actions when code is pushed to the `sit` branch.

1. **Prepare for SIT**
   ```bash
   # Create and switch to sit branch
   git checkout -b sit
   
   # Push to trigger deployment
   git push origin sit
   ```

2. **Verify Deployment**
   - Check GitHub Actions for deployment status
   - Verify contract deployment on MegaETH testnet
   - Run integration tests
   - Perform manual QA checks

3. **Monitor**
   - Check logs for any errors
   - Verify all features are working
   - Run performance tests

### 3. Production Deployment

Production deployments require manual approval and are done through a controlled process.

1. **Pre-deployment Checklist**
   - [ ] All tests passing
   - [ ] SIT deployment verified
   - [ ] Performance metrics meeting thresholds
   - [ ] Security audit completed
   - [ ] Documentation updated

2. **Deploy to Production**
   ```bash
   # Create production branch
   git checkout -b production
   
   # Push to trigger deployment
   git push origin production
   ```

3. **Manual Approval**
   - Review deployment plan
   - Check environment variables
   - Verify contract addresses
   - Approve deployment in GitHub

4. **Post-deployment**
   - Verify application health
   - Monitor error rates
   - Check transaction success rates
   - Verify contract interactions

## Environment Variables

Each environment requires specific configuration:

### Development
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=local_contract_address
NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS=local_adapter_address
NEXT_PUBLIC_ENVIRONMENT=development
```

### SIT
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=sit_contract_address
NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS=sit_adapter_address
NEXT_PUBLIC_ENVIRONMENT=sit
```

### Production
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=prod_contract_address
NEXT_PUBLIC_ERC721_ADAPTER_ADDRESS=prod_adapter_address
NEXT_PUBLIC_ENVIRONMENT=production
```

## Monitoring and Alerts

### Metrics to Monitor
- Frontend performance
- Contract interaction success rate
- Gas usage
- Error rates
- User activity

### Alert Thresholds
- Error rate > 1%
- Response time > 3s
- Failed transactions > 5%
- Memory usage > 80%

## Rollback Procedure

If issues are detected in production:

1. **Immediate Actions**
   - Assess impact
   - Notify stakeholders
   - Document the issue

2. **Rollback Steps**
   ```bash
   # Revert to last known good deployment
   git checkout production
   git reset --hard <last-good-commit>
   git push -f origin production
   ```

3. **Post-Rollback**
   - Verify application stability
   - Investigate root cause
   - Update documentation
   - Plan fix implementation

## Security Considerations

- All environment variables must be securely stored
- Production secrets must never be used in lower environments
- Access to production deployment must be strictly controlled
- Regular security audits must be performed
- Smart contract upgrades must follow timelock procedures

## Support and Troubleshooting

For deployment issues:
1. Check deployment logs in GitHub Actions
2. Verify environment variables
3. Check contract deployment status
4. Review recent changes
5. Contact the development team

## Useful Commands

```bash
# Check deployment status
npm run check-deployment

# Run integration tests
npm run test:integration

# Verify contract deployment
npm run verify-contracts

# Monitor application health
npm run health-check
``` 