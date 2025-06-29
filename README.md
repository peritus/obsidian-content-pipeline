# Obsidian Content Pipeline Plugin

**LLM workflow automation that processes files through configurable multi-step pipelines**

This plugin creates automated workflows where files move through a series of LLM processing stages. At each stage, LLM can analyze content and intelligently route files to different destinations based on that analysis.

## Core Capabilities

**Multi-Stage Processing**: Define workflows with any number of sequential steps, where each step can transform, analyze, or route content based on LLM analysis.

**Intelligent Routing**: LLM examines file content and decides which path the file takes next. Instead of static workflows, you get dynamic branching based on actual content analysis.

**Multiple LLM Integration**: Use different LLM models for different tasks - transcription models for audio, language models for text analysis, specialized models for specific domains.

**Flexible File Organization**: Template-based file naming and folder organization with variables that populate based on content, timestamps, and processing metadata.

**Context-Aware Processing**: Each processing step can reference external knowledge files, previous outputs, and custom instructions to inform AI decisions.

**Automatic Archiving**: Source files are preserved and organized automatically, maintaining a complete audit trail of processing.

## What This Enables

You can automate any multi-step cognitive process that involves analyzing content, making decisions about that content, and routing it through different processing paths based on those decisions. The LLM handles both the analysis and the routing logic, while you define the overall workflow structure.

The plugin handles all the technical complexity - file management, API communication, error handling, progress tracking - so you can focus on designing the workflow logic that meets your specific needs.

## Installation

**Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewer's Auto-update Tool):**

1. Install [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) if you don't have it
2. In BRAT settings, add this repository: `peritus/obsidian-content-pipeline`
3. BRAT will install and keep the plugin updated

**Apple Shortcuts Integration:**

This repository includes `Audio to Obsidian.shortcut` - an Apple Shortcuts automation that enables quick audio capture and routing to your Obsidian vault for processing through the content pipeline.

**To install the shortcut:**
1. Download `Audio to Obsidian.shortcut` from this repository
2. Double-tap the file on iOS or double-click on macOS to import it into the Shortcuts app
3. Configure the shortcut to point to your Obsidian vault's input folder

**To use the shortcut:**
- **iOS**: Add to home screen, control center, or invoke via Siri
- **macOS**: Run from Shortcuts app or assign a keyboard shortcut
- **Voice activation**: Say "Audio to Obsidian" to Siri (customizable)

The shortcut captures audio recordings and places them in your configured input folder where the content pipeline can automatically process them through your audio transcription and analysis workflow.

## Quick Start

1. **Add [OpenAI API key](https://platform.openai.com/api-keys)** in plugin settings
2. **Configure your models** - define API endpoints and model types
3. **Design your pipeline** - define processing steps and routing logic
4. **Create prompt files** with LLM instructions for each step
5. **Drop files** in your input folders and run processing commands

## Configuration

**Models Configuration**: Define your LLMs, API keys, and endpoints. This configuration contains sensitive data and stays private.

**Pipeline Configuration**: Define your processing workflow - steps, routing logic, file paths, and instructions. This configuration contains no sensitive data and can be shared.

Each pipeline step specifies:
- Which LLM to use
- Input folder pattern  
- Output destination(s) with routing options
- Archive location for processed files
- Prompt files for LLM instructions
- Context files for reference material

LLM can route content to different outputs based on analysis results, enabling complex branching workflows.

## Commands

- **Process Next File**: Process the next available file in any input folder
- **Process All Files**: Automatically process all available files until none remain  
- **Process Specific File**: Right-click any file to process it through the appropriate pipeline step

## API Integration

**OpenAI Integration**: Add your [OpenAI API key](https://platform.openai.com/api-keys) in the Models Configuration. The plugin supports gpt-4o for text analysis and content generation, and whisper-1 for audio transcription.

Configure multiple model instances with different settings if needed. The plugin handles all API communication and error handling automatically.

## License

MIT