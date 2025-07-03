
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const inputPath = 'C:\\Users\Marke\\Documents\\docx-pdf-generator-main\\src\\templates\\invoice-template.docx'; // <- ini nanti diganti sama file DOCX dari template
const outputDir = 'C:\\Users\\Marke\\Documents\\docx-pdf-generator-main\\src\\outputs'; // <- folder tempat hasil PD

const execAsync = promisify(exec);

// Process DOCX template with data injection

async function processDocxTemplate(templateData, templatePath) {
  try {
    // Read the template file
    const content = await fs.readFile(templatePath, 'binary');
    
    // Create a PizZip instance with the template content
    const zip = new PizZip(content);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Inject data into template
    doc.setData(templateData);

    try {
      // Render the document
      doc.render();
    } catch (error) {
      console.error('Template rendering error:', error);
      
      // Enhanced error reporting for template issues
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map(err => {
          return `${err.name}: ${err.message} at ${err.properties.part}`;
        }).join(', ');
        throw new Error(`Template rendering failed: ${errorMessages}`);
      }
      throw error;
    }

    // Generate the filled DOCX buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buffer;

  } catch (error) {
    console.error('Error processing DOCX template:', error);
    throw new Error(`DOCX processing failed: ${error.message}`);
  }
}

// Convert DOCX buffer to PDF using LibreOffice headless mode
async function convertDocxToPdf(docxBuffer) {
  const tempDir = os.tmpdir();
  const tempDocxName = `invoice-${Date.now()}.docx`; // Kasih nama yang jelas
  const tempDocxPath = path.join(tempDir, tempDocxName);
  const expectedPdfName = `invoice-${Date.now()}.pdf`; // Nama PDF yang diharapkan
  const expectedPdfPath = path.join(outputDir, expectedPdfName);

  // Tulis buffer DOCX ke file sementara
await fs.writeFile(tempDocxPath, docxBuffer);

  const command = `"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe" --headless --convert-to pdf --outdir "${outputDir}" "${tempDocxPath}"`;
  await execAsync(command);

  // Cek PDF-nya pake expected name
  if (await fs.access(expectedPdfPath).then(() => true).catch(() => false)) {
    return await fs.readFile(expectedPdfPath);
  }

  // Kalo gak ketemu, cari PDF dengan pola nama lain
  const files = await fs.readdir(outputDir);
  const createdPdf = files.find(file => file.endsWith('.pdf'));
  if (createdPdf) {
    console.log(`PDF ter-create dengan nama: ${createdPdf} (rename ke ${expectedPdfName})`);
    const pdfBuffer = await fs.readFile(path.join(outputDir, createdPdf));
    await fs.rename(path.join(outputDir, createdPdf), expectedPdfPath); // Auto rename
    return pdfBuffer;
  }
  
  // Buat direktori output jika belum ada
  await fs.mkdir(outputDir, { recursive: true });

  throw new Error('PDF tidak ter-create!');
}

// Main function to convert template data to PDF
async function convertToPDF(templateData, templatePath) {
  try {
    console.log('Starting PDF conversion process...');
    
    // Step 1: Process DOCX template
    const docxBuffer = await processDocxTemplate(templateData, templatePath);
    console.log('DOCX template processed successfully');

    // Step 2: Convert to PDF
    const pdfBuffer = await convertDocxToPdf(docxBuffer);
    console.log('PDF conversion completed successfully');

    return pdfBuffer;

  } catch (error) {
    console.error('Error in convertToPDF:', error);
    throw error;
  }
}

module.exports = {
  processDocxTemplate,
  convertDocxToPdf,
  convertToPDF
};
