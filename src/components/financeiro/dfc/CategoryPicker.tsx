import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { DEFAULT_CATEGORIES, suggestCategory, type CategorySource } from "@/lib/imports/categorize";
import type { StoredCategoryRule } from "@/hooks/useCategoryRules";

interface Props {
  value: string | null;
  description: string;
  direction: "in" | "out";
  rules: StoredCategoryRule[];
  onChange: (category: string, source: CategorySource | "manual") => void;
}

export function CategoryPicker({ value, description, direction, rules, onChange }: Props) {
  const suggestion = suggestCategory(description, direction, rules);
  const effective = value || suggestion.category;
  const showSuggestion = !value && suggestion.source !== "default";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={effective}
        onValueChange={(v) => onChange(v, "manual")}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEFAULT_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSuggestion && (
        <Badge
          variant="outline"
          className="cursor-pointer bg-info/10 text-info border-info/30 text-[10px] px-1.5 py-0"
          onClick={() => onChange(suggestion.category, suggestion.source)}
          title={`Sugestão via ${suggestion.source === "builtin" ? "dicionário" : suggestion.source === "learned" ? "aprendizado" : "sua regra"}`}
        >
          <Sparkles className="w-2.5 h-2.5 mr-1" />
          Sugerido: {suggestion.category}
        </Badge>
      )}
    </div>
  );
}