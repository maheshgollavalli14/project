import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';

export class PaymentController {
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const teamId = req.user?.teamId;

      // Fetch contest fee
      const contest = await prisma.contest.findFirst({
        where: { status: { in: ['UPCOMING', 'ACTIVE'] } },
      });
      const amount = contest?.registrationFee || 150.0;

      const order = await PaymentService.createPayment({
        userId,
        teamId,
        amount,
      });

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const teamId = req.user?.teamId;
      const { transactionId, orderId, signature } = req.body;

      const payment = await PaymentService.verifyPayment(
        { transactionId, orderId, signature },
        userId,
        teamId
      );

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: { payment },
      });
    } catch (err) {
      next(err);
    }
  }

  static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const payload = JSON.stringify(req.body);

      const result = await PaymentService.handleWebhook(payload, signature);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
