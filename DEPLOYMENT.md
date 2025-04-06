# Hashpin Deployment Guide

This document outlines the deployment process design for the Hashpin protocol across different environments.

## Environment Overview

TODO [C] Finalize environment naming conventions.
The Hashpin protocol uses three deployment stages:
- Development (Local)
- Preview (Automated branch deployments)
- Production (Live environment)

Each stage serves a specific purpose:
- **Development**: Local development and testing
- **Preview**: Automated deployments for feature testing and SIT
- **Production**: Live production environment

## Prerequisites

- TODO [A] Ensure GitHub account has necessary permissions.
- TODO [A] Ensure Vercel account is set up.
- TODO [A] Enable Vercel GitHub integration for the repository.
- TODO [A] Gather all necessary environment secrets and configurations.
- TODO [C] Verify Node.js version >= 16.
- TODO [C] Verify npm version >= 8.

## Branch Strategy

- TODO [B] Set up `master` branch protection rules.
- `master` - Main development branch, auto-deploys to Preview
- TODO [A] Create `production` branch.
- TODO [B] Set up `production` branch protection rules (restrict direct pushes).
- `production` - Production deployment branch

## Versioning Strategy (Using Changesets)

- TODO [A] Initialize Changesets in the repository (`npx changeset init`).
- We will use Changesets to manage versioning and changelogs for packages within the monorepo.
- Developers will add changeset files (`.changeset/*.md`) with their Pull Requests detailing changes and bump types (patch, minor, major).
- Versioning and tagging will occur automatically as part of the Production Deployment workflow.

## Deployment Process

### 1. Development Deployment

Development is done locally and doesn't require deployment to external servers.

```bash
# TODO [C] Document or script local blockchain setup.
# Start local blockchain
cd packages/hashpin-contracts
npx hardhat node

# TODO [C] Ensure deploy script works correctly for localhost.
# In a new terminal, deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# TODO [C] Ensure frontend dev command works correctly.
# Start the frontend
cd ../../apps/hashpin-ui
npm run dev
```

### 2. Preview Deployments

Preview deployments are automatically handled by Vercel when code is pushed to any branch.

1. **Continuous Integration**
   - TODO [A] Create GitHub Actions workflow for CI (`ci.yml`).
   - TODO [A] Implement automated contract tests in CI workflow.
   - TODO [A] Implement automated frontend tests (lint, build, unit tests) in CI workflow.
   - TODO [B] Add step to CI workflow to validate changesets (`npx changeset status`).
   - TODO [B] Implement integration tests in CI workflow (optional, may run on schedule or specific trigger).
   - TODO [C] Consider adding contract deployment checks to testnet within CI using `preview` GitHub env.

2. **System Integration Testing (SIT)**
   ```bash
   # Example feature branch workflow
   git checkout -b feature/new-feature
   # ... make changes ...
   git push origin feature/new-feature
   ```

   **Verification Steps**:
   - TODO [A] Verify GitHub Actions CI checks pass for the branch.
   - TODO [A] Verify Vercel preview deployment builds successfully.
   - TODO [B] Define process for testing features in preview environments.
   - TODO [B] Run integration tests against the preview deployment URL.

### 3. Production Deployment

Production deployments follow a two-stage process to ensure secure and verified contract deployments.

1. **Pre-deployment Checklist**
   - TODO [A] Ensure CI tests are consistently passing on `master`.
   - TODO [B] Verify functionality on a recent Preview deployment.
   - TODO [C] Define and check performance metrics.
   - TODO [B] Perform security audit (manual or automated).
   - TODO [C] Ensure documentation (README, etc.) is updated.
   - TODO [A] Review contract deployment script parameters.
   - TODO [B] Calculate and approve gas estimates for mainnet deployment.
   - TODO [A] Ensure all merged PRs intended for release have corresponding changesets.

