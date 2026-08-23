# PoC-1 Plan — the Evidence Product (gated)

**Date:** 19 August 2026
**Authority:** subordinate to [whitepaper-critique.md](./whitepaper-critique.md) (SSOT — challenge numbers cited throughout) and [VISION.md](./VISION.md) Phase 0. If this plan disagrees with either, they win; design decisions made while executing this plan are recorded back into the critique, not only here.
**Status:** Stage A not started. Gate passes are logged in the [Gate ledger](#gate-ledger) at the bottom.

---

## 0. What PoC-1 is

The evidence product end-to-end, as an explicitly interim, founder-operated, upgradeable deployment: blind pinning on MegaETH with the full native-provenance skeleton — write-path accumulator, chronicle at ~zero difficulty, direct Ethereum anchor — and the client tooling that turns a pin into a user-held **proof bundle** that verifies offline, forever, against nothing but Ethereum.

The proof bundle **is** the product of PoC-1. Everything else exists to produce it cheaply and instantly.

**In scope:** `pin` / `pinBatch` (blind keys, ch. 2), `verify`, accumulator (ch. 11), chronicle seal (ch. 1/11), L1 anchor contract + relayer, indexer + proof-bundle API, offline verifier, reworked web UI, chronicle archival, monitoring, interim labeling.

**Out of scope (PoC-2 or later):** claims, the 30-day window, usurpation, ERC-721s, fees of any kind (no fee code ships at all); difficulty > 0, sealer rewards, retarget activation; the CLI/SDK and Figma instruments as *products* (PoC-1 builds their library plumbing only); aggregator service; the live MVP.

**Standing invariants this plan must not violate:** pins are blind (nothing but a 32-byte key on the wire); pinners never grind; receipts are instant; proofs are generated while history is live and custodied by users; the deployment says exactly what it is (VISION §2; Phase 0 is exempt only from immutability).

### 0.1 Codebase disposition — rewrite in place (assessed 19 Aug 2026)

The existing monorepo stays; the product code inside it is replaced. Neither "build on top" nor a greenfield repo. Survey of the ~4,100 lines:

| Surface | Size (LoC) | Disposition |
|---|---|---|
| Monorepo infra: nx + npm workspaces, changesets, CI (builds/tests all workspaces on every push), production workflow with environment approval, Vercel wiring | — | **Keep as-is.** |
| Hardhat setup in `packages/hashpin-contracts`: TypeChain, gas-reporter, coverage; networks already configured for MegaETH testnet (chainId 6342), Sepolia, mainnet | — | **Keep** — this is Stage B/D wiring, already done. |
| `contracts/Hashpin.sol`, `contracts/adapters/*` (ERC-721/1155), `contracts/interfaces/*`, their tests | ~1,380 | **Retire via `git rm`** in Stage B. The write path, key format, Merkle fold, and governance are all superseded; the tests encode the wrong convention and provably can't catch the ch-10 bug (negative value as a base). The adapters are PoC-2 surface built on the pre-blind-key claim signature — git history is their reference copy. |
| UI components `HashPinForm.tsx` (924) + `HashVerify.tsx` (1,166) | ~2,090 | **Replace outright** in Stage C — both are built around the dead design (mining loop, hash+nonce on the wire, pin-time metadata). The new flow shares no logic with them and is simpler (no grind UX). |
| UI shell: `providers.tsx`, `client-providers.tsx`, `WalletConnect.tsx`, `layout.tsx`, `page.tsx` | ~430 | **Keep** — wagmi v2 + web3modal + Next 15 + Tailwind 4 is current, and the recently fixed wallet-connection flow survives untouched. |
| `apps/hashpin-backend` | ~113 | **Discard** — an express stub with a mocked endpoint, and its shape is the custodial anti-pattern (server pins with a server key). The real backend (indexer, sealer, relayer, proof API) is new code (Stage C). |
| `packages/hashpin-utils` | ~38 | **Superseded** by `hashpin-merkle` (its `HashpinData` type is the dead shape). Delete or repurpose the package slot. |

**Rules of the rewrite-in-place:**
1. Retire old files with `git rm`, never by orphaning the repo — git history is the project's audit trail (the critique cites `Hashpin.sol` line numbers; the review check verified against them).
2. Toolchain stays Hardhat + TypeChain — no Foundry migration. G2's headline test (contract-vs-mirror fuzz equivalence) is naturally a TS test driving both sides, and TypeChain feeds the UI types.
3. Dependencies are early-2025 vintage (Hardhat 2.19, OZ 5.2, Next 15.2). Stage B opens with a **refresh pass** — update in place, especially OpenZeppelin (proxy/Pausable imports) — refresh, never a stack swap.

---

## 1. Gates at a glance

| Gate | Name | One-line criterion |
|------|------|--------------------|
| G0 | Entry | Decisions recorded; keys, funds, RPC access in hand |
| G1 | Spec frozen | Every Stage-A question answered in a written spec; SSOT updated |
| G2 | Core green | Contracts + merkle lib pass the full suite incl. adversarial tests; gas within budget |
| G3 | E2E local | Pin → seal → anchor → bundle → **offline verify with the stack turned off** |
| G4 | Testnet soak passed | N-day soak on MegaETH testnet + Sepolia anchor; all drills passed; review done |
| G5 | Mainnet stable — PoC-1 exit | M-day stable operation on MegaETH mainnet + Ethereum anchor; public claims match the approved language |

No stage starts before the previous gate is signed off (founder sign-off, dated, in the ledger). A failed gate loops the stage; it never skips.

---

## 2. Gate G0 — entry checklist

- [x] Design decisions resolved and recorded (critique challenges 1, 2, 3, 4, 6, 7, 8, 10, 11; ch. 5 deliberately open — PoC instruments are its validation vehicle, in PoC-2).
- [x] Deployment plan recorded (critique ch. 11 deployment-plan note; VISION Phase 0).
- [ ] MegaETH **testnet** RPC access + faucet funds; chain metadata (chain id, gas token, explorer) collected.
- [ ] Sepolia funds for anchor testing.
- [ ] Key roles created (see §8.3): deployer, proxy admin, sealer, anchor relayer — four distinct keys, admin key cold.
- [ ] Repo baseline green: `npm test` / `nx run-many --target=test` passes as-is (the old `Hashpin.sol` suite still passes on its own terms; it will be retired in Stage B).
- [ ] This plan reviewed and G0 signed in the ledger.

---

## 3. Stage A — design spike → Gate G1

**Objective:** freeze the machine-level spec that the critique intentionally left to a spike. Output: `poc1-spec.md` (new file, referenced from the critique's ch. 11 follow-ups) with every question below answered, plus SSOT notes where a decision refines a challenge.

### A1. Accumulator structure

Requirements: append-only; O(1) amortized storage writes per append; total insertion order (position = priority, ch. 3 amendment); opaque 32-byte leaves (blind keys); inclusion proofs generatable while history is live (invariant 5).

Decide between:
- **Incremental Merkle tree** (Ethereum deposit-contract pattern): fixed depth (propose 32 → 4.29B pins), `branch[depth]` + counter, ~1 SSTORE amortized per append, proofs served by an indexer that mirrors the tree.
- **Merkle Mountain Range**: unbounded, peaks-bagging root, same order properties, marginally more complex proof/verifier code.

Must specify: leaf encoding (raw `pinKey` vs `keccak(pinKey ‖ index)` — note duplicates are impossible since re-pin reverts), root computation, proof format, and the **TS mirror algorithm** that must reproduce the contract state bit-for-bit.

### A2. Pin storage and semantics

- Record layout per key: proposal — one slot: `struct PinRecord { uint64 index; uint64 timestamp; }` (index = accumulator position, the priority order; timestamp = human-facing time). `require(record.timestamp == 0)` on re-pin (ch. 2).
- `pinBatch(bytes32[] pinKeys)` duplicate semantics: revert-all vs skip-duplicates. Lean skip-and-report (idempotent, relayer-friendly, ch. 2 aggregator flow); spike decides and records.
- Event schema (the indexer's food): propose `event Pinned(bytes32 indexed pinKey, uint64 index)` — nothing else; anything more would be noise or a leak.
- `verify(bytes32 hash, bytes32[] proof, address pinner) → PinRecord`: folds with sorted-pair convention (ch. 10), recomputes `pinKey = keccak256(root, pinner)`, returns the record; empty proof = single-hash pin (degenerate tree).

### A3. Chronicle block format and seal path

- Header fields: propose `(prevTip, accumulatorRoot, accumulatorSize, hostBlockNumber, nonce)`; `tip = keccak256(header)`. The nonce field exists; difficulty is a constant 0 in PoC-1 (the grind does not).
- **Seal signature question:** if the sealer passes `accumulatorRoot` explicitly, the root moves under them between submission and inclusion on a ms-block host. Proposal: `seal(uint256 nonce)` — the contract composes the header from live state, so sealing can never race itself. Record the consequence for future mined sealing (the option-D tip-contention item) without solving it here.
- Cadence: cron parameter (§10). Permissionless from genesis — anyone may call `seal`; the founder cron is simply the only caller in practice (ch. 11).
- Chronicle storage: tip + height in state; headers emitted as events (`Sealed(uint64 height, bytes32 tip, bytes32 accRoot, uint64 accSize)`) and archived (§8.5).
- Define **terminal tip** precisely (the hand-off rule depends on it): the tip at the block in which the PoC is frozen for live-MVP genesis; must be reconstructable from the archive alone.

### A4. Anchor contract + relayer trust model

- L1 contract: minimal — store/emit `(tip, chronicleHeight, sender)`. Decide permissionless vs relayer-only posting. Note: an anchor only ever proves *no-later-than* — a garbage tip forges nothing — so permissionless posting is safe by construction; the official relayer address is a UX convention, not a trust root. Lean permissionless-with-attribution.
- Cadence + cost model: measure Sepolia/Ethereum gas for one anchor tx; set testnet/mainnet cadence (§10); treasury pays (ch. 6 addendum: post-sunset funding is a live-MVP question, not PoC's).
- Verifier rule: a bundle is anchored iff its chronicle tip (or a descendant tip) appears in an anchor event.

### A5. Upgradeability, pausability, labeling

- Pattern: UUPS proxy vs transparent proxy; `Pausable` on `pin`/`pinBatch`/`seal`. Owner = proxy admin key (§8.3).
- On-chain labeling: contract name `HashpinPoC`, a public constant string stating interim status and pointing at the trust-model doc. Honesty is a feature of the artifact, not just the website.

### A6. Proof bundle format (`hashpin-proof-v1`)

Versioned JSON schema containing: content hash + user-tree Merkle proof → root; pinner address; derived pinKey; accumulator index + inclusion proof → accumulator root; chronicle header path → sealed tip; anchor reference (L1 chain id, tx hash, block number/timestamp). Verification must require **only the bundle + the ability to check one L1 event** — no Hashpin service, no MegaETH RPC.

### A7. Due-diligence findings (research, written into the critique's ch. 11 note)

- MegaETH force-inclusion: does it retain the OP Stack L1 portal path? What does forcing a pin cost? (Caps sequencer censorship at L1-tx cost if yes.)
- EigenDA retention terms as deployed by MegaETH (confirms the permanence analysis the anchor design already hedges).
- MegaETH mainnet gas pricing for our write pattern (informs G2 budgets).

**Gate G1 — spec frozen. Criteria:**
- [ ] `poc1-spec.md` answers A1–A6 with concrete formats and signatures; no TBDs in the write path.
- [ ] A7 findings written with citations; critique ch. 11 follow-ups updated.
- [ ] Gas budget table set (used by G2): target ≤ 150k gas/single pin, ≤ 80k marginal gas/key in batch — revise with A7 data, then freeze.
- [ ] Founder sign-off in ledger.

---

## 4. Stage B — core build → Gate G2

**Objective:** the on-chain core plus the one shared Merkle convention package, fully tested, no services yet.

### Work items

1. **Dependency refresh** (§0.1 rule 3): update Hardhat/OZ/toolchain in place before any new code lands; no stack swaps. Baseline CI must stay green through the refresh.
2. **`packages/hashpin-merkle`** (new, `@hashpin-monorepo/hashpin-merkle`): the single convention implementation (ch. 10) — raw keccak sorted-pair hashing, odd node promotes, no leaf double-hash; build/root/prove/verify for user trees; the accumulator mirror + inclusion proofs (per A1); pinKey derivation. Zero service dependencies. Everything downstream (contracts tests, UI, backend, future CLI/SDK and Figma plugin) imports this and nothing else for hashing.
3. **`packages/hashpin-contracts` v2:** new `contracts/HashpinPoC.sol` (proxy + implementation per A5): `pin`, `pinBatch`, `verify`, accumulator write path, `seal`, pause, labels. New `contracts/HashpinAnchor.sol` (L1). **Retire the old surface via `git rm`** (§0.1): `Hashpin.sol`, the ERC-721/1155 adapters + interfaces, their tests, and `hashpin-utils` — the old contract must become undeployable by accident (ch. 2/10 bugs; review R7); history keeps the reference copies.
4. **Deploy scripts** (Hardhat): local devnet, MegaETH testnet, Sepolia; deterministic config per network in one place.
5. **Test suite:**
   - Merkle: every leaf of a 4-leaf tree verifies (left and right paths at both levels); 3-leaf odd-promotion; intermediate-node verify; single-hash empty-proof; non-member reverts (the ch. 10 mandated set, applied to `verify`).
   - Blind-key path: pin → verify round-trips; wrong pinner yields no record; re-pin reverts; batch duplicate semantics per spec.
   - Accumulator equivalence: fuzz N random pin sequences; contract root/indices == `hashpin-merkle` mirror, every key's inclusion proof verifies.
   - Chronicle: seal linkage (prevTip chain), seal-after-pins commits the right root/size, permissionless caller works, pause blocks writes but never reads.
   - Gas benchmarks asserted against the G1 budget table.
6. **Static analysis:** slither (or equivalent) run; findings triaged in writing.

**Gate G2 — core green. Criteria:**
- [ ] Full suite green in CI (`nx run-many --target=test`), including the adversarial Merkle set that the old suite lacked.
- [ ] Fuzzed contract-vs-mirror equivalence passes (≥ 10k appends cumulative).
- [ ] Gas within frozen budgets; numbers recorded.
- [ ] Old surface gone from the build via `git rm` (`Hashpin.sol`, adapters, interfaces, their tests, `hashpin-utils`); no PoW remnant compiles; dependency refresh landed with CI green.
- [ ] Static-analysis triage written; no unaddressed high-severity finding.
- [ ] Founder sign-off in ledger.

---

## 5. Stage C — services + UI, local end-to-end → Gate G3

**Objective:** everything around the contracts, proven on a local stack (devnet + local L1 sim).

### Work items

1. **Sealer cron** (in `apps/hashpin-backend`): calls `seal` on cadence; idempotent (skips if nothing new); alerts on failure.
2. **Anchor relayer** (same service): posts tip to the anchor contract on cadence; tracks L1 confirmation; alerts on lag.
3. **Indexer + proof API:** ingests `Pinned`/`Sealed` events, maintains the accumulator mirror (via `hashpin-merkle`), serves proof bundles per `hashpin-proof-v1`; exposes registry stats (pin count, seal height, last anchor). Must support **cold rebuild from chain logs alone** — the indexer is a cache, never a source of truth.
4. **Offline verifier:** small standalone package (`packages/hashpin-verify` or a `hashpin-merkle` subpath) + tiny CLI: `verify-bundle <bundle.json>` → checks the full chain of custody (A6) given the bundle plus an L1 RPC *or* a pasted anchor event. This is the artifact a skeptic runs in 2076; keep its dependency tree near zero.
5. **UI rework (`apps/hashpin-ui`):** keep the app shell (§0.1 — providers, `WalletConnect`, layout, the recently fixed wagmi/web3modal wiring); **replace `HashPinForm.tsx` and `HashVerify.tsx` outright** rather than untangling them — the mining loop (`mineValidNonce`), nonce-in-proof handling, and pin-time metadata all disappear. New flow: hash files locally in the browser (content never leaves the machine); build user trees client-side (`hashpin-merkle`); compute the blind key; `pin`; then poll and hand the user their **downloadable proof bundle** with plain-language status: *received → sealed → anchored*. Interim banner on every page (§8.2 language). A "verify a bundle" page that runs the offline verifier in-browser.
6. **Chronicle archival job:** appends sealed headers as JSONL to a public mirror (git repo and/or IPFS) on cadence (§8.5).

**Gate G3 — end-to-end local. Criteria:**
- [ ] Demo script: pin a file → receipt < 2s → sealed on cadence → anchored on local L1 → bundle downloads → `verify-bundle` passes.
- [ ] **Kill-the-stack drill:** stop devnet, indexer, and every service; the previously downloaded bundle still verifies against the local L1 sim's anchor record alone.
- [ ] Indexer cold-rebuild drill: wipe its DB, rebuild from logs, all previously issued bundles still provable.
- [ ] UI shows the interim banner and the three-state status truthfully (a pin that is received-but-unsealed says so).
- [ ] Founder sign-off in ledger.

---

## 6. Stage D — testnet shakeout → Gate G4

**Objective:** the same system, running unattended against MegaETH testnet + Sepolia anchor, under load and under failure.

### Work items

1. Deploy (proxy) to MegaETH testnet; anchor to Sepolia; services on real infrastructure; staging UI live.
2. **Soak:** `SOAK_TESTNET` days (default 14) of continuous operation with synthetic traffic: steady single pins + daily `pinBatch` bursts (1k–10k keys/tx, up to block limits); record latency (receipt time), cost per pin/key, seal lag, anchor lag.
3. **Drills (each documented with outcome):**
   - Sequencer/RPC outage simulation → UI degrades honestly, services recover unaided.
   - Missed seals (cron down 24h) → chronicle continues correctly on restart; no gap ambiguity.
   - **Upgrade drill:** one real proxy upgrade on testnet; state intact; disclosure note drafted as if public.
   - Pause/unpause drill; verify reads keep working while paused.
   - Force-inclusion attempt (if A7 found the path exists): force one pin via the L1 portal; record cost and latency.
   - Kill-the-host drill against testnet: verify bundles with MegaETH RPC unreachable, Sepolia only.
4. **Volume/means test of proof generation at scale:** bundles remain generatable at the largest tested accumulator size; measure indexer rebuild time.
5. **Security review** of the mainnet-bound contract set — at minimum a structured internal pass against a published checklist + tool runs; external eyes if budget allows. Upgradeability lowers the stakes; mainnet evidence raises them.
6. **Labeling/claims review:** website copy, bundle README, and contract labels against §8.2 — the exact ch. 11 language.

**Gate G4 — soak passed. Criteria:**
- [ ] `SOAK_TESTNET` days with zero lost pins (every `Pinned` event indexed and bundle-provable), seal/anchor cadences held (≤ 2 missed cycles, both recovered), services ≥ 99% uptime.
- [ ] All drills passed and written up.
- [ ] Measured numbers published into the repo (latency, cost, gas) — these become the paper's §8 evidence.
- [ ] Security review findings closed or explicitly risk-accepted in writing.
- [ ] Claims/labeling review passed.
- [ ] Founder sign-off in ledger.

---

## 7. Stage E — mainnet promotion → Gate G5 (PoC-1 exit)

**Objective:** the same artifact, on MegaETH mainnet with an Ethereum mainnet anchor. From the first anchored seal, PoC pins are real, permanent evidence (VISION Phase 0) — even though ownership priority will start fresh at live-MVP genesis.

### Work items

1. Deploy to MegaETH mainnet (fresh proxy; testnet history is not carried); anchor contract to Ethereum mainnet; relayer funded from treasury with a monthly budget cap (§10).
2. Smoke-test the full path; then **dogfood as the first pins:** the whitepaper, VISION.md, whitepaper-critique.md, this plan, and the repo HEAD archive — hashpin's own documents become its first permanent evidence, and their bundles are published in the repo as worked examples.
3. UI cutover to mainnet; trust-model page live (§8.2); testnet stays up as a sandbox, clearly separated.
4. Monitoring + alerting live (§8.4); runbook written (restart procedures, key handling, incident/disclosure template).
5. Chronicle archival running against mainnet from block one — the archive must be complete from genesis, because the live MVP's genesis commitment (the hand-off rule) references the terminal tip of *this* history.
6. Public announcement drafted in the approved claims language only.

**Gate G5 — PoC-1 exit / PoC-2 entry. Criteria:**
- [ ] `STABLE_MAINNET` days (default 14) of stable mainnet operation under the G4 definitions.
- [ ] ≥ 1 externally reproduced verification: someone outside the founder verifies a published bundle with the offline verifier and only public data.
- [ ] Anchors landing on Ethereum mainnet on cadence within budget.
- [ ] Archive independently reconstructs the chronicle from genesis to tip.
- [ ] Runbook + monitoring in place; incident template exists.
- [ ] Public copy matches §8.2 exactly.
- [ ] Founder sign-off in ledger → PoC-2 planning (claims, window, usurpation rehearsal, CLI/SDK + Figma instruments) begins as its own gated plan.

---

## 8. Cross-cutting requirements

### 8.1 Kill / pause / redeploy rules

- **Pause immediately** on: pin-path correctness bug; contract-vs-mirror accumulator divergence; admin/sealer/relayer key compromise. Reads and previously issued bundles are unaffected by pause (evidence never depends on liveness).
- Fix via upgrade → written post-mortem (public, in-repo) → unpause.
- **Redeploy (history reset):** free before Gate G4; after mainnet (G5 era) only with public disclosure, and the old contract + archive stay readable forever — deployed evidence is never orphaned silently. Never `selfdestruct`.

### 8.2 Claims language (fixed by critique ch. 11 — verbatim discipline)

**Say:** instant receipts (a sequencer promise); ordering fixed when the batch certifies toward Ethereum; Ethereum-grade permanence at each anchor; records here are evidence forever; ownership priority starts fresh at the live MVP's genesis (re-pin to enter the canonical pin-chain); this deployment is interim, founder-operated, and upgradeable — it says exactly what it is.
**Never say:** proof-of-work security; decentralized; final ownership; anything implying a pin proves creation or authorship (it proves existence-no-later-than-T and possession of the hash by the key-holder — ch. 4).

### 8.3 Key management

Four distinct keys, no reuse: **deployer** (used once per network), **proxy admin** (cold — hardware or Safe multisig if available on MegaETH; never on a server), **sealer** (hot, harmless by design — sealing is permissionless anyway), **anchor relayer** (hot, holds bounded L1 funds only). Documented in the runbook; rotation procedure written before G5.

### 8.4 Monitoring

Metrics: pin count, receipt latency, seal height + lag, anchor lag, indexer head lag, relayer balance, service uptime. Alerts to the founder on: missed seal cycle ×2, missed anchor cycle, indexer lag > threshold, low relayer balance, any pause event.

### 8.5 Archival

Chronicle headers (JSONL) mirrored publicly on cadence — a surviving copy is kilobytes/day and is all that "self-verifying chronicle" needs. Bundle schema versioned from day one (`hashpin-proof-v1`); any later change is a new version, verifiers keep accepting old ones.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| MegaETH mainnet gas/pricing differs from testnet assumptions | A7 measures early; G1 budgets revised before code freeze |
| EigenDA retention or force-inclusion findings worse than assumed | The anchor + archival design already assumes the worst (that's why they exist); findings only tune cadence |
| Indexer as a proof-generation single point of failure | Cold-rebuild drill (G3), archival, and mirror algorithm in a public package — anyone can rebuild while the host lives |
| Proxy-admin key compromise (attacker "upgrades" the registry) | Cold key; anchors + archive make history tampering visible (they pin the past externally); pause + disclosure rule |
| Accumulator/mirror divergence discovered late | Fuzzed equivalence at G2; continuous divergence check in the indexer (alerts, §8.4) |
| Sequencer censorship of pins | Visible by design; force-inclusion path researched at A7, exercised at D if it exists; worst case bounded to delay, disclosed honestly |
| Scope creep toward PoC-2 (claims, fees, instruments) | The out-of-scope list in §0; gates check deliverables, not ambitions |

---

## 10. Parameters (founder-tunable; defaults)

| Parameter | Default | Notes |
|---|---|---|
| Seal cadence (testnet / mainnet) | 10 min / 60 min | Cron; permissionless function regardless |
| Anchor cadence (Sepolia / Ethereum) | 6 h / 24 h | ~1 small tx; mainnet ≈ single-digit $/day at typical gas |
| `SOAK_TESTNET` | 14 days | Gate G4 |
| `STABLE_MAINNET` | 14 days | Gate G5 |
| Gas budget: single pin / batch marginal | ≤ 150k / ≤ 80k per key | Frozen at G1 after A7 |
| Batch burst test size | 1k–10k keys/tx | Up to block limits, measured |
| Anchor budget cap (mainnet) | set at E1 | Monthly treasury cap, alert at 80% |

Rough calendar (planning aid, not a promise): A ≈ 1 week · B ≈ 1–2 weeks · C ≈ 1–2 weeks · D ≈ 3 weeks (soak-bound) · E ≈ cutover + 2 weeks stability → **~8–10 weeks to PoC-1 exit**, dominated by the two soak clocks.

---

## Gate ledger

| Gate | Date | Sign-off | Notes |
|------|------|----------|-------|
| G0 | — | — | |
| G1 | — | — | |
| G2 | — | — | |
| G3 | — | — | |
| G4 | — | — | |
| G5 | — | — | |
