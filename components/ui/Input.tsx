
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = (props) => {
  return (
    <input
      {...props}
      className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none"
    />
  );
};
