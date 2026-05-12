/**
 * Tests for EditMapSettingsModal (Tranche 4 fix-up #2)
 *
 * Map-level settings edit dialog. Mappings are NOT modified by this modal —
 * the save handler only sees attribute deltas.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditMapSettingsModal } from "@/components/context-panel/EditMapSettingsModal";
import type { RedirectMapItem } from "@/lib/domain/types";

const baseMap: RedirectMapItem = {
  id: "map-1",
  name: "Marketing campaigns",
  redirectType: "Redirect301",
  preserveQueryString: true,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183802Z",
  mappings: [{ source: "/a", target: "/b" }],
};

beforeEach(() => {
  // Discard-changes confirm is auto-accepted in jsdom tests where needed.
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("EditMapSettingsModal", () => {
  it("hydrates form fields from the provided map on open", () => {
    render(
      <EditMapSettingsModal
        open
        onOpenChange={vi.fn()}
        map={baseMap}
        onSave={vi.fn()}
      />
    );
    const nameInput = screen.getByLabelText(/Map name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Marketing campaigns");
    const pqs = screen.getByLabelText(/Preserve Query String/i) as HTMLInputElement;
    expect(pqs.getAttribute("data-state")).toBe("checked");
  });

  it("invokes onSave with edited attributes when Save is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <EditMapSettingsModal
        open
        onOpenChange={onOpenChange}
        map={baseMap}
        onSave={onSave}
      />
    );
    const nameInput = screen.getByLabelText(/Map name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed campaigns");

    // Toggle preserveLanguage on
    const plang = screen.getByLabelText(/Preserve Language/i);
    await userEvent.click(plang);

    await userEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: "Renamed campaigns",
      redirectType: "Redirect301",
      preserveQueryString: true,
      preserveLanguage: true,
      includeVirtualFolder: false,
    });
  });

  it("rejects save when name is empty (validation guard)", async () => {
    const onSave = vi.fn();
    render(
      <EditMapSettingsModal
        open
        onOpenChange={vi.fn()}
        map={baseMap}
        onSave={onSave}
      />
    );
    const nameInput = screen.getByLabelText(/Map name/i);
    await userEvent.clear(nameInput);
    const saveBtn = screen.getByRole("button", { name: /^Save$/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Cancel closes the modal without invoking onSave", async () => {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <EditMapSettingsModal
        open
        onOpenChange={onOpenChange}
        map={baseMap}
        onSave={onSave}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
