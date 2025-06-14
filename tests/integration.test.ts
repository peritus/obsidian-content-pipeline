/**
 * Integration Test
 * 
 * Basic integration test to verify the test system is working with v1.1 schema
 */

describe('Test System Integration', () => {
    it('should run basic assertions', () => {
        expect(1 + 1).toBe(2);
        expect('hello').toBe('hello');
        expect([1, 2, 3]).toHaveLength(3);
    });

    it('should support async testing', async () => {
        const promise = Promise.resolve('async result');
        await expect(promise).resolves.toBe('async result');
    });

    it('should support custom matchers for v1.1 schema', () => {
        expect('valid/path/file.md').toBeValidPath();
        expect('transcribe').toBeValidStepId();
        expect('process-thoughts').toBeValidStepId();
        expect('summary-personal').toBeValidStepId();
    });

    it('should handle TypeScript imports', () => {
        // This tests that our TypeScript configuration is working
        const obj: { name: string; value: number } = {
            name: 'test',
            value: 42
        };
        
        expect(obj.name).toBe('test');
        expect(obj.value).toBe(42);
    });

    it('should validate step routing structure', () => {
        // Test the object-keyed next step configuration
        const stepRouting = {
            'process-thoughts': 'If personal content detected',
            'process-tasks': 'If work content detected',
            'process-ideas': 'If innovative ideas detected'
        };

        expect(Object.keys(stepRouting)).toHaveLength(3);
        expect(stepRouting['process-thoughts']).toBe('If personal content detected');
        expect(stepRouting['process-tasks']).toBe('If work content detected');
        expect(stepRouting['process-ideas']).toBe('If innovative ideas detected');
    });
});
