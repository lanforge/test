import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_EMAIL_KEY as string);

const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'support@lanforge.co';
const FROM_NAME = process.env.POSTMARK_FROM_NAME || 'LANForge';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const escapeHtml = (unsafe: string): string => {
  return String(unsafe)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
};

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  email: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping: number;
  shippingInsurance: number;
  tax: number;
  discount: number;
  total: number;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

interface OrderStatusUpdateData {
  email: string;
  orderNumber: string;
  customerName: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
}

export const sendOrderStatusUpdate = async (data: OrderStatusUpdateData): Promise<void> => {
  const formattedStatus = data.status.replace(/-/g, ' ').toUpperCase();
  const subject = `Order Status Updated: ${formattedStatus} - LANForge`;
  
  let trackingHtml = '';
  if (data.trackingNumber) {
    trackingHtml = `
      <div style="background-color:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:32px;">
        <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Tracking Information</p>
        <p style="margin:8px 0 0;font-size:20px;font-weight:bold;color:#f8fafc;">${escapeHtml(data.trackingNumber)}</p>
        ${data.carrier ? `<p style="margin:4px 0 0;font-size:14px;color:#cbd5e1;">Carrier: ${escapeHtml(data.carrier)}</p>` : ''}
      </div>
    `;
  }

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: data.email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0f172a;margin:0;padding:40px 20px;">
        <div style="max-width:640px;margin:0 auto;background-color:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg, #064e3b 0%, #10b981 100%);padding:40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:36px;font-weight:800;letter-spacing:-1px;">LANForge</h1>
            <p style="color:#d1fae5;margin:12px 0 0;font-size:18px;font-weight:500;">Order Update</p>
          </div>
          
          <div style="padding:40px;">
            <h2 style="color:#f8fafc;margin:0 0 16px;font-size:24px;">Hi ${escapeHtml(data.customerName)},</h2>
            <p style="color:#94a3b8;margin:0 0 32px;font-size:16px;line-height:1.6;">
              The status of your order <strong>#${escapeHtml(data.orderNumber)}</strong> has been updated.
            </p>
            
            <div style="text-align:center;padding:24px;border:1px solid #10b981;border-radius:12px;background-color:rgba(16, 185, 129, 0.1);margin-bottom:32px;">
              <h3 style="color:#10b981;margin:0;font-size:28px;text-transform:uppercase;letter-spacing:1px;">${formattedStatus}</h3>
            </div>
            
            ${trackingHtml}
            
            <!-- Action Button -->
            <div style="text-align:center;margin-top:48px;">
              <a href="${FRONTEND_URL}/order-status?order=${data.orderNumber}" 
                 style="display:inline-block;background-color:#10b981;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;box-shadow:0 4px 6px -1px rgba(16, 185, 129, 0.4);">
                Track Your Order Live
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color:#0f172a;padding:32px;text-align:center;border-top:1px solid #334155;">
            <p style="margin:0 0 12px;color:#64748b;font-size:13px;">© ${new Date().getFullYear()} LANForge. Built for performance.</p>
            <p style="margin:0;"><a href="${FRONTEND_URL}" style="color:#10b981;text-decoration:none;font-size:13px;font-weight:500;">Visit our website</a></p>
          </div>
          
        </div>
      </body>
      </html>
    `,
    text: `Order Status Update: ${formattedStatus}\n\nHi ${data.customerName},\nYour order #${data.orderNumber} is now: ${formattedStatus}\n\n${data.trackingNumber ? `Tracking: ${data.trackingNumber} (${data.carrier || ''})\n\n` : ''}Track live: ${FRONTEND_URL}/order-status?order=${encodeURIComponent(data.orderNumber)}`,
  });

  if (error) {
    console.error('Resend error sending order status update:', error);
  }
};

