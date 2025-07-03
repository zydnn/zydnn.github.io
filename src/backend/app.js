const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const invoiceRoutes = require('./routes/invoiceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/invoices', invoiceRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Invoice Generator API',
    version: '1.0.0',
    endpoints: {
      health: '/api/invoices/health',
      generateInvoice: 'POST /api/invoices/generate'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Invoice Generator API running on port ${PORT}`);
    console.log(`📖 API documentation: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/invoices/health`);
  });
}

module.exports = app;