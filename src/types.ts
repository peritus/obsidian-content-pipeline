/**
 * Comprehensive type definitions for the Audio Inbox plugin
 * 
 * This file contains all TypeScript interfaces and types used throughout the plugin,
 * providing type safety and clear contracts for all data structures.
 */

// =============================================================================
// PIPELINE CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for a single pipeline step
 */
export interface PipelineStep {
    /** Model identifier (e.g., "whisper-1", "gpt-4") */
    model: string;
    /** Pattern for input directory */
    input: string;
    /** Pattern for output file path */
    output: string;
    /** Pattern for archive directory (auto-generated) */
    archive: string;
    /** File patterns to include (prompts + additional files) */
    include: string[];
    /** API key for this specific step */
    apiKey: string;
    /** Custom API endpoint (optional) */
    baseUrl?: string;
    /** Organization ID (optional) */
    organization?: string;
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

/**
 * Pipeline validation result
 */
export interface PipelineValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    entryPoints: string[];
    orphanedSteps: string[];
    circularReferences: string[];
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
// VALIDATION TYPES
// =============================================================================

/**
 * Generic validation result
 */
export interface ValidationResult {
    /** Whether the validation passed */
    isValid: boolean;
    /** Validation errors (blocking issues) */
    errors: string[];
    /** Validation warnings (non-blocking issues) */
    warnings: string[];
    /** Additional context for debugging */
    context?: any;
}

/**
 * Configuration validation context
 */
export interface ValidationContext {
    /** Vault path for resolving relative paths */
    vaultPath: string;
    /** Validation options */
    options: ValidationOptions;
}

/**
 * Validation options
 */
export interface ValidationOptions {
    /** Whether to perform strict validation */
    strict: boolean;
    /** Whether to check file existence */
    checkFileExistence: boolean;
    /** Whether to validate API credentials */
    validateCredentials: boolean;
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
 * Notification severity levels
 */
export enum NotificationType {
    SUCCESS = 'success',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info'
}

/**
 * Notification configuration
 */
export interface NotificationOptions {
    /** Auto-dismiss timeout in milliseconds */
    timeout?: number;
    /** Whether notification persists until manually dismissed */
    persistent?: boolean;
    /** Action buttons for the notification */
    actions?: NotificationAction[];
}

/**
 * Notification action button
 */
export interface NotificationAction {
    /** Button label */
    label: string;
    /** Action callback */
    callback: () => void;
    /** Button style */
    style?: 'primary' | 'secondary' | 'destructive';
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

// =============================================================================
// API INTEGRATION TYPES
// =============================================================================

/**
 * API client configuration
 */
export interface ApiConfig {
    /** API key for authentication */
    apiKey: string;
    /** Base URL for API endpoints */
    baseUrl: string;
    /** Organization ID (if applicable) */
    organization?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Maximum retry attempts */
    maxRetries?: number;
}

/**
 * API request metadata
 */
export interface ApiRequest {
    /** Request ID for tracking */
    id: string;
    /** Model being used */
    model: string;
    /** Request timestamp */
    timestamp: Date;
    /** Request payload size */
    payloadSize: number;
    /** Step that made the request */
    stepId: string;
}

/**
 * API response metadata
 */
export interface ApiResponse {
    /** Request ID this response is for */
    requestId: string;
    /** Response status code */
    status: number;
    /** Response timestamp */
    timestamp: Date;
    /** Response payload size */
    payloadSize: number;
    /** Processing duration in milliseconds */
    duration: number;
    /** Whether the response was successful */
    success: boolean;
    /** Error message (if failed) */
    error?: string;
}

// =============================================================================
// FOLDER STRUCTURE TYPES
// =============================================================================

/**
 * Complete folder structure for the plugin
 */
export interface FolderStructure {
    inbox: {
        audio: string[];
        transcripts: string[];
        archive: {
            [stepId: string]: string[];
        };
    };
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
// PLUGIN SETTINGS TYPES
// =============================================================================

/**
 * Complete plugin settings interface
 * NOTE: Log level is now controlled at build-time via OBSIDIAN_AUDIO_INBOX_LOGLEVEL
 */
export interface AudioInboxSettings {
    /** JSON string containing the complete pipeline configuration */
    pipelineConfig: string;
    /** Parsed pipeline configuration (computed from pipelineConfig) */
    parsedPipelineConfig?: PipelineConfiguration;
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
 * Type guard for validating log levels
 */
export function isValidLogLevel(value: any): value is LogLevel {
    return Object.values(LogLevel).includes(value);
}

/**
 * Type guard for validating notification types
 */
export function isValidNotificationType(value: any): value is NotificationType {
    return Object.values(NotificationType).includes(value);
}

/**
 * Type guard for validating file roles
 */
export function isValidFileRole(value: any): value is FileRole {
    return Object.values(FileRole).includes(value);
}

/**
 * Type guard for validating processing status
 */
export function isValidProcessingStatus(value: any): value is ProcessingStatus {
    return Object.values(ProcessingStatus).includes(value);
}

/**
 * Type guard for validating error types
 */
export function isValidErrorType(value: any): value is ErrorType {
    return Object.values(ErrorType).includes(value);
}