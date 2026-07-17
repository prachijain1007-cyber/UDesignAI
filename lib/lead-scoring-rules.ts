export const BUDGET_OPTIONS = ["under_2k", "2k_10k", "10k_50k", "50k_plus", "unsure"] as const;
export const TIMELINE_OPTIONS = [
  "immediately",
  "1_3_months",
  "3_6_months",
  "6_plus_months",
  "just_browsing",
] as const;
export const URGENCY_OPTIONS = ["high", "medium", "low"] as const;
export const PROJECT_SIZE_OPTIONS = ["single_room", "multi_room", "full_home"] as const;
export const OWNERSHIP_OPTIONS = ["OWNER", "RENTER", "UNSURE"] as const;
export const DECISION_READINESS_OPTIONS = [
  "ready_to_book",
  "comparing_options",
  "early_research",
] as const;

export type BudgetOption = (typeof BUDGET_OPTIONS)[number];
export type TimelineOption = (typeof TIMELINE_OPTIONS)[number];
export type UrgencyOption = (typeof URGENCY_OPTIONS)[number];
export type ProjectSizeOption = (typeof PROJECT_SIZE_OPTIONS)[number];
export type OwnershipOption = (typeof OWNERSHIP_OPTIONS)[number];
export type DecisionReadinessOption = (typeof DECISION_READINESS_OPTIONS)[number];

export interface LeadScoringInput {
  budget?: BudgetOption | null;
  timeline?: TimelineOption | null;
  urgency?: UrgencyOption | null;
  projectSize?: ProjectSizeOption | null;
  ownership?: OwnershipOption | null;
  decisionReadiness?: DecisionReadinessOption | null;
}

const BUDGET_POINTS: Record<BudgetOption, number> = {
  under_2k: 5,
  "2k_10k": 15,
  "10k_50k": 25,
  "50k_plus": 30,
  unsure: 5,
};

const TIMELINE_POINTS: Record<TimelineOption, number> = {
  immediately: 25,
  "1_3_months": 18,
  "3_6_months": 10,
  "6_plus_months": 4,
  just_browsing: 0,
};

const URGENCY_POINTS: Record<UrgencyOption, number> = {
  high: 15,
  medium: 8,
  low: 2,
};

const PROJECT_SIZE_POINTS: Record<ProjectSizeOption, number> = {
  full_home: 20,
  multi_room: 12,
  single_room: 6,
};

const OWNERSHIP_POINTS: Record<OwnershipOption, number> = {
  OWNER: 10,
  RENTER: 5,
  UNSURE: 2,
};

const DECISION_READINESS_POINTS: Record<DecisionReadinessOption, number> = {
  ready_to_book: 20,
  comparing_options: 10,
  early_research: 3,
};

export interface LeadScoreResult {
  score: number;
  tier: "HOT" | "WARM" | "COLD";
  reason: string;
}

export function computeLeadScore(input: LeadScoringInput): LeadScoreResult {
  const contributions: string[] = [];
  let score = 0;

  if (input.budget) {
    score += BUDGET_POINTS[input.budget];
    contributions.push(`budget=${input.budget}`);
  }
  if (input.timeline) {
    score += TIMELINE_POINTS[input.timeline];
    contributions.push(`timeline=${input.timeline}`);
  }
  if (input.urgency) {
    score += URGENCY_POINTS[input.urgency];
    contributions.push(`urgency=${input.urgency}`);
  }
  if (input.projectSize) {
    score += PROJECT_SIZE_POINTS[input.projectSize];
    contributions.push(`projectSize=${input.projectSize}`);
  }
  if (input.ownership) {
    score += OWNERSHIP_POINTS[input.ownership];
    contributions.push(`ownership=${input.ownership}`);
  }
  if (input.decisionReadiness) {
    score += DECISION_READINESS_POINTS[input.decisionReadiness];
    contributions.push(`decisionReadiness=${input.decisionReadiness}`);
  }

  score = Math.max(0, Math.min(100, score));

  const tier: LeadScoreResult["tier"] = score >= 65 ? "HOT" : score >= 30 ? "WARM" : "COLD";

  return {
    score,
    tier,
    reason: contributions.length > 0 ? contributions.join(", ") : "No qualification signals yet",
  };
}
