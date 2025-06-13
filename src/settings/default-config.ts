import { PipelineConfiguration } from '../types';

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfiguration = {
    "transcribe": {
        "model": "whisper-1",
        "input": "inbox/audio/{category}",
        "output": "inbox/transcripts/{category}/{filename}-transcript.md",
        "archive": "inbox/archive/transcribe/{category}",
        "template": "inbox/templates/transcribe.md",
        "include": ["transcriptionprompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "next": "process"
    },
    "process": {
        "model": "gpt-4",
        "input": "inbox/transcripts/{category}",
        "output": "inbox/results/{category}/{filename}-processed.md",
        "archive": "inbox/archive/process/{category}",
        "template": "inbox/templates/process.md",
        "include": ["processingprompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "next": "summarize"
    },
    "summarize": {
        "model": "gpt-4",
        "input": "inbox/results/{category}",
        "output": "inbox/summary/{category}/",
        "archive": "inbox/archive/summarize/{category}",
        "template": "inbox/templates/summarize.md",
        "include": ["summariseprompt.md", "inbox/summary/{category}/*"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1"
    }
};
