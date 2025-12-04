import React, { useState, useMemo, useEffect } from 'react';
import { LoanForm } from './components/LoanForm';
import { PaymentSchedule } from './components/PaymentSchedule';
import { SummaryCards } from './components/SummaryCards';
import { ExportButton } from './components/ExportButton';
import { generatePaymentSchedule, calculateAmortizationRate } from './utils/loan';
import type { LoanDetails, Payment } from './types';

const App: React.FC = () => {
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleCalculate = (details: LoanDetails) => {
    let finalDetails: LoanDetails = { ...details };

    // Logic to calculate interest rate based on known remaining balance
    if (details.knownRemainingBalance && details.paymentsMade && details.paymentsMade > 0) {
      
      // 1. Calculate rate for the PAST (Initial loan -> Known Balance)
      const { annualRate: initialAnnual, biweeklyRate: initialBiweekly } = calculateAmortizationRate({
        amount: details.amount,
        biweeklyPayment: details.biweeklyPayment,
        paymentsCount: details.paymentsMade, // Time elapsed
        targetBalance: details.knownRemainingBalance // Where we ended up
      });

      // 2. Calculate rate for the FUTURE (Known Balance -> 0)
      const remainingPayments = details.paymentsCount - details.paymentsMade;
      const { annualRate: futureAnnual, biweeklyRate: futureBiweekly } = calculateAmortizationRate({
        amount: details.knownRemainingBalance,
        biweeklyPayment: details.biweeklyPayment,
        paymentsCount: remainingPayments,
        // targetBalance default is 0
      });

      // We store the future rate as the main one for display, but store specific rates for calculation
      finalDetails.annualInterestRate = futureAnnual; 
      finalDetails.preciseBiweeklyRate = futureBiweekly;
      finalDetails.initialPhaseBiweeklyRate = initialBiweekly;

    } 
    else if (!details.annualInterestRate) {
      const { annualRate, biweeklyRate } = calculateAmortizationRate({
        amount: details.amount,
        biweeklyPayment: details.biweeklyPayment,
        paymentsCount: details.paymentsCount,
      });
      finalDetails.annualInterestRate = annualRate;
      finalDetails.preciseBiweeklyRate = biweeklyRate;
    }

    setLoanDetails(finalDetails);
    const schedule = generatePaymentSchedule(finalDetails);
    setPayments(schedule);
  };

  const handleAmountPaidChange = (paymentId: number, amountStr: string) => {
    const paidAmount = parseFloat(amountStr);

    setPayments(prevPayments =>
      prevPayments.map(p => {
        if (p.id === paymentId) {
          const newAmountPaid = isNaN(paidAmount) || paidAmount < 0 ? undefined : paidAmount;
          let newStatus: Payment['status'] = 'pending';
          if (newAmountPaid !== undefined) {
            // Use a small epsilon for float comparison to treat practically equal numbers as paid
            if (newAmountPaid >= p.amount - 0.01) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0) {
              newStatus = 'partial';
            }
          }
          return { ...p, amountPaid: newAmountPaid, status: newStatus };
        }
        return p;
      })
    );
  };

  const handlePaymentToggle = (paymentId: number) => {
    setPayments(prevPayments =>
      prevPayments.map(p => {
        if (p.id === paymentId) {
          // If it's currently paid, we toggle to pending. 
          // If it's partial or pending, we toggle to paid (full amount).
          const isCurrentlyPaid = p.status === 'paid';
          
          const newStatus = isCurrentlyPaid ? 'pending' : 'paid';
          const newAmountPaid = isCurrentlyPaid ? undefined : p.amount;
          
          return { ...p, status: newStatus, amountPaid: newAmountPaid };
        }
        return p;
      })
    );
  };

  const handleSave = () => {
    if (!loanDetails || payments.length === 0) {
        setNotification({ msg: 'No hay datos calculados para guardar', type: 'error' });
        return;
    }
    try {
        const dataToSave = {
            loanDetails,
            payments,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('loanControlData', JSON.stringify(dataToSave));
        setNotification({ msg: 'Datos guardados correctamente', type: 'success' });
    } catch (error) {
        setNotification({ msg: 'Error al guardar los datos', type: 'error' });
    }
  };

  const handleLoad = () => {
      try {
          const savedDataStr = localStorage.getItem('loanControlData');
          if (!savedDataStr) {
              setNotification({ msg: 'No se encontraron datos guardados', type: 'error' });
              return;
          }

          const parsedData = JSON.parse(savedDataStr);

          // Restore Date objects for LoanDetails
          const restoredLoanDetails: LoanDetails = {
              ...parsedData.loanDetails,
              firstPaymentDate: new Date(parsedData.loanDetails.firstPaymentDate)
          };

          // Restore Date objects for Payments
          const restoredPayments: Payment[] = parsedData.payments.map((p: any) => ({
              ...p,
              paymentDate: new Date(p.paymentDate)
          }));

          setLoanDetails(restoredLoanDetails);
          setPayments(restoredPayments);
          setNotification({ msg: 'Datos cargados correctamente', type: 'success' });

      } catch (error) {
          console.error(error);
          setNotification({ msg: 'Error al cargar los datos. Formato inválido.', type: 'error' });
      }
  };

  const summary = useMemo(() => {
    if (!loanDetails) {
      return { totalLoan: 0, totalPaid: 0, remainingBalance: 0, paidCount: 0, totalInterest: 0, shortfall: 0, previousDebt: 0 };
    }
    
    const totalPaid = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
    const paidCount = payments.filter(p => p.status === 'paid').length; 
    const totalInterest = payments.reduce((acc, p) => acc + p.interest, 0);

    // Use the specific rate for each phase if available, otherwise default to standard rate
    const standardRate = loanDetails.preciseBiweeklyRate ?? (loanDetails.annualInterestRate / 100) / 24;
    const initialRate = loanDetails.initialPhaseBiweeklyRate ?? standardRate;
    
    // ALWAYS start calculation from the initial amount to ensure toggling past payments 
    // correctly updates the current running balance.
    let dynamicBalance = loanDetails.amount;
    
    // The cut-off point where the interest rate might change (if using Known Balance feature)
    const pivotIndex = (loanDetails.paymentsMade || 0) - 1;

    const lastPaymentIndex = payments.map(p => p.status !== 'pending').lastIndexOf(true);
    
    // Iterate from the beginning up to the last active payment found
    if (lastPaymentIndex >= 0) {
        for (let i = 0; i <= lastPaymentIndex; i++) {
            const p = payments[i];
            
            // Use initial rate before the pivot, standard rate after
            const currentRate = (i <= pivotIndex) ? initialRate : standardRate;

            const interest = dynamicBalance * currentRate;
            const paymentAmount = p.amountPaid ?? 0;
            
            // Basic amortization logic: Add interest, subtract payment
            dynamicBalance = dynamicBalance + interest - paymentAmount;
        }
    } 
    // If no payments are marked (lastPaymentIndex is -1), dynamicBalance remains loanDetails.amount

    const cumulativeShortfall = payments
      .slice(0, lastPaymentIndex + 1)
      .reduce((acc, p) => {
        const expectedPayment = p.amount;
        const actualPayment = p.amountPaid || 0;
        return acc + (expectedPayment - actualPayment);
      }, 0);

    return {
      totalLoan: loanDetails.amount,
      totalPaid,
      remainingBalance: dynamicBalance < 0.01 ? 0 : dynamicBalance,
      paidCount,
      totalInterest: totalInterest > 0 ? totalInterest : 0,
      shortfall: cumulativeShortfall > 0 ? cumulativeShortfall : 0,
      previousDebt: loanDetails.previousDebt || 0,
    };
  }, [loanDetails, payments]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
        {notification && (
            <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-500 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {notification.msg}
            </div>
        )}

      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">Control de Préstamos</h1>
          <p className="text-slate-500 mt-1">Calcula y gestiona tu calendario de pagos quincenales.</p>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <LoanForm 
            onCalculate={handleCalculate} 
            onSave={handleSave}
            onLoad={handleLoad}
            currentValues={loanDetails}
          />
        </div>
        
        <div className="lg:col-span-2">
          {loanDetails ? (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Resumen del Préstamo</h2>
                    <div className="flex flex-wrap gap-2">
                        <ExportButton 
                            loanDetails={loanDetails} 
                            payments={payments} 
                            summary={summary} 
                        />
                    </div>
                </div>
              <SummaryCards summary={summary} totalPayments={loanDetails.paymentsCount} />
              <PaymentSchedule 
                payments={payments} 
                onAmountPaidChange={handleAmountPaidChange}
                onPaymentToggle={handlePaymentToggle}
              />
            </div>
          ) : (
             <div className="flex flex-col h-full space-y-6">
                <div className="bg-white rounded-xl shadow-md p-8 text-center flex-grow flex flex-col justify-center">
                    <img src="https://storage.googleapis.com/aistudio-hosting/generative-ai/18210333/2024-05-21T02:00:15.341Z/undraw_personal_finance_re_1k6k.svg" alt="Ilustración de finanzas" className="mx-auto rounded-lg mb-6 w-1/2"/>
                    <h2 className="text-2xl font-semibold text-slate-700">Comienza a planificar tu préstamo</h2>
                    <p className="text-slate-500 mt-2">Ingresa los detalles o carga un préstamo guardado para visualizar tu calendario.</p>
                </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;