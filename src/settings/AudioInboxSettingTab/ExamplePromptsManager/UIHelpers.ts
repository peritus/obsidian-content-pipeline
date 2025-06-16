/**
 * Common UI styling utilities for the Example Prompts Manager
 */
export class UIHelpers {
    /**
     * Add shimmer animation to the document
     */
    static addShimmerAnimation(): void {
        if (document.querySelector('#example-prompts-shimmer')) return;
        
        const style = document.createElement('style');
        style.id = 'example-prompts-shimmer';
        style.textContent = `
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Get common styles for different UI states
     */
    static getStyles() {
        return {
            shimmerLoading: `
                padding: 30px;
                text-align: center;
                color: var(--text-muted);
                background: linear-gradient(90deg, 
                    var(--background-secondary) 25%, 
                    var(--background-primary) 50%, 
                    var(--background-secondary) 75%);
                background-size: 200% 100%;
                animation: shimmer 2s infinite;
                border-radius: 4px;
            `,
            statusSummary: `
                margin-bottom: 20px;
                padding: 15px;
                background: var(--background-primary);
                border-radius: 8px;
                border: 2px solid var(--background-modifier-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
            `,
            promptCard: `
                margin-bottom: 15px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                overflow: hidden;
                background: var(--background-primary);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `,
            primaryButton: `
                padding: 10px 16px;
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
            `,
            secondaryButton: `
                padding: 10px 16px;
                background: var(--background-secondary);
                color: var(--text-normal);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            `
        };
    }

    /**
     * Create a status indicator dot
     */
    static createStatusDot(color: string): string {
        return `<span style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; display: inline-block;"></span>`;
    }
}
