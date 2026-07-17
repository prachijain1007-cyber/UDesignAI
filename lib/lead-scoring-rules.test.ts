import { describe, expect, it } from "vitest";
import { computeLeadScore } from "./lead-scoring-rules";

describe("computeLeadScore", () => {
  it("returns 0/COLD with no qualification signals", () => {
    const result = computeLeadScore({});
    expect(result.score).toBe(0);
    expect(result.tier).toBe("COLD");
    expect(result.reason).toBe("No qualification signals yet");
  });

  it("sums points across all provided fields", () => {
    const result = computeLeadScore({
      budget: "2k_10k", // 15
      timeline: "1_3_months", // 18
      urgency: "medium", // 8
    });
    expect(result.score).toBe(41);
    expect(result.tier).toBe("WARM");
    expect(result.reason).toBe("budget=2k_10k, timeline=1_3_months, urgency=medium");
  });

  it("clamps the score at 100 even when raw points exceed it", () => {
    const result = computeLeadScore({
      budget: "50k_plus", // 30
      timeline: "immediately", // 25
      urgency: "high", // 15
      projectSize: "full_home", // 20
      ownership: "OWNER", // 10
      decisionReadiness: "ready_to_book", // 20
    });
    // raw total is 120, must clamp to 100
    expect(result.score).toBe(100);
    expect(result.tier).toBe("HOT");
  });

  it("classifies the HOT/WARM boundary at 65 inclusive", () => {
    const hot = computeLeadScore({ budget: "50k_plus", timeline: "immediately" }); // 55
    expect(hot.tier).toBe("WARM");

    const stillHot = computeLeadScore({
      budget: "50k_plus", // 30
      timeline: "immediately", // 25
      urgency: "medium", // 8, total 63 -> still WARM
    });
    expect(stillHot.score).toBe(63);
    expect(stillHot.tier).toBe("WARM");

    const exactlyHot = computeLeadScore({
      budget: "50k_plus", // 30
      timeline: "immediately", // 25
      urgency: "high", // 15, total 70 -> HOT
    });
    expect(exactlyHot.score).toBe(70);
    expect(exactlyHot.tier).toBe("HOT");
  });

  it("classifies the WARM/COLD boundary at 30 inclusive", () => {
    const cold = computeLeadScore({ budget: "under_2k", urgency: "low" }); // 5 + 2 = 7
    expect(cold.tier).toBe("COLD");

    const warm = computeLeadScore({ budget: "10k_50k" }); // exactly 25 -> still COLD
    expect(warm.score).toBe(25);
    expect(warm.tier).toBe("COLD");

    const justWarm = computeLeadScore({ budget: "10k_50k", urgency: "low" }); // 25 + 2 = 27 -> COLD
    expect(justWarm.score).toBe(27);
    expect(justWarm.tier).toBe("COLD");

    const nowWarm = computeLeadScore({ budget: "10k_50k", urgency: "medium" }); // 25 + 8 = 33 -> WARM
    expect(nowWarm.score).toBe(33);
    expect(nowWarm.tier).toBe("WARM");
  });

  it("ignores null/undefined fields without throwing", () => {
    const result = computeLeadScore({
      budget: null,
      timeline: undefined,
      urgency: "high",
    });
    expect(result.score).toBe(15);
    expect(result.reason).toBe("urgency=high");
  });
});
