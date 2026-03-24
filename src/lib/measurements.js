export const ALL_MEASUREMENT_FIELDS = [
  { key: 'neck',     label: 'Neck' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'chest',    label: 'Chest' },
  { key: 'sleeve',   label: 'Sleeve' },
  { key: 'length',   label: 'Length' },
  { key: 'waist',    label: 'Waist' },
  { key: 'hips',     label: 'Hips' },
  { key: 'inseam',   label: 'Inseam' },
  { key: 'thigh',    label: 'Thigh' },
]

export const GARMENT_TEMPLATES = {
  'Mens Shirt': ['neck', 'shoulder', 'chest', 'sleeve', 'length'],
  'Mens Kurta': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist', 'hips'],
  'Mens Sherwani': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist', 'hips'],
  'Mens Waistcoat': ['neck', 'shoulder', 'chest', 'length', 'waist'],
  'Mens Coat / Blazer': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist'],
  'Mens Jacket': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist'],
  'Mens Pant / Trouser': ['waist', 'hips', 'inseam', 'thigh', 'length'],
  'Mens Salwar': ['waist', 'hips', 'inseam', 'thigh', 'length'],
  'Mens Pajama': ['waist', 'hips', 'inseam', 'thigh', 'length'],
  'Mens Dhoti': ['waist', 'length'],
  'Mens Pathani Suit': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist', 'hips', 'inseam'],
  'Mens Safari Suit': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist', 'hips', 'inseam'],
  'Mens Full Suit': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist', 'hips', 'inseam', 'thigh'],
  'Other': ['neck', 'shoulder', 'chest', 'sleeve', 'length', 'waist', 'hips', 'inseam', 'thigh']
}

export function getFieldsForGarment(garmentType) {
  const keys = GARMENT_TEMPLATES[garmentType] || GARMENT_TEMPLATES['Other']
  return ALL_MEASUREMENT_FIELDS.filter(f => keys.includes(f.key))
}
