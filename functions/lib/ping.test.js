"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ping_1 = require("./ping");
describe("ping function", () => {
    it("should respond with \"pong\" and status 200", () => {
        const mockRequest = {};
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        (0, ping_1.ping)(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.send).toHaveBeenCalledWith("pong");
    });
});
//# sourceMappingURL=ping.test.js.map