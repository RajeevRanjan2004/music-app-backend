const test = require("node:test");
const assert = require("node:assert/strict");
const createRateLimiter = require("../src/middleware/rateLimit");

function createMockReq(ip = "127.0.0.1") {
  return { ip };
}

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test("rate limiter blocks after max hits", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
  let nextCalls = 0;
  const next = () => {
    nextCalls += 1;
  };

  const req = createMockReq();
  const res1 = createMockRes();
  limiter(req, res1, next);
  const res2 = createMockRes();
  limiter(req, res2, next);
  const res3 = createMockRes();
  limiter(req, res3, next);

  assert.equal(nextCalls, 2);
  assert.equal(res3.statusCode, 429);
  assert.equal(Boolean(res3.payload?.message), true);
});
