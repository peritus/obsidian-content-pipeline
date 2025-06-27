#!/usr/bin/env node

/**
 * Generate importable configuration files from examples/config/
 * 
 * This script reads all configuration folders in examples/config/ and generates
 * JSON configuration files in build/configs/ for the esbuild plugin.
 * 
 * Each configuration folder should contain:
 * - pipeline.json: Pipeline configuration
 * - prompts/: Directory with prompt files
 * - context/: Directory with context files (optional)
 * 
 * The shared models.json is used for all configurations.
 * 
 * Output structure:
 * - build/configs/models.json: Shared models configuration
 * - build/configs/{config-name}-pipeline.json: Individual pipeline configs with prompts
 */

const fs = require('fs');
const path = require('path');

// Constants
const EXAMPLES_DIR = path.join(__dirname, 'examples', 'config');
const OUTPUT_DIR = path.join(__dirname, 'build', 'configs');
const MODELS_FILE = path.join(EXAMPLES_DIR, 'models.json');

interface ConfigDirectory {
    name: string;
    path: string;
}

interface PipelineConfig {
    pipeline: any;
    examplePrompts: Record<string, string>;
}

interface GeneratedConfigSummary {
    name: string;
    steps: number;
    prompts: number;
}

/**
 * Ensure a directory exists
 */
function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Read and parse a JSON file
 */
function readJsonFile(filePath: string): any {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to read JSON file ${filePath}: ${(error as Error).message}`);
    }
}

/**
 * Read a text file and return its content
 */
function readTextFile(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Failed to read text file ${filePath}: ${(error as Error).message}`);
    }
}

/**
 * Write a JSON file with pretty formatting
 */
function writeJsonFile(filePath: string, data: any): void {
    try {
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
        throw new Error(`Failed to write JSON file ${filePath}: ${(error as Error).message}`);
    }
}

/**
 * Recursively find all files with specific extensions in a directory
 */
function findFiles(dir: string, extensions: string[] = ['.md', '.txt']): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
        return files;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            files.push(...findFiles(fullPath, extensions));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

/**
 * Get relative path from config folder to file, using forward slashes
 */
function getRelativeConfigPath(configDir: string, filePath: string): string {
    const relativePath = path.relative(configDir, filePath);
    // Convert backslashes to forward slashes for consistency
    return relativePath.replace(/\\/g, '/');
}

/**
 * Collect all example prompts from a configuration folder
 */
function collectExamplePrompts(configDir: string): Record<string, string> {
    const examplePrompts: Record<string, string> = {};
    
    // Find all markdown and text files in the config directory
    const files = findFiles(configDir, ['.md', '.txt']);
    
    for (const filePath of files) {
        // Skip pipeline.json files
        if (path.basename(filePath) === 'pipeline.json') {
            continue;
        }
        
        const relativePath = getRelativeConfigPath(configDir, filePath);
        const content = readTextFile(filePath);
        
        // Use the relative path as the key
        examplePrompts[relativePath] = content;
    }
    
    return examplePrompts;
}

/**
 * Generate a single pipeline configuration file
 */
function generatePipelineConfig(configName: string, configDir: string): PipelineConfig {
    console.log(`Processing config: ${configName}`);
    
    // Read pipeline configuration
    const pipelineFile = path.join(configDir, 'pipeline.json');
    if (!fs.existsSync(pipelineFile)) {
        throw new Error(`Missing pipeline.json in ${configDir}`);
    }
    
    const pipeline = readJsonFile(pipelineFile);
    
    // Collect example prompts
    const examplePrompts = collectExamplePrompts(configDir);
    
    // Count actual pipeline steps (excluding description field)
    const stepCount = Object.keys(pipeline).filter(key => key !== 'description').length;
    
    console.log(`  - Found ${stepCount} pipeline steps`);
    console.log(`  - Found ${Object.keys(examplePrompts).length} example prompts`);
    
    return {
        pipeline: pipeline,
        examplePrompts: examplePrompts
    };
}

/**
 * Get all configuration directories
 */
function getConfigDirectories(): ConfigDirectory[] {
    const configDirs: ConfigDirectory[] = [];
    
    if (!fs.existsSync(EXAMPLES_DIR)) {
        throw new Error(`Examples directory not found: ${EXAMPLES_DIR}`);
    }
    
    const entries = fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const configDir = path.join(EXAMPLES_DIR, entry.name);
            configDirs.push({
                name: entry.name,
                path: configDir
            });
        }
    }
    
    return configDirs;
}

/**
 * Main function
 */
function main(): void {
    try {
        console.log('🔄 Generating configuration files...');
        
        // Ensure output directory exists
        ensureDir(OUTPUT_DIR);
        
        // Read shared models configuration
        console.log('📖 Reading shared models configuration...');
        const sharedModels = readJsonFile(MODELS_FILE);
        console.log(`  - Found ${Object.keys(sharedModels).length} model configurations`);
        
        // Write shared models configuration
        const modelsOutputPath = path.join(OUTPUT_DIR, 'models.json');
        writeJsonFile(modelsOutputPath, sharedModels);
        console.log(`  - Written to: ${path.relative(process.cwd(), modelsOutputPath)}`);
        
        // Get all configuration directories
        console.log('📁 Scanning configuration directories...');
        const configDirs = getConfigDirectories();
        console.log(`  - Found ${configDirs.length} configuration directories`);
        
        // Generate individual pipeline configuration files
        const generatedConfigs: GeneratedConfigSummary[] = [];
        for (const { name, path: configDir } of configDirs) {
            const pipelineConfig = generatePipelineConfig(name, configDir);
            
            // Write pipeline configuration file
            const pipelineOutputPath = path.join(OUTPUT_DIR, `${name}-pipeline.json`);
            writeJsonFile(pipelineOutputPath, pipelineConfig);
            console.log(`  - Written to: ${path.relative(process.cwd(), pipelineOutputPath)}`);
            
            generatedConfigs.push({
                name,
                steps: Object.keys(pipelineConfig.pipeline).filter(key => key !== 'description').length,
                prompts: Object.keys(pipelineConfig.examplePrompts).length
            });
        }
        
        console.log('✅ Successfully generated all configuration files!');
        
        // Summary
        console.log('\n📊 Summary:');
        console.log(`  - Output directory: ${path.relative(process.cwd(), OUTPUT_DIR)}`);
        console.log(`  - Models file: models.json`);
        console.log(`  - Pipeline files: ${generatedConfigs.length}`);
        
        for (const config of generatedConfigs) {
            console.log(`    - ${config.name}-pipeline.json: ${config.steps} steps, ${config.prompts} prompts`);
        }
        
    } catch (error) {
        console.error('❌ Error generating configurations:', (error as Error).message);
        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main();
}

module.exports = {
    main,
    generatePipelineConfig,
    collectExamplePrompts,
    readJsonFile,
    readTextFile
};
