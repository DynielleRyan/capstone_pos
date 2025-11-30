import React from 'react';
import { X, Printer } from 'lucide-react';

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount?: number;
  vatAmount?: number;
}

interface ReceiptProps {
  transactionId: string;
  referenceNo: string;
  orderDateTime: string;
  paymentMethod: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  cashReceived?: number;
  change?: number;
  isSeniorPWDActive: boolean;
  onClose?: () => void;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyContact?: string;
}

const Receipt: React.FC<ReceiptProps> = ({
  transactionId,
  referenceNo,
  orderDateTime,
  paymentMethod,
  items,
  subtotal,
  discount,
  vat,
  total,
  cashReceived,
  change,
  isSeniorPWDActive,
  onClose,
  pharmacyName = "Jambo's Pharmacy",
  pharmacyAddress = "123 Main Street, City, Philippines",
  pharmacyContact = "Tel: (02) 1234-5678"
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPaymentMethod = (method: string) => {
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const handlePrint = () => {
    // Create a new window with just the receipt content for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      // If popup blocked, fall back to regular print
      window.print();
      return;
    }
    
    // Build the receipt HTML
    // Using Letter paper size (standard) but constraining content to 80mm width
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${referenceNo}</title>
          <style>
            /* Use Letter size (standard) but content is exactly 80mm wide */
            @page {
              size: Letter;
              margin: 0;
            }
            
            /* For thermal printers - try to use custom size if supported */
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
            }
            
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box;
            }
            
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100%;
              height: auto;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 9pt;
              line-height: 1.2;
              color: #000;
              background: white;
              padding: 0 !important;
              margin: 0 !important;
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }
            
            /* Receipt container - exactly 80mm wide (3 inches = 80mm) */
            .receipt-wrapper {
              width: 80mm;
              max-width: 80mm;
              min-width: 80mm;
              margin: 0 auto;
              padding: 2mm 1mm;
              background: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 3px;
            }
            
            .header h1 {
              font-size: 11pt;
              font-weight: bold;
              margin-bottom: 1px;
              line-height: 1.1;
            }
            
            .header p {
              font-size: 7pt;
              margin: 0;
              line-height: 1.1;
            }
            
            .divider {
              border-top: 1px dashed #666;
              margin: 3px 0;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 1px 0;
              font-size: 8pt;
              line-height: 1.2;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 3px 0;
              font-size: 8pt;
              table-layout: fixed;
            }
            
            th:first-child, td:first-child {
              width: 40%;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            
            th:nth-child(2), td:nth-child(2) {
              width: 12%;
            }
            
            th:nth-child(3), td:nth-child(3) {
              width: 24%;
            }
            
            th:nth-child(4), td:nth-child(4) {
              width: 24%;
            }
            
            th, td {
              padding: 1px 0.5px;
              text-align: left;
              line-height: 1.1;
              vertical-align: top;
            }
            
            th {
              border-bottom: 1px solid #333;
              font-weight: bold;
              font-size: 8pt;
            }
            
            td {
              border-bottom: 1px solid #ddd;
              font-size: 8pt;
            }
            
            .text-right {
              text-align: right;
            }
            
            .text-center {
              text-align: center;
            }
            
            .totals {
              margin: 3px 0;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 1px 0;
              font-size: 8pt;
              line-height: 1.2;
            }
            
            .total-final {
              border-top: 1px solid #333;
              padding-top: 2px;
              margin-top: 2px;
              font-size: 11pt;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              margin-top: 3px;
              font-size: 7pt;
              line-height: 1.2;
            }
            
            small {
              font-size: 7pt;
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            <div class="header">
              <h1>${pharmacyName}</h1>
              <p>${pharmacyAddress}</p>
              <p>${pharmacyContact}</p>
            </div>
            <div class="divider"></div>
            <div class="info-row">
              <span>Receipt No:</span>
              <span><strong>${referenceNo}</strong></span>
            </div>
            <div class="info-row">
              <span>Transaction ID:</span>
              <span><strong>${transactionId}</strong></span>
            </div>
            <div class="info-row">
              <span>Date & Time:</span>
              <span><strong>${formatDate(orderDateTime)}</strong></span>
            </div>
            <div class="info-row">
              <span>Payment Method:</span>
              <span><strong>${formatPaymentMethod(paymentMethod)}</strong></span>
            </div>
            <div class="divider"></div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td>
                      ${item.productName}
                      ${item.discountAmount && item.discountAmount > 0 ? `<br><small style="color: red;">Discount: ₱${item.discountAmount.toFixed(2)}</small>` : ''}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">₱${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right"><strong>₱${item.subtotal.toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₱${subtotal.toFixed(2)}</span>
              </div>
              ${isSeniorPWDActive && discount > 0 ? `
              <div class="total-row" style="color: red;">
                <span>Senior/PWD Discount (20%):</span>
                <span>-₱${discount.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="total-row">
                <span>VAT (12%):</span>
                <span>₱${vat.toFixed(2)}</span>
              </div>
              ${paymentMethod === 'cash' && cashReceived ? `
              <div class="total-row">
                <span>Cash Received:</span>
                <span>₱${cashReceived.toFixed(2)}</span>
              </div>
              ${change !== undefined && change > 0 ? `
              <div class="total-row">
                <span>Change:</span>
                <span>₱${change.toFixed(2)}</span>
              </div>
              ` : ''}
              ` : ''}
              <div class="total-row total-final">
                <span>TOTAL:</span>
                <span>₱${total.toFixed(2)}</span>
              </div>
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Thank you for your purchase!</p>
              <p>Please keep this receipt for your records.</p>
              <p style="margin-top: 5px;">This is a computer-generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header with close button */}
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Receipt</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Receipt Content */}
          <div className="p-6">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{pharmacyName}</h1>
              <p className="text-xs text-gray-600">{pharmacyAddress}</p>
              <p className="text-xs text-gray-600">{pharmacyContact}</p>
            </div>

            <div className="border-t border-dashed border-gray-400 my-4"></div>

            <div className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Receipt No:</span>
                <span className="font-medium">{referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium">{transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-medium">{formatDate(orderDateTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">{formatPaymentMethod(paymentMethod)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-4"></div>

            <div className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 text-gray-700">Item</th>
                    <th className="text-center py-2 text-gray-700">Qty</th>
                    <th className="text-right py-2 text-gray-700">Price</th>
                    <th className="text-right py-2 text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2 text-gray-800">
                        <div className="font-medium">{item.productName}</div>
                        {item.discountAmount && item.discountAmount > 0 && (
                          <div className="text-xs text-red-600">
                            Discount: ₱{item.discountAmount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-2 text-gray-700">{item.quantity}</td>
                      <td className="text-right py-2 text-gray-700">₱{item.unitPrice.toFixed(2)}</td>
                      <td className="text-right py-2 font-medium text-gray-800">
                        ₱{item.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-dashed border-gray-400 my-4"></div>

            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₱{subtotal.toFixed(2)}</span>
              </div>
              
              {isSeniorPWDActive && discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Senior/PWD Discount (20%):</span>
                  <span className="font-medium">-₱{discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (12%):</span>
                <span className="font-medium">₱{vat.toFixed(2)}</span>
              </div>
              
              {paymentMethod === 'cash' && cashReceived && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Received:</span>
                    <span className="font-medium">₱{cashReceived.toFixed(2)}</span>
                  </div>
                  {change !== undefined && change > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Change:</span>
                      <span className="font-medium">₱{change.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="border-t border-gray-400 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL:</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-4"></div>

            <div className="text-center text-xs text-gray-600 space-y-1">
              <p>Thank you for your purchase!</p>
              <p>Please keep this receipt for your records.</p>
              <p className="mt-2">This is a computer-generated receipt.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Receipt;
