import { Box, InlineStack, Text, Icon } from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import type { StepDefinition } from "../../lib/pageTypes/registry";

interface WizardStepperProps {
  currentStep: number;
  steps: StepDefinition[];
}

export function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  return (
    <Box paddingBlockEnd="400">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <InlineStack gap="300" blockAlign="center">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <InlineStack key={stepNumber} gap="200" blockAlign="center">
                {isCompleted ? (
                  <Icon source={CheckCircleIcon} tone="success" />
                ) : (
                  <Box
                    background={isActive ? "bg-fill-info" : "bg-fill-secondary"}
                    borderRadius="full"
                    padding="100"
                    minWidth="24px"
                    minHeight="24px"
                  >
                    <Text
                      as="span"
                      variant="bodySm"
                      fontWeight="bold"
                      tone={isActive ? "text-inverse" : "subdued"}
                      alignment="center"
                    >
                      {stepNumber}
                    </Text>
                  </Box>
                )}
                <Text
                  as="span"
                  variant="bodySm"
                  fontWeight={isActive ? "bold" : "regular"}
                  tone={isActive ? undefined : "subdued"}
                >
                  {step.description}
                </Text>
                {index < steps.length - 1 && (
                  <Text as="span" tone="subdued">
                    →
                  </Text>
                )}
              </InlineStack>
            );
          })}
        </InlineStack>
      </div>
    </Box>
  );
}
