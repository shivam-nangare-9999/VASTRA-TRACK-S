export function formatPhoneForWA(phone) {
  if (!phone) return null;
  // Remove all non-numeric characters
  let digits = phone.toString().replace(/\D/g, '');
  
  if (digits.length === 10) {
    digits = '91' + digits; // Assume India if 10 digits
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // Already correct formatting
  } else if (digits.length > 10) {
    // Other country code, assume clean format without +
  }
  return digits;
}

export function openWhatsApp(phone, message) {
  const formattedPhone = formatPhoneForWA(phone);
  if (!formattedPhone) return false;
  
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
