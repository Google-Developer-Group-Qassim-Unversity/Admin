import { ShieldX } from "lucide-react";

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

interface AccessDeniedProps {
  title?: string;
  description?: string;
}

export function AccessDenied({
  title = "Access Denied",
  description = "You don't have permission to access this feature.",
}: AccessDeniedProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldX />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
