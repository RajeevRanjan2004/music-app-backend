const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeEmail,
  isValidEmail,
  isStrongPassword,
  sanitizeText,
  parseNumber,
} = require("../src/utils/validation");

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  TEST@MAIL.COM "), "test@mail.com");
});

test("isValidEmail validates basic emails", () => {
  assert.equal(isValidEmail("a@b.com"), true);
  assert.equal(isValidEmail("bad-email"), false);
});

test("isStrongPassword enforces minimum length", () => {
  assert.equal(isStrongPassword("12345"), false);
  assert.equal(isStrongPassword("123456"), true);
});

test("sanitizeText trims and cuts length", () => {
  assert.equal(sanitizeText("  hello  "), "hello");
  assert.equal(sanitizeText("abcdef", 4), "abcd");
});

test("parseNumber safely parses values", () => {
  assert.equal(parseNumber("12.5", 0), 12.5);
  assert.equal(parseNumber("bad", 7), 7);
});
