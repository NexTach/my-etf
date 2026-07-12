import React from "react";
import type { HoldingRiskLevel } from "@/lib/types";

const LABELS: Record<HoldingRiskLevel, string> = {
  LOW: "저위험",
  HIGH: "고위험"
};

export function RiskBadge({
  level,
  showUnassigned = false
}: {
  level?: HoldingRiskLevel;
  showUnassigned?: boolean;
}) {
  if (!level && !showUnassigned) return null;

  return (
    <span className={`risk-badge ${level?.toLowerCase() ?? "unassigned"}`}>
      {level ? LABELS[level] : "미지정"}
    </span>
  );
}
