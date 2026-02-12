/**
 * Light tests for activate page UI
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivatePage from "@/app/activate/page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe("ActivatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ session: null }),
    });
  });

  it("shows error when checkout fails", async () => {
    // Mock checkout failure
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspace_id: "test-ws" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "STRIPE_NOT_CONFIGURED" }),
      });

    render(<ActivatePage />);

    const emailInput = screen.getByPlaceholderText("you@company.com");
    const submitButton = screen.getByText("Start 14-day protection");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Payment setup isn't complete yet/i)).toBeInTheDocument();
    });
  });

  it("calls fetch with correct payload", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspace_id: "test-ws" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://checkout.stripe.com/test" }),
      });

    render(<ActivatePage />);

    const emailInput = screen.getByPlaceholderText("you@company.com");
    const submitButton = screen.getByText("Start 14-day protection");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trial/start",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            hired_roles: ["full_autopilot"],
            business_type: null,
          }),
        })
      );
    });
  });
});
