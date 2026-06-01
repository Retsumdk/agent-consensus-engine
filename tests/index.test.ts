import { expect, test, describe, beforeEach } from "bun:test";
import { ConsensusEngine } from "../src/engine";
import { ConsensusConfig, ProposalStatus } from "../src/types";

describe("ConsensusEngine", () => {
  let engine: ConsensusEngine;
  const config: ConsensusConfig = {
    quorumThreshold: 0.6,
    timeoutMs: 1000,
    persistenceEnabled: false,
    storagePath: "./test-data",
  };

  beforeEach(() => {
    engine = new ConsensusEngine("test-node", config);
    engine.addNode("test-node");
    engine.addNode("peer-1");
    engine.addNode("peer-2");
  });

  test("should initialize with correct status", () => {
    const status = engine.getStatus();
    expect(status.nodeId).toBe("test-node");
    expect(status.nodeCount).toBe(3);
    expect(status.ledgerSize).toBe(0);
  });

  test("should create a proposal and broadcast it", async () => {
    let broadcasted = false;
    engine.on("broadcast", (msg) => {
      if (msg.type === "PREPARE") broadcasted = true;
    });

    const proposalId = await engine.propose("test-value");
    expect(proposalId).toBeDefined();
    expect(broadcasted).toBe(true);
    
    const status = engine.getStatus();
    expect(status.pendingProposals).toBe(1);
  });

  test("should reach consensus when quorum is met", async () => {
    const proposalId = await engine.propose("consensus-test");
    
    // Simulate votes from peers
    engine.handleMessage({
      type: "VOTE",
      senderId: "peer-1",
      payload: { proposalId, voterId: "peer-1", approve: true }
    });

    // Quorum is 3 * 0.6 = 1.8 -> 2 nodes. 
    // Proposer already voted for itself, plus peer-1 = 2 votes.
    
    const status = engine.getStatus();
    expect(status.ledgerSize).toBe(1);
    expect(status.pendingProposals).toBe(0);
  });
});
