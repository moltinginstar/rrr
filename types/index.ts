import { daysOfWeek, frequencies } from "../consts/index.ts";

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Hour = `${"0" | "1"}${Digit}` | `${"2"}${"0" | "1" | "2" | "3"}`;

export type Time = `${Hour}:${"0" | "1" | "2" | "3" | "4" | "5"}${Digit}`;

export type Frequency = (typeof frequencies)[number];

export type DayOfWeek = (typeof daysOfWeek)[number];
