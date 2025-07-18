/**
 * Comprehensive type definitions for the Content Pipeline plugin
 *
 * This file contains all TypeScript interfaces and types used throughout the plugin,
 * providing type safety and clear contracts for all data structures.
 */

// =============================================================================
// MODEL CONFIGURATION TYPES
// =============================================================================

/**
 * Supported model implementation types for automatic client mapping
 * Currently supporting OpenAI implementations only
 */
export type ModelImplementation = 'whisper' | 'chatgpt';

/**
 * Configuration for a single model (API credentials and implementation details)
 */
export interface ModelConfig {
    /** API endpoint URL */
    baseUrl: string;
    /** API key for authentication */
    apiKey: string;
    /** Client implementation type for automatic mapping */
    implementation: ModelImplementation;
    /** Model name (e.g., "whisper-1", "gpt-4") */
    model: string;
    /** Organization ID (optional) */
    organization?: string;
}

/**
 * Complete models configuration - object-keyed by config ID
 */
export interface ModelsConfig {
    [configId: string]: ModelConfig;
}

// =============================================================================
// ROUTING-AWARE OUTPUT PATH TYPES
// =============================================================================

/**
 * Routing-aware output configuration that maps nextStep options to output paths
 * Note: Using Record type to properly handle the default property
 */
export type RoutingAwareOutput = Record<string, string> & {
    /** Default fallback output path when routing decision is invalid/missing */
    default?: string;
};

/**
 * Output routing validation result types
 */
export interface OutputRoutingValidationResult {
    /** Whether the output routing configuration is valid */
    isValid: boolean;
    /** List of validation errors */
    errors: string[];
    /** Available next step options */
    availableNextSteps: string[];
    /** Whether default fallback is configured */
    hasDefaultFallback: boolean;
}

// =============================================================================
// PIPELINE CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for a single pipeline step with routing-aware output support
 */
export interface PipelineStep {
    /** Reference to ModelConfig ID */
    modelConfig: string;
    /** Pattern for input directory */
    input: string;
    /** Pattern for output file path (string) or routing-aware output mapping */
    output: string | RoutingAwareOutput;
    /** Original routing-aware output configuration (if applicable) */
    routingAwareOutput?: RoutingAwareOutput;
    /** Pattern for archive directory (auto-generated) */
    archive: string;
    /** Files containing LLM instructions */
    prompts?: string[];
    /** Files containing reference material */
    context?: string[];
    /** Description of what this step does */
    description?: string;
}

/**
 * Complete pipeline configuration - object-keyed by step ID
 */
export interface PipelineConfiguration {
    [stepId: string]: PipelineStep;
}

/**
 * Pipeline configuration with optional description
 */
export interface PipelineConfigurationWithDescription {
    /** Optional description of the pipeline configuration */
    description?: string;
    /** Pipeline steps configuration */
    [stepId: string]: PipelineStep | string | undefined;
}

/**
 * Utility function to extract pipeline steps from a configuration that may contain description
 */
export function extractPipelineSteps(config: unknown): PipelineConfiguration {
    const steps: PipelineConfiguration = {};
    if (config && typeof config === 'object') {
        for (const [key, value] of Object.entries(config)) {
            if (key !== 'description' && typeof value === 'object' && value !== null) {
                steps[key] = value as PipelineStep;
            }
        }
    }
    return steps;
}

// =============================================================================
// CONFIGURATION RESOLUTION TYPES
// =============================================================================

/**
 * Resolved pipeline step with actual model configuration and resolved output path
 */
export interface ResolvedPipelineStep {
    /** Step ID */
    stepId: string;
    /** Resolved model configuration */
    modelConfig: ModelConfig;
    /** Input pattern */
    input: string;
    /** Output pattern (string format) */
    output: string;
    /** Resolved output path based on routing decision */
    resolvedOutputPath?: string;
    /** Original routing-aware output configuration (if applicable) */
    routingAwareOutput?: RoutingAwareOutput;
    /** Archive pattern */
    archive: string;
    /** Resolved prompt file paths */
    prompts?: string[];
    /** Resolved context file paths */
    context?: string[];
    /** Description */
    description?: string;
}

/**
 * Configuration validation result for dual config system with routing validation
 */
export interface ConfigValidationResult {
    /** Whether both configurations are valid */
    isValid: boolean;
    /** Models configuration validation errors */
    modelsErrors: string[];
    /** Pipeline configuration validation errors */
    pipelineErrors: string[];
    /** Cross-reference validation errors */
    crossRefErrors: string[];
    /** Output routing validation errors */
    outputRoutingErrors: string[];
    /** Validation warnings */
    warnings: string[];
    /** Entry points identified */
    entryPoints: string[];
}

// =============================================================================
// PROCESSING CONTEXT TYPES
// =============================================================================

/**
 * Context information available during file processing with routing metadata
 */
export interface ProcessingContext {
    /** Original filename without extension */
    filename: string;
    /** Current timestamp in ISO format */
    timestamp: string;
    /** Current date in YYYY-MM-DD format */
    date: string;
    /** Path to archived source file */
    archivePath: string;
    /** Step ID that is processing this file */
    stepId: string;
    /** Complete input file path */
    inputPath: string;
    /** Generated output file path */
    outputPath: string;
    /** Routing decision metadata */
    routingDecision?: {
        /** Next step chosen by AI routing */
        nextStep?: string;
        /** Whether default fallback was used */
        usedDefaultFallback: boolean;
        /** Resolved output path based on routing */
        resolvedOutputPath: string;
        /** Available routing options */
        availableOptions: string[];
    };
}