export const sendOrderConfirmation = async (data: OrderEmailData): Promise<void> => {
  const itemsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:16px 8px;border-bottom:1px solid #334155;color:#f8fafc;font-size:15px;">
            ${escapeHtml(item.name)}
          </td>
          <td style="padding:16px 8px;border-bottom:1px solid #334155;text-align:center;color:#94a3b8;font-size:15px;">
            ${item.quantity}
          </td>
          <td style="padding:16px 8px;border-bottom:1px solid #334155;text-align:right;color:#f8fafc;font-size:15px;font-weight:600;">
            $${item.price.toFixed(2)}
          </td>
        </tr>
      `
    )
    .join('');

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: data.email,
    subject: `Order Confirmation #${data.orderNumber} - LANForge`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0f172a;margin:0;padding:40px 20px;">
        <div style="max-width:640px;margin:0 auto;background-color:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg, #064e3b 0%, #10b981 100%);padding:40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:36px;font-weight:800;letter-spacing:-1px;">LANForge</h1>
            <p style="color:#d1fae5;margin:12px 0 0;font-size:18px;font-weight:500;">Order Confirmed! 🚀</p>
          </div>
          
          <div style="padding:40px;">
            <h2 style="color:#f8fafc;margin:0 0 16px;font-size:24px;">Hi ${escapeHtml(data.customerName)},</h2>
            <p style="color:#94a3b8;margin:0 0 32px;font-size:16px;line-height:1.6;">
              Thank you for trusting LANForge with your build. We've received your order and our team is already getting everything ready for you.
            </p>
            
            <!-- Order Info Card -->
            <div style="background-color:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:32px;">
              <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Order Number</p>
              <p style="margin:8px 0 0;font-size:28px;font-weight:bold;color:#10b981;">#${escapeHtml(data.orderNumber)}</p>
              <p style="margin:8px 0 0;font-size:14px;color:#cbd5e1;">Placed on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            
            <!-- Items Table -->
            <h3 style="color:#f8fafc;font-size:18px;margin:0 0 16px;border-bottom:2px solid #334155;padding-bottom:12px;">Order Details</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
              <thead>
                <tr>
                  <th style="padding:12px 8px;text-align:left;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #334155;">Item</th>
                  <th style="padding:12px 8px;text-align:center;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #334155;">Qty</th>
                  <th style="padding:12px 8px;text-align:right;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #334155;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <!-- Summary -->
            <table style="margin-top:24px;padding-top:24px;border-top:1px solid #334155;width:300px;margin-left:auto;border-collapse:collapse;">
              <tr>
                <td style="padding-bottom:12px;font-size:15px;color:#94a3b8;text-align:left;">Subtotal</td>
                <td style="padding-bottom:12px;font-size:15px;color:#f8fafc;font-weight:500;text-align:right;">$${data.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;font-size:15px;color:#94a3b8;text-align:left;">Shipping</td>
                <td style="padding-bottom:12px;font-size:15px;color:#f8fafc;font-weight:500;text-align:right;">${data.shipping === 0 ? 'FREE' : '$' + data.shipping.toFixed(2)}</td>
              </tr>
              ${data.shippingInsurance > 0 || data.shippingInsurance === 0 ? `<tr><td style="padding-bottom:12px;font-size:15px;color:#94a3b8;text-align:left;">Shipping Insurance</td><td style="padding-bottom:12px;font-size:15px;color:#f8fafc;font-weight:500;text-align:right;">${data.shippingInsurance === 0 ? 'FREE' : '$' + data.shippingInsurance.toFixed(2)}</td></tr>` : ''}
              ${data.tax > 0 ? `<tr><td style="padding-bottom:12px;font-size:15px;color:#94a3b8;text-align:left;">Tax</td><td style="padding-bottom:12px;font-size:15px;color:#f8fafc;font-weight:500;text-align:right;">$${data.tax.toFixed(2)}</td></tr>` : ''}
              ${data.discount > 0 ? `<tr><td style="padding-bottom:12px;font-size:15px;color:#10b981;text-align:left;">Discount</td><td style="padding-bottom:12px;font-size:15px;color:#10b981;font-weight:500;text-align:right;">-$${data.discount.toFixed(2)}</td></tr>` : ''}
              <tr>
                <td style="padding-top:20px;font-size:22px;font-weight:bold;color:#f8fafc;text-align:left;border-top:1px solid #334155;">Total</td>
                <td style="padding-top:20px;font-size:22px;font-weight:bold;color:#10b981;text-align:right;border-top:1px solid #334155;">$${data.total.toFixed(2)}</td>
              </tr>
            </table>
            
            <!-- Shipping Info -->
            <div style="margin-top:40px;background-color:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;">
              <p style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Shipping Address</p>
              <p style="margin:0;color:#f8fafc;font-size:15px;line-height:1.6;">
                ${escapeHtml(data.shippingAddress.address)}<br/>
                ${escapeHtml(data.shippingAddress.city)}, ${escapeHtml(data.shippingAddress.state)} ${escapeHtml(data.shippingAddress.zip)}<br/>
                ${escapeHtml(data.shippingAddress.country)}
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align:center;margin-top:48px;">
              <a href="${FRONTEND_URL}/order-status?order=${data.orderNumber}" 
                 style="display:inline-block;background-color:#10b981;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;box-shadow:0 4px 6px -1px rgba(16, 185, 129, 0.4);">
                Track Your Order
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color:#0f172a;padding:32px;text-align:center;border-top:1px solid #334155;">
            <p style="margin:0 0 12px;color:#64748b;font-size:13px;">© ${new Date().getFullYear()} LANForge. Built for performance.</p>
            <p style="margin:0;"><a href="${FRONTEND_URL}" style="color:#10b981;text-decoration:none;font-size:13px;font-weight:500;">Visit our website</a></p>
          </div>
          
        </div>
      </body>
      </html>
    `,
    text: `Order Confirmation #${data.orderNumber}\n\nHi ${data.customerName},\nThank you for your order!\n\nTotal: $${data.total.toFixed(2)}\n\nTrack your order: ${FRONTEND_URL}/order-status?order=${encodeURIComponent(data.orderNumber)}`,
  });

  if (error) {
    console.error("Resend sendOrderConfirmation Error:", error);
    throw new Error(error.message);
  }
};

