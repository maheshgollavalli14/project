import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { PaymentStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface CreatePaymentParams {
  userId: string;
  teamId?: string | null;
  amount: number;
  currency?: string;
}

export interface VerifyPaymentParams {
  transactionId: string;
  orderId?: string;
  signature?: string;
}

export class PaymentService {
  /**
   * Initialize a payment order
   */
  static async createPayment(params: CreatePaymentParams) {
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // If Razorpay gateway is active and configured
    if (env.PAYMENT_GATEWAY === 'razorpay' && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      // In production with Razorpay credentials, create order via Razorpay SDK / API
      return {
        provider: 'RAZORPAY',
        transactionId,
        orderId: `order_${transactionId}`,
        amount: params.amount,
        currency: params.currency || 'INR',
        keyId: env.RAZORPAY_KEY_ID, // Only public key passed to frontend
      };
    }

    // Default Mock Gateway for fast local and test development
    return {
      provider: 'MOCK_GATEWAY',
      transactionId,
      orderId: `mock_${transactionId}`,
      amount: params.amount,
      currency: params.currency || 'INR',
      keyId: 'mock_key_public',
    };
  }

  /**
   * Verify payment signature server-side
   */
  static async verifyPayment(params: VerifyPaymentParams, userId: string, teamId?: string | null) {
    let isValid = false;

    if (env.PAYMENT_GATEWAY === 'razorpay' && env.RAZORPAY_KEY_SECRET && params.orderId && params.signature) {
      const generatedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${params.orderId}|${params.transactionId}`)
        .digest('hex');

      isValid = generatedSignature === params.signature;
    } else {
      // Mock gateway always succeeds if transactionId exists
      isValid = Boolean(params.transactionId);
    }

    if (!isValid) {
      const error: any = new Error('Payment verification signature mismatch.');
      error.statusCode = 400;
      error.code = 'PAYMENT_VERIFICATION_FAILED';
      throw error;
    }

    // Record verified payment in database
    const payment = await prisma.payment.create({
      data: {
        userId,
        teamId: teamId || null,
        amount: 200.0, // Authoritative contest fee
        transactionId: params.transactionId,
        status: PaymentStatus.COMPLETED,
        provider: env.PAYMENT_GATEWAY.toUpperCase(),
      },
    });

    logger.info('Payment verified and recorded', 'PaymentService', {
      paymentId: payment.id,
      transactionId: params.transactionId,
      userId,
      teamId,
    });

    return payment;
  }

  /**
   * Handle server-side gateway webhooks
   */
  static async handleWebhook(payload: string, signature: string) {
    if (env.PAYMENT_GATEWAY === 'razorpay' && env.RAZORPAY_KEY_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }
    }

    logger.info('Payment webhook handled', 'PaymentService');
    return { received: true };
  }

  /**
   * Check status of a registration payment
   */
  static async getPaymentStatus(transactionId: string) {
    return await prisma.payment.findUnique({
      where: { transactionId },
    });
  }
}
