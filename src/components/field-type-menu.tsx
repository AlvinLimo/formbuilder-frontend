"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FIELD_TYPE_ICONS } from "@/lib/field-icons";
import { CONTENT_TYPES, FIELD_TYPE_LABELS, QUESTION_TYPES } from "@/lib/field-types";
import type { FieldType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FieldTypeMenu({
  trigger,
  children,
  current,
  onSelect,
  align = "start",
}: {
  trigger: React.ComponentProps<typeof DropdownMenuTrigger>["render"];
  children: React.ReactNode;
  current?: FieldType;
  onSelect: (type: FieldType) => void;
  align?: "start" | "center" | "end";
}) {
  const item = (type: FieldType) => {
    const Icon = FIELD_TYPE_ICONS[type];
    return (
      <DropdownMenuItem
        key={type}
        onClick={() => onSelect(type)}
        className={cn(current === type && "bg-accent text-accent-foreground")}
      >
        <Icon className="text-muted-foreground" />
        {FIELD_TYPE_LABELS[type]}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="max-h-80 w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Questions</DropdownMenuLabel>
          {QUESTION_TYPES.map(item)}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Text blocks</DropdownMenuLabel>
          {CONTENT_TYPES.map(item)}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
