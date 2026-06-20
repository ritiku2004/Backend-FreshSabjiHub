const { orderModel } = require('../../models');
const { responseHelper, razorpay } = require('../../utils');
const { notificationService } = require('../../services');
const crypto = require('crypto');

const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      shopId, 
      addressId, 
      totalAmount, 
      items, 
      tipAmount, 
      discountAmount, 
      handlingFee, 
      deliveryFee,
      paymentMethod = 'cod' // 'gpay' | 'phonepe' | 'cod' | 'card' etc.
    } = req.body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return responseHelper.sendError(res, 400, 'Invalid order data');
    }

    const isPrepaid = paymentMethod !== 'cod';

    // 1. Create order in DB (backend calculates correct subtotal, taxes, fees)
    const orderData = await orderModel.createOrder(
      userId, 
      shopId, 
      addressId, 
      totalAmount, 
      items, 
      tipAmount, 
      discountAmount, 
      handlingFee, 
      deliveryFee,
      isPrepaid ? 'prepaid' : 'cod'
    );

    // Log the order placement in payment logs
    await orderModel.recordPaymentLog(orderData.orderId, null, null, 'order_created', { paymentMethod, initialStatus: orderData.status });

    if (isPrepaid) {
      // 2. Generate Razorpay Order
      try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          throw new Error('Razorpay production environment keys are not configured');
        }

        const amountPaise = Math.round(orderData.totalAmount * 100);
        const options = {
          amount: amountPaise,
          currency: 'INR',
          receipt: `receipt_order_${orderData.orderId}`,
        };
        const rzpOrder = await razorpay.orders.create(options);

        // Save the Razorpay Order ID in DB
        await orderModel.updateRazorpayOrderId(orderData.orderId, rzpOrder.id);
        
        // Log the payment registration
        await orderModel.recordPaymentLog(orderData.orderId, rzpOrder.id, null, 'payment_created', rzpOrder);

        return responseHelper.sendSuccess(res, 201, 'Order created, payment pending', {
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          status: orderData.status,
          createdAt: orderData.createdAt,
          paymentRequired: true,
          razorpayOrderId: rzpOrder.id,
          amount: orderData.totalAmount,
          amountPaise: amountPaise,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
      } catch (rzpError) {
        console.error('Razorpay Order Creation Failed:', rzpError);
        // Record payment creation failure in logs
        await orderModel.recordPaymentLog(orderData.orderId, null, null, 'payment_creation_failed', rzpError);
        return responseHelper.sendError(res, 500, 'Failed to generate payment gateway order', rzpError);
      }
    } else {
      // COD Order -> Confirmed and processing immediately
      // Send notifications in background to avoid blocking response
      notificationService.sendOrderStatus(userId, orderData.orderId, 'placed')
        .catch(notifErr => console.error('Failed to send order placed notification to user:', notifErr));
      notificationService.sendAdminOrderArrived(orderData.orderId)
        .catch(notifErr => console.error('Failed to send order arrived notification to admin:', notifErr));

      return responseHelper.sendSuccess(res, 201, 'Order created successfully', {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        createdAt: orderData.createdAt,
        paymentRequired: false
      });
    }
  } catch (error) {
    console.error('Create Order Error:', error);
    try {
      require('fs').appendFileSync('error_log.txt', new Date().toISOString() + ': ' + (error.stack || error) + '\n');
    } catch(e){}
    return responseHelper.sendError(res, 500, 'Failed to create order', error);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return responseHelper.sendError(res, 400, 'All payment fields are required');
    }

    // 1. Verify Razorpay signature
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay production keys are not configured');
    }

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(razorpayOrderId + '|' + razorpayPaymentId);
    const digest = shasum.digest('hex');
    const isSignatureValid = digest === razorpaySignature;

    if (!isSignatureValid) {
      await orderModel.recordPaymentLog(orderId, razorpayOrderId, razorpayPaymentId, 'signature_verification_failed', { receivedSignature: razorpaySignature });
      return responseHelper.sendError(res, 400, 'Payment verification signature mismatch');
    }

    // 2. Lock row & update status
    const result = await orderModel.verifyAndConfirmPayment(orderId, razorpayPaymentId, razorpaySignature);
    
    // Log the success
    await orderModel.recordPaymentLog(orderId, razorpayOrderId, razorpayPaymentId, 'payment_success_verified', { alreadyPaid: result.alreadyPaid });

    // 3. Send notifications if this is the first payment confirmation (non-blocking)
    if (!result.alreadyPaid) {
      notificationService.sendOrderStatus(result.order.user_id, orderId, 'placed')
        .catch(notifErr => console.error('Failed to send order status notification:', notifErr));
      notificationService.sendAdminOrderArrived(orderId)
        .catch(notifErr => console.error('Failed to send admin notification:', notifErr));
    }

    return responseHelper.sendSuccess(res, 200, 'Payment verified and order confirmed successfully', {
      orderId: result.order.id,
      orderNumber: result.order.order_number,
      status: result.order.status,
      paymentStatus: result.order.payment_status
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to verify payment', error);
  }
};

