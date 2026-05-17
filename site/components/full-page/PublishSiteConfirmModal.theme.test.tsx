/**
 * T025 — Theme parity tests (PublishSiteConfirmModal).
 *
 * Tranche 3a: RedirectMapPublishButton removed (per-map publish removed).
 *
 * jest-axe is NOT installed — WCAG contrast assertions are deferred to the
 * m_publish host-frame smoke gate (T028 / smoke-publish.md).
 *
 * These tests verify that the component renders without errors in each theme
 * context and that the confirm button is visible in the DOM.
 * They are a structural smoke, not an axe accessibility scan.
 *
 * When jest-axe is available, replace with axe() assertions per task breakdown § 10 T025.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublishSiteConfirmModal } from "./PublishSiteConfirmModal";

const themes = ["light", "dark", "system"] as const;

describe("PublishSiteConfirmModal — theme parity (structural smoke)", () => {
  themes.forEach((theme) => {
    it(`renders in ${theme} theme without error and confirm button is present`, () => {
      const { container } = render(
        <div data-theme={theme}>
          <PublishSiteConfirmModal
            open={true}
            siteDisplayName="Solo Website"
            localeCount={2}
            isPublishing={false}
            onOpenChange={vi.fn()}
            onConfirm={vi.fn()}
          />
        </div>,
      );
      // Confirm button visible in all themes
      expect(screen.getByRole("button", { name: "Republish site" })).toBeTruthy();
      void container;
    });
  });
});
