/**
 * Comprehensive type definitions for the Content Pipeline plugin
 * 
 * This file contains all TypeScript interfaces and types used throughout the plugin,
 * providing type safety and clear contracts for all data structures.
 */

// =============================================================================
// MODEL CONFIGURATION TYPES (v1.2)
// =============================================================================

/**
 * Supported model implementation types for automatic client mapping
 */
export type ModelImplementation = 'whisper' | 'chatgpt' | 'claude';

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
// PIPELINE CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for a single pipeline step
 */
export interface PipelineStep {
    /** Reference to ModelConfig ID */
    modelConfig: string;
    /** Pattern for input directory */
    input: string;
    /** Pattern for output file path */
    output: string;
    /** Pattern for archive directory (auto-generated) */
    archive: string;
    /** File patterns to include (prompts + additional files) */
    include: string[];
    /** Object mapping step IDs to routing prompts (optional) */
    next?: { [stepId: string]: string };
    /** Description of what this step does */
    description?: string;
}

/**
 * Complete pipeline configuration - object-keyed by step ID
 */
export interface PipelineConfiguration {
    [stepId: string]: PipelineStep;
}

// =============================================================================
// CONFIGURATION RESOLUTION TYPES (v1.2)
// =============================================================================

/**
 * Resolved pipeline step with actual model configuration
 */
export interface ResolvedPipelineStep {
    /** Step ID */
    stepId: string;
    /** Resolved model configuration */
    modelConfig: ModelConfig;
    /** Input pattern */
    input: string;
    /** Output pattern */
    output: string;
    /** Archive pattern */
    archive: string;
    /** Include patterns */
    include: string[];
    /** Next step routing */
    next?: { [stepId: string]: string };
    /** Description */
    description?: string;
}

/**
 * Configuration validation result for dual config system
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
    /** Validation warnings */
    warnings: string[];
    /** Entry points identified */
    entryPoints: string[];
}

// =============================================================================
// PROCESSING CONTEXT TYPES
// =============================================================================

/**
 * Context information available during file processing
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
}

/**
 * File metadata stored in frontmatter
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
 * File processing result
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
}

// =============================================================================
// YAML FRONTMATTER TYPES
// =============================================================================

/**
 * Role assignment for files in YAML requests
 */
export enum FileRole {
    INPUT = 'input',
    PROMPT = 'prompt',
    CONTEXT = 'context',
    ROUTING = 'routing'
}

/**
 * YAML frontmatter section for requests
 */
export interface YamlRequestSection {
    role: FileRole;
    filename: string;
    content: string;
}

/**
 * YAML frontmatter section for responses
 */
export interface YamlResponseSection {
    filename: string;
    nextStep?: string;
    content: string;
}

/**
 * Parsed YAML response with multiple sections
 */
export interface ParsedYamlResponse {
    sections: YamlResponseSection[];
    isMultiFile: boolean;
    rawResponse: string;
}

/**
 * Step routing information for YAML requests
 */
export interface StepRoutingInfo {
    available_next_steps: { [stepId: string]: string };
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

/**
 * Error categories for the plugin
 */
export enum ErrorType {
    CONFIGURATION = 'configuration',
    FILE_SYSTEM = 'filesystem',
    API = 'api',
    PIPELINE = 'pipeline',
    VALIDATION = 'validation',
    PARSING = 'parsing'
}

/**
 * Structured error information
 */
export interface ErrorInfo {
    /** Error type/category */
    type: ErrorType;
    /** Technical error message */
    message: string;
    /** User-friendly error message */
    userMessage: string;
    /** Additional context for debugging */
    context?: any;
    /** Stack trace (if available) */
    stack?: string;
    /** Suggested recovery actions */
    suggestions?: string[];
}

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
    context?: any;
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
 * Path pattern resolution context
 */
export interface PathContext {
    /** Filename for path resolution */
    filename?: string;
    /** Timestamp for path resolution */
    timestamp?: string;
    /** Date for path resolution */
    date?: string;
    /** Step ID for path resolution */
    stepId?: string;
}

// =============================================================================
// PLUGIN SETTINGS TYPES (v1.2)
// =============================================================================

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
    /** Example prompts imported from configuration files */
    importedExamplePrompts?: Record<string, string>;
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
 */
export function isValidModelImplementation(value: any): value is ModelImplementation {
    return ['whisper', 'chatgpt', 'claude'].includes(value);
}
