import { EventEmitter } from "events";
import { NodeId, Proposal, ProposalStatus, Vote, ConsensusConfig, NetworkMessage } from "./types";
import { Logger } from "./utils/logger";

export class ConsensusEngine extends EventEmitter {
  private nodeId: NodeId;
  private config: ConsensusConfig;
  private nodes: Set<NodeId> = new Set();
  private proposals: Map<string, Proposal> = new Map();
  private ledger: Proposal[] = [];
  private logger: Logger;
  private currentSequence: number = 0;

  constructor(nodeId: NodeId, config: ConsensusConfig) {
    super();
    this.nodeId = nodeId;
    this.config = config;
    this.logger = new Logger(`Node-${nodeId}`);
  }

  public addNode(id: NodeId) {
    this.nodes.add(id);
    this.logger.info(`Node ${id} added to collective. Total nodes: ${this.nodes.size}`);
  }

  public removeNode(id: NodeId) {
    this.nodes.delete(id);
    this.logger.info(`Node ${id} removed. Total nodes: ${this.nodes.size}`);
  }

  public async propose<T>(value: T): Promise<string> {
    const proposalId = Math.random().toString(36).substring(7);
    const proposal: Proposal<T> = {
      id: proposalId,
      proposerId: this.nodeId,
      value,
      sequence: ++this.currentSequence,
      status: ProposalStatus.PENDING,
      votes: new Set([this.nodeId]),
      timestamp: Date.now(),
    };

    this.proposals.set(proposal.id, proposal);
    this.logger.info(`Created proposal ${proposal.id} for sequence ${proposal.sequence}`);

    // Broadcast PREPARE
    this.emit("broadcast", {
      type: "PREPARE",
      senderId: this.nodeId,
      payload: proposal,
    });

    return proposal.id;
  }

  public handleMessage(message: NetworkMessage) {
    const { type, senderId, payload } = message;

    switch (type) {
      case "PREPARE":
        this.onPrepare(payload);
        break;
      case "VOTE":
        this.onVote(payload);
        break;
      case "COMMIT":
        this.onCommit(payload);
        break;
      case "SYNC":
        this.onSync(payload, senderId);
        break;
    }
  }

  private onPrepare(proposal: Proposal) {
    if (this.proposals.has(proposal.id)) return;

    this.logger.debug(`Received PREPARE for ${proposal.id} from ${proposal.proposerId}`);
    
    // Validate proposal (simplified)
    const lastCommittedSequence = this.ledger.length > 0 ? this.ledger[this.ledger.length - 1].sequence : 0;
    const isValid = proposal.sequence > lastCommittedSequence;

    if (isValid) {
      this.proposals.set(proposal.id, proposal);
      this.vote(proposal.id, true);
    } else {
      this.logger.warn(`Rejected stale proposal ${proposal.id}`);
    }
  }

  private vote(proposalId: string, approve: boolean) {
    const vote: Vote = {
      proposalId,
      voterId: this.nodeId,
      approve,
    };

    this.emit("broadcast", {
      type: "VOTE",
      senderId: this.nodeId,
      payload: vote,
    });
  }

  private onVote(vote: Vote) {
    const proposal = this.proposals.get(vote.proposalId);
    if (!proposal || proposal.status !== ProposalStatus.PENDING) return;

    if (vote.approve) {
      proposal.votes.add(vote.voterId);
      this.logger.debug(`Proposal ${proposal.id} has ${proposal.votes.size} votes`);

      if (this.hasQuorum(proposal.votes.size)) {
        this.commit(proposal.id);
      }
    }
  }

  private hasQuorum(voteCount: number): boolean {
    const threshold = Math.ceil(this.nodes.size * this.config.quorumThreshold);
    return voteCount >= threshold;
  }

  private commit(proposalId: string) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status === ProposalStatus.COMMITTED) return;

    proposal.status = ProposalStatus.COMMITTED;
    this.ledger.push(proposal);
    this.logger.success(`Proposal ${proposal.id} COMMITTED at sequence ${proposal.sequence}`);

    this.emit("committed", proposal);

    // Broadcast COMMIT to ensure all nodes update status
    this.emit("broadcast", {
      type: "COMMIT",
      senderId: this.nodeId,
      payload: { proposalId: proposal.id, sequence: proposal.sequence },
    });
  }

  private onCommit(payload: { proposalId: string; sequence: number }) {
    const proposal = this.proposals.get(payload.proposalId);
    if (proposal && proposal.status !== ProposalStatus.COMMITTED) {
      proposal.status = ProposalStatus.COMMITTED;
      this.ledger.push(proposal);
      this.logger.success(`Remote COMMIT received for ${proposal.id}`);
      this.emit("committed", proposal);
    }
  }

  private onSync(payload: any, senderId: NodeId) {
    // Handle state synchronization
    this.logger.info(`Sync request from ${senderId}`);
  }

  public getLedger() {
    return [...this.ledger];
  }

  public getStatus() {
    return {
      nodeId: this.nodeId,
      nodeCount: this.nodes.size,
      ledgerSize: this.ledger.length,
      pendingProposals: Array.from(this.proposals.values()).filter(p => p.status === ProposalStatus.PENDING).length
    };
  }
}
