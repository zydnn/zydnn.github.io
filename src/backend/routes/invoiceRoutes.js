
const express = require('express');
const { generateInvoice, healthCheck } = require('../controllers/invoiceController');
const { validateInvoiceData } = require('../middleware/validation');

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Generate invoice endpoint
router.post('/generate', validateInvoiceData, generateInvoice);

module.exports = router;
