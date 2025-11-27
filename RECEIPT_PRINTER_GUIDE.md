# Receipt Printing Guide

## Overview

The receipt system is designed to work with **both commercial receipt printers (thermal printers) and regular printers** using the browser's standard print functionality.

## How It Works

### ✅ **Commercial Receipt Printers (Thermal Printers)**

**Compatible with:**
- 80mm thermal receipt printers (most common)
- USB, Network, or Bluetooth connected printers
- Examples: Epson TM series, Star Micronics, Bixolon, Citizen

**Requirements:**
1. **Printer must be installed as a system printer** on the computer
2. Printer drivers must be properly installed
3. Printer should be set as default or selected in print dialog

**How to Use:**
1. Complete a transaction
2. Receipt modal appears automatically
3. Click "Print Receipt" button
4. In the print dialog, select your receipt printer
5. Click Print

**Optimizations for Receipt Printers:**
- Paper width: 80mm (3 inches)
- No margins (edge-to-edge printing)
- Monospace font (Courier New) for consistent alignment
- Compact layout optimized for thermal paper
- Automatic page sizing

### ✅ **Regular Printers (Inkjet/Laser)**

**Compatible with:**
- All standard printers (HP, Canon, Epson, Brother, etc.)
- Any printer that works with your operating system

**How to Use:**
1. Complete a transaction
2. Receipt modal appears automatically
3. Click "Print Receipt" button
4. Select your regular printer
5. Receipt will print on standard paper (A4/Letter) with proper margins

**Optimizations for Regular Printers:**
- Centered layout (80mm width) on standard paper
- Proper margins for standard paper sizes
- Same formatting as receipt printers

## Setup Instructions

### For Receipt Printers:

1. **Install Printer Drivers:**
   - Download drivers from manufacturer's website
   - Install following manufacturer's instructions
   - Test print from any application to verify installation

2. **Configure Printer Settings:**
   - Set paper size to 80mm (if available in printer settings)
   - Ensure printer is set as default (optional, but convenient)

3. **Test Printing:**
   - Complete a test transaction
   - Print receipt and verify formatting
   - Adjust printer settings if needed

### For Regular Printers:

1. **No special setup required** - works with any installed printer
2. Receipt will print on standard paper with proper formatting

## Technical Details

### Print Method
- Uses standard `window.print()` JavaScript API
- Works through browser's print dialog
- Compatible with all modern browsers (Chrome, Firefox, Edge, Safari)

### CSS Print Styles
- `@page { size: 80mm auto; }` - Optimized for receipt printers
- Fallback to A4 for regular printers
- Monospace font for consistent alignment
- No margins for receipt printers
- Proper margins for regular printers

### Browser Compatibility
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Opera: Full support

## Alternative Solutions (If Needed)

If you need more advanced features, consider:

1. **Direct Printer Communication:**
   - Use libraries like `node-thermal-printer` (requires backend)
   - Direct ESC/POS commands
   - More control but requires additional setup

2. **PDF Generation:**
   - Use `jspdf` or `react-pdf` libraries
   - Generate PDF files
   - Can be printed or saved

3. **Cloud Print Services:**
   - Google Cloud Print (deprecated)
   - CUPS (Linux)
   - Windows Print Spooler

## Troubleshooting

### Receipt Printer Not Showing in Print Dialog
- **Solution:** Ensure printer is installed as a system printer
- Check printer is powered on and connected
- Verify printer drivers are installed correctly

### Receipt Prints Too Large/Small
- **Solution:** Adjust printer settings (paper size, scaling)
- Check browser print settings (scale, margins)

### Text Alignment Issues
- **Solution:** Ensure printer is set to 80mm paper width
- Check printer driver settings

### Receipt Cuts Incorrectly
- **Solution:** Configure auto-cutter settings in printer driver
- Some printers require manual cutting

## Best Practices

1. **Always test** with your specific printer model
2. **Keep printer drivers updated**
3. **Set receipt printer as default** for faster printing
4. **Use quality thermal paper** for best results
5. **Test print** after any printer driver updates

## Customization

You can customize the receipt by editing:
- `frontend/src/components/Receipt.tsx`
- Pharmacy name, address, contact info
- Receipt layout and styling
- Print styles in the `<style>` tag

## Support

For printer-specific issues:
1. Check printer manufacturer's documentation
2. Verify printer drivers are up to date
3. Test printer with other applications
4. Contact printer manufacturer support if needed