export const sendWelcomeEmail = async (name: string, email: string): Promise<void> => {
  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: `Welcome to LANForge, ${name}! Here's 10% off 🎮`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#10b981;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0">Welcome to LANForge!</h1>
        </div>
        <div style="padding:32px">
          <h2>Hi ${escapeHtml(name)},</h2>
          <p>Welcome to the LANForge family! We build high-performance gaming PCs tailored for players like you.</p>
          <p>As a welcome gift, use code <strong style="color:#10b981;font-size:20px">WELCOME10</strong> for 10% off your first order!</p>
          <div style="text-align:center;margin-top:32px">
            <a href="${FRONTEND_URL}/products" style="background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
              Shop Now
            </a>
          </div>
        </div>
      </div>
    `,
    text: `Welcome to LANForge, ${name}! Use code WELCOME10 for 10% off your first order. Shop at ${FRONTEND_URL}`,
  });
  if (error) throw new Error(error.message);
};

export const sendShippingNotification = async (
  name: string,
  email: string,
  orderNumber: string,
  trackingNumber: string,
  carrier: string
): Promise<void> => {
  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: `Your LANForge order #${orderNumber} has shipped! 📦`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#3b82f6;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0">Your order is on its way!</h1>
        </div>
        <div style="padding:32px">
          <h2>Hi ${escapeHtml(name)},</h2>
          <p>Great news! Your order <strong>#${escapeHtml(orderNumber)}</strong> has been shipped.</p>
          <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:24px 0">
            <p style="margin:0;font-size:14px;color:#6b7280">Tracking Number</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#3b82f6">${escapeHtml(trackingNumber)}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:14px">Carrier: ${escapeHtml(carrier)}</p>
          </div>
          <div style="text-align:center;margin-top:32px">
            <a href="${FRONTEND_URL}/order-status?order=${encodeURIComponent(orderNumber)}" style="background:#3b82f6;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
              Track Order
            </a>
          </div>
        </div>
      </div>
    `,
    text: `Your order #${orderNumber} has shipped! Tracking: ${trackingNumber} via ${carrier}`,
  });
  if (error) throw new Error(error.message);
};

export const sendPasswordReset = async (
  name: string,
  email: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: 'Reset your LANForge password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="padding:32px">
          <h2>Hi ${escapeHtml(name)},</h2>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align:center;margin-top:32px">
            <a href="${resetUrl}" style="background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
              Reset Password
            </a>
          </div>
          <p style="margin-top:24px;color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
        </div>
      </div>
    `,
    text: `Reset your LANForge password: ${resetUrl}\nThis link expires in 1 hour.`,
  });
  if (error) throw new Error(error.message);
};

export const sendCampaignEmail = async (
  to: string[],
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<void> => {
  const messages = to.map((email) => ({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: subject,
    html: htmlBody,
    text: textBody,
  }));

  // Resend max batch size is 100
  for (let i = 0; i < messages.length; i += 100) {
    const { error } = await resend.batch.send(messages.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
};