"use client";
import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function TextareaBase({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('border rounded px-3 py-2 w-full', className)} {...props} />;
});

