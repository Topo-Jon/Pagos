export interface LoanDetails {
  amount: number;
  paymentsCount: number;
  biweeklyPayment: number;
  firstPaymentDate: Date;
  annualInterestRate: number;
  paymentsMade?: number;
  knownRemainingBalance?: number;
  preciseBiweeklyRate?: number;
  previousDebt?: number;
  initialPhaseBiweeklyRate?: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'partial';

export interface Payment {
  id: number;
  paymentNumber: number;
  paymentDate: Date;
  amount: number; // The biweekly payment amount
  principal: number;
  interest: number;
  remainingBalance: number;
  status: PaymentStatus;
  amountPaid?: number;
}