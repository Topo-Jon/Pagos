import React, { useState, useEffect } from 'react';
import type { LoanDetails } from '../types';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { SaveIcon } from './icons/SaveIcon';
import { UploadIcon } from './icons/UploadIcon';


interface LoanFormProps {
  onCalculate: (details: LoanDetails) => void;
  onSave: () => void;
  onLoad: () => void;
  currentValues: LoanDetails | null;
}

export const LoanForm: React.FC<LoanFormProps> = ({ onCalculate, onSave, onLoad, currentValues }) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentsCount, setPaymentsCount] = useState<string>('');
  const [paymentsMade, setPaymentsMade] = useState<string>('');
  const [biweeklyPayment, setBiweeklyPayment] = useState<string>('');
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>('');
  const [annualInterestRate, setAnnualInterestRate] = useState<string>('');
  const [knownRemainingBalance, setKnownRemainingBalance] = useState<string>('');
  const [previousDebt, setPreviousDebt] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Sync local state with currentValues when loaded or recalculated
  useEffect(() => {
    if (currentValues) {
        setAmount(currentValues.amount.toString());
        setPaymentsCount(currentValues.paymentsCount.toString());
        setPaymentsMade(currentValues.paymentsMade ? currentValues.paymentsMade.toString() : '');
        setBiweeklyPayment(currentValues.biweeklyPayment.toString());
        
        if (currentValues.firstPaymentDate) {
            try {
                const d = new Date(currentValues.firstPaymentDate);
                setFirstPaymentDate(d.toISOString().split('T')[0]);
            } catch (e) {
                // Ignore date parse errors
            }
        }

        // If it was a calculated rate from known balance, we might want to show that, 
        // but usually we want to show what the user input. 
        // If knownRemainingBalance exists, we prioritize that.
        if (currentValues.knownRemainingBalance) {
            setKnownRemainingBalance(currentValues.knownRemainingBalance.toString());
            setAnnualInterestRate(''); // Clear rate if using known balance mode
        } else {
            // Round to 2 decimals for display if it's a calculated float
            const rate = Math.round((currentValues.annualInterestRate + Number.EPSILON) * 100) / 100;
            setAnnualInterestRate(rate.toString());
            setKnownRemainingBalance('');
        }

        setPreviousDebt(currentValues.previousDebt ? currentValues.previousDebt.toString() : '');
        setError(''); // Clear any previous errors
    }
  }, [currentValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const parsedPaymentsCount = parseInt(paymentsCount, 10);
    const parsedPaymentsMade = parseInt(paymentsMade, 10) || 0;
    const parsedBiweeklyPayment = parseFloat(biweeklyPayment);
    const parsedAnnualInterestRate = parseFloat(annualInterestRate);
    const parsedKnownRemainingBalance = parseFloat(knownRemainingBalance);
    const parsedPreviousDebt = parseFloat(previousDebt);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('La cantidad del préstamo debe ser un número positivo.');
      return;
    }
    if (isNaN(parsedPaymentsCount) || parsedPaymentsCount <= 0) {
      setError('El número de quincenas debe ser un número positivo.');
      return;
    }
    if (isNaN(parsedPaymentsMade) || parsedPaymentsMade < 0) {
      setError('Las quincenas pagadas deben ser un número positivo o cero.');
      return;
    }
    if (parsedPaymentsMade >= parsedPaymentsCount) {
        setError('Las quincenas pagadas no pueden ser mayor o igual al total de quincenas.');
        return;
    }
    if (isNaN(parsedBiweeklyPayment) || parsedBiweeklyPayment <= 0) {
      setError('El pago quincenal debe ser un número positivo.');
      return;
    }
    if (!knownRemainingBalance && (isNaN(parsedAnnualInterestRate) || parsedAnnualInterestRate <= 0)) {
       setError('Debe proporcionar la Tasa de Interés Anual o un Saldo Restante Conocido.');
       return;
    }
     if (knownRemainingBalance && (isNaN(parsedKnownRemainingBalance) || parsedKnownRemainingBalance <= 0)) {
        setError('El Saldo Restante Conocido debe ser un número positivo.');
        return;
    }

    // Simple check: is the first payment enough to cover first interest?
    if(!knownRemainingBalance) {
        const firstInterest = parsedAmount * ((parsedAnnualInterestRate/100)/24);
        if(parsedBiweeklyPayment <= firstInterest) {
            setError('El pago quincenal es demasiado bajo para cubrir los intereses del préstamo.');
            return;
        }
    }
   
    if (!firstPaymentDate) {
      setError('Por favor, selecciona la fecha del primer pago.');
      return;
    }

    setError('');
    const paymentDate = new Date(firstPaymentDate + 'T00:00:00');

    onCalculate({ 
        amount: parsedAmount, 
        paymentsCount: parsedPaymentsCount,
        paymentsMade: parsedPaymentsMade,
        biweeklyPayment: parsedBiweeklyPayment,
        firstPaymentDate: paymentDate,
        annualInterestRate: parsedAnnualInterestRate || 0,
        knownRemainingBalance: parsedKnownRemainingBalance || undefined,
        previousDebt: parsedPreviousDebt || undefined,
    });
  };

  return (
    <Card>
      <div className="p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 bg-slate-50/50">
        <div>
            <h2 className="text-xl font-bold text-slate-800">Detalles del Préstamo</h2>
            <p className="text-xs text-slate-500 mt-1">Introduce la información para generar el plan.</p>
        </div>
        <div className="flex gap-2 w-full xl:w-auto">
            <Button 
                type="button" 
                onClick={onLoad} 
                className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 focus:ring-indigo-500 flex-1 xl:flex-none" 
                title="Cargar datos guardados"
            >
                <UploadIcon className="h-4 w-4 mr-1.5" />
                Cargar
            </Button>
            <Button 
                type="button" 
                onClick={onSave} 
                className="bg-slate-700 hover:bg-slate-800 focus:ring-slate-500 flex-1 xl:flex-none" 
                title="Guardar cambios actuales"
            >
                <SaveIcon className="h-4 w-4 mr-1.5" />
                Guardar
            </Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
            Cantidad Prestada ($)
          </label>
          <Input
            id="amount"
            type="number"
            placeholder="Ej: 107000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="paymentsCount" className="block text-sm font-medium text-slate-700 mb-1">
            Total de Quincenas
          </label>
          <Input
            id="paymentsCount"
            type="number"
            placeholder="Ej: 48"
            value={paymentsCount}
            onChange={(e) => setPaymentsCount(e.target.value)}
            step="1"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="paymentsMade" className="block text-sm font-medium text-slate-700 mb-1">
            Quincenas Ya Pagadas (Opcional)
          </label>
          <Input
            id="paymentsMade"
            type="number"
            placeholder="Ej: 11"
            value={paymentsMade}
            onChange={(e) => setPaymentsMade(e.target.value)}
            step="1"
            min="0"
          />
        </div>
         <div>
          <label htmlFor="biweeklyPayment" className="block text-sm font-medium text-slate-700 mb-1">
            Pago Quincenal ($)
          </label>
          <Input
            id="biweeklyPayment"
            type="number"
            placeholder="Ej: 3110.72"
            value={biweeklyPayment}
            onChange={(e) => setBiweeklyPayment(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
            <label htmlFor="previousDebt" className="block text-sm font-medium text-slate-700 mb-1">
                Deuda Anterior ($) (Opcional)
            </label>
            <Input
                id="previousDebt"
                type="number"
                placeholder="Ej: 15000"
                value={previousDebt}
                onChange={(e) => setPreviousDebt(e.target.value)}
                step="0.01"
                min="0"
            />
        </div>
        <div>
          <label htmlFor="firstPaymentDate" className="block text-sm font-medium text-slate-700 mb-1">
            Fecha del Primer Pago
          </label>
          <Input
            id="firstPaymentDate"
            type="date"
            value={firstPaymentDate}
            onChange={(e) => setFirstPaymentDate(e.target.value)}
            required
          />
        </div>
        <div className="relative border-t border-slate-200 my-4">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-sm text-slate-500">
                Elige una opción
            </span>
        </div>
        <div>
          <label htmlFor="annualInterestRate" className="block text-sm font-medium text-slate-700 mb-1">
            Tasa de Interés Anual (%)
          </label>
          <Input
            id="annualInterestRate"
            type="number"
            placeholder="Ej: 27.06"
            value={annualInterestRate}
            onChange={(e) => setAnnualInterestRate(e.target.value)}
            step="0.01"
            min="0"
            disabled={!!knownRemainingBalance}
          />
        </div>
         <div>
          <label htmlFor="knownRemainingBalance" className="block text-sm font-medium text-slate-700 mb-1">
            Saldo Restante Conocido ($) (Opcional)
          </label>
          <Input
            id="knownRemainingBalance"
            type="number"
            placeholder="Ej: 90055.88"
            value={knownRemainingBalance}
            onChange={(e) => setKnownRemainingBalance(e.target.value)}
            step="0.01"
            min="0"
          />
           <p className="text-xs text-slate-400 mt-1">Si llenas este campo, calcularemos la tasa de interés por ti.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="pt-2">
           <Button type="submit" className="w-full">
            <CalculatorIcon className="h-5 w-5 mr-2" />
            Calcular Calendario
          </Button>
        </div>
      </form>
    </Card>
  );
};