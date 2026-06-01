#!/usr/bin/env bun
import { ConsensusEngine } from "./engine";
import { AgentNetwork } from "./network";
import { ConsensusConfig } from "./types";
import { Logger } from "./utils/logger";

const mainLogger = new Logger("Main");

async function run() {
  mainLogger.info("Initializing Agent Consensus Engine demo...");

  const config: ConsensusConfig = {
    quorumThreshold: 0.6, // 60% majority
    timeoutMs: 5000,
    persistenceEnabled: false,
    storagePath: "./data",
  };

  const network = new AgentNetwork();

  // Create a collective of 5 agents
  for (let i = 1; i <= 5; i++) {
    const id = `agent-${i}`;
    const engine = new ConsensusEngine(id, config);
    network.register(engine, id);
  }

  // Run a simulation scenario
  await network.simulateScenario();

  mainLogger.success("Consensus demo completed successfully.");
}

run().catch(err => {
  mainLogger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