/**
 * File metadata stored in frontmatter (cleaned for end-user files)
 */
export interface FileMetadata {
    /** Path to archived source file */
    source: string;
    /** ISO timestamp of processing */
    processed: string;
    /** Step ID that generated this file */
    step: string;
    /** Chosen next step for processing (if applicable) */
    nextStep?: string;
    /** Pipeline identifier (for future multi-pipeline support) */
    pipeline?: string;
    /** Template version (for future template evolution) */
    version?: string;
}

// =============================================================================
// FILE PROCESSING TYPES
// =============================================================================

/**
 * Information about a discovered file
 */
export interface FileInfo {
    /** File name with extension */
    name: string;
    /** Complete file path */
    path: string;
    /** File size in bytes */
    size: number;
    /** File extension (including dot) */
    extension: string;
    /** Whether this file type can be processed */
    isProcessable: boolean;
    /** Last modified timestamp */
    lastModified: Date;
    /** MIME type (if detectable) */
    mimeType?: string;
}

/**
 * File processing status
 */
export enum ProcessingStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped'
}

/**
 * File processing result with routing decision details
 */
export interface ProcessingResult {
    /** Input file that was processed */
    inputFile: FileInfo;
    /** Processing status */
    status: ProcessingStatus;
    /** Output files that were created */
    outputFiles: string[];
    /** Archive location of input file */
    archivePath?: string;
    /** Error message if processing failed */
    error?: string;
    /** Processing start time */
    startTime: Date;
    /** Processing end time */
    endTime?: Date;
    /** Step that processed this file */
    stepId: string;
    /** Next step to process (if any) */
    nextStep?: string;
    /** Routing decision details */
    routingDecision?: {
        /** Available routing options at time of processing */
        availableOptions: string[];
        /** Chosen routing option */
        chosenOption?: string;
        /** Whether default fallback was used */
        usedDefaultFallback: boolean;
        /** Resolved output path */
        resolvedOutputPath: string;
        /** Original routing configuration */
        routingConfig?: RoutingAwareOutput;
    };
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

// Error handling is now simplified:
// - ContentPipelineError for plugin-specific operations (file I/O, API calls)
// - Valibot validation errors bubble up naturally with excellent messages
// See src/errors.ts for the simple error system

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/**
 * Notification severity levels (used for error categorization)
 */
export enum NotificationType {
    SUCCESS = 'success',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info'
}

// =============================================================================
// LOGGING TYPES
// =============================================================================

/**
 * Log levels - enum values match string values for build-time configuration
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

/**
 * Log entry structure
 */
export interface LogEntry {
    /** Log level */
    level: LogLevel;
    /** Component that generated the log */
    component: string;
    /** Log message */
    message: string;
    /** Additional context data */
    context?: Record<string, unknown>;
    /** Timestamp */
    timestamp: Date;
}

/**
 * Logger configuration (read from build-time environment)
 */
export interface LoggerConfig {
    /** Current log level threshold */
    level: LogLevel;
    /** Whether to include timestamps */
    includeTimestamp: boolean;
    /** Whether to include component names */
    includeComponent: boolean;
    /** Whether to format output for readability */
    prettyFormat: boolean;
}

/**
 * Complete plugin settings interface for dual configuration system
 * NOTE: Log level is now controlled at build-time via OBSIDIAN_CONTENT_PIPELINE_LOGLEVEL
 */
export interface ContentPipelineSettings {
    /** JSON string containing the models configuration (private) */
    modelsConfig: string;
    /** JSON string containing the pipeline configuration (shareable) */
    pipelineConfig: string;
    /** Parsed models configuration (computed from modelsConfig) */
    parsedModelsConfig?: ModelsConfig;
    /** Parsed pipeline configuration (computed from pipelineConfig) */
    parsedPipelineConfig?: PipelineConfiguration;
    /** Prompts defined in configuration files */
    configDefinedPrompts?: Record<string, string>;
    /** Enable debug mode for additional diagnostics in UI */
    debugMode: boolean;
    /** Plugin version (for migration purposes) */
    version: string;
    /** Last time settings were saved */
    lastSaved?: string;
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

/**
 * Type guard for validating model implementations
 * Currently supporting OpenAI implementations only
 */
export function isValidModelImplementation(value: unknown): value is ModelImplementation {
    return ['whisper', 'chatgpt'].includes(value as string);
}

/**
 * Type guard for checking if output configuration is routing-aware
 */
export function isRoutingAwareOutput(output: string | RoutingAwareOutput): output is RoutingAwareOutput {
    return typeof output === 'object' && output !== null;
}

/**
 * Type guard for validating routing-aware output structure
 */
export function isValidRoutingAwareOutput(value: unknown): value is RoutingAwareOutput {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    // Check that all values are strings
    for (const [, val] of Object.entries(value)) {
        if (typeof val !== 'string') {
            return false;
        }
    }

    return true;
}
