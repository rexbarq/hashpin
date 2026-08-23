# The Hashpin Vision

### From a zero-PoW registry to a self-sovereign timechain

**Status of this document.** This is the narrative arc of the protocol: where it starts, what each phase proves, and where it ends. It is a companion to the [whitepaper](./hashpin-whitepaper.md) — the original specification, to be rewritten to the critique's decisions once its open challenges close — and the [whitepaper critique](./whitepaper-critique.md), the working record of those decisions. Where this document or the whitepaper disagrees with the critique, the critique wins: it is the source of truth; this is the story its decisions add up to. One decision is still formally open there — the first customer segment, deliberately held for validation (the paper meanwhile presents the funnel and candidate segments without committing). Blind pinning, the Phase 1 skeleton, and per-hash ownership were resolved on 19 August 2026, and usurpation's "strictly earlier" now compares the registry's own insertion order (the accumulator), so priority ties cannot arise. This document presents the working design, and the critique's status lines govern.

_19 August 2026_

---

## 1. The point

Hashpin proves one thing, precisely: **a piece of content existed no later than a moment in time, and its hash was held at that moment by the holder of a key.** Nothing more — because nothing more can be proven by anyone. Creation time and authorship are not cryptographically provable in the absolute; existence-before-T is, and a hash on an immutable ledger is the frontier primitive for it.

From that one primitive, Hashpin builds two products:

- **Evidence** — a timestamp that anyone can create for anything, for roughly nothing, that reveals nothing at creation, and that never expires. Evidence is the free commodity, and it is meant to be created in absurd volume.
- **Ownership** — a claimed hash minted as a standard NFT, contestable for 30 days after each claim by any strictly-earlier registration (a successful usurpation is itself a claim and restarts the window), and **final** once a window expires unchallenged. Ownership is the paid product: the fee lands precisely at the moments when a timestamp turns into value — a dispute, a sale, a license.

The registry's power compounds with use. As pinning density grows and pinning moves toward the point of capture — cameras, editors, export buttons, model pipelines — the earliest pin converges toward creation time, and the *absence* of a pin becomes evidence too: "no pin before T" starts to mean "probably didn't exist before T." (Absence is established at dispute time: whoever asserts an earlier pin must reveal it — preimage and proof — or the absence stands; the blindness of pins costs this thesis nothing.) Every pin strengthens the inference for all content, pinned or not. That compounding inference is the protocol's central bet — none of the deployed predecessors built around it, and Phase 1 exists to test it. The AI-content flood is the reason to make the bet now: the provenance stack taking shape around that flood (signatures say *who claims*, attestation says *how captured*, Hashpin says *when, at the latest*) has no neutral timestamp layer beneath it — and that layer should not be owned by any vendor, or any single blockchain.

One requirement generates this entire roadmap: **evidence written today must still verify in fifty years.** Fifty years is longer than the credible life of any host chain, any data-availability network, any sequencer company, and most consensus fashions. So Hashpin must begin as a guest and become an institution: start where users are, and grow a spine that can outlive every landlord it ever has.

The mechanics, in one breath: to **pin** is to record a blind commitment to a hash — free; this is evidence. To **claim** is to reveal the hash and mint the NFT — paid — opening the 30-day window in which the holder of any strictly earlier pin can **usurp** (seize) the token; a window that expires unchallenged is final. To **verify** is to prove what a pin contains without claiming it. Everything else in this document is about making those three verbs trustworthy for fifty years.

## 2. Invariants

True in every phase, from first block to last:

