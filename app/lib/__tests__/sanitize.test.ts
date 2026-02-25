import { describe, it, expect } from "vitest";
import { html, escapeHtml, safeHtml } from "../sanitize";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("does not modify safe strings", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles Japanese text without escaping", () => {
    expect(escapeHtml("株式会社テスト")).toBe("株式会社テスト");
  });
});

describe("html tagged template literal", () => {
  it("escapes interpolated values", () => {
    const name = '<script>alert("xss")</script>';
    const result = html`<p>${name}</p>`;
    expect(result).toBe(
      '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>',
    );
  });

  it("does not double-escape static parts", () => {
    const result = html`<div class="test"><p>Hello</p></div>`;
    expect(result).toBe('<div class="test"><p>Hello</p></div>');
  });

  it("handles null and undefined values", () => {
    const result = html`<p>${null}</p>`;
    expect(result).toBe("<p></p>");
    const result2 = html`<p>${undefined}</p>`;
    expect(result2).toBe("<p></p>");
  });

  it("handles numbers", () => {
    const result = html`<p>${42}</p>`;
    expect(result).toBe("<p>42</p>");
  });

  it("handles safeHtml for pre-escaped content", () => {
    const trusted = safeHtml("<strong>Bold</strong>");
    const result = html`<p>${trusted}</p>`;
    expect(result).toBe("<p><strong>Bold</strong></p>");
  });

  it("handles arrays", () => {
    const items = ["<b>one</b>", "two"];
    const result = html`<p>${items}</p>`;
    expect(result).toBe("<p>&lt;b&gt;one&lt;/b&gt;two</p>");
  });

  it("handles arrays with SafeHtml items", () => {
    const items = [safeHtml("<b>one</b>"), "two & three"];
    const result = html`<p>${items}</p>`;
    expect(result).toBe("<p><b>one</b>two &amp; three</p>");
  });

  it("prevents XSS via event handlers", () => {
    const input = '" onmouseover="alert(1)"';
    const result = html`<input value="${input}">`;
    expect(result).toBe(
      '<input value="&quot; onmouseover=&quot;alert(1)&quot;">',
    );
  });

  it("escapes quotes in javascript: URLs", () => {
    const url = "javascript:alert('xss')";
    const result = html`<a href="${url}">link</a>`;
    // The quotes are escaped, preventing attribute breakout
    expect(result).toContain("&#39;");
    expect(result).toBe('<a href="javascript:alert(&#39;xss&#39;)">link</a>');
  });
});
