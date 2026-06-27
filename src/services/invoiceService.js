const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const generateInvoicePDF = async (order) => {
  // Read logo and convert to base64 for embedding
  const logoPath = path.join(__dirname, '../assets/logo.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    const logoData = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
  }

  // Parse delivery address if it's a string
  let address = order.delivery_address || '{}';
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address);
    } catch (e) {
      address = {};
    }
  }

  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate totals
  const subtotal = parseFloat(order.total_amount) - parseFloat(order.delivery_fee || 0) - parseFloat(order.handling_fee || 0) + parseFloat(order.global_discount_amount || 0);

  // HTML Template
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${order.order_number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --primary: #2e7d32;
        --primary-light: #e8f5e9;
        --text-main: #1f2937;
        --text-muted: #6b7280;
        --border-color: #e5e7eb;
        --bg-subtle: #f9fafb;
      }
      body {
        font-family: 'Inter', sans-serif;
        color: var(--text-main);
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        -webkit-font-smoothing: antialiased;
      }
      .invoice-container {
        padding: 40px 50px;
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
        border-bottom: 2px solid var(--primary-light);
        padding-bottom: 20px;
      }
      .logo-section {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      .logo-section img {
        width: 60px;
        height: 60px;
        object-fit: contain;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .company-details h1 {
        margin: 0;
        font-size: 24px;
        color: var(--primary);
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .company-details p {
        margin: 4px 0 0;
        color: var(--text-muted);
        font-size: 13px;
      }
      .invoice-title-section {
        text-align: right;
      }
      .invoice-title {
        font-size: 32px;
        font-weight: 800;
        color: var(--text-main);
        margin: 0 0 5px 0;
        letter-spacing: -1px;
      }
      .order-id {
        font-size: 14px;
        color: var(--text-muted);
        font-weight: 500;
        background: var(--bg-subtle);
        padding: 4px 10px;
        border-radius: 6px;
        display: inline-block;
      }
      .details-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 40px;
      }
      .details-box {
        background: var(--bg-subtle);
        padding: 20px;
        border-radius: 12px;
        width: 45%;
        border: 1px solid var(--border-color);
      }
      .details-box h3 {
        margin: 0 0 12px 0;
        font-size: 12px;
        text-transform: uppercase;
        color: var(--text-muted);
        letter-spacing: 1px;
        font-weight: 600;
      }
      .details-box p {
        margin: 4px 0;
        font-size: 14px;
        line-height: 1.5;
      }
      .details-box strong {
        color: var(--text-main);
      }
      .items-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 40px;
      }
      .items-table th {
        background-color: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
        padding: 12px 16px;
        text-align: left;
        border-top: 1px solid var(--border-color);
        border-bottom: 1px solid var(--border-color);
      }
      .items-table th:first-child { border-left: 1px solid var(--border-color); border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
      .items-table th:last-child { border-right: 1px solid var(--border-color); border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
      
      .items-table td {
        padding: 16px;
        font-size: 14px;
        border-bottom: 1px solid var(--border-color);
      }
      .items-table .item-name {
        font-weight: 600;
        color: var(--text-main);
      }
      .items-table .text-right {
        text-align: right;
      }
      .items-table .text-center {
        text-align: center;
      }
      
      .summary-section {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 50px;
      }
      .summary-box {
        width: 350px;
        background: #fff;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        overflow: hidden;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 20px;
        font-size: 14px;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-color);
      }
      .summary-row.total {
        background: var(--primary-light);
        color: var(--primary);
        font-weight: 700;
        font-size: 18px;
        border-bottom: none;
        padding: 16px 20px;
      }
      .summary-row.discount {
        color: #ef4444;
      }
      
      .footer {
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
        border-top: 1px solid var(--border-color);
        padding-top: 20px;
        margin-top: 40px;
      }
      .footer p {
        margin: 4px 0;
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <!-- Header -->
      <div class="header">
        <div class="logo-section">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
          <div class="company-details">
            <h1>Fresh Sabji Hub</h1>
            <p>Premium Quality, Delivered Fresh.</p>
          </div>
        </div>
        <div class="invoice-title-section">
          <h2 class="invoice-title">INVOICE</h2>
          <div class="order-id">#${order.order_number}</div>
        </div>
      </div>

      <!-- Details -->
      <div class="details-section">
        <div class="details-box">
          <h3>Billed To</h3>
          <p><strong>${order.first_name} ${order.last_name || ''}</strong></p>
          <p>${address.address_line1 || order.address_line1 || 'Address unavailable'}</p>
          <p>${[address.address_line2 || order.address_line2, address.city || order.city, address.state || order.state].filter(Boolean).join(', ')}</p>
          <p>Phone: ${address.receiver_mobile || order.user_phone || 'N/A'}</p>
        </div>
        
        <div class="details-box">
          <h3>Order Details</h3>
          <p><strong>Date:</strong> ${orderDate}</p>
          <p><strong>Time:</strong> ${orderTime}</p>
          <p><strong>Payment Method:</strong> ${order.payment_method}</p>
          <p><strong>Status:</strong> ${order.payment_status}</p>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Item Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map(item => `
            <tr>
              <td class="item-name">${item.product_name}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">₹${parseFloat(item.price).toFixed(2)}</td>
              <td class="text-right" style="font-weight: 500;">₹${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary -->
      <div class="summary-section">
        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          ${parseFloat(order.handling_fee) > 0 ? `
          <div class="summary-row">
            <span>Handling Fee</span>
            <span>₹${parseFloat(order.handling_fee).toFixed(2)}</span>
          </div>` : ''}
          ${parseFloat(order.delivery_fee) > 0 ? `
          <div class="summary-row">
            <span>Delivery Fee</span>
            <span>₹${parseFloat(order.delivery_fee).toFixed(2)}</span>
          </div>` : ''}
          ${parseFloat(order.handling_fee) > 0 ? `
          <div class="summary-row">
            <span>Handling Fee</span>
            <span>₹${parseFloat(order.handling_fee).toFixed(2)}</span>
          </div>` : ''}
          ${parseFloat(order.tip_amount) > 0 ? `
          <div class="summary-row">
            <span>Tip Amount</span>
            <span>₹${parseFloat(order.tip_amount).toFixed(2)}</span>
          </div>` : ''}
          ${parseFloat(order.global_discount_amount) > 0 ? `
          <div class="summary-row discount">
            <span>Offers Applied</span>
            <span>- ₹${parseFloat(order.global_discount_amount).toFixed(2)}</span>
          </div>` : ''}
          <div class="summary-row total">
            <span>Grand Total</span>
            <span>₹${parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Thank you for shopping with <strong>Fresh Sabji Hub</strong>!</p>
        <p>If you have any questions concerning this invoice, please contact our support.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  // Launch puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  
  // Set content and wait for network idle to ensure fonts/images load
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // Generate PDF buffer
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px'
    }
  });

  await browser.close();

  return pdfBuffer;
};

module.exports = {
  generateInvoicePDF
};
