import { beforeEach, describe, expect, it, vi } from "vitest";

// The action imports the RSC client, which is guarded by `server-only`; outside React Server
// Components that module throws, so the guard and the client are replaced for the test.
vi.mock("server-only", () => ({}));
const { getSession, readAccessToken, mutate, revalidatePath } = vi.hoisted(() => ({
  getSession: vi.fn(),
  readAccessToken: vi.fn(),
  mutate: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/apollo/rsc-client", () => ({ getClient: () => ({ mutate }) }));
vi.mock("@/lib/auth/session", () => ({ getSession }));
vi.mock("@/lib/auth/access-token", () => ({ readAccessToken }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { type RegisterViewState, registerView } from "./register-view";

const IDLE: RegisterViewState = { status: "idle" };
const form = (views: string, trackId = "c_0") => {
  const data = new FormData();
  data.set("trackId", trackId);
  data.set("views", views);
  return data;
};

describe("registerView (Server Action)", () => {
  beforeEach(() => {
    getSession.mockReset();
    getSession.mockResolvedValue({
      user: { name: "Cadet Kitty" },
      session: { token: "session-token-abc" },
    });
    readAccessToken.mockReset();
    readAccessToken.mockReturnValue("token-123");
    mutate.mockReset();
    revalidatePath.mockReset();
  });

  it("validates on the server and returns field errors instead of throwing", async () => {
    await expect(registerView(IDLE, form("7"))).resolves.toEqual({
      status: "invalid",
      fieldErrors: { trackId: undefined, views: "At most 5 views at a time" },
    });
    expect(mutate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses to run without a session, before any mutation", async () => {
    getSession.mockResolvedValue(null);

    await expect(registerView(IDLE, form("2"))).resolves.toEqual({
      status: "failed",
      message: "Sign in to register views",
    });
    expect(mutate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses to run when the session carries no API token, before any mutation", async () => {
    readAccessToken.mockReturnValue(null);

    await expect(registerView(IDLE, form("2"))).resolves.toEqual({
      status: "failed",
      message: "Sign in to register views",
    });
    expect(mutate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reads the token by session token, not off the session object", async () => {
    mutate.mockResolvedValue({
      data: { incrementTrackViews: { track: { id: "c_0", numberOfViews: 11 } } },
    });

    await registerView(IDLE, form("1"));

    expect(readAccessToken).toHaveBeenCalledWith("session-token-abc");
  });

  it("runs one mutation per view with the session token as context, then revalidates", async () => {
    let numberOfViews = 10;
    mutate.mockImplementation(async () => ({
      data: { incrementTrackViews: { track: { id: "c_0", numberOfViews: ++numberOfViews } } },
    }));

    await expect(registerView(IDLE, form("3"))).resolves.toEqual({
      status: "registered",
      views: 3,
      numberOfViews: 13,
    });
    expect(mutate).toHaveBeenCalledTimes(3);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { trackId: "c_0" },
        context: { headers: { authorization: "Bearer token-123" } },
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/rsc/track/c_0");
  });

  it("reports a failed mutation as state", async () => {
    mutate.mockRejectedValue(new Error("GraphQL unreachable"));

    await expect(registerView(IDLE, form("1"))).resolves.toEqual({
      status: "failed",
      message: "GraphQL unreachable",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
