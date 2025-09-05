"use client";
import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'destructive';
};

export function Button({ className, variant = 'default', ...props }: Props) {
  const styles = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return <button className={cn('rounded px-4 py-2 disabled:opacity-60', styles, className)} {...props} />;
}

