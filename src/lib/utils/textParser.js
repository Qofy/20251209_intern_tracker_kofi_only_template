/**
 * Text Parser Utility
 * Extracts customer information from unstructured text (e.g., Impressum, business info)
 */

/**
 * Parse customer information from text blob
 * @param {string} text - The text to parse
 * @returns {object} - Extracted customer data
 */
export function parseCustomerInfo(text) {
  const result = {
    name: '',
    email: '',
    phone: '',
    fax: '',
    website: '',
    contact_person: '',
    vat_number: '',
    company_reg_number: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'DE' // Default to Germany
    }
  };

  // Clean up text
  const cleanText = text.trim();
  const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line);

  // Extract company name (usually first non-empty line or after "Firmenname:")
  const nameMatch = text.match(/(?:Firmenname:|Firma:)\s*([^\n]+)/i) ||
                    text.match(/^([^\n]+(?:GmbH|e\.K|AG|KG|OHG|GbR|UG))/im);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  } else if (lines.length > 0) {
    // First line is likely company name
    result.name = lines[0].replace(/Impressum/i, '').trim();
  }

  // Extract email
  const emailMatch = text.match(/(?:E-?Mail|E-?mail):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    result.email = emailMatch[1].trim();
  }

  // Extract phone (various formats)
  const phoneMatch = text.match(/(?:Tel(?:efon)?\.?|Phone|Telefon):\s*([\+\d\s\(\)\/\-]+)/i);
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Extract fax
  const faxMatch = text.match(/Fax:\s*([\+\d\s\(\)\/\-]+)/i);
  if (faxMatch) {
    result.fax = faxMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Extract website
  const websiteMatch = text.match(/(?:Web|Website|Homepage):\s*(https?:\/\/[^\s\n]+|www\.[^\s\n]+)/i) ||
                       text.match(/(https?:\/\/[^\s\n]+)/);
  if (websiteMatch) {
    let website = websiteMatch[1].trim();
    if (!website.startsWith('http')) {
      website = 'https://' + website;
    }
    result.website = website;
  }

  // Extract contact person (Geschäftsführung, Inhaber, Inhaberin)
  const contactMatch = text.match(/(?:Geschäftsführung|Inhaber(?:in)?|Vertretungsberechtigte?r?):\s*([^\n]+)/i);
  if (contactMatch) {
    result.contact_person = contactMatch[1].trim().split(',')[0].trim(); // Take first person if multiple
  }

  // Extract VAT number (USt-ID, Umsatzsteuer-ID)
  const vatMatch = text.match(/(?:USt[.\s-]*Ident[.\s-]*Nr\.?|Umsatzsteuer-ID|VAT):\s*([A-Z]{2}\s*[\d\s]+)/i);
  if (vatMatch) {
    result.vat_number = vatMatch[1].trim().replace(/\s+/g, '');
  }

  // Extract company registration number (HRB, HRA)
  const regMatch = text.match(/(?:Handelsregister-Nr\.?|HRB|HRA):\s*([A-Z]*\s*\d+[A-Z]*)/i) ||
                   text.match(/(?:Amtsgericht\s+\w+)\s+(HRB|HRA)\s*(\d+[A-Z]*)/i);
  if (regMatch) {
    result.company_reg_number = (regMatch[2] || regMatch[1]).trim();
  }

  // Extract address
  // Pattern 1: Street + Number
  const streetMatch = text.match(/(?:Anschrift:|Adresse:)?\s*([A-Za-zäöüÄÖÜß\-\s\.]+\s+\d+[a-z]?)\s*,?\s*(?:D-?)?\s*(\d{5})\s+([A-Za-zäöüÄÖÜß\-\s]+)/im) ||
                     text.match(/([A-Za-zäöüÄÖÜß\-\s\.]+\s+\d+[a-z]?)\s*\n\s*(?:D-?)?\s*(\d{5})\s+([A-Za-zäöüÄÖÜß\-\s]+)/im);

  if (streetMatch) {
    result.address.street = streetMatch[1].trim();
    result.address.zip = streetMatch[2].trim();
    result.address.city = streetMatch[3].trim();
  } else {
    // Try simpler pattern
    const simpleStreetMatch = text.match(/([A-Za-zäöüÄÖÜß\-\s\.]+\s+\d+[a-z]?)/);
    if (simpleStreetMatch) {
      result.address.street = simpleStreetMatch[1].trim();
    }

    const zipCityMatch = text.match(/(?:D-?)?\s*(\d{5})\s+([A-Za-zäöüÄÖÜß\-\s]+)/);
    if (zipCityMatch) {
      result.address.zip = zipCityMatch[1].trim();
      result.address.city = zipCityMatch[2].trim();
    }
  }

  return result;
}

/**
 * Extract key-value pairs from text
 * Useful for structured data like "Key: Value" format
 */
export function extractKeyValuePairs(text) {
  const pairs = {};
  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2].trim();
      pairs[key] = value;
    }
  }

  return pairs;
}

/**
 * Clean and normalize phone numbers
 */
export function normalizePhone(phone) {
  return phone.replace(/\s+/g, ' ').replace(/\//g, '-');
}

/**
 * Generate slug from company name
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => {
      const map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return map[match] || match;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
