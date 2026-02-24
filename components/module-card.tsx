import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  buttonText: string;
}

export function ModuleCard({
  icon: Icon,
  title,
  description,
  href,
  buttonText,
}: ModuleCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
