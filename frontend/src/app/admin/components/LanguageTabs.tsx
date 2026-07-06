import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "kk", label: "Kazakh" },
  { value: "ru", label: "Russian" },
  { value: "en", label: "English" },
];

interface LanguageTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Language switcher used both as a list filter and inside content editors. */
export function LanguageTabs({ value, onChange, className }: LanguageTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList>
        {LANGUAGE_OPTIONS.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
