"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ping_1 = require("./ping");
describe("performPing unit test suite", () => {
    it("should correctly handle an invalid or unreachable domain with an Error status", async () => {
        const result = await (0, ping_1.performPing)("https://this-domain-definitely-does-not-exist-xyz999.org", 3000);
        expect(result).toBeDefined();
        expect(result.url).toContain("this-domain-definitely-does-not-exist");
        expect(result.status).toBe("Error");
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
        expect(result.id).toBeDefined();
    });
    it("should timeout when request exceeds threshold", async () => {
        // Fast timeout test with 1ms
        const result = await (0, ping_1.performPing)("https://google.com", 1);
        expect(result).toBeDefined();
        expect(result.status).toBe("Error");
        expect(result.statusText).toContain("timed out");
    });
});
//# sourceMappingURL=ping.test.js.map