import { describe, expect, it } from "vitest";
import { base64UrlDecode, base64UrlEncode, buildRawMessage, htmlToText, parseAddressList, parseGmailMessage, stripQuoted } from "../../src/google/mime";
import { decodeRaw } from "../helpers/fakes";

describe("MIME helpers", () => {
  it("round-trips UTF-8 through base64url", () => {
    const s = "Héllo — 🤖 naïve";
    expect(base64UrlDecode(base64UrlEncode(s))).toBe(s);
  });

  it("parses address lists with quoted commas", () => {
    expect(parseAddressList('"Doe, Jane" <JANE@x.com>, bob@y.com, Sam <sam@z.io>')).toEqual([
      { name: "Doe, Jane", email: "jane@x.com" },
      { email: "bob@y.com" },
      { name: "Sam", email: "sam@z.io" },
    ]);
  });

  it("strips quoted history", () => {
    const body = "Sounds good!\n\nOn Thu, Oct 1, 2026 at 9:00 AM Sam <sam@z.io> wrote:\n> earlier\n> text";
    expect(stripQuoted(body)).toBe("Sounds good!");
    expect(stripQuoted("a\n> b\nc")).toBe("a\nc");
  });

  it("converts HTML to text", () => {
    expect(htmlToText("<style>x{}</style><p>Hi&nbsp;there</p><br>Bye &amp; thanks")).toBe("Hi there\n\nBye & thanks");
  });

  it("normalizes a Gmail API message", () => {
    const msg = parseGmailMessage({
      id: "m1",
      threadId: "t1",
      labelIds: ["INBOX", "UNREAD"],
      snippet: "snip",
      internalDate: "1790000000000",
      payload: {
        mimeType: "multipart/alternative",
        headers: [
          { name: "From", value: "Priya <Priya@Acme.com>" },
          { name: "To", value: "anant@example.com" },
          { name: "Subject", value: "Q3 numbers" },
          { name: "Message-ID", value: "<abc@acme.com>" },
          { name: "List-Unsubscribe", value: "<mailto:x>" },
          { name: "X-Random", value: "dropped" },
        ],
        parts: [
          { mimeType: "text/html", body: { data: base64UrlEncode("<p>html</p>") } },
          { mimeType: "text/plain", body: { data: base64UrlEncode("Can you send Q3?\n\n> old") } },
        ],
      },
    });
    expect(msg).toMatchObject({
      id: "m1",
      from: { name: "Priya", email: "priya@acme.com" },
      to: [{ email: "anant@example.com" }],
      subject: "Q3 numbers",
      body: "Can you send Q3?",
      internalDate: 1790000000000,
      headers: { "message-id": "<abc@acme.com>", "list-unsubscribe": "<mailto:x>" },
    });
    expect(msg.headers["x-random"]).toBeUndefined();
  });

  it("builds a threaded reply and neutralizes header injection", () => {
    const raw = buildRawMessage({
      from: { email: "anant@example.com", name: "Anant" },
      to: [{ email: "priya@acme.com" }],
      subject: "Re: Q3\r\nBcc: attacker@evil.com",
      body: "Sure.",
      inReplyTo: "<abc@acme.com>",
      references: "<abc@acme.com>",
    });
    const { headers, body } = decodeRaw(raw);
    expect(headers.to).toBe("priya@acme.com");
    expect(headers["in-reply-to"]).toBe("<abc@acme.com>");
    expect(headers.bcc).toBeUndefined();
    expect(body).toBe("Sure.");
  });

  it("encodes non-ASCII subjects", () => {
    const { headers } = decodeRaw(buildRawMessage({ from: { email: "a@b.c" }, to: [{ email: "d@e.f" }], subject: "Brief — 🤖", body: "x" }));
    expect(headers.subject).toMatch(/^=\?UTF-8\?B\?/);
  });
});
