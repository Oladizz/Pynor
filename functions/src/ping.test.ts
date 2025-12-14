import {ping} from "./ping";
import {Request} from "firebase-functions/v2/https";
import {Response} from "express";

describe("ping function", () => {
  it("should respond with \"pong\" and status 200", () => {
    const mockRequest: Partial<Request> = {};
    const mockResponse: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    ping(mockRequest as Request, mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith("pong");
  });
});
