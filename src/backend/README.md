
# Invoice Generator Backend

A Node.js/Express backend for generating PDF invoices from DOCX templates.

## Features

- Process DOCX templates with data injection using `docxtemplater`
- Convert DOCX to PDF using LibreOffice headless mode
- Indonesian number-to-words conversion
- Input validation and error handling
- RESTful API endpoints

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **LibreOffice** (for PDF conversion)

### Installing LibreOffice

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install libreoffice
```

**Windows:**
- Download from https://www.libreoffice.org/
- Install with default settings
- Add LibreOffice to your system PATH

**macOS:**
```bash
brew install --cask libreoffice
```

## Installation

1. Navigate to the backend directory:
```bash
cd src/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Template Setup

1. Create a `templates` folder in the backend root:
```bash
mkdir templates
```

2. Place your `invoice-template.docx` file in the `templates` folder

### Template Structure

Your DOCX template should include these placeholders:

**Basic Information:**
- `{pelanggan}` - Customer name
- `{tanggal}` - Formatted date
- `{invoiceNo}` - Invoice number
- `{periode}` - Rental period
- `{alamatSewa}` - Rental address

**Items Loop:**
```
{#noItems}
{no} | {nama} | {jumlah} | Rp {hargaSatuan} | Rp {total}
{/noItems}
```

**Totals:**
- `{ongkir}` - Shipping cost
- `{subtotal}` - Subtotal
- `{total}` - Total amount
- `{totalTerbilang}` - Total in Indonesian words

**Optional:**
- `{keterangan}` - Additional notes

## Running the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/invoices/health
```

### Generate Invoice
```
POST /api/invoices/generate
Content-Type: application/json

{
  "pelanggan": "Customer Name",
  "tanggal": "2024-01-15",
  "invoiceNo": "INV-001",
  "periode": "1 Month",
  "alamatSewa": "Rental Address",
  "noItems": [
    {
      "name": "Item 1",
      "quantity": 2,
      "price": 100000
    }
  ],
  "ongkir": 50000,
  "keterangan": "Optional notes"
}
```

**Response:** PDF file download

## Project Structure

```
src/backend/
├── app.js                 # Main Express application
├── controllers/
│   └── invoiceController.js
├── routes/
│   └── invoiceRoutes.js
├── utils/
│   ├── docxProcessor.js   # DOCX template processing
│   └── numberToWords.js   # Indonesian number conversion
├── middleware/
│   └── validation.js      # Input validation
├── templates/
│   └── invoice-template.docx
├── package.json
└── README.md
```

## Frontend Integration

Update your frontend API call:

```javascript
const response = await fetch('http://localhost:3000/api/invoices/generate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify(invoiceData),
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoiceData.invoiceNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
} else {
  const error = await response.json();
  console.error('Invoice generation failed:', error);
}
```

## Error Handling

The API returns structured error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": [...] // For validation errors
}
```

Common error codes:
- `400` - Bad request (validation errors)
- `500` - Server error (template not found, conversion failed)

## Troubleshooting

**LibreOffice not found:**
- Ensure LibreOffice is installed and accessible via command line
- Try running `libreoffice --version` to verify installation

**Template not found:**
- Check that `invoice-template.docx` exists in the `templates` folder
- Verify file permissions

**PDF conversion fails:**
- Check LibreOffice installation
- Ensure sufficient disk space in temp directory
- Verify DOCX template is not corrupted

## Development Notes

- Template processing uses `docxtemplater` with `pizzip`
- PDF conversion uses LibreOffice headless mode
- Temporary files are automatically cleaned up
- All currency amounts are formatted for Indonesian locale
- Comprehensive input validation using `express-validator`
