/**
 * File information and metadata operations
 */

import { TFile } from 'obsidian';
import { FileInfo } from '../../types';

export class FileInfoProvider {
    /**
     * Get file information
     */
    getFileInfo(file: TFile): FileInfo {
        const path = file.path;
        const extension = this.getFileExtension(path);
        const isProcessable = this.isProcessableFile(extension);

        return {
            name: file.name,
            path: file.path,
            size: file.stat.size,
            extension,
            isProcessable,
            lastModified: new Date(file.stat.mtime),
            mimeType: this.getMimeType(extension)
        };
    }

    /**
     * Extract file extension from path
     */
    private getFileExtension(path: string): string {
        const filename = path.includes('/') ? path.split('/').pop() || '' : path;
        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? '' : filename.substring(lastDot);
    }

    /**
     * Check if a file extension is processable
     */
    private isProcessableFile(extension: string): boolean {
        const processableExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'];
        return processableExtensions.includes(extension.toLowerCase());
    }

    /**
     * Get MIME type for file extension
     */
    private getMimeType(extension: string): string | undefined {
        const mimeTypes: Record<string, string> = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.mp4': 'video/mp4',
            '.md': 'text/markdown',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp'
        };

        return mimeTypes[extension.toLowerCase()];
    }

    /**
     * Check if a file should be included in results
     */
    shouldIncludeFile(
        file: TFile,
        extensions: string[],
        includeHidden: boolean
    ): boolean {
        // Check hidden files
        if (!includeHidden && file.name.startsWith('.')) {
            return false;
        }

        // Check extensions
        if (extensions.length > 0) {
            const fileExt = this.getFileExtension(file.path);
            return extensions.includes(fileExt);
        }

        return true;
    }

    /**
     * Sort files based on criteria
     */
    sortFiles(files: FileInfo[], sortBy: string, sortOrder: string): void {
        files.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'modified':
                    comparison = a.lastModified.getTime() - b.lastModified.getTime();
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }
}
