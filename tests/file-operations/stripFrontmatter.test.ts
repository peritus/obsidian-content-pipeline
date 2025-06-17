/**
 * Test for frontmatter stripping functionality
 */

import { FileUtils } from '../../src/core/file-operations/file-utils';

describe('FileUtils.stripFrontmatter', () => {
    describe('Content with frontmatter', () => {
        it('should strip YAML frontmatter from markdown content', () => {
            const content = `---
source: "[[archive/file.md]]"
processed: "2025-06-17T10:00:00Z"
step: "transcribe"
---

This is the actual content that should be preserved.

It includes multiple paragraphs.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(`This is the actual content that should be preserved.

It includes multiple paragraphs.`);
        });

        it('should handle frontmatter with various field types', () => {
            const content = `---
title: "My Document"
tags: [important, work]
date: 2025-06-17
published: true
---

# Document Content

This is the main content.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(`# Document Content

This is the main content.`);
        });

        it('should handle empty content after frontmatter', () => {
            const content = `---
title: "Empty Document"
---

`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe('');
        });

        it('should handle frontmatter with no content after', () => {
            const content = `---
title: "Only Frontmatter"
---`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe('');
        });
    });

    describe('Content without frontmatter', () => {
        it('should return original content when no frontmatter present', () => {
            const content = `This is just regular content.

No frontmatter here.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(content);
        });

        it('should handle content that starts with --- but is not valid frontmatter', () => {
            const content = `---
This is not valid YAML frontmatter
because there's no closing delimiter

This is the content.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(content);
        });

        it('should handle empty content', () => {
            const content = '';
            
            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe('');
        });

        it('should handle content with --- in the middle', () => {
            const content = `This is regular content.

---

This line has dashes but it's not frontmatter.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(content);
        });
    });

    describe('Edge cases', () => {
        it('should handle whitespace correctly', () => {
            const content = `   ---
title: "Test"
---

Content with leading/trailing whitespace.
   `;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe('Content with leading/trailing whitespace.');
        });

        it('should handle nested --- in content', () => {
            const content = `---
title: "Test"
---

# Main Content

Here's some code:
\`\`\`
---
nested: "dashes"
---
\`\`\`

More content.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(`# Main Content

Here's some code:
\`\`\`
---
nested: "dashes"
---
\`\`\`

More content.`);
        });

        it('should handle frontmatter with complex YAML', () => {
            const content = `---
title: "Complex Document"
metadata:
  author: "John Doe"
  tags:
    - important
    - work
    - project
  dates:
    created: 2025-06-17
    modified: 2025-06-18
source: |
  This is a multi-line
  string value.
---

# Actual Content

This is the body of the document.`;

            const result = FileUtils.stripFrontmatter(content);
            
            expect(result).toBe(`# Actual Content

This is the body of the document.`);
        });
    });
});
