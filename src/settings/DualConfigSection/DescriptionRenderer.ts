/**
 * Description component for dual configuration section
 */

export class DescriptionRenderer {
    /**
     * Render the description section
     */
    static render(containerEl: HTMLElement): void {
        const descEl = containerEl.createEl('div');
        descEl.style.marginBottom = '20px';
        descEl.innerHTML = `
            <p style="margin-bottom: 10px;">
                Configure the Audio Inbox plugin using two separate configurations for security and sharing:
            </p>
            <ul style="margin-left: 20px; margin-bottom: 0;">
                <li><strong>Models Configuration:</strong> Private API credentials and model settings (never shared)</li>
                <li><strong>Pipeline Configuration:</strong> Workflow logic that can be safely exported and shared</li>
            </ul>
            <div style="margin-top: 10px; padding: 10px; background-color: var(--background-secondary); border-radius: 4px; font-size: 14px; color: var(--text-muted);">
                💾 <strong>Auto-save enabled:</strong> Changes are automatically saved as you type after validation completes.
            </div>
        `;
    }
}