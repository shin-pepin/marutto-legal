import type { ComponentType } from "react";
import { Step1BusinessInfo } from "./Step1BusinessInfo";
import { Step2SalesConditions } from "./Step2SalesConditions";
import { Step1BasicInfo } from "./privacy/Step1BasicInfo";
import { Step2DataCollection } from "./privacy/Step2DataCollection";
import { getPageTypeConfig } from "../../lib/pageTypes/registry";

export interface WizardStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (field: string, value: string | string[]) => void;
  openSections?: Record<string, boolean>;
  onToggleSection?: (section: string) => void;
}

// Maps pageType to form step components (preview step is handled generically).
// The last step in config.steps is always the preview step, so the number of
// components here must equal config.steps.length - 1.
const PAGE_TYPE_STEPS: Record<string, ComponentType<WizardStepProps>[]> = {
  tokushoho: [Step1BusinessInfo, Step2SalesConditions],
  privacy: [Step1BasicInfo, Step2DataCollection],
};

/**
 * Get step components for a pageType.
 * Validates that the component count matches the registry step count (minus preview).
 */
export function getStepComponents(pageType: string): ComponentType<WizardStepProps>[] {
  const components = PAGE_TYPE_STEPS[pageType];
  if (!components) {
    console.error(`[pageTypeUI] No step components registered for pageType: ${pageType}`);
    return [];
  }

  // Validate component count matches registry (steps minus the preview step)
  const config = getPageTypeConfig(pageType);
  if (config) {
    const expectedFormSteps = config.steps.length - 1; // last step is always preview
    if (components.length !== expectedFormSteps) {
      console.error(
        `[pageTypeUI] Step count mismatch for "${pageType}": ` +
        `${components.length} components vs ${expectedFormSteps} expected (registry has ${config.steps.length} steps)`,
      );
    }
  }

  return components;
}
