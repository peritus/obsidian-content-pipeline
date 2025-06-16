/**
 * Manages user notifications and notices with enhanced styling
 */
export class NotificationManager {
    /**
     * Show a notice to the user with enhanced styling
     */
    static showNotice(message: string): void {
        console.log(`[Audio Inbox] ${message}`);
        
        // Create a temporary status element with better styling
        const statusEl = document.createElement('div');
        statusEl.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            padding: 12px 16px;
            background-color: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 350px;
            font-size: 14px;
            line-height: 1.4;
            color: var(--text-normal);
        `;
        statusEl.textContent = message;

        document.body.appendChild(statusEl);

        // Remove after 4 seconds with fade out
        setTimeout(() => {
            statusEl.style.opacity = '0.5';
            statusEl.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                if (statusEl.parentNode) {
                    statusEl.parentNode.removeChild(statusEl);
                }
            }, 300);
        }, 4000);
    }
}