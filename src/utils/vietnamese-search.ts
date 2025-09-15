/**
 * Utility functions for Vietnamese text search
 */

/**
 * Remove Vietnamese diacritics (tone marks) from text
 * This helps with search when users type without tone marks
 */
export function removeVietnameseDiacritics(text: string): string {
  if (!text) return '';
  
  // Vietnamese character mappings
  const map: Record<string, string> = {
    // Lowercase
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'đ': 'd',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    
    // Uppercase
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'Đ': 'D',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
  };

  return text.split('').map(char => map[char] || char).join('');
}

/**
 * Normalize text for search (remove diacritics and convert to uppercase)
 */
export function normalizeForSearch(text: string): string {
  return removeVietnameseDiacritics(text).toUpperCase();
}

/**
 * Create search pattern for Vietnamese text
 * Returns both original and normalized patterns
 */
export function createVietnameseSearchPatterns(query: string): {
  original: string;
  normalized: string;
  patterns: string[];
} {
  const original = query;
  const normalized = normalizeForSearch(query);
  
  // Create various patterns for flexible matching
  const patterns = [
    original,                    // Original query
    normalized,                  // Normalized query
    `%${original}%`,            // Contains original
    `%${normalized}%`,          // Contains normalized
    `${original}%`,             // Starts with original
    `${normalized}%`,           // Starts with normalized
  ];
  
  return {
    original,
    normalized,
    patterns: [...new Set(patterns)] // Remove duplicates
  };
}

/**
 * Check if text matches query (with Vietnamese normalization)
 */
export function matchesVietnameseText(text: string, query: string): boolean {
  if (!text || !query) return false;
  
  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);
  
  return normalizedText.includes(normalizedQuery);
}

/**
 * Get match score for Vietnamese text search
 * Lower score = better match
 */
export function getVietnameseMatchScore(text: string, query: string): number {
  if (!text || !query) return 999;
  
  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);
  
  // Exact match
  if (normalizedText === normalizedQuery) return 1;
  
  // Starts with
  if (normalizedText.startsWith(normalizedQuery)) return 2;
  
  // Word boundary match
  if (normalizedText.includes(' ' + normalizedQuery)) return 3;
  
  // Contains
  if (normalizedText.includes(normalizedQuery)) return 4;
  
  // No match
  return 999;
}