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
    /** Path to template file */
    template: string;
    /** File patterns to include (prompts + additional files) */
    include: string[];
    /** API key for this specific step */
    apiKey: string;
    /** Custom API endpoint (optional) */
    baseUrl?: string;
    /** Organization ID (optional) */
    organization?: string;
    /** ID of the next step (optional) */
    next?: string;
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
    /** Original category extracted from input file path */
    originalCategory: string;
    /** Resolved category (after any routing) */
    resolvedCategory: string;
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
 * Variables available for template substitution
 */
export interface TemplateVariables {
    category: string;
    content: string;
    filename: string;
    archivePath: string;
    timestamp: string;
    date: string;
    originalCategory: string;
    stepId: string;
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
    /** Final category (after any routing) */
    category: string;
    /** Original category before routing (if different) */
    originalCategory?: string;
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
    /** Extracted category from path */
    category: string;
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
    CONTEXT = 'context'
}

/**
 * YAML frontmatter section for requests
 */
export interface YamlRequestSection {
    role: FileRole;
    filename: string;
    category?: string;
    content: string;
}

/**
 * YAML frontmatter section for responses
 */
export interface YamlResponseSection {
    filename: string;
    category?: string;
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

// =============================================================================
// TEMPLATE SYSTEM TYPES
// =============================================================================

/**
 * Template file structure
 */
export interface TemplateFile {
    /** Template frontmatter metadata */
    frontmatter: TemplateMetadata;
    /** Template content (after frontmatter) */
    content: string;
    /** Path to template file */
    path: string;
}

/**
 * Template metadata from frontmatter
 */
export interface TemplateMetadata {
    /** Available variables in this template */
    variables: string[];
    /** Template description */
    description?: string;
    /** Step this template is for */
    step?: string;
    /** Template version */
    version?: string;
}

/**
 * Template processing result
 */
export interface TemplateResult {
    /** Final rendered content */
    content: string;
    /** Variables that were substituted */
    substitutions: Record<string, string>;
    /** Variables that were missing */
    missingVariables: string[];
}

// =============================================================================
// CATEGORY SYSTEM TYPES
// =============================================================================

/**
 * Default categories provided by the plugin
 */
export const DEFAULT_CATEGORIES = ['tasks', 'thoughts', 'uncategorized'] as const;
export type DefaultCategory = typeof DEFAULT_CATEGORIES[number];

/**
 * Category validation options
 */
export interface CategoryValidationOptions {
    /** Regex pattern for allowed characters */
    allowedCharacters: RegExp;
    /** Minimum category name length */
    minLength: number;
    /** Maximum category name length */
    maxLength: number;
    /** Reserved names that cannot be used */
    reservedNames: string[];
}

/**
 * Category routing information
 */
export interface CategoryRouting {
    /** Original category from file path */
    originalCategory: string;
    /** Target category (may be different if routed) */
    targetCategory: string;
    /** Whether category was changed during processing */
    wasRouted: boolean;
    /** Reason for routing (if applicable) */
    routingReason?: string;
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
    /** Available categories */
    categories: string[];
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
    TEMPLATE = 'template',
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
 * Log levels
 */
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
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
        results: string[];
        summary: string[];
        templates: string;
        archive: {
            [stepId: string]: string[];
        };
    };
}

/**
 * Path pattern resolution context
 */
export interface PathContext {
    /** Category for path resolution */
    category?: string;
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
// PLUGIN SETTINGS TYPES (Enhanced)
// =============================================================================

/**
 * Complete plugin settings interface
 */
export interface AudioInboxSettings {
    /** JSON string containing the complete pipeline configuration */
    pipelineConfig: string;
    /** Parsed pipeline configuration (computed from pipelineConfig) */
    parsedPipelineConfig?: PipelineConfiguration;
    /** Enable debug mode for additional logging and diagnostics */
    debugMode: boolean;
    /** Log level for the plugin operations */
    logLevel: LogLevel;
    /** Default categories to create on setup */
    defaultCategories: string[];
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
