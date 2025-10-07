import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/app/_components/app-header";
import { resetWizardStore } from "@/lib/client/wizard-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/create",
}));

describe("AppHeader", () => {
  beforeEach(() => {
    resetWizardStore();
  });

  it("highlights the active navigation link", () => {
    render(<AppHeader />);

    const activeLink = screen.getByText("동화 만들기");
    expect(activeLink).toHaveClass("bg-white", { exact: false });
  });

  it("renders all navigation links", () => {
    render(<AppHeader />);

    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("동화책 읽기")).toBeInTheDocument();
    expect(screen.getByText("모임 게시판")).toBeInTheDocument();
    expect(screen.getByText("계정 설정")).toBeInTheDocument();
  });
});
