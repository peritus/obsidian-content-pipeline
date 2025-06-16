/**
 * Pipeline Executor Module
 * 
 * Main entry point for the pipeline execution system.
 */

export { PipelineExecutor, ExecutionOptions } from './pipeline-executor';
export { ExecutionState } from './execution-state';
export { StepChain } from './StepChain';

// Re-export FileDiscoveryResult from file-operations for backwards compatibility
export type { FileDiscoveryResult } from '../file-operations';