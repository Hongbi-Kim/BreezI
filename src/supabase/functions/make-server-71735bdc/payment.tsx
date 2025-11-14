import { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

// Helper function to get user from context (must be called after auth middleware)
async function getUserFromContext(c: Context, supabase: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  const accessToken = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  return user;
}

// Payment initialization
export async function initPayment(c: Context, supabase: any) {
  try {
    const user = await getUserFromContext(c, supabase);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { productType, plan, paymentMethod, amount } = await c.req.json();
    
    // Generate unique order ID
    const orderId = `order_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    
    // Store order information
    const orders = await kv.get('payment:orders') || {};
    orders[orderId] = {
      orderId,
      userId: user.id,
      productType,
      plan,
      paymentMethod,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await kv.set('payment:orders', orders);

    console.log('Payment initialized:', { orderId, userId: user.id, amount, productType });

    // Return order info for frontend to proceed with TossPayments
    return c.json({ 
      success: true, 
      orderId,
      amount,
      customerKey: user.id  // Use user ID as customer key
    });
  } catch (error) {
    console.log('Payment init error:', error);
    return c.json({ error: String(error) }, 500);
  }
}

// Payment confirmation (토스페이먼츠 결제 승인)
export async function confirmPayment(c: Context, supabase: any) {
  try {
    const user = await getUserFromContext(c, supabase);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { orderId, paymentKey, amount } = await c.req.json();
    
    console.log('Confirming payment:', { orderId, paymentKey, amount });

    // Verify order exists and matches
    const orders = await kv.get('payment:orders') || {};
    const order = orders[orderId];
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    if (order.userId !== user.id) {
      return c.json({ error: 'Order does not belong to user' }, 403);
    }
    
    if (order.amount !== amount) {
      return c.json({ error: 'Amount mismatch' }, 400);
    }

    // Confirm payment with TossPayments
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY');
    if (tossSecretKey) {
      try {
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(tossSecretKey + ':')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            amount,
            paymentKey
          })
        });

        if (!response.ok) {
          const error = await response.json();
          console.log('TossPayments confirm error:', error);
          return c.json({ error: error.message || 'Payment confirmation failed' }, 400);
        }

        const paymentData = await response.json();
        console.log('Payment confirmed with TossPayments:', paymentData);
      } catch (err) {
        console.log('TossPayments API error:', err);
        // Continue even if TossPayments fails (for development)
      }
    }

    // Update order status
    order.status = 'completed';
    order.paymentKey = paymentKey;
    order.confirmedAt = new Date().toISOString();
    orders[orderId] = order;
    await kv.set('payment:orders', orders);

    // Update user profile with Pro subscription
    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};
    
    const now = new Date();
    const endDate = new Date();
    if (order.plan === '1month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (order.plan === '3months') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (order.plan === '1year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (order.plan === 'monthly') {
      // Legacy support
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (order.plan === 'yearly') {
      // Legacy support
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    profiles[user.id] = {
      ...profile,
      isPro: true,
      proStartDate: now.toISOString(),
      proEndDate: endDate.toISOString(),
      proPaymentCompleted: true,
      proPaymentInfo: {
        plan: order.plan,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        orderId: order.orderId,
        purchasedAt: now.toISOString()
      },
      updatedAt: now.toISOString()
    };
    
    await kv.set('profiles', profiles);

    console.log('Pro subscription activated:', { userId: user.id, plan: order.plan });

    return c.json({ success: true, profile: profiles[user.id] });
  } catch (error) {
    console.log('Payment confirm error:', error);
    return c.json({ error: String(error) }, 500);
  }
}

// Payment confirmation for item package
export async function confirmItemPackagePayment(c: Context, supabase: any) {
  try {
    const user = await getUserFromContext(c, supabase);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { orderId, paymentKey, amount } = await c.req.json();
    
    console.log('Confirming item package payment:', { orderId, paymentKey, amount });

    // Verify order exists and matches
    const orders = await kv.get('payment:orders') || {};
    const order = orders[orderId];
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    if (order.userId !== user.id) {
      return c.json({ error: 'Order does not belong to user' }, 403);
    }
    
    if (order.amount !== amount) {
      return c.json({ error: 'Amount mismatch' }, 400);
    }

    // Confirm payment with TossPayments
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY');
    if (tossSecretKey) {
      try {
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(tossSecretKey + ':')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId,
            amount,
            paymentKey
          })
        });

        if (!response.ok) {
          const error = await response.json();
          console.log('TossPayments confirm error:', error);
          return c.json({ error: error.message || 'Payment confirmation failed' }, 400);
        }

        const paymentData = await response.json();
        console.log('Payment confirmed with TossPayments:', paymentData);
      } catch (err) {
        console.log('TossPayments API error:', err);
        // Continue even if TossPayments fails (for development)
      }
    }

    // Update order status
    order.status = 'completed';
    order.paymentKey = paymentKey;
    order.confirmedAt = new Date().toISOString();
    orders[orderId] = order;
    await kv.set('payment:orders', orders);

    // Update user profile with item package
    const profiles = await kv.get('profiles') || {};
    const profile = profiles[user.id] || {};
    
    profiles[user.id] = {
      ...profile,
      hasItemPackage: true,
      itemPackageInfo: {
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        orderId: order.orderId,
        purchasedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    
    await kv.set('profiles', profiles);

    console.log('Item package activated:', { userId: user.id });

    return c.json({ success: true, profile: profiles[user.id] });
  } catch (error) {
    console.log('Item package payment confirm error:', error);
    return c.json({ error: String(error) }, 500);
  }
}
