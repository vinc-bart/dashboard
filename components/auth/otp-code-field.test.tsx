// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { OtpCodeField } from "./otp-code-field";

function renderField() {
  return render(
    <>
      <label htmlFor="code">Code</label>
      <OtpCodeField />
    </>,
  );
}

function cellText() {
  return document.querySelector("[aria-hidden='true']")?.textContent;
}

describe("OtpCodeField", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps a single textbox and shows pasted digits in the cells", async () => {
    const user = userEvent.setup();
    renderField();
    const field = screen.getByRole("textbox", { name: "Code" });
    expect(screen.getAllByRole("textbox")).toHaveLength(1);

    await user.click(field);
    await user.paste("90 0499");

    expect(field).toHaveValue("900499");
    expect(cellText()).toBe("900499");
  });

  it("drops letters while typing", async () => {
    const user = userEvent.setup();
    renderField();
    const field = screen.getByRole("textbox", { name: "Code" });

    await user.type(field, "12a3");

    expect(field).toHaveValue("123");
    expect(cellText()).toBe("123");
  });
});
