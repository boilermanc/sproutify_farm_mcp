/**
 * Flexible date parser for natural language date inputs
 * Handles formats like: "today", "May 2nd", "5/2", "2025-05-02"
 */

export class DateParser {
  /**
   * Parse natural language date input
   */
  static parseDate(input: string): Date | null {
    const trimmed = input.toLowerCase().trim();
    const now = new Date();

    // Handle "today"
    if (trimmed === 'today') {
      return now;
    }

    // Handle "yesterday"
    if (trimmed === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }

    // Handle "tomorrow"
    if (trimmed === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    // Handle relative days: "3 days ago", "in 5 days"
    const daysAgoMatch = trimmed.match(/^(\d+)\s+days?\s+ago$/);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1]);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      return date;
    }

    const inDaysMatch = trimmed.match(/^in\s+(\d+)\s+days?$/);
    if (inDaysMatch) {
      const daysAhead = parseInt(inDaysMatch[1]);
      const date = new Date(now);
      date.setDate(date.getDate() + daysAhead);
      return date;
    }

    // Try ISO format: 2025-05-02
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try M/D or M/D/YY or M/D/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMatch) {
      const [, month, day, year] = slashMatch;
      const fullYear = year
        ? (year.length === 2 ? 2000 + parseInt(year) : parseInt(year))
        : now.getFullYear();
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }

    // Try "Month DD" or "Month DDth/st/nd/rd": "May 2", "May 2nd"
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthMatch = trimmed.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?$/);
    if (monthMatch) {
      const [, monthStr, day] = monthMatch;
      const monthIndex = monthNames.indexOf(monthStr);
      return new Date(now.getFullYear(), monthIndex, parseInt(day));
    }

    // Try native Date parse as last resort
    try {
      const parsed = new Date(input);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e) {
      // Fall through to return null
    }

    return null;
  }

  /**
   * Validate if a string is a parseable date
   */
  static isValidDate(input: string): boolean {
    return this.parseDate(input) !== null;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];

    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  /**
   * Format date for database (ISO string)
   */
  static formatForDatabase(date: Date): string {
    return date.toISOString();
  }
}
