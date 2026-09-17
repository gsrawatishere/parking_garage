export type BillingRate = {
  firstHourRate: number;
  additionalHourRate: number;
  dailyCap: number;
};

export type Charge = {
  elapsedHours: number;
  amount: number;
};

export function calculateCharge(checkedInAt: Date, checkedOutAt: Date, rate: BillingRate): Charge {
  const elapsedHours = Math.max(1, Math.ceil((checkedOutAt.getTime() - checkedInAt.getTime()) / 3_600_000));
  const rawAmount = rate.firstHourRate + Math.max(0, elapsedHours - 1) * rate.additionalHourRate;
  return { elapsedHours, amount: Math.min(rawAmount, rate.dailyCap) };
}