2. **Stage 1: Versioning and Contract Deployment**
   ```bash
   # TODO [A] Define process for creating/merging to production branch (e.g., merge from master).
   # Create/update production branch
   git checkout production
   git merge master # Or cherry-pick specific commits
   
   # TODO [A] Create GitHub Actions workflow for Production Deployment (`production-deploy.yml`).
   # Push to trigger deployment workflow
   git push origin production
   ```

   **Workflow Steps (Before Approval):**
   - TODO [A] Add step: Run `npx changeset version` to bump package versions based on accumulated changesets and generate/update CHANGELOG.md files.
   - TODO [A] Add step: Commit the version bumps and changelog updates back to the `production` branch.
   - TODO [B] Add step: Create Git tag for the new release version (e.g., `v1.2.3`).

   **Review Process (within GitHub Actions)**:
   - TODO [A] Configure GitHub `production` environment with required reviewers.
   - Review contract deployment parameters (logged by workflow).
   - Verify contract initialization values (logged by workflow).
   - TODO [B] Check deployment wallet balance (manual check or automated check in workflow).
   - Approve contract deployment step in GitHub Actions UI.
   
   **After Approval (within GitHub Actions)**:
   - TODO [A] Implement contract deployment script for mainnet.
   - Smart contracts are deployed to mainnet.
   - TODO [A] Implement script to record new contract addresses.
   - New contract addresses are recorded (e.g., to a file or workflow artifact).
   - TODO [B] Implement contract verification script (e.g., using hardhat-etherscan).
   - Contract verification on block explorer.
   - TODO [A] Implement script to update Vercel environment variables using Vercel CLI and `VERCEL_TOKEN`.
   - Environment variables (e.g., `NEXT_PUBLIC_CONTRACT_ADDRESS`) updated in Vercel Production environment.
   - TODO [C] Add optional step: Publish versioned packages to npm (if applicable later).

3. **Stage 2: Frontend Deployment**
   - TODO [A] Configure Vercel project: Link `production` branch to Vercel Production environment.
   - Vercel automatically detects the push to the `production` branch and starts a new Production build/deployment.
   - The Vercel build uses the updated environment variables set in Stage 1.
   - Production domain updated automatically by Vercel.

4. **Post-deployment**
   - TODO [B] Define health checks for the application.
   - TODO [B] Set up monitoring for error rates.
   - TODO [B] Set up monitoring for transaction success rates.
   - TODO [C] Define process for verifying contract interactions post-deployment.
   - TODO [C] Update documentation (e.g., README, user guides) with new contract addresses if necessary.

5. **Deployment Abort Process**
   - TODO [B] Define specific criteria for aborting deployment at Stage 1 or Stage 2.
   - If issues are found during either stage:
     - Document the issues found.
     - Update the deployment plan.
     - Fix identified issues (likely requires a new branch/PR).
     - Restart from Stage 1 with the corrected code.

## Environment Configuration

### Vercel Environments
- TODO [X] Create Vercel Project and link to GitHub repository.
- TODO [A] Configure Vercel Preview environment settings (e.g., default env vars, domains).
- TODO [X] Configure Vercel Production environment settings (link to `production` branch, custom domain, env vars).
- TODO [X] Define and configure all necessary Vercel environment variables (e.g., `NEXT_PUBLIC_ENVIRONMENT`, API keys, initial contract addresses).
- TODO [C] Set up Vercel team access controls.

### GitHub Environments
Used for contract deployment control and secrets.
- **SIT**: For testnet contract deployment checks (optional, used in CI).
  - TODO [A] Create GitHub environment named `sit`.
  - TODO [A] Add required secrets to `sit` environment:
    ```
    # Secrets for SIT Environment (GitHub)
    DEPLOYER_PRIVATE_KEY=testnet_wallet_key
    MEGAETH_TESTNET_URL=testnet_rpc_url
    VERCEL_TOKEN=your_vercel_api_token # Needed to potentially update Vercel preview env vars
    ```
- **Production**: For mainnet contract deployments.
  - TODO [A] Create GitHub environment named `production`.
  - TODO [A] Add required secrets to `production` environment:
    ```
    # Secrets for Production Environment (GitHub)
    DEPLOYER_PRIVATE_KEY=mainnet_wallet_key
    MEGAETH_MAINNET_URL=mainnet_rpc_url
    VERCEL_TOKEN=your_vercel_api_token # Needed to update Vercel production env vars
    ```
  - TODO [A] Configure protection rules for `production` environment (required reviewers).

## Monitoring and Alerts

