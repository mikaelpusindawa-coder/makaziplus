import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

// ============================================================
// TRANSLATIONS
// ============================================================

const translations = {
  en: {
    // Common
    app_name: 'MakaziPlus',
    tagline: 'Home in Your Hand',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    all: 'All',
    
    // Navigation
    home: 'Home',
    search_nav: 'Search',
    add_property: 'Add Property',
    chat: 'Chat',
    account: 'Account',
    dashboard: 'Dashboard',
    favorites: 'Favorites',
    notifications: 'Notifications',
    profile: 'Profile',
    subscription: 'Subscription',
    admin: 'Admin',
    help: 'Help & Support',
    
    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm Password',
    name: 'Full Name',
    phone: 'Phone Number',
    forgot_password: 'Forgot Password?',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    signup_here: 'Sign up here',
    login_here: 'Login here',
    
    // Roles
    customer: 'Customer',
    agent: 'Agent',
    owner: 'Owner',
    admin_role: 'Admin',
    
    // Property
    property: 'Property',
    properties: 'Properties',
    price: 'Price',
    location: 'Location',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    size: 'Size (m²)',
    description: 'Description',
    amenities: 'Amenities',
    images: 'Images',
    type: 'Type',
    rent: 'Rent',
    sale: 'Sale',
    available: 'Available',
    sold: 'Sold',
    rented: 'Rented',
    pending: 'Pending',
    premium: 'Premium',
    views: 'Views',
    contact: 'Contact',
    book_now: 'Book Now',
    chat_now: 'Chat Now',
    call_now: 'Call Now',
    share: 'Share',
    favourite: 'Favorite',
    added: 'Added',
    
    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    days_ago: 'days ago',
    weeks_ago: 'weeks ago',
    months_ago: 'months ago',
    years_ago: 'years ago',
    just_now: 'Just now',
    
    // Messages
    message: 'Message',
    type_message: 'Type a message...',
    online: 'Online',
    offline: 'Offline',
    typing: 'Typing...',
    conversations: 'conversations',
    no_conversations: 'No conversations yet',
    start_chat: 'Start a conversation',
    
    // Ratings
    rating: 'Rating',
    reviews: 'Reviews',
    write_review: 'Write a Review',
    rate_experience: 'Rate your experience',
    excellent: 'Excellent!',
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
    terrible: 'Terrible',
    
    // Verification
    verify_account: 'Verify Account',
    verification: 'Verification',
    id_type: 'ID Type',
    id_number: 'ID Number',
    nida: 'NIDA (20 digits)',
    passport: 'Passport',
    driving_license: "Driver's License",
    tin: 'TIN',
    upload_document: 'Upload Document',
    upload_front: 'Upload Front Side',
    upload_back: 'Upload Back Side',
    upload_selfie: 'Upload Selfie with ID',
    verified: 'Verified',
    unverified: 'Unverified',
    pending_verification: 'Pending Verification',
    verification_submitted: 'Verification Submitted',
    
    // Bookings
    booking: 'Booking',
    bookings: 'Bookings',
    check_in: 'Check-in Date',
    check_out: 'Check-out Date',
    guests: 'Number of Guests',
    special_requests: 'Special Requests',
    total: 'Total',
    confirm_booking: 'Confirm Booking',
    booking_confirmed: 'Booking Confirmed',
    booking_cancelled: 'Booking Cancelled',
    
    // Payments
    payment: 'Payment',
    payments: 'Payments',
    pay_now: 'Pay Now',
    payment_method: 'Payment Method',
    mpesa: 'M-Pesa',
    airtel: 'Airtel Money',
    tigo: 'Tigo Pesa',
    amount: 'Amount',
    transaction_id: 'Transaction ID',
    payment_success: 'Payment Successful!',
    payment_failed: 'Payment Failed',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    notifications_settings: 'Notifications',
    email_notifications: 'Email Notifications',
    sms_notifications: 'SMS Notifications',
    push_notifications: 'Push Notifications',
    privacy_policy: 'Privacy Policy',
    terms_of_service: 'Terms of Service',
    
    // Errors
    error: 'Error',
    network_error: 'Network Error',
    please_login: 'Please login to continue',
    please_fill_fields: 'Please fill all required fields',
    invalid_email: 'Invalid email address',
    invalid_phone: 'Invalid phone number',
    password_too_short: 'Password must be at least 8 characters',
    passwords_do_not_match: 'Passwords do not match',
    
    // Success
    success: 'Success',
    profile_updated: 'Profile updated successfully!',
    password_changed: 'Password changed successfully!',
    property_added: 'Property added successfully!',
    property_updated: 'Property updated successfully!',
    property_deleted: 'Property deleted successfully!',
    review_added: 'Thank you for your review!',
    rating_added: 'Thank you for your rating!',
  },
  
  sw: {
    // Common
    app_name: 'MakaziPlus',
    tagline: 'Makazi Kiganjani',
    loading: 'Inapakia...',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    edit: 'Hariri',
    delete: 'Futa',
    back: 'Rudi',
    next: 'Endelea',
    submit: 'Wasilisha',
    search: 'Tafuta',
    filter: 'Chuja',
    clear: 'Futa',
    all: 'Zote',
    
    // Navigation
    home: 'Nyumbani',
    search_nav: 'Tafuta',
    add_property: 'Ongeza Mali',
    chat: 'Gumzo',
    account: 'Akaunti',
    dashboard: 'Dashibodi',
    favorites: 'Zilizohifadhiwa',
    notifications: 'Arifa',
    profile: 'Profaili',
    subscription: 'Usajili',
    admin: 'Msimamizi',
    help: 'Msaada',
    
    // Auth
    login: 'Ingia',
    register: 'Jisajili',
    logout: 'Toka',
    email: 'Barua Pepe',
    password: 'Nywila',
    confirm_password: 'Thibitisha Nywila',
    name: 'Jina Kamili',
    phone: 'Nambari ya Simu',
    forgot_password: 'Umesahau nywila?',
    no_account: 'Huna akaunti?',
    have_account: 'Una akaunti tayari?',
    signup_here: 'Jisajili hapa',
    login_here: 'Ingia hapa',
    
    // Roles
    customer: 'Mteja',
    agent: 'Dalali',
    owner: 'Mwenye Nyumba',
    admin_role: 'Msimamizi',
    
    // Property
    property: 'Mali',
    properties: 'Mali',
    price: 'Bei',
    location: 'Eneo',
    bedrooms: 'Vyumba',
    bathrooms: 'Bafu',
    size: 'Ukubwa (m²)',
    description: 'Maelezo',
    amenities: 'Huduma',
    images: 'Picha',
    type: 'Aina',
    rent: 'Kukodi',
    sale: 'Kuuza',
    available: 'Inapatikana',
    sold: 'Imeuzwa',
    rented: 'Imekodishwa',
    pending: 'Inasubiri',
    premium: 'Premium',
    views: 'Maoni',
    contact: 'Wasiliana',
    book_now: 'Book Sasa',
    chat_now: 'Ongea Sasa',
    call_now: 'Piga Sasa',
    share: 'Shiriki',
    favourite: 'Hifadhi',
    added: 'Imeongezwa',
    
    // Time
    today: 'Leo',
    yesterday: 'Jana',
    days_ago: 'siku zilizopita',
    weeks_ago: 'wiki zilizopita',
    months_ago: 'miezi iliyopita',
    years_ago: 'miaka iliyopita',
    just_now: 'Sasa hivi',
    
    // Messages
    message: 'Ujumbe',
    type_message: 'Andika ujumbe...',
    online: 'Mtandaoni',
    offline: 'Mtuoni',
    typing: 'Anaandika...',
    conversations: 'mazungumzo',
    no_conversations: 'Hakuna mazungumzo bado',
    start_chat: 'Anza mazungumzo',
    
    // Ratings
    rating: 'Tathmini',
    reviews: 'Maoni',
    write_review: 'Andika Maoni',
    rate_experience: 'Kadiria uzoefu wako',
    excellent: 'Bora kabisa!',
    good: 'Nzuri',
    average: 'Sawa',
    poor: 'Mbaya',
    terrible: 'Mbaya sana',
    
    // Verification
    verify_account: 'Thibitisha Akaunti',
    verification: 'Uthibitisho',
    id_type: 'Aina ya Kitambulisho',
    id_number: 'Namba ya Kitambulisho',
    nida: 'NIDA (Tarakimu 20)',
    passport: 'Pasipoti',
    driving_license: 'Leseni ya Dereva',
    tin: 'Namba ya Kodi',
    upload_document: 'Pakia Hati',
    upload_front: 'Pakia Upande wa Mbele',
    upload_back: 'Pakia Upande wa Nyuma',
    upload_selfie: 'Pakia Selfie na Kitambulisho',
    verified: 'Imethibitishwa',
    unverified: 'Haijathibitishwa',
    pending_verification: 'Inasubiri Uthibitisho',
    verification_submitted: 'Ombi Limetumwa',
    
    // Bookings
    booking: 'Booking',
    bookings: 'Bookings',
    check_in: 'Tarehe ya Kuingia',
    check_out: 'Tarehe ya Kutoka',
    guests: 'Idadi ya Wageni',
    special_requests: 'Maombi Maalum',
    total: 'Jumla',
    confirm_booking: 'Thibitisha Booking',
    booking_confirmed: 'Booking Imethibitishwa',
    booking_cancelled: 'Booking Imefutwa',
    
    // Payments
    payment: 'Malipo',
    payments: 'Malipo',
    pay_now: 'Lipa Sasa',
    payment_method: 'Njia ya Malipo',
    mpesa: 'M-Pesa',
    airtel: 'Airtel Money',
    tigo: 'Tigo Pesa',
    amount: 'Kiasi',
    transaction_id: 'Namba ya Muamala',
    payment_success: 'Malipo Yamefanikiwa!',
    payment_failed: 'Malipo Yameshindikana',
    
    // Settings
    settings: 'Mipangilio',
    language: 'Lugha',
    theme: 'Mandhari',
    notifications_settings: 'Arifa',
    email_notifications: 'Arifa za Barua Pepe',
    sms_notifications: 'Arifa za SMS',
    push_notifications: 'Arifa za Push',
    privacy_policy: 'Sera ya Faragha',
    terms_of_service: 'Masharti ya Matumizi',
    
    // Errors
    error: 'Hitilafu',
    network_error: 'Hitilafu ya Mtandao',
    please_login: 'Tafadhali ingia kuendelea',
    please_fill_fields: 'Tafadhali jaza sehemu zote zinazohitajika',
    invalid_email: 'Barua pepe si sahihi',
    invalid_phone: 'Nambari ya simu si sahihi',
    password_too_short: 'Nywila lazima iwe na herufi 8 au zaidi',
    passwords_do_not_match: 'Nywila hazifanani',
    
    // Success
    success: 'Imefanikiwa',
    profile_updated: 'Profaili imesasishwa!',
    password_changed: 'Nywila imebadilishwa!',
    property_added: 'Mali imeongezwa!',
    property_updated: 'Mali imesasishwa!',
    property_deleted: 'Mali imefutwa!',
    review_added: 'Asante kwa maoni yako!',
    rating_added: 'Asante kwa tathmini yako!',
  }
};

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('mp_language');
    return saved && (saved === 'en' || saved === 'sw') ? saved : 'sw';
  });
  const [t, setT] = useState(translations[language]);

  useEffect(() => {
    setT(translations[language]);
    localStorage.setItem('mp_language', language);
    
    // Update html lang attribute
    document.documentElement.lang = language === 'sw' ? 'sw' : 'en';
    
    // Save to backend if user is logged in
    const token = localStorage.getItem('mp_token');
    if (token) {
      api.patch('/settings', { language }).catch(() => {});
    }
  }, [language]);

  const changeLanguage = (lang) => {
    if (lang === 'en' || lang === 'sw') {
      setLanguage(lang);
    }
  };

  const translate = (key) => {
    return t[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t: translate, translations: t }}>
      {children}
    </LanguageContext.Provider>
  );
};