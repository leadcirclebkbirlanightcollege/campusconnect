import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
      <Sonner />
    </>
  );
}
