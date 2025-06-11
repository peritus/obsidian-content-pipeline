import { Plugin } from 'obsidian';

export default class AudioInboxPlugin extends Plugin {
    async onload() {
        console.log('Audio Inbox Plugin loaded!');
        
        // Add ribbon icon
        this.addRibbonIcon('microphone', 'Audio Inbox', () => {
            console.log('Audio Inbox clicked!');
        });
    }

    onunload() {
        console.log('Audio Inbox Plugin unloaded');
    }
}