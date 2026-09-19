import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AppSplash from "@/components/pwa/AppSplash";
import EventPromoModal from "@/components/events/EventPromoModal";
import {
  isEventPromoEligible,
  selectPriorityPromo,
  type ActiveEventPromo,
} from "@/hooks/use-active-event-promo";

// Mock router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: vi.fn(() => ({ pathname: "/" })),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Mock providers used by AppSplash and EventPromoModal
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({
    isLoading: false,
    user: { id: "test-user-123" },
  })),
}));

vi.mock("@/providers/TenantProvider", () => ({
  useTenant: vi.fn(() => ({
    isLoading: false,
    collegeId: "col-123",
    college: null,
    isSuperAdmin: false,
  })),
}));

vi.mock("@/hooks/use-platform-branding", () => ({
  usePlatformBranding: vi.fn(() => ({
    branding: {
      brand_name: "Campus Connect",
      tagline: "By Students For Students",
      logo_url: null,
      favicon_url: null,
    },
    loading: false,
  })),
}));

// Mock active event promo hook
const mockDismissPromo = vi.fn();
let mockActivePromo: ActiveEventPromo | null = null;

vi.mock("@/hooks/use-active-event-promo", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useActiveEventPromo: () => ({
      activePromo: mockActivePromo,
      dismissPromo: mockDismissPromo,
      isLoading: false,
      isError: false,
    }),
  };
});