1. **A pin reveals nothing.** The wire carries a blind key — `keccak256(root, pinner)`, where the root is the Merkle root of the user's own tree of hashes and the pinner is the address entitled to claim. For any content an observer does not already hold, front-running is cryptographically impossible, not merely unprofitable: copying the key donates the registration to its intended pinner, and there is no preimage to build a substitute from. (Pinning an already-public hash concedes nothing either — an observer who knows a hash could always have pinned it; the wire tells them nothing they lacked.) The block producer learns nothing about the content; it is revealed only if and when the pinner chooses to claim or verify.
2. **Pinners never grind.** Zero proof-of-work for users, in every phase — including the phases where PoW secures the protocol. When work exists, it is the business of miners racing each other, never a tax on registration.
3. **Registration is immediate and unbounded.** Immediate on its venue's timescale — milliseconds on a real-time host, block cadence on the sovereign chain — and unbounded: one 32-byte key can carry a single hash or a Merkle tree of a billion. Users aggregate their own trees and keep their own proofs.
4. **Evidence is perpetual; only ownership finalizes.** A pin is forever. The 30-day window makes NFTs safe to buy, lend against, and build on — and its expiry takes nothing from an earlier pinner but the NFT.
5. **Users custody their proofs.** Every guarantee ultimately reduces to a user-held Merkle proof, verifiable against a public commitment. Proofs are generated while history is live — that is client tooling's standing job — and verify forever after. The registry can lose its host, its indexers, and its website, and your proof still verifies.
6. **The core is immutable; governance is minimal.** Pin, verify, claim, and the window logic ship non-upgradeable. The few parameters that remain adjustable have bounds baked in as constants, and each claim snapshots its own deadline at claim time, so no later change can reach it. Bootstrap authority is disclosed, bounded, and sunsets on schedule.
7. **Only commitments cross boundaries.** Pins flow one way — outward as checkpoints into anchors and, wherever layers exist, downward into heavier ones; no value peg ever connects them. Claims, fees, and NFTs live on smart-contract hosts where the ecosystems live — and a claimed token may leave its home venue only after its challenge window closes.
8. **Claims match mechanisms.** In each phase the protocol states exactly the security it has, and no more. A young registry never borrows the language of an old one.

## 3. The road

### Phase 0 — Rehearsal: the interim PoC

Before anything freezes, the whole machine runs once as an explicitly interim deployment on MegaETH — upgradeable, pausable, and labeled as what it is. Phase 0 is the one deployment exempt from invariant 6 (a rehearsal is not the institution), and its test tokens are explicitly not perpetual assets — invariant 4's finality begins at Phase 1. Every other invariant holds even here: pins are blind, nobody grinds, receipts are instant, evidence is perpetual, proofs are user-held, and the deployment says exactly what it is. Two sub-phases:

- **PoC-1 — evidence.** Blind `pin`/`pinBatch`, `verify`, the write-path accumulator, the chronicle (founder cron, ~zero difficulty), the direct Ethereum anchor, and the client tooling that generates proofs while history is live. No claims, no fees. Shaken out on testnet, then promoted to MegaETH mainnet with an Ethereum mainnet anchor — from that moment PoC pins are real, permanently anchored evidence.
- **PoC-2 — ownership.** Claims, the 30-day window, and usurpation run as clearly test-labeled per-hash tokens at nominal fees — rehearsing everything that will later ship immutable — plus the first capture-point instruments: a CLI/SDK (TypeScript and Python, with a git-hook/watch mode) and a Figma pin-on-export plugin. These run the demand test the segment decision is waiting on.

PoC-1 executes under a gated plan — [poc1-plan.md](./poc1-plan.md), gates G0–G5 — whose exit is PoC-2's entry.

**The hand-off rule.** PoC records are evidence forever — MegaETH history plus the PoC's own anchors keep them verifiable — but they never govern canonical ownership: the live MVP's genesis commits to the PoC's terminal chronicle tip (so every PoC pin provably predates canonical genesis), on-chain priority starts fresh, and entering the canonical pin-chain means **re-pinning**. A founder-controlled rehearsal must never hold usurpation power in the institution that follows it.

**What Phase 0 must prove.** That the machinery works under real conditions, and that anyone shows up: pinning volume through the instruments is the first read on the segment bet — taken before a single irreversible byte ships.

### Phase 1 — Genesis: the registry (zero PoW)

**What ships.** The full user-facing protocol on a fast, cheap EVM host:

- `pin` / `pinBatch` — blind keys, ~free, receipted in milliseconds; aggregators — relays that batch other users' pins — forward finished 32-byte keys per user and learn nothing at all.
- `claim` — reconstructs the key from an explicit `(hash, proof, pinner)`, mints an ERC-721 to the declared beneficiary, takes a stablecoin fee, opens the 30-day window.
- Usurpation within the window by strictly-earlier registration — "earlier" measured by the registry's own insertion order, so ties cannot arise; finality at expiry.
- Minimal governance: immutable core, bounded parameters, a sunsetted multisig, no token.

