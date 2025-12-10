/**
 * Translation helper utilities for HYBRID translation approach
 * Handles database content with _es and _en suffixes
 */

import { useTranslation } from 'react-i18next';

/**
 * Hook to get localized field from database objects
 * @example
 * const getLocalizedField = useLocalizedField();
 * const title = getLocalizedField(announcement, 'title'); // Returns title_es or title_en based on current language
 */
export const useLocalizedField = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  return <T extends Record<string, any>>(
    obj: T | null | undefined,
    fieldName: string,
    fallbackLang: string = 'es'
  ): string => {
    if (!obj) return '';

    const langSuffix = currentLang === 'en' ? '_en' : '_es';
    const fallbackSuffix = fallbackLang === 'en' ? '_en' : '_es';

    const localizedField = `${fieldName}${langSuffix}`;
    const fallbackField = `${fieldName}${fallbackSuffix}`;

    // Try current language first, then fallback
    return obj[localizedField] || obj[fallbackField] || '';
  };
};

/**
 * Direct function to get localized field (non-hook version)
 * Use this in functions that can't use hooks
 */
export const getLocalizedField = <T extends Record<string, any>>(
  obj: T | null | undefined,
  fieldName: string,
  currentLang: string = 'es',
  fallbackLang: string = 'es'
): string => {
  if (!obj) return '';

  const langSuffix = currentLang === 'en' ? '_en' : '_es';
  const fallbackSuffix = fallbackLang === 'en' ? '_en' : '_es';

  const localizedField = `${fieldName}${langSuffix}`;
  const fallbackField = `${fieldName}${fallbackSuffix}`;

  return obj[localizedField] || obj[fallbackField] || '';
};

/**
 * Type-safe helper for amenities display names
 */
export const getAmenityDisplayName = (
  amenity: {
    display_name_es: string;
    display_name_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!amenity) return '';
  return currentLang === 'en' && amenity.display_name_en
    ? amenity.display_name_en
    : amenity.display_name_es;
};

/**
 * Type-safe helper for amenities rules
 */
export const getAmenityRules = (
  amenity: {
    rules_es?: string | null;
    rules_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!amenity) return '';
  return currentLang === 'en' && amenity.rules_en
    ? amenity.rules_en
    : amenity.rules_es || '';
};

/**
 * Type-safe helper for announcement titles
 */
export const getAnnouncementTitle = (
  announcement: {
    title_es: string;
    title_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!announcement) return '';
  return currentLang === 'en' && announcement.title_en
    ? announcement.title_en
    : announcement.title_es;
};

/**
 * Type-safe helper for announcement content
 */
export const getAnnouncementContent = (
  announcement: {
    content_es: string;
    content_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!announcement) return '';
  return currentLang === 'en' && announcement.content_en
    ? announcement.content_en
    : announcement.content_es;
};

/**
 * Type-safe helper for document titles
 */
export const getDocumentTitle = (
  document: {
    title_es: string;
    title_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!document) return '';
  return currentLang === 'en' && document.title_en
    ? document.title_en
    : document.title_es;
};

/**
 * Type-safe helper for document descriptions
 */
export const getDocumentDescription = (
  document: {
    description_es?: string | null;
    description_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!document) return '';
  return currentLang === 'en' && document.description_en
    ? document.description_en
    : document.description_es || '';
};

/**
 * Type-safe helper for building welcome messages
 */
export const getBuildingWelcomeMessage = (
  building: {
    welcome_message_es?: string | null;
    welcome_message_en?: string | null;
  } | null | undefined,
  currentLang: string = 'es'
): string => {
  if (!building) return '';
  return currentLang === 'en' && building.welcome_message_en
    ? building.welcome_message_en
    : building.welcome_message_es || '';
};

/**
 * Batch translation helper - translates array of objects
 */
export const translateArray = <T extends Record<string, any>>(
  items: T[] | null | undefined,
  fieldName: string,
  currentLang: string = 'es'
): Array<T & { _localized_field: string }> => {
  if (!items || items.length === 0) return [];

  return items.map(item => ({
    ...item,
    _localized_field: getLocalizedField(item, fieldName, currentLang),
  }));
};

/**
 * Get translation status for an object
 * Returns which languages are available for a specific field
 */
export const getTranslationStatus = (
  obj: Record<string, any> | null | undefined,
  fieldName: string
): { hasSpanish: boolean; hasEnglish: boolean } => {
  if (!obj) return { hasSpanish: false, hasEnglish: false };

  return {
    hasSpanish: Boolean(obj[`${fieldName}_es`]),
    hasEnglish: Boolean(obj[`${fieldName}_en`]),
  };
};

/**
 * Check if object has complete translations
 */
export const hasCompleteTranslations = (
  obj: Record<string, any> | null | undefined,
  fieldNames: string[]
): boolean => {
  if (!obj) return false;

  return fieldNames.every(fieldName => {
    const status = getTranslationStatus(obj, fieldName);
    return status.hasSpanish && status.hasEnglish;
  });
};

/**
 * Format enum values for display with translation
 * Maps database enum values to translation keys
 */
export const getEnumTranslationKey = (
  enumType: 'payment_status' | 'concept_type' | 'reservation_status' | 'incident_status' | 'incident_type' | 'user_role',
  value: string
): string => {
  // Return translation key for the enum value
  // e.g., 'paid' -> 'finance.paid'
  const keyMap: Record<string, Record<string, string>> = {
    payment_status: {
      paid: 'finance.paid',
      pending: 'finance.pending',
      overdue: 'finance.overdue',
    },
    concept_type: {
      invoice_credit: 'finance.invoiceCredit',
      invoice_cash: 'finance.invoiceCash',
      receipt: 'finance.receipt',
      credit_note: 'finance.creditNote',
    },
    reservation_status: {
      pending: 'reservations.pending',
      confirmed: 'reservations.confirmed',
      rejected: 'reservations.rejected',
      cancelled: 'reservations.cancelled',
    },
    incident_status: {
      open: 'incidents.open',
      in_progress: 'incidents.inProgress',
      resolved: 'incidents.resolved',
      closed: 'incidents.closed',
    },
    incident_type: {
      maintenance: 'incidents.maintenance',
      complaint: 'incidents.complaint',
      suggestion: 'incidents.suggestion',
    },
    user_role: {
      regular_user: 'roles.regularUser',
      tenant: 'roles.tenant',
      owner: 'roles.owner',
      super_admin: 'roles.superAdmin',
    },
  };

  return keyMap[enumType]?.[value] || value;
};
