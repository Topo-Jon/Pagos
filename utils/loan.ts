import type { Payment, LoanDetails } from './types';

// Helper function to round to 2 decimal places, mimicking financial calculations.
const roundCents = (num: number): number => Math.round(num * 100) / 100;

const getEOMPayDay = (date: Date): number => {
  // February is month 1 (0-indexed)
  return date.getMonth() === 1 ? 28 : 30;
};

const generatePaymentDates = (count: number, firstPaymentDate: Date): Date[] => {
  const dates: Date[] = [];
  if (count <= 0) return dates;

  let cursor = new Date(firstPaymentDate);
  dates.push(new Date(cursor));

  while (dates.length < count) {
    const lastDate = dates[dates.length - 1];
    let nextDate = new Date(lastDate);

    if (lastDate.getDate() <= 15) {
      const eomPayDay = getEOMPayDay(nextDate);
      nextDate.setDate(eomPayDay);
    } else {
      nextDate.setDate(15);
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    dates.push(nextDate);
  }

  return dates;
};

// This function simulates the loan amortization and is used by both the rate solver and the schedule generator.
const simulateLoanBalance = (
  principal: number,
  biweeklyRate: number,
  biweeklyPayment: number,
  periods: number
): number => {
  let balance = principal;
  for (let i = 0; i < periods; i++) {
    const interest = roundCents(balance * biweeklyRate);
    if (biweeklyPayment <= interest) {
      return Infinity; // Payment doesn't cover interest, loan will never be paid off.
    }
    const principalPaid = roundCents(biweeklyPayment - interest);
    balance = roundCents(balance - principalPaid);
     if (balance < 0) return balance;
  }
  return balance;
};

export const calculateAmortizationRate = (params: {
    amount: number;
    biweeklyPayment: number;
    paymentsCount: number;
    targetBalance?: number;
}): { annualRate: number; biweeklyRate: number } => {
    const { amount, biweeklyPayment, paymentsCount, targetBalance = 0 } = params;
    
    if (paymentsCount <= 0) return { annualRate: 0, biweeklyRate: 0 };

    let lowRate = 0;
    let highRate = 0.05; // 5% bi-weekly (~130% APR), a safe upper bound.
    let midRate = 0;

    for (let i = 0; i < 100; i++) { // 100 iterations for high precision
        midRate = (lowRate + highRate) / 2;
        const finalBalance = simulateLoanBalance(amount, midRate, biweeklyPayment, paymentsCount);
        
        if (Math.abs(finalBalance - targetBalance) < 0.01) {
            break;
        }

        // If we still owe money (more than target), the interest rate was too high. We need to try a lower rate.
        if (finalBalance > targetBalance) {
            highRate = midRate;
        } else { // If we overpaid (less than target), the interest rate was too low. We need to try a higher rate.
            lowRate = midRate;
        }
    }
    
    const finalRate = midRate;
    const annualRate = finalRate * 24 * 100;
    return { annualRate, biweeklyRate: finalRate };
};


export const generatePaymentSchedule = (details: LoanDetails): Payment[] => {
  const { amount, paymentsCount, biweeklyPayment, firstPaymentDate, annualInterestRate, paymentsMade, knownRemainingBalance, preciseBiweeklyRate } = details;

  if (amount <= 0 || paymentsCount <= 0 || biweeklyPayment <= 0 || annualInterestRate < 0) return [];
  
  const biweeklyRate = preciseBiweeklyRate ?? (annualInterestRate / 100) / 24;
  const paymentDates = generatePaymentDates(paymentsCount, firstPaymentDate);
  let remainingBalance = amount;
  
  const schedule: Payment[] = [];

  for (let i = 0; i < paymentsCount; i++) {
    if (remainingBalance < 0.01 && i > 0) {
        break;
    }

    const interest = roundCents(remainingBalance * biweeklyRate);
    let paymentAmount = biweeklyPayment;
    let principal: number;
    
    let currentRemainingBalance = remainingBalance;

    // Check if this payment will clear the balance or if it's the last scheduled payment
    if (i === paymentsCount - 1 || roundCents(currentRemainingBalance + interest) <= biweeklyPayment) {
        paymentAmount = roundCents(currentRemainingBalance + interest);
        principal = currentRemainingBalance;
        currentRemainingBalance = 0;
    } else {
        principal = roundCents(biweeklyPayment - interest);
        if (principal < 0) {
            principal = 0; // Safeguard
        }
        currentRemainingBalance = roundCents(currentRemainingBalance - principal);
    }
    
    // If this is the last "paid" payment and a known balance was provided,
    // override the calculated balance with the known value.
    if (i + 1 === paymentsMade && knownRemainingBalance) {
        currentRemainingBalance = knownRemainingBalance;
    }

    const isInitiallyPaid = i < (paymentsMade || 0);

    schedule.push({
      id: i + 1,
      paymentNumber: i + 1,
      paymentDate: paymentDates[i],
      amount: paymentAmount,
      principal: principal,
      interest: interest,
      remainingBalance: currentRemainingBalance,
      status: isInitiallyPaid ? 'paid' : 'pending',
      amountPaid: isInitiallyPaid ? paymentAmount : undefined,
    });

    // The next iteration starts with the (potentially overridden) correct balance.
    remainingBalance = currentRemainingBalance;
  }

  return schedule;
};