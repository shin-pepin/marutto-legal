import type { ComponentType } from "react";
import type { ZodSchema } from "zod";
import type { PageType } from "../../types/wizard";
import type { PlanLevel } from "../requirePlan.server";

/**
 * Step definition: label shown in stepper + React component to render.
 */
export interface StepDefinition {
  label: string;
  description: string;
}

/**
 * Configuration for each legal page type.
 */
export interface PageTypeConfig {
  type: PageType;
  /** Title shown in wizard header and page creation */
  title: string;
  /** Short description for dashboard display */
  description: string;
  /** Shopify page title */
  shopifyPageTitle: string;
  /** Shopify page handle (URL slug) */
  handle: string;
  /** Zod schema per step (index 0 = step 1, etc.) */
  stepSchemas: ZodSchema[];
  /** Full form validation schema */
  fullSchema: ZodSchema;
  /** Step labels for the stepper */
  steps: StepDefinition[];
  /** Generate HTML from validated form data */
  generateHtml: (data: Record<string, unknown>) => string;
  /** Normalize form data before HTML generation */
  normalizeData?: (data: Record<string, unknown>) => Record<string, unknown>;
  /** Collapsible sections config (section keys with default open state) */
  sections?: Record<string, boolean>;
  /** Required billing plan ("free" = no billing required) */
  requiredPlan?: PlanLevel;
}

const registry = new Map<string, PageTypeConfig>();

export function registerPageType(config: PageTypeConfig): void {
  registry.set(config.type, config);
}

export function getPageTypeConfig(type: string): PageTypeConfig | undefined {
  return registry.get(type);
}

export function getAllPageTypes(): PageTypeConfig[] {
  return Array.from(registry.values());
}

export function isValidPageType(type: string): type is PageType {
  return registry.has(type);
}
