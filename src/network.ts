import { NodeId, NetworkMessage } from "./types";
import { ConsensusEngine } from "./engine";
import { Logger } from "./utils/logger";

export class AgentNetwork {
  private engines: Map<NodeId, ConsensusEngine> = new Map();
  private logger: Logger;
  private latencyMin: number = 10;
  private latencyMax: number = 50;

  constructor() {
    this.logger = new Logger("AgentNetwork");
  }

  public register(engine: ConsensusEngine, id: NodeId) {
    this.engines.set(id, engine);
    
    // Wire up broadcasting
    engine.on("broadcast", (message: NetworkMessage) => {
      this.broadcast(message);
    });
  }

  private async broadcast(message: NetworkMessage) {
    const recipients = Array.from(this.engines.keys()).filter(id => id !== message.senderId);
    
    for (const recipientId of recipients) {
      const engine = this.engines.get(recipientId);
      if (engine) {
        // Simulate network latency
        const latency = Math.floor(Math.random() * (this.latencyMax - this.latencyMin)) + this.latencyMin;
        setTimeout(() => {
          engine.handleMessage(message);
        }, latency);
      }
    }
  }

  public async simulateScenario() {
    this.logger.info("Starting consensus simulation...");
    
    // Add all nodes to each other's configuration
    const ids = Array.from(this.engines.keys());
    for (const engine of this.engines.values()) {
      for (const id of ids) {
        engine.addNode(id);
      }
    }

    // Agent 1 proposes something
    const agent1 = this.engines.get(ids[0]);
    if (agent1) {
      await agent1.propose({ action: "UPDATE_MEMORY", data: "New observation from Agent 1" });
    }

    // Wait for consensus
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Agent 2 proposes something
    const agent2 = this.engines.get(ids[1]);
    if (agent2) {
      await agent2.propose({ action: "EXECUTE_TOOL", tool: "WebSearch", query: "Current AI trends" });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    this.logger.info("Simulation finished.");
    this.reportStats();
  }

  private reportStats() {
    console.log("\n--- Consensus Statistics ---");
    for (const [id, engine] of this.engines.entries()) {
      const status = engine.getStatus();
      console.log(`Node ${id}: Ledger Size = ${status.ledgerSize}, Pending = ${status.pendingProposals}`);
    }
    console.log("----------------------------\n");
  }
}
