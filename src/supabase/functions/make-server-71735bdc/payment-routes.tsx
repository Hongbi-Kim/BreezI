// Payment route handlers for integration with main server
// To be added to index.tsx before Deno.serve(app.fetch);

import { initPayment, confirmPayment, confirmItemPackagePayment } from './payment.tsx';

export function setupPaymentRoutes(app: any, supabase: any) {
  // ==================== PAYMENT (토스페이먼츠) ====================
  
  // Payment initialization
  app.post('/make-server-71735bdc/payment/init', async (c: any) => {
    return await initPayment(c, supabase);
  });

  // Payment confirmation (토스페이먼츠 결제 승인)
  app.post('/make-server-71735bdc/payment/confirm', async (c: any) => {
    return await confirmPayment(c, supabase);
  });

  // Payment confirmation for item package
  app.post('/make-server-71735bdc/payment/confirm-item-package', async (c: any) => {
    return await confirmItemPackagePayment(c, supabase);
  });
}
