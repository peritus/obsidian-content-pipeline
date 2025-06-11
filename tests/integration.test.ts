/**
 * Integration Test
 * 
 * Basic integration test to verify the test system is working
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

    it('should support custom matchers', () => {
        expect('valid/path/file.md').toBeValidPath();
        expect('valid-category').toBeValidCategory();
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
});
