import { Box, InlineStack, Text, Icon } from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";

interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { label: "Step 1", description: "事業者情報" },
  { label: "Step 2", description: "販売条件" },
  { label: "Step 3", description: "プレビュー & 公開" },
];

interface WizardStepperProps {
  currentStep: number;
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <Box paddingBlockEnd="400">
      <InlineStack gap="400" align="center">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <InlineStack key={stepNumber} gap="200" align="center">
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
              {index < STEPS.length - 1 && (
                <Text as="span" tone="subdued">
                  →
                </Text>
              )}
            </InlineStack>
          );
        })}
      </InlineStack>
    </Box>
  );
}
