import { useState, useCallback } from "react";
import { Popover, ActionList, Button } from "@shopify/polaris";

interface TemplateOption {
  content: string;
  value: string;
}

interface TemplateInsertButtonProps {
  options: TemplateOption[];
  onSelect: (value: string) => void;
  label?: string;
}

export function TemplateInsertButton({
  options,
  onSelect,
  label = "テンプレートから挿入",
}: TemplateInsertButtonProps) {
  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((v) => !v), []);

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      setActive(false);
    },
    [onSelect],
  );

  const activator = (
    <Button onClick={toggleActive} disclosure size="slim">
      {label}
    </Button>
  );

  return (
    <Popover active={active} activator={activator} onClose={toggleActive}>
      <ActionList
        items={options.map((opt) => ({
          content: opt.content,
          onAction: () => handleSelect(opt.value),
        }))}
      />
    </Popover>
  );
}