const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder';
    
    // Validate request body
    if (!req.body) {
      return res.status(400).send('Empty body');
    }

    // Since Express might parse body into JSON, we stringify it.
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(bodyStr);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.warn('Webhook signature mismatch');
      return res.status(400).send('Signature verification failed');
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Razorpay Webhook Received Event:', event.event);

    const payload = event.payload;
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;
      const razorpaySignature = req.headers['x-razorpay-signature'] || '';

      if (razorpayOrderId) {
        const order = await orderModel.getOrderByRazorpayOrderId(razorpayOrderId);
        if (order) {
          if (order.payment_status !== 'Paid') {
            const result = await orderModel.verifyAndConfirmPayment(order.id, razorpayPaymentId, razorpaySignature);
            await orderModel.recordPaymentLog(order.id, razorpayOrderId, razorpayPaymentId, 'webhook_payment_confirmed', event);

            if (!result.alreadyPaid) {
              notificationService.sendOrderStatus(order.user_id, order.id, 'placed')
                .catch(e => console.error('Webhook: Failed to send user notification:', e));
              notificationService.sendAdminOrderArrived(order.id)
                .catch(e => console.error('Webhook: Failed to send admin notification:', e));
            }
            console.log(`Order #${order.order_number} confirmed via webhook.`);
          } else {
            console.log(`Order #${order.order_number} already marked as paid. Ignoring duplicate webhook.`);
          }
        } else {
          console.warn(`No order found in database for razorpay_order_id: ${razorpayOrderId}`);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.getOrderById(orderId);
    
    if (!order) {
      return responseHelper.sendError(res, 404, 'Order not found');
    }

    if (order.payment_status === 'Paid') {
      return responseHelper.sendError(res, 400, 'Order has already been paid');
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay production environment keys are not configured');
    }
    
    const amountPaise = Math.round(order.total_amount * 100);
    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_retry_${order.id}`,
    };
    const rzpOrder = await razorpay.orders.create(options);
    
    // Update order with new Razorpay Order ID
    await orderModel.updateRazorpayOrderId(order.id, rzpOrder.id);
    
    // Log payment retry
    await orderModel.recordPaymentLog(order.id, rzpOrder.id, null, 'payment_retry_created', rzpOrder);

    return responseHelper.sendSuccess(res, 200, 'Payment retry order generated', {
      orderId: order.id,
      orderNumber: order.order_number,
      razorpayOrderId: rzpOrder.id,
      amount: order.total_amount,
      amountPaise: amountPaise,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Retry Payment Error:', error);
    try {
      require('fs').appendFileSync('error_log.txt', new Date().toISOString() + ' (Retry): ' + (error.stack || error) + '\n');
    } catch(e){}
    return responseHelper.sendError(res, 500, 'Failed to retry payment', error);
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await orderModel.getOrdersByUserId(userId);
    return responseHelper.sendSuccess(res, 200, 'Orders fetched successfully', orders);
  } catch (error) {
    console.error('Get User Orders Error:', error);
    return responseHelper.sendError(res, 500, 'Failed to fetch orders', error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  retryPayment,
  getUserOrders
};