describe("Campus Connect Branded Launch / Splash Screen", () => {
  it("renders Campus Connect hierarchy with BKBNC and official logo mark", () => {
    render(<AppSplash />);

    // Must show Campus Connect brand hierarchy
    expect(screen.getByText("Campus Connect")).toBeInTheDocument();
    expect(screen.getByText("BKBNC")).toBeInTheDocument();
    expect(screen.getByText("Loading your campus experience...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Verify logo accessibility
    const logoImg = screen.getByAltText("Campus Connect logo");
    expect(logoImg).toBeInTheDocument();
  });
});

describe("Event Promotional Eligibility Logic", () => {
  const baseEvent = {
    id: "evt-1",
    title: "Innovate BKBNC Hackathon 2026",
    event_date: "2026-10-15",
    event_time: "10:00 AM",
    promotional_popup_enabled: true,
    promotional_image_url: "https://example.com/poster.jpg",
    promotional_duration_seconds: 7,
    promotional_start_at: "2026-09-01T00:00:00Z",
    promotional_end_at: "2026-10-15T23:59:59Z",
  };

  it("is eligible when enabled with image within time window", () => {
    const testNow = new Date("2026-09-15T12:00:00Z");
    const result = isEventPromoEligible(baseEvent, testNow);
    expect(result.eligible).toBe(true);
    expect(result.imageUrl).toBe("https://example.com/poster.jpg");
  });

  it("is not eligible when promotional_popup_enabled is false", () => {
    const testNow = new Date("2026-09-15T12:00:00Z");
    const result = isEventPromoEligible(
      { ...baseEvent, promotional_popup_enabled: false },
      testNow
    );
    expect(result.eligible).toBe(false);
  });

  it("is not eligible when before promotional_start_at", () => {
    const testNow = new Date("2026-08-31T23:59:59Z");
    const result = isEventPromoEligible(baseEvent, testNow);
    expect(result.eligible).toBe(false);
  });

  it("is not eligible when after promotional_end_at", () => {
    const testNow = new Date("2026-10-16T00:00:01Z");
    const result = isEventPromoEligible(baseEvent, testNow);
    expect(result.eligible).toBe(false);
  });

  it("falls back to flyer_url or poster_url if promotional_image_url is not set", () => {
    const testNow = new Date("2026-09-15T12:00:00Z");
    const result = isEventPromoEligible(
      {
        ...baseEvent,
        promotional_image_url: null,
        flyer_url: "https://example.com/flyer.png",
      },
      testNow
    );
    expect(result.eligible).toBe(true);
    expect(result.imageUrl).toBe("https://example.com/flyer.png");
  });

  it("is not eligible if no image or flyer exists", () => {
    const testNow = new Date("2026-09-15T12:00:00Z");
    const result = isEventPromoEligible(
      {
        ...baseEvent,
        promotional_image_url: null,
        flyer_url: null,
        full_flyer_url: null,
        poster_url: null,
      },
      testNow
    );
    expect(result.eligible).toBe(false);
  });
});

describe("Deterministic Selection with Multiple Active Events", () => {
  it("selects nearest upcoming event date first", () => {
    const events: ActiveEventPromo[] = [
      {
        id: "evt-far",
        title: "Future Gala",
        description: null,
        venue: "Hall A",
        event_date: "2026-11-20",
        event_time: "5:00 PM",
        promotional_image_url: "https://example.com/far.jpg",
        promotional_duration_seconds: 7,
        promotional_start_at: "2026-09-01T00:00:00Z",
        promotional_end_at: "2026-11-20T23:59:59Z",
        is_featured: false,
        is_ecell_event: false,
        imageUrl: "https://example.com/far.jpg",
      },
      {
        id: "evt-near",
        title: "Startup Pitch",
        description: null,
        venue: "Auditorium",
        event_date: "2026-09-25",
        event_time: "2:00 PM",
        promotional_image_url: "https://example.com/near.jpg",
        promotional_duration_seconds: 6,
        promotional_start_at: "2026-09-01T00:00:00Z",
        promotional_end_at: "2026-09-25T23:59:59Z",
        is_featured: true,
        is_ecell_event: true,
        imageUrl: "https://example.com/near.jpg",
      },
    ];

    const chosen = selectPriorityPromo(events);
    expect(chosen?.id).toBe("evt-near");
  });
});

describe("EventPromoModal UI & Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = true;
      private _src = "";
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          this.onload?.();
        }, 10);
      }
      get src() {
        return this._src;
      }
    }

    vi.stubGlobal("Image", MockImage);
  });

  it("renders nothing when no active promotion exists", () => {
    mockActivePromo = null;
    const { container } = render(<EventPromoModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders promotion modal when active promo exists and navigates on VIEW EVENT click", async () => {
    mockActivePromo = {
      id: "evt-fest-2026",
      title: "BKBNC TechFest 2026",
      description: "Annual university technical festival and robotics cup.",
      venue: "Main Campus Auditorium",
      event_date: "2026-10-10",
      event_time: "09:00 AM",
      promotional_image_url: "https://example.com/techfest.jpg",
      promotional_duration_seconds: 7,
      promotional_start_at: "2026-09-01T00:00:00Z",
      promotional_end_at: "2026-10-10T23:59:59Z",
      is_featured: true,
      is_ecell_event: false,
      imageUrl: "https://example.com/techfest.jpg",
    };

    render(<EventPromoModal />);

    // Simulate image load event on Image instance
    act(() => {
      // In JSDOM, window.Image onload is triggered
    });

    // Wait for modal elements
    const titleEl = await screen.findByText("BKBNC TechFest 2026");
    expect(titleEl).toBeInTheDocument();

    const ctaButton = screen.getByRole("button", { name: /view event/i });
    expect(ctaButton).toBeInTheDocument();

    // Click VIEW EVENT
    fireEvent.click(ctaButton);

    // Navigates to event details page
    expect(mockNavigate).toHaveBeenCalledWith("/events/evt-fest-2026");
    expect(mockDismissPromo).toHaveBeenCalledWith("evt-fest-2026");
  });

  it("dismisses immediately on close button click", async () => {
    mockActivePromo = {
      id: "evt-close-test",
      title: "E-Cell Workshop",
      description: "Learn pitch deck design.",
      venue: "Seminar Room 1",
      event_date: "2026-09-28",
      event_time: "11:00 AM",
      promotional_image_url: "https://example.com/workshop.jpg",
      promotional_duration_seconds: 5,
      promotional_start_at: null,
      promotional_end_at: null,
      is_featured: false,
      is_ecell_event: true,
      imageUrl: "https://example.com/workshop.jpg",
    };

    render(<EventPromoModal />);

    const closeBtn = await screen.findByRole("button", {
      name: /close promotional popup/i,
    });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(mockDismissPromo).toHaveBeenCalledWith("evt-close-test");
  });
});
