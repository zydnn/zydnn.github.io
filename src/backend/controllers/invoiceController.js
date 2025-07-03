const express = require('express');
const { processDocxTemplate, convertToPDF } = require('../utils/docxProcessor');
const { convertToIndonesianWords } = require('../utils/numberToWords');
const path = require('path');
const fs = require('fs').promises;

// Generate invoice and return PDF
exports.generateInvoice = async (req, res) => {
  try {
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

    // Validate required fields
    if (!pelanggan || !tanggal || !invoiceNo || !periode || !alamatSewa || !noItems || noItems.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['pelanggan', 'tanggal', 'invoiceNo', 'periode', 'alamatSewa', 'noItems']
      });
    }

    // Calculate totals
    const subtotal = noItems.reduce((sum, item) => {
      if (!item.name || !item.quantity || !item.price) {
        throw new Error('Each item must have name, quantity, and price');
      }
      return sum + (item.quantity * item.price);
    }, 0);

    const total = subtotal + parseFloat(ongkir || 0);
    const totalTerbilang = convertToIndonesianWords(total);

    // Format date to Indonesian format
    const formattedDate = new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Prepare template data
    const templateData = {
      pelanggan,
      tanggal: formattedDate,
      invoiceNo,
      periode,
      alamatSewa,
      noItems: noItems.map((item, index) => ({
        no: index + 1,
        nama: item.name,
        jumlah: item.quantity,
        hargaSatuan: item.price.toLocaleString('id-ID'),
        total: (item.quantity * item.price).toLocaleString('id-ID')
      })),
      ongkir: ongkir.toLocaleString('id-ID'),
      subtotal: subtotal.toLocaleString('id-ID'),
      total: total.toLocaleString('id-ID'),
      totalTerbilang,
      keterangan: keterangan || ''
    };

    console.log('Processing invoice with data:', templateData);

    // Process template and generate PDF
    const templatePath = path.join(__dirname, '../../templates/invoice-template.docx');
    
    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      console.error('Template not found:', templatePath);
      return res.status(500).json({
        error: 'Invoice template not found',
        path: templatePath
      });
    }

    const pdfBuffer = await convertToPDF(templateData, templatePath);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      error: 'Failed to generate invoice',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Health check endpoint
exports.healthCheck = (req, res) => {
  res.json({
    status: 'OK',
    message: 'Invoice generator API is running',
    timestamp: new Date().toISOString()
  });
};