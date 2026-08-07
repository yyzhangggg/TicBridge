import { describe, expect, test } from "@jest/globals";
import {
  PLATFORMS,
  WEEKDAYS,
  buildEntry,
  buildWeekEntries,
  defaultDayConfig,
  mergeWeekConfig,
  resolveWeeklyGoal
} from "../lib/schedule.js";

describe("schedule", () => {
  test("uses the platform weekly goal unless storage supplies one", () => {
    expect(resolveWeeklyGoal("tiktok", null)).toBe(PLATFORMS.tiktok.weeklyGoal);
    expect(resolveWeeklyGoal("tiktok", 4)).toBe(4);
  });

  test("merges partial saved settings with every weekday default", () => {
    const config = mergeWeekConfig("tiktok", {
      1: { active: true, time: "09:00", title: "Monday post" }
    });

    expect(Object.keys(config)).toHaveLength(WEEKDAYS.length);
    expect(config[1]).toEqual({ ...defaultDayConfig("tiktok", 1), active: true, time: "09:00", title: "Monday post" });
    expect(config[2]).toEqual(defaultDayConfig("tiktok", 2));
  });

  test("does not create an entry for inactive days and preserves user content for active ones", () => {
    expect(buildEntry("rednote", 2, { active: false, time: "18:00" })).toBeNull();

    expect(buildEntry("rednote", 2, {
      active: true,
      time: "20:00",
      title: "My title",
      description: "My description",
      tags: ["tag-a"]
    })).toEqual({
      platformId: "rednote",
      weekday: 2,
      time: "20:00",
      contentType: "",
      title: "My title",
      description: "My description",
      tags: ["tag-a"]
    });
  });

  test("builds Monday-through-Sunday rows with entries only for active days", () => {
    const config = mergeWeekConfig("bilibili", { 1: { active: true, time: "12:00" } });
    const rows = buildWeekEntries("bilibili", config);

    expect(rows.map((row) => row.key)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(rows[0].entry).toMatchObject({ weekday: 1, time: "12:00" });
    expect(rows.slice(1).every((row) => row.entry === null)).toBe(true);
  });
});
