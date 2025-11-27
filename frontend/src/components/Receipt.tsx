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
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${referenceNo}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            @media print and (min-width: 200mm) {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                max-width: 80mm;
                margin: 0 auto;
              }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12pt;
              line-height: 1.4;
              color: #000;
              background: white;
              padding: 10mm 5mm;
              margin: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 18pt;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header p {
              font-size: 9pt;
              margin: 2px 0;
            }
            .divider {
              border-top: 1px dashed #666;
              margin: 15px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 10pt;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 10pt;
            }
            th, td {
              padding: 5px;
              text-align: left;
            }
            th {
              border-bottom: 1px solid #333;
              font-weight: bold;
            }
            td {
              border-bottom: 1px solid #ddd;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .totals {
              margin: 15px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 10pt;
            }
            .total-final {
              border-top: 1px solid #333;
              padding-top: 10px;
              margin-top: 10px;
              font-size: 14pt;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 9pt;
            }
          </style>
        </head>
        <body>
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
            <p style="margin-top: 10px;">This is a computer-generated receipt.</p>
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
        // Optionally close after printing
        // printWindow.close();
      }, 250);
    };
  };

  // Render receipt content
  const renderReceiptContent = () => (
    <div className="receipt-container p-6">
      {/* Pharmacy Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{pharmacyName}</h1>
        <p className="text-xs text-gray-600">{pharmacyAddress}</p>
        <p className="text-xs text-gray-600">{pharmacyContact}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* Transaction Info */}
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

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* Items List */}
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

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* Totals */}
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

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-4"></div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 space-y-1">
        <p>Thank you for your purchase!</p>
        <p>Please keep this receipt for your records.</p>
        <p className="mt-2">This is a computer-generated receipt.</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Print styles - simple and direct approach */}
      <style>{`
        @media print {
          /* Hide everything on the page */
          body > * {
            display: none !important;
          }
          
          /* Show only the receipt overlay */
          .receipt-overlay {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
          }
          
          /* Show the modal */
          .receipt-modal {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          
          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }
          
          /* Receipt container styling */
          .receipt-container {
            display: block !important;
            padding: 10mm 5mm !important;
            font-family: 'Courier New', monospace !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
            color: #000 !important;
            background: white !important;
            width: 100% !important;
          }
          
          /* Make sure all content is visible */
          .receipt-container * {
            display: block !important;
            color: #000 !important;
            visibility: visible !important;
          }
          
          /* Table elements need special handling */
          .receipt-container table {
            display: table !important;
            width: 100% !important;
          }
          
          .receipt-container thead {
            display: table-header-group !important;
          }
          
          .receipt-container tbody {
            display: table-row-group !important;
          }
          
          .receipt-container tr {
            display: table-row !important;
          }
          
          .receipt-container td,
          .receipt-container th {
            display: table-cell !important;
            padding: 4px !important;
          }
          
          /* Flex containers */
          .receipt-container .flex {
            display: flex !important;
          }
          
          /* Inline elements */
          .receipt-container span {
            display: inline !important;
          }
          
          /* Optimized for 80mm thermal receipt printers */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          /* Fallback for regular printers */
          @media print and (min-width: 200mm) {
            @page {
              size: A4;
              margin: 10mm;
            }
            
            .receipt-container {
              max-width: 80mm;
              margin: 0 auto;
            }
          }
          
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Overlay - visible on screen, hidden when printing */}
      <div className="receipt-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 no-print">
        <div className="receipt-modal bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header with close button */}
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center no-print">
            <h2 className="text-xl font-bold text-gray-800">Receipt</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Receipt Content - visible on screen */}
          <div className="receipt-container p-6">
            {renderReceiptContent()}
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2 no-print">
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

