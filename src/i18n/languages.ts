// The languages NyayaX offers — English + the 22 scheduled (8th-Schedule)
// languages of India. `native` is the self-name shown on the switcher button
// (e.g. हिंदी / ଓଡ଼ିଆ). `rtl` flags Perso-Arabic scripts so we flip text
// direction. Catalogs that don't yet exist fall back to English automatically.

export interface AppLanguage {
  code: string
  native: string
  english: string
  rtl?: boolean
}

export const LANGUAGES: AppLanguage[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिंदी', english: 'Hindi' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'ur', native: 'اردو', english: 'Urdu', rtl: true },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese' },
  { code: 'mai', native: 'मैथिली', english: 'Maithili' },
  { code: 'sat', native: 'ᱥᱟᱱᱛᱟᱲᱤ', english: 'Santali' },
  { code: 'ks', native: 'کٲشُر', english: 'Kashmiri', rtl: true },
  { code: 'ne', native: 'नेपाली', english: 'Nepali' },
  { code: 'sd', native: 'سنڌي', english: 'Sindhi', rtl: true },
  { code: 'kok', native: 'कोंकणी', english: 'Konkani' },
  { code: 'doi', native: 'डोगरी', english: 'Dogri' },
  { code: 'mni', native: ' মৈতৈলোন্', english: 'Manipuri' },
  { code: 'brx', native: 'बड़ो', english: 'Bodo' },
  { code: 'sa', native: 'संस्कृतम्', english: 'Sanskrit' },
]

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

export function languageByCode(code: string): AppLanguage | undefined {
  const base = code.split('-')[0]
  return LANGUAGES.find((l) => l.code === base)
}
