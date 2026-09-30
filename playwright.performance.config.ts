import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testMatch: "performance.spec.ts", projects: base.projects?.filter(project => project.name === "chromium") });
