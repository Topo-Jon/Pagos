import React from 'react';
import type { Payment } from '../types';
import { Card } from './ui/Card';
import { Input } from './ui/Input';


interface PaymentScheduleProps {
  payments: Payment[];
  onAmountPaidChange: (paymentId: number, amount: string) => void;
  onPaymentToggle: (paymentId: number) => void;
}

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const statusConfig = {
    paid: { text: 'Pagado', className: 'bg-green-100 text-green-800', rowClassName: 'bg-green-50' },
    partial: { text: 'Parcial', className: 'bg-amber-100 text-amber-800', rowClassName: 'bg-amber-50' },
    pending: { text: 'Pendiente', className: 'bg-slate-100 text-slate-600', rowClassName: 'bg-white' },
};


const PaymentRow: React.FC<{ payment: Payment, onAmountPaidChange: (id: number, amount: string) => void, onPaymentToggle: (id: number) => void }> = ({ payment, onAmountPaidChange, onPaymentToggle }) => {
  const config = statusConfig[payment.status];
  
  // Check is active if Paid OR Partial
  const isChecked = payment.status === 'paid' || payment.status === 'partial';
  
  // Determines the checkbox accent color: Yellow/Amber for partial, Indigo (Default) for Paid
  // Tailwind needs 'accent-color' utility.
  const checkboxColorClass = payment.status === 'partial' 
    ? 'accent-amber-500 focus:ring-amber-500' 
    : 'accent-indigo-600 focus:ring-indigo-500';

  return (
    <tr className={`border-b border-slate-200 ${config.rowClassName} hover:bg-slate-50 transition-colors`}>
      <td className="p-4 text-center font-medium">{payment.paymentNumber}</td>
      <td className="p-4 whitespace-nowrap text-slate-600">{dateFormatter.format(payment.paymentDate)}</td>
      <td className="p-4 text-right whitespace-nowrap font-medium text-slate-700">{currencyFormatter.format(payment.amount)}</td>
      <td className="p-4 text-right text-red-500 whitespace-nowrap text-xs sm:text-sm">{currencyFormatter.format(payment.interest)}</td>
      <td className="p-4 text-right text-green-600 whitespace-nowrap text-xs sm:text-sm">{currencyFormatter.format(payment.principal)}</td>
      <td className="p-4 text-right font-medium text-slate-800 whitespace-nowrap">{currencyFormatter.format(payment.remainingBalance)}</td>
      <td className="p-4 text-center">
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.className}`}>
          {config.text}
        </span>
      </td>
       <td className="p-4 text-center">
        <input 
          type="checkbox"
          className={`h-5 w-5 rounded border-gray-300 cursor-pointer ${checkboxColorClass}`}
          checked={isChecked}
          onChange={() => onPaymentToggle(payment.id)}
          aria-label={`Marcar pago #${payment.paymentNumber} como completado`}
        />
      </td>
      <td className="p-2 text-center" style={{minWidth: '120px'}}>
        <Input 
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className={`text-right ${payment.status === 'partial' ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`}
            value={payment.amountPaid ?? ''}
            onChange={(e) => onAmountPaidChange(payment.id, e.target.value)}
            aria-label={`Abono para el pago #${payment.paymentNumber}`}
        />
      </td>
    </tr>
  );
};

export const PaymentSchedule: React.FC<PaymentScheduleProps> = ({ payments, onAmountPaidChange, onPaymentToggle }) => {
  if (payments.length === 0) {
    return null;
  }

  return (
    <Card>
        <div className="p-6 bg-white border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Calendario de Pagos</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                <tr>
                    <th scope="col" className="p-4 text-center">#</th>
                    <th scope="col" className="p-4">Fecha</th>
                    <th scope="col" className="p-4 text-right">Monto Quincenal</th>
                    <th scope="col" className="p-4 text-right">Interés</th>
                    <th scope="col" className="p-4 text-right">Capital</th>
                    <th scope="col" className="p-4 text-right">Saldo Ideal</th>
                    <th scope="col" className="p-4 text-center">Estado</th>
                    <th scope="col" className="p-4 text-center">Pagado</th>
                    <th scope="col" className="p-4 text-center">Abono ($)</th>
                </tr>
                </thead>
                <tbody>
                {payments.map(payment => (
                    <PaymentRow key={payment.id} payment={payment} onAmountPaidChange={onAmountPaidChange} onPaymentToggle={onPaymentToggle} />
                ))}
                </tbody>
            </table>
        </div>
    </Card>
  );
};