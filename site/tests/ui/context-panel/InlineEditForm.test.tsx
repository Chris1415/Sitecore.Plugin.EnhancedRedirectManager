/**
 * Tests for InlineEditForm (T025 RED-1 through RED-4)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineEditForm } from "@/components/context-panel/InlineEditForm";

describe("InlineEditForm", () => {
  it("RED-1: renders source and target inputs with initial values", () => {
    render(
      <InlineEditForm
        initialSource="/foo"
        initialTarget="/bar"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect((screen.getByRole("textbox", { name: /redirect source/i }) as HTMLInputElement).value).toBe("/foo");
    expect((screen.getByRole("textbox", { name: /redirect target/i }) as HTMLInputElement).value).toBe("/bar");
  });

  it("RED-2: Save and Cancel buttons present", () => {
    render(
      <InlineEditForm
        initialSource="/foo"
        initialTarget="/bar"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /save/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
  });

  it("RED-3: onSave called with updated values when Save clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InlineEditForm
        initialSource="/foo"
        initialTarget="/bar"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    const targetInput = screen.getByRole("textbox", { name: /redirect target/i });
    await userEvent.clear(targetInput);
    await userEvent.type(targetInput, "/new-bar");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith({ source: "/foo", target: "/new-bar" });
  });

  it("RED-4: inline validation blocks save on empty target", async () => {
    const onSave = vi.fn();
    render(
      <InlineEditForm
        initialSource="/foo"
        initialTarget="/bar"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    const targetInput = screen.getByRole("textbox", { name: /redirect target/i });
    await userEvent.clear(targetInput);
    // Save button should be disabled when target is empty
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toHaveAttribute("disabled");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("RED-5: pristine cancel calls onCancel directly without confirm", async () => {
    const onCancel = vi.fn();
    render(
      <InlineEditForm
        initialSource="/foo"
        initialTarget="/bar"
        onSave={vi.fn()}
        onCancel={onCancel}
      />
    );
    // Don't modify anything — pristine
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
