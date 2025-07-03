
// Indonesian number to words converter for backend
const ones = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
  'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
  'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'
];

const tens = [
  '', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh',
  'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'
];

const scales = [
  '', 'ribu', 'juta', 'miliar', 'triliun'
];

function convertHundreds(num) {
  let result = '';
  
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    if (hundreds === 1) {
      result += 'seratus ';
    } else {
      result += ones[hundreds] + ' ratus ';
    }
    num %= 100;
  }
  
  if (num >= 20) {
    const tensDigit = Math.floor(num / 10);
    const onesDigit = num % 10;
    result += tens[tensDigit];
    if (onesDigit > 0) {
      result += ' ' + ones[onesDigit];
    }
  } else if (num > 0) {
    result += ones[num];
  }
  
  return result.trim();
}

function convertToIndonesianWords(amount) {
  if (amount === 0) {
    return 'nol rupiah';
  }
  
  if (amount < 0) {
    return 'minus ' + convertToIndonesianWords(-amount);
  }
  
  // Handle very large numbers up to trillions
  const parts = [];
  let scaleIndex = 0;
  let remaining = Math.floor(amount);
  
  while (remaining > 0 && scaleIndex < scales.length) {
    const currentPart = remaining % 1000;
    
    if (currentPart > 0) {
      let partText = '';
      
      if (scaleIndex === 1 && currentPart === 1) {
        // Special case for "seribu"
        partText = 'seribu';
      } else {
        partText = convertHundreds(currentPart);
        if (scaleIndex > 0) {
          partText += ' ' + scales[scaleIndex];
        }
      }
      
      parts.unshift(partText);
    }
    
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }
  
  let result = parts.join(' ').trim();
  
  // Clean up double spaces and ensure proper formatting
  result = result.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter and add "rupiah"
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1) + ' rupiah';
  }
  
  return result;
}

module.exports = {
  convertToIndonesianWords
};
