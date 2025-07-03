const { body, validationResult } = require('express-validator');

// Validation rules for invoice data
const invoiceValidationRules = [
  body('pelanggan')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Customer name must be between 2 and 255 characters'),
  
  body('tanggal')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in valid ISO format'),
  
  body('invoiceNo')
    .notEmpty()
    .withMessage('Invoice number is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invoice number must be between 1 and 100 characters'),
  
  body('periode')
    .notEmpty()
    .withMessage('Rental period is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Period must be between 1 and 100 characters'),
  
  body('alamatSewa')
    .notEmpty()
    .withMessage('Rental address is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Address must be between 5 and 1000 characters'),
  
  body('noItems')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('noItems.*.name')
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Item name must be between 1 and 255 characters'),
  
  body('noItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  
  body('noItems.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be non-negative'),
  
  body('ongkir')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be non-negative'),
  
  body('keterangan')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

// Middleware to validate invoice data
const validateInvoiceData = [
  ...invoiceValidationRules,
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    next();
  }
];

module.exports = {
  validateInvoiceData
};
