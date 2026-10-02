import { z } from 'zod';

export const registerIndividualSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  college: z.string().min(2, 'College name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(6, 'Phone must be at least 6 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  paymentTransactionId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
