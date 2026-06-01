export type NodeId = string;

export enum ProposalStatus {
  PENDING = "PENDING",
  PREPARED = "PREPARED",
  COMMITTED = "COMMITTED",
  REJECTED = "REJECTED",
}

export interface Proposal<T = any> {
  id: string;
  proposerId: NodeId;
  value: T;
  sequence: number;
  status: ProposalStatus;
  votes: Set<NodeId>;
  timestamp: number;
}

export interface Vote {
  proposalId: string;
  voterId: NodeId;
  approve: boolean;
  signature?: string;
}

export interface ConsensusConfig {
  quorumThreshold: number; // e.g., 0.66 for 2/3 majority
  timeoutMs: number;
  persistenceEnabled: boolean;
  storagePath: string;
}

export interface NetworkMessage {
  type: "PREPARE" | "VOTE" | "COMMIT" | "SYNC";
  senderId: NodeId;
  payload: any;
}
