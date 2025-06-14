import { PipelineConfiguration } from '../types';

/**
 * Default pipeline configuration following the new object-keyed schema
 * with intelligent step routing and direct content output
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfiguration = {
    "transcribe": {
        "model": "whisper-1",
        "input": "inbox/audio",
        "output": "inbox/transcripts/{filename}-transcript.md",
        "archive": "inbox/archive/transcribe",
        "include": ["transcriptionprompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "description": "Transcribe audio files to text",
        "next": {
            "process-thoughts": "If the document contains personal thoughts, reflections, journal entries, creative ideas, or mentions private topics like children, home, hobbies, or family members Alice, Bob or Charlotte.",
            "process-tasks": "If the document contains work-related content, meeting notes, action items, project planning, or business discussions.",
            "process-ideas": "If the document contains innovative concepts, brainstorming sessions, conceptual discussions, or new ideas for development."
        }
    },
    "process-thoughts": {
        "model": "gpt-4",
        "input": "inbox/transcripts",
        "output": "inbox/process-thoughts/{filename}-processed.md",
        "archive": "inbox/archive/process-thoughts",
        "include": ["process-thoughts-prompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "description": "Process personal thoughts and reflections with emotional intelligence",
        "next": {
            "summary-personal": "Always route personal thoughts and reflections to personal summary."
        }
    },
    "process-tasks": {
        "model": "gpt-4",
        "input": "inbox/transcripts",
        "output": "inbox/process-tasks/{filename}-processed.md",
        "archive": "inbox/archive/process-tasks",
        "include": ["process-tasks-prompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "description": "Process work content with focus on action items and project management",
        "next": {
            "summary-work": "Always route work content and action items to work summary."
        }
    },
    "process-ideas": {
        "model": "gpt-4",
        "input": "inbox/transcripts",
        "output": "inbox/process-ideas/{filename}-processed.md",
        "archive": "inbox/archive/process-ideas",
        "include": ["process-ideas-prompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "description": "Process innovative ideas with focus on development and connection",
        "next": {
            "summary-personal": "If the document specifically mentions this is private. If it mentions topics like children, home, my hobby flunky ball, my family members Alice, Bob or Charlotte.",
            "summary-work": "If the document contains business innovations, professional ideas, or work-related concepts."
        }
    },
    "summary-personal": {
        "model": "gpt-4",
        "input": "inbox/process-thoughts",
        "output": "inbox/summary-personal/",
        "archive": "inbox/archive/summary-personal",
        "include": ["summary-personal-prompt.md", "inbox/summary-personal/*"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "description": "Create personal summaries and insights"
    },
    "summary-work": {
        "model": "gpt-4",
        "input": "inbox/process-tasks",
        "output": "inbox/summary-work/",
        "archive": "inbox/archive/summary-work",
        "include": ["summary-work-prompt.md", "inbox/summary-work/*"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "description": "Create work-focused summaries with action items"
    }
};
