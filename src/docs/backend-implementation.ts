
// This file contains the complete backend implementation guide
// for the invoice generation system using Node.js, Express, and MySQL

/*
==================================================
PROJECT STRUCTURE (Backend)
==================================================

backend/
├── src/
│   ├── controllers/
│   │   └── invoiceController.js
│   ├── models/
│   │   └── Invoice.js
│   ├── routes/
│   │   └── invoiceRoutes.js
│   ├── utils/
│   │   ├── docxProcessor.js
│   │   ├── pdfGenerator.js
│   │   └── numberToWords.js
│   ├── middleware/
│   │   └── validation.js
│   ├── config/
│   │   └── database.js
│   └── app.js
├── templates/
│   └── invoice-template.docx
├── uploads/
├── package.json
└── README.md

==================================================
PACKAGE.JSON DEPENDENCIES
==================================================

{
  "name": "invoice-generator-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "multer": "^1.4.5",
    "docxtemplater": "^3.39.0",
    "pizzip": "^3.1.4",
    "libre-office-convert": "^1.6.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-validator": "^7.0.1",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}

==================================================
DATABASE SCHEMA (MySQL)
==================================================

CREATE DATABASE invoice_generator;
USE invoice_generator;

CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    pelanggan VARCHAR(255) NOT NULL,
    tanggal DATE NOT NULL,
    periode VARCHAR(100) NOT NULL,
    alamat_sewa TEXT NOT NULL,
    ongkir DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    total_terbilang TEXT NOT NULL,
    keterangan TEXT,
    pdf_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

==================================================
BACKEND CONTROLLER EXAMPLE
==================================================

// controllers/invoiceController.js
const mysql = require('mysql2/promise');
const { processDocxTemplate, generatePDF } = require('../utils/docxProcessor');
const { convertToIndonesianWords } = require('../utils/numberToWords');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'invoice_generator'
};

exports.createInvoice = async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    await connection.beginTransaction();
    
    const {
      pelanggan,
      tanggal,
      invoiceNo,
      periode,
      alamatSewa,
      noItems,
      ongkir = 0,
      keterangan = ''
    } = req.body;

    // Calculate totals
    const subtotal = noItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const total = subtotal + parseFloat(ongkir);
    const totalTerbilang = convertToIndonesianWords(total);

    // Insert invoice
    const [invoiceResult] = await connection.execute(
      `INSERT INTO invoices (invoice_no, pelanggan, tanggal, periode, alamat_sewa, 
       ongkir, subtotal, total, total_terbilang, keterangan) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNo, pelanggan, tanggal, periode, alamatSewa, ongkir, subtotal, total, totalTerbilang, keterangan]
    );

    const invoiceId = invoiceResult.insertId;

    // Insert invoice items
    for (const item of noItems) {
      const itemTotal = item.quantity * item.price;
      await connection.execute(
        `INSERT INTO invoice_items (invoice_id, item_name, quantity, price, total) 
         VALUES (?, ?, ?, ?, ?)`,
        [invoiceId, item.name, item.quantity, item.price, itemTotal]
      );
    }

    // Prepare data for template
    const templateData = {
      pelanggan,
      tanggal: new Date(tanggal).toLocaleDateString('id-ID'),
      invoiceNo,
      periode,
      alamatSewa,
      items: noItems.map(item => ({
        ...item,
        total: item.quantity * item.price,
        formattedPrice: item.price.toLocaleString('id-ID'),
        formattedTotal: (item.quantity * item.price).toLocaleString('id-ID')
      })),
      ongkir: ongkir.toLocaleString('id-ID'),
      subtotal: subtotal.toLocaleString('id-ID'),
      total: total.toLocaleString('id-ID'),
      totalTerbilang,
      keterangan
    };

    // Generate PDF
    const pdfBuffer = await generatePDF(templateData, 'invoice-template.docx');
    
    await connection.commit();

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNo}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    await connection.rollback();
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  } finally {
    await connection.end();
  }
};

==================================================
DOCX TO PDF PROCESSOR
==================================================

// utils/docxProcessor.js
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs').promises;
const path = require('path');
const libre = require('libre-office-convert');
const { promisify } = require('util');

const libreConvert = promisify(libre.convert);

async function processDocxTemplate(templateData, templateName) {
  try {
    const templatePath = path.join(__dirname, '../../templates', templateName);
    const content = await fs.readFile(templatePath, 'binary');
    
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set the template variables
    doc.setData(templateData);

    try {
      doc.render();
    } catch (error) {
      console.error('Template rendering error:', error);
      throw error;
    }

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buf;
  } catch (error) {
    console.error('Error processing DOCX template:', error);
    throw error;
  }
}

async function generatePDF(templateData, templateName) {
  try {
    // First, generate the filled DOCX
    const docxBuffer = await processDocxTemplate(templateData, templateName);
    
    // Convert DOCX to PDF using LibreOffice
    const pdfBuffer = await libreConvert(docxBuffer, '.pdf', undefined);
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

module.exports = {
  processDocxTemplate,
  generatePDF
};

==================================================
DOCX TEMPLATE STRUCTURE
==================================================

Your invoice-template.docx should contain placeholders like:

{pelanggan}
{tanggal}
{invoiceNo}
{periode}
{alamatSewa}

Items table:
{#items}
{name} | {quantity} | Rp {formattedPrice} | Rp {formattedTotal}
{/items}

Subtotal: Rp {subtotal}
Ongkir: Rp {ongkir}
Total: Rp {total}
Terbilang: {totalTerbilang}

{keterangan}

==================================================
API ROUTES EXAMPLE
==================================================

// routes/invoiceRoutes.js
const express = require('express');
const { createInvoice, getInvoice, regenerateInvoice } = require('../controllers/invoiceController');
const { validateInvoiceData } = require('../middleware/validation');

const router = express.Router();

router.post('/generate', validateInvoiceData, createInvoice);
router.get('/:id', getInvoice);
router.post('/regenerate/:id', regenerateInvoice);

module.exports = router;

==================================================
INSTALLATION & SETUP INSTRUCTIONS
==================================================

1. Install dependencies:
   npm install

2. Setup MySQL database:
   - Create database and tables using the schema above
   - Update database credentials in config/database.js

3. Install LibreOffice (required for PDF conversion):
   - Ubuntu/Debian: sudo apt-get install libreoffice
   - Windows: Download from https://www.libreoffice.org/
   - macOS: brew install --cask libreoffice

4. Place your DOCX template in the templates/ folder

5. Create .env file:
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=invoice_generator
   PORT=3000

6. Run the server:
   npm run dev (with nodemon)
   or
   npm start

==================================================
FRONTEND API INTEGRATION
==================================================

Replace the commented API call in InvoiceForm.tsx with:

const response = await fetch('http://localhost:3000/api/invoices/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invoiceData),
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${data.invoiceNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

*/

export {};