### Metrics to Monitor
- TODO [B] Set up frontend performance monitoring (e.g., Vercel Analytics, external service).
- TODO [B] Set up contract interaction monitoring (e.g., Tenderly, custom alerts).
- TODO [C] Monitor gas usage trends.
- TODO [B] Set up error tracking (e.g., Sentry, Vercel logs).
- TODO [C] Define and monitor key user activity metrics.

### Alert Thresholds
- TODO [B] Configure alert triggers based on defined thresholds.

## Rollback Procedure

If issues are detected in production:

1. **Smart Contracts**
   - TODO [C] Define contract upgrade strategy (e.g., proxies).
   - TODO [C] Implement emergency stop mechanism if applicable.

2. **Frontend**
   - TODO [B] Familiarize team with Vercel rollback feature.
   - Use Vercel dashboard to revert to last working deployment.
   - Check and potentially revert Vercel environment variables if they caused the issue.

## Security Considerations

- TODO [B] Ensure secure storage and rotation plan for `DEPLOYER_PRIVATE_KEY`s.
- TODO [C] Regularly review Vercel/GitHub access controls.
- TODO [B] Schedule regular security audits.
- TODO [C] Document and follow timelock procedures for contract upgrades if applicable.
- TODO [A] Ensure contract deployment parameter review process is followed.
- TODO [A] Enforce multiple signers for production approvals in GitHub environment settings.
- TODO [B] Strictly control access to deployment wallets.

## Support and Troubleshooting

- TODO [C] Establish primary contacts for deployment issues.

## Useful Commands

- TODO [C] Add scripts/commands for common checks (e.g., `npm run test:contracts`, `npm run verify-contracts`, `npm run update-vercel-env`).
- TODO [B] Add command for adding changesets (`npx changeset add`).

## Feature Development Workflow (Start to Production)

This outlines the standard process for developing a new feature and deploying it to production. This assumes all Priority A setup tasks in this document are complete.

1.  **Branch Creation:**
    *   Create a feature branch from the latest `master`:
        ```bash
        git checkout master
        git pull origin master
        git checkout -b feature/your-feature-name
        ```

2.  **Development:**
    *   Implement the feature on your branch.
    *   Commit changes frequently with clear messages.
    *   Use local development environment for testing (see Development Deployment).

3.  **Push and Preview:**
    *   Push your feature branch to GitHub:
        ```bash
        git push origin feature/your-feature-name
        ```
    *   Vercel automatically creates a Preview deployment for your branch.
    *   GitHub Actions automatically runs CI checks (tests) on your branch.

4.  **Pull Request (PR) and Review:**
    *   Open a Pull Request from your feature branch targeting `master`.
    *   Ensure all CI checks pass on the PR.
    *   Verify the feature manually using the Vercel Preview deployment URL.
    *   Request code reviews from teammates.
    *   Address feedback and push updates to the feature branch (CI/Preview will re-run).

5.  **Merge to Master:**
    *   Once the PR is approved and all checks pass, merge it into `master`.
    *   Vercel deploys the updated `master` branch to a canonical Preview URL (optional, depends on Vercel config).

6.  **Prepare for Production Deployment:**
    *   Ensure the `master` branch is stable and includes all features intended for the release.
    *   Complete relevant pre-deployment checklist items (B/C priorities like audits, performance checks if applicable for this release).

7.  **Initiate Production Deployment:**
    *   Update the `production` branch with the latest changes from `master` (ensure you have permissions based on branch protection rules):
        ```bash
        git checkout production
        git pull origin production
        git merge master
        git push origin production
        ```
    *   This push triggers the `production-deploy.yml` GitHub Actions workflow.

8.  **Stage 1 Approval (Contract Deployment):**
    *   The GitHub Actions workflow will pause, waiting for approval on the `production` environment.
    *   Designated reviewers check the contract deployment parameters logged by the workflow.
    *   Reviewers approve the job in the GitHub Actions UI.
    *   **Workflow Executes:** Deploys contracts, verifies them (if implemented - Priority B), records addresses, and updates Vercel environment variables.

9.  **Stage 2 Deployment (Frontend):**
    *   Vercel automatically detects the completed push to the `production` branch (due to the setup in Priority A).
    *   Vercel starts a new Production deployment, using the *updated* environment variables.

10. **Post-Deployment Verification:**
    *   Verify the production application is healthy.
    *   Perform any required post-deployment checks (Priority B/C).
    *   Monitor the application (Priority B/C).