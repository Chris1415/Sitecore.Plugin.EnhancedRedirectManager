/**
 * T012b / T013b — Body builder + outcome mapper + orchestration tests
 *
 * Tranche 3a: buildItemPublishBody removed; item-flow tests removed.
 * Tranche 3b: site body fixture updated to new name format
 *   `Redirect Manager — {collectionName}/{siteName} — {nowIso}`
 *
 * ADR-0033 §§ 2, 4, 5, 6. PRD-003 AC-P1.4, AC-P1.5/6.
 * Verbatim body fixtures from task-breakdown § 4c-8 (updated for Tranche 3b).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSitePublishBody,
  outcomeFrom,
  publish,
} from "./publish-service";
import type { PublishScope, ToastAdapter } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// T012b — buildSitePublishBody
// ─────────────────────────────────────────────────────────────────────────────

describe("buildSitePublishBody", () => {
  it("produces the updated Tranche-3b name format body", () => {
    // source: PRD-003 AC-P1.4 + ADR-0033 § 2 + Tranche 3b name change
    const expectedSiteBody = {
      name: "Redirect Manager — my-collection/solo-website — 2026-05-16T20:00:00.000Z",
      source: "Redirect Manager",
      description: "Triggered from Redirect Manager Full Page workspace hero",
      options: {
        xmc: {
          site: { mode: "Republish" },
          locales: ["en-US", "de-DE"],
        },
      },
    };

    const result = buildSitePublishBody(
      {
        collectionName: "my-collection",
        siteName: "solo-website",
        siteDisplayName: "Solo Website",
        locales: ["en-US", "de-DE"],
      },
      "2026-05-16T20:00:00.000Z",
    );

    expect(result).toEqual(expectedSiteBody);
    // Negative assertions — site body MUST NOT contain item fields
    expect((result.options as Record<string, unknown>).items).toBeUndefined();
    expect(result.options.xmc.items).toBeUndefined();
  });

  it("name uses collectionName/siteName not siteDisplayName", () => {
    const result = buildSitePublishBody(
      {
        collectionName: "acme-corp",
        siteName: "main-site",
        siteDisplayName: "ACME Main Site",
        locales: ["en"],
      },
      "2026-01-01T00:00:00.000Z",
    );
    expect(result.name).toBe("Redirect Manager — acme-corp/main-site — 2026-01-01T00:00:00.000Z");
    expect(result.name).not.toContain("ACME Main Site");
  });

  it("locales are included verbatim", () => {
    const result = buildSitePublishBody(
      {
        collectionName: "c",
        siteName: "s",
        siteDisplayName: "S",
        locales: ["en", "fr-FR"],
      },
      "2026-01-01T00:00:00.000Z",
    );
    expect(result.options.xmc.locales).toEqual(["en", "fr-FR"]);
  });

  it("mode is always Republish", () => {
    const result = buildSitePublishBody(
      {
        collectionName: "c",
        siteName: "s",
        siteDisplayName: "S",
        locales: ["en"],
      },
      "2026-01-01T00:00:00.000Z",
    );
    expect(result.options.xmc.site?.mode).toBe("Republish");
  });

  it("source is always 'Redirect Manager'", () => {
    const result = buildSitePublishBody(
      {
        collectionName: "c",
        siteName: "s",
        siteDisplayName: "S",
        locales: ["en"],
      },
    );
    expect(result.source).toBe("Redirect Manager");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T012b — outcomeFrom
// ─────────────────────────────────────────────────────────────────────────────

describe("outcomeFrom", () => {
  it("201 with id → queued outcome", () => {
    const result = outcomeFrom(201, { id: "abc12345-rest", system: { status: "Queued" } });
    expect(result).toEqual({ kind: "queued", jobId: "abc12345-rest", jobIdShort: "abc12345" });
  });

  it("400 with detail → failed with detail", () => {
    const result = outcomeFrom(400, { title: "Bad Request", detail: "Invalid locale" });
    expect(result).toEqual({ kind: "failed", status: 400, detail: "Invalid locale" });
  });

  it("400 with title only (no detail) → failed with title", () => {
    const result = outcomeFrom(400, { title: "Bad Request" });
    expect(result).toEqual({ kind: "failed", status: 400, detail: "Bad Request" });
  });

  it("401 empty body → failed with HTTP fallback", () => {
    const result = outcomeFrom(401, {});
    expect(result).toEqual({ kind: "failed", status: 401, detail: "HTTP 401" });
  });

  it("500 with detail → failed with detail", () => {
    const result = outcomeFrom(500, { detail: "boom" });
    expect(result).toEqual({ kind: "failed", status: 500, detail: "boom" });
  });

  it("201 without id → failed malformed shape", () => {
    const result = outcomeFrom(201, {});
    expect(result).toEqual({
      kind: "failed",
      status: 201,
      detail: "Unexpected response shape from publishing API",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T013b — publish() orchestration (site path only)
// ─────────────────────────────────────────────────────────────────────────────

describe("publish() orchestration", () => {
  let callPublish: ReturnType<typeof vi.fn>;
  let toasts: ToastAdapter;

  beforeEach(() => {
    callPublish = vi.fn().mockResolvedValue({
      status: 201,
      body: { id: "abc12345-rest", system: { status: "Queued" } },
    });
    toasts = {
      requested: vi.fn<() => string | number>().mockReturnValue("toast-123"),
      queued: vi.fn(),
      failed: vi.fn(),
    };
  });

  it("site publish happy path — correct toast sequence and return value", async () => {
    const scope: PublishScope = {
      collectionName: "my-collection",
      siteName: "solo-website",
      siteDisplayName: "Solo Website",
      locales: ["en-US"],
    };

    const result = await publish(scope, { callPublish, toasts });

    expect(toasts.requested).toHaveBeenCalledTimes(1);
    expect(toasts.requested).toHaveBeenCalledWith("Publishing site — Solo Website");
    expect(callPublish).toHaveBeenCalledTimes(1);
    expect(toasts.queued).toHaveBeenCalledTimes(1);
    expect(toasts.queued).toHaveBeenCalledWith("Site publish queued — job abc12345", {
      dismissId: "toast-123",
    });
    expect(result).toMatchObject({ kind: "queued" });
  });

  it("site publish failure — error toast with status + detail", async () => {
    callPublish.mockResolvedValue({
      status: 400,
      body: { title: "Bad Request", detail: "Invalid locale" },
    });

    const scope: PublishScope = {
      collectionName: "my-collection",
      siteName: "solo-website",
      siteDisplayName: "Solo Website",
      locales: ["en-US"],
    };

    const result = await publish(scope, { callPublish, toasts });

    expect(toasts.failed).toHaveBeenCalledWith("Publish failed — 400: Invalid locale", {
      dismissId: "toast-123",
    });
    expect(result).toEqual({ kind: "failed", status: 400, detail: "Invalid locale" });
  });

  it("dismissId contract — queued receives the id returned by requested", async () => {
    const scope: PublishScope = {
      collectionName: "my-collection",
      siteName: "solo-website",
      siteDisplayName: "Solo Website",
      locales: ["en-US"],
    };

    await publish(scope, { callPublish, toasts });

    // toasts.requested returns "toast-123" per mock setup
    const queuArgs = (toasts.queued as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(queuArgs[1]).toEqual({ dismissId: "toast-123" });
  });

  it("callPublish receives the body with the Tranche-3b name format", async () => {
    const scope: PublishScope = {
      collectionName: "acme",
      siteName: "main",
      siteDisplayName: "ACME Main",
      locales: ["en"],
    };

    await publish(scope, { callPublish, toasts });

    const passedBody = callPublish.mock.calls[0][0] as { name: string };
    expect(passedBody.name).toMatch(/^Redirect Manager — acme\/main — /);
  });
});
