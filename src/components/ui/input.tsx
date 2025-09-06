"use client";
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function InputBase({ className, ...props }, ref) {
  return <input ref={ref} className={cn('border rounded px-3 py-2 w-full', className)} {...props} />;
});

