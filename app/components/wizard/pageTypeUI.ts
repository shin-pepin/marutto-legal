import type { ComponentType } from "react";
import { Step1BusinessInfo } from "./Step1BusinessInfo";
import { Step2SalesConditions } from "./Step2SalesConditions";
import { Step1BasicInfo } from "./privacy/Step1BasicInfo";
import { Step2DataCollection } from "./privacy/Step2DataCollection";

export interface WizardStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (field: string, value: string | string[]) => void;
  openSections?: Record<string, boolean>;
  onToggleSection?: (section: string) => void;
}

// Maps pageType to form step components (preview step is handled generically)
const PAGE_TYPE_STEPS: Record<string, ComponentType<WizardStepProps>[]> = {
  tokushoho: [Step1BusinessInfo, Step2SalesConditions],
  privacy: [Step1BasicInfo, Step2DataCollection],
};

export function getStepComponents(pageType: string): ComponentType<WizardStepProps>[] {
  return PAGE_TYPE_STEPS[pageType] || [];
}