**Where.** A real-time host — MegaETH, the decided host (critique challenge 11) already proven by the Phase 0 rehearsal — because Phase 1's job is to make the density flywheel economically alive from day one. Pin-on-every-export only happens where a pin costs ~nothing and a receipt lands before the export dialog closes. Phase 1 is the canonical deployment: the immutable core ships here, and its genesis — which commits to the rehearsal's terminal tip — starts the linked history every later phase carries.

**The skeleton underneath** *(the critique's challenge-11 hybrid, resolved 19 August 2026)*. Although no proof-of-work exists yet, the structure that will one day carry it ships in the genesis contract:

- an **append-only accumulator** in the write path — every pin key is appended as a side effect, so the entire registry has one internal, total, tamper-evident order from the very first pin;
- a **chronicle chain** over it — sealed blocks of `(accumulatorRoot, prevTip, nonce)`, each linked to the last. Sealing is permissionless from day one; at genesis the difficulty is ~zero and the only sealer is a founder cron job. The nonce field exists; the grind does not;
- a **direct Ethereum anchor** — the chronicle tip checkpointed periodically to a tiny L1 contract, so "existed before the anchor that followed it" verifies against Ethereum's archive — at anchor-cadence granularity, for all history up to the last anchor — whatever happens to the host.

Why carry a chain before there are miners? Because **accumulated-work security is retroactive over linked history — and only over linked history.** Bitcoin's CPU-mined 2009 blocks are today among the most immutable data in existence, not because they were expensive to make, but because everything since is stacked on them. History that isn't linked when it's written can never be hardened later. So the linkage ships at genesis; the work comes when it comes.

**What Phase 1 claims — exactly.** Instant receipts; ordering fixed when the batch certifies toward Ethereum; Ethereum-grade permanence at each anchor. Between a receipt and its certification the host can still misbehave — visibly, not silently, because the accumulator makes recorded history tamper-evident; from certification onward a recorded pin can no longer be reordered or backdated. Final ownership 30 days after an unchallenged claim. **What it does not claim:** proof-of-work security. There is none yet, and the paper says so.

**What Phase 1 must prove.** Demand. The working bet (the critique's challenge 5): creators pinning at export and claiming on dispute or sale, with AI pipelines pinning datasets and outputs at volume. If nobody wants the primitive, no amount of consensus engineering matters.

### Phase 2 — Ignition: work arrives

Chronicling has been permissionless since genesis; ignition means making it worth racing for. Rewards attract independent miners — a routed share of claim fees, plus mined issuance if a native token passes the legal review the critique requires — and difficulty rises from ~zero as they compete to seal the next block. The exact reward design is, per the critique, the hardest open economics question on this road; it gets solved before ignition, not assumed by it.

From this point, Hashpin has the property the original whitepaper wanted and the original design could not deliver: **it generates its own security, in addition to its host's — truthfully.** Not per-pin puzzles (isolated work proves effort, not time), but a chained, accumulating record in which every joule spent extending the tip also buries all prior history deeper. Genesis-era pins — recorded when the chronicler was a cron job — are hardened retroactively, as Bitcoin's early blocks were, with the Ethereum anchors standing in for what Bitcoin's own early consensus provided.

Every post-ignition pin is attested by two clocks: the host's, and Hashpin's own **work-clock** — internal linkage proving order, accumulated difficulty proving elapsed work — which depends on no sequencer, no validator set, and no consensus ideology. Genesis-era pins keep their order from the linkage and their time from the host and the anchors; what ignition adds to them is depth.

Pinners notice nothing. Pins are still instant, still blind, still free of grinding. The work-tax lands on miners, who are paid to bear it.

**What Phase 2 must prove.** Miner economics: that the reward flow sustains independent hashrate without volume subsidies or founder mining.

### Phase 3 — Detachment: the sovereign timechain

The chronicle graduates. Miners extend the tip as a **standalone proof-of-work chain that keeps its own state** — the registry itself. Blocks carry the pin keys and the accumulator roots; full nodes hold the pin-set; the canonical registry is the chain with the most accumulated work — a fact any observer can verify independently, from any copy, trusting no one. Registration keeps its invariant — pins enter at block cadence — and fast blocks are within reach because the chain uses DAG-style proof-of-work rather than naive longest-chain (Kaspa's GHOSTDAG runs ten blocks per second in production), so confirmation time scales with network diameter, not with the long intervals longest-chain designs need to keep orphan rates down. The precise sovereign write path is a detachment design item; the bar it must clear is written in the invariants.

The original host is demoted, not abandoned: it remains a claim venue, while Ethereum becomes one anchor among several — other chains, potentially Bitcoin, joining it. The NFTs never leave the smart-contract world, because ownership needs marketplaces, lending, and wallets, and a timechain should never grow a VM. A claim contract on a host verifies a pin against checkpointed chain state — with one canonical claim venue per hash, so no hash can ever mint twice — and nothing but commitments ever crosses. Tokens leave a claim venue only after their window closes.

Detachment is an event with **pre-committed preconditions**, not a mood: sustained independent hashrate above a floor, a minimum count of unaffiliated miners, stable anchor cadence, reward flow covering chronicling and anchoring. Until the conditions hold, the chain stays embedded, where the host contract structurally refuses forks. When they hold, the sovereign genesis block references the last embedded tip — **one unbroken linked history from the first pin ever recorded in the Phase 1 contract.** The contract was a venue. The chain is the institution.

**The test that defines success.** Kill the host. All of it — sequencer, data-availability layer, the company behind it. If Hashpin is finished, nothing evidentiary is lost: every user-held proof still verifies against the anchors on Ethereum and any single surviving copy of the chronicle (self-verifying, kilobytes per day); the full pin-set reconstructs from any surviving node of the sovereign chain; and mining continues from the surviving tip. A Hashpin that passes this test has stopped being a tenant.

**What Phase 3 must prove.** Sovereignty without ecosystem loss: the registry stands alone while claims keep living where liquidity lives.

### Phase 4 — Horizon: the recursive timechain

The end-state, held lightly. A hierarchy of timechains, each tuned to the diameter of its network — sub-second confirmation locally, planetary layers beneath, and a base layer slow enough for worlds that are light-minutes apart — each layer sealing its history into the heavier one below. Probabilistic at every level, because finality does not survive a partition: a protocol that imposes it must halt, or keep running unfinalized and surrender the very guarantee it imposed. And interplanetary life *is* scheduled partition — Mars loses sight of Earth for about two weeks every 26 months, behind the sun. A protocol that only accumulates evidence keeps mining through the blackout and reconciles when the sky clears.

Between branches, priority becomes a partial order resolved where histories merge. For pins closer in time than the light between them, that is not a compromise but the physically honest answer — no observer-independent order exists; simultaneity itself is relative. For the rest, the merge rule is a convention the protocol commits to in advance. Timestamping is the rare primitive that degrades *gracefully* under partial order; money doesn't. That is why this structure will be built around a registry rather than a currency — and why Hashpin is not an application looking for a chain, but the payload this architecture exists to carry: pure commitments, needing ordering and nothing else, broadcastable one-way over any link that can move 32 bytes.

Phase 4 is a horizon, not a commitment. It becomes engineering only after Phase 3 stands.

## 4. What this vision refuses

- **No pinner ever grinds.** If a design requires users to mine, the design is wrong.
- **No perpetual seizure.** Ownership without finality is not ownership; the window is the whole compromise, and it is enough.
- **No security theater.** No proof-of-work language before there is work; no "decentralized" label over a sunsetting multisig; the trust model of each phase is printed on the tin.
- **No native token before its job exists.** A token's only defensible role here is paying for security; it arrives with mining or not at all, and only after legal review.
- **No value bridges.** Wrapped registry state, pegged tokens between layers, pre-finality NFT exits: all refused. Commitments cross; value doesn't.
- **No chain tribalism.** Hosts are rented for their ecosystems. Anchors are commodities bought for their permanence. The only component Hashpin fully trusts is the work-linked chronicle it owns. Ideology stays out of the trust model.

## 5. Why this order

Each phase risks only what the previous phase has already proven it can afford:

0. **The rehearsal** proves the machinery and the appetite while nothing is yet irreversible — the one phase allowed to be wrong in public.
1. **Genesis** proves people want the primitive — spending nothing on mining or difficulty, while quietly writing the only kind of history that can ever be hardened.
2. **Ignition** proves the security can pay for itself — spending nothing on sovereignty, while the host still guarantees liveness.
3. **Detachment** proves the institution can stand — spending nothing on new physics, while claims keep their ecosystems.
4. **The horizon** waits for the one force that has never missed a deadline: distance.

A hash is a hash. A timestamp should outlive its witness. Hashpin is built so that it can.
