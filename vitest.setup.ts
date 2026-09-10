import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";

// Next.js bundles React's canary channel, where <ViewTransition> is an export of "react". The
// npm package Vitest resolves (19.2) does not ship it, so components that animate in the app
// would render an undefined element type here. Every other export stays the real one.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<Record<string, unknown>>();
  if ("ViewTransition" in react) return react;
  return { ...react, ViewTransition: ({ children }: { children?: ReactNode }) => children };
});

afterEach(cleanup);
