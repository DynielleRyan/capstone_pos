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
  vatExempt?: number;
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
  vatExempt,
  total,
  cashReceived,
  change,
  isSeniorPWDActive,
  onClose,
  pharmacyName = "Jambo's Pharmacy",
  pharmacyAddress = "Babag, Lapu-Lapu City",
  pharmacyContact = "0991 648 2809"
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
    // Thermal printer: 57mm width
    const printWindow = window.open('', '_blank', 'width=220,height=600');
    
    if (!printWindow) {
      // If popup blocked, fall back to regular print
      window.print();
      return;
    }
    
    // Build the receipt HTML
    // Optimized for 57mm x 30mm thermal paper
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${referenceNo}</title>
          <style>
            /* Thermal Printer: 57mm width */
            @page {
              size: 57mm auto;
              margin: 0;
            }
            
            /* For thermal printers - custom size */
            @media print {
              @page {
                size: 57mm auto;
                margin: 0;
              }
              
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
                margin: 0;
                padding: 0;
                width: 57mm;
              }
              
              .receipt-wrapper {
                page-break-inside: avoid;
                break-inside: avoid;
                margin: 0;
                padding: 2mm 2mm;
                width: 57mm;
                max-width: 57mm;
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
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
              background: white;
              padding: 0 !important;
              margin: 0 !important;
              display: block;
              width: 100%;
            }
            
            /* Receipt container - exactly 57mm wide, left-aligned for thermal printers */
            .receipt-wrapper {
              width: 57mm;
              max-width: 57mm;
              min-width: 57mm;
              margin: 0;
              padding: 3mm 2.5mm;
              background: white;
              box-sizing: border-box;
            }
            
            .header {
              text-align: center;
              margin-bottom: 6px;
              width: 100%;
            }
            
            .header h1 {
              font-size: 13pt;
              font-weight: bold;
              margin-bottom: 4px;
              line-height: 1.3;
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              max-width: 100%;
            }
            
            .header p {
              font-size: 10pt;
              margin: 2px 0;
              line-height: 1.3;
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              max-width: 100%;
            }
            
            .divider {
              border-top: 1px dashed #666;
              margin: 6px 0;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 10pt;
              line-height: 1.4;
              word-wrap: break-word;
            }
            
            .info-row span:first-child {
              flex: 0 0 auto;
              min-width: 0;
              word-wrap: break-word;
              overflow-wrap: break-word;
              padding-right: 8px;
              max-width: 45%;
            }
            
            .info-row span:last-child {
              flex: 1;
              word-wrap: break-word;
              overflow-wrap: break-word;
              text-align: right;
              min-width: 0;
              max-width: 55%;
            }
            
            /* Special handling for long transaction IDs */
            .info-row.transaction-id span:last-child {
              font-size: 9pt;
              word-break: break-all;
              overflow-wrap: anywhere;
            }
            
            table {
              width: 100%;
              max-width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              font-size: 10pt;
              table-layout: fixed;
              box-sizing: border-box;
            }
            
            th:first-child, td:first-child {
              width: 45%;
              word-wrap: break-word;
              overflow-wrap: break-word;
              padding-right: 3px;
            }
            
            th:nth-child(2), td:nth-child(2) {
              width: 15%;
              text-align: center;
            }
            
            th:nth-child(3), td:nth-child(3) {
              width: 40%;
              text-align: right;
              white-space: nowrap;
            }
            
            th, td {
              padding: 4px 3px;
              text-align: left;
              line-height: 1.3;
              vertical-align: top;
              overflow: visible;
            }
            
            th {
              border-bottom: 1px solid #333;
              font-weight: bold;
              font-size: 10pt;
              padding-bottom: 5px;
              word-wrap: break-word;
            }
            
            td {
              border-bottom: 1px solid #ddd;
              font-size: 10pt;
              padding-top: 5px;
              padding-bottom: 5px;
              overflow: visible;
              word-wrap: break-word;
            }
            
            td.text-right {
              white-space: nowrap;
              overflow: visible;
            }
            
            .text-right {
              text-align: right;
            }
            
            .text-center {
              text-align: center;
            }
            
            .totals {
              margin: 6px 0;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 10pt;
              line-height: 1.4;
              word-wrap: break-word;
            }
            
            .total-row span:first-child {
              flex: 1;
              word-wrap: break-word;
              overflow-wrap: break-word;
              padding-right: 5px;
            }
            
            .total-row span:last-child {
              white-space: nowrap;
              flex-shrink: 0;
              text-align: right;
            }
            
            .total-final {
              border-top: 2px solid #333;
              padding-top: 6px;
              margin-top: 6px;
              font-size: 13pt;
              font-weight: bold;
            }
            
            .total-final span:last-child {
              font-size: 13pt;
              white-space: nowrap;
            }
            
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 9pt;
              line-height: 1.4;
            }
            
            small {
              font-size: 9pt;
            }
            
            /* Ensure text doesn't overflow */
            * {
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            
            /* Prevent numbers from wrapping */
            .text-right, [class*="text-right"] {
              white-space: nowrap;
            }
            
            /* Ensure prices always show full value including centavos */
            strong, .total-final span:last-child {
              white-space: nowrap;
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
              <span>Receipt:</span>
              <span><strong>${referenceNo}</strong></span>
            </div>
            <div class="info-row transaction-id">
              <span>Trans ID:</span>
              <span><strong>${transactionId.length > 20 ? transactionId.substring(0, 17) + '...' : transactionId}</strong></span>
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
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => {
                  const itemDiscount = item.discountAmount || 0;
                  const itemVAT = item.vatAmount || 0;
                  const hasVAT = itemVAT > 0;
                  
                  // Don't truncate - let CSS handle wrapping
                  // For 57mm width, we can fit more characters with proper wrapping
                  return `
                  <tr>
                    <td style="word-break: break-word; overflow-wrap: break-word; hyphens: auto;">
                      ${item.productName}
                      ${itemDiscount > 0 ? `<br><small style="color: red;">Disc: -₱${itemDiscount.toFixed(2)}</small>` : ''}
                      ${hasVAT ? `<br><small style="color: #2563eb;">VAT (12%): ₱${itemVAT.toFixed(2)}</small>` : `<br><small style="color: #16a34a;">VAT Exempt</small>`}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right" style="white-space: nowrap;"><strong>₱${item.subtotal.toFixed(2)}</strong></td>
                  </tr>
                `;
                }).join('')}
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
                <span>Senior/PWD Disc (20%):</span>
                <span>-₱${discount.toFixed(2)}</span>
              </div>
              ` : ''}
              
              <div style="border-top: 1px dashed #999; margin: 8px 0; padding-top: 8px;">
                <div style="font-size: 9pt; font-weight: bold; color: #666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">VAT Breakdown</div>
                
                ${vatExempt && vatExempt > 0 ? `
                <div class="total-row">
                  <span style="color: #16a34a;">VAT Exempt Amount:</span>
                  <span style="color: #16a34a; font-weight: bold;">₱${vatExempt.toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${vat > 0 ? `
                <div class="total-row">
                  <span style="color: #2563eb;">VAT (12%):</span>
                  <span style="color: #2563eb; font-weight: bold;">₱${vat.toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${vat === 0 && (!vatExempt || vatExempt === 0) ? `
                <div class="total-row" style="font-size: 9pt; color: #666; font-style: italic;">
                  <span>No VAT applicable</span>
                </div>
                ` : ''}
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
                  {items.map((item, index) => {
                    const itemDiscount = item.discountAmount || 0;
                    const itemVAT = item.vatAmount || 0;
                    const hasVAT = itemVAT > 0;
                    
                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2 text-gray-800">
                          <div className="font-medium">{item.productName}</div>
                          {itemDiscount > 0 && (
                            <div className="text-xs text-red-600">
                              Discount: ₱{itemDiscount.toFixed(2)}
                            </div>
                          )}
                          {hasVAT ? (
                            <div className="text-xs text-blue-600 font-medium">
                              VAT (12%): ₱{itemVAT.toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-xs text-green-600 font-medium">
                              VAT Exempt
                            </div>
                          )}
                        </td>
                        <td className="text-center py-2 text-gray-700">{item.quantity}</td>
                        <td className="text-right py-2 text-gray-700">₱{item.unitPrice.toFixed(2)}</td>
                        <td className="text-right py-2 font-medium text-gray-800">
                          ₱{item.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
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
              
              {/* VAT Breakdown Section */}
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">VAT Breakdown</div>
                
                {vatExempt && vatExempt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-green-600">VAT Exempt Amount:</span>
                    <span className="font-medium text-green-600">₱{vatExempt.toFixed(2)}</span>
                  </div>
                )}
                
                {vat > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-blue-600">VAT (12%):</span>
                    <span className="font-medium text-blue-600">₱{vat.toFixed(2)}</span>
                  </div>
                )}
                
                {vat === 0 && (!vatExempt || vatExempt === 0) && (
                  <div className="text-xs text-gray-500 italic">No VAT applicable</div>
                )}
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
