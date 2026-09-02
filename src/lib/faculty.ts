/**
 * Faculty formatting utilities and title types.
 * Standardizes faculty title prefix across the application.
 */

export const FACULTY_TITLES = ["Dr.", "Mr.", "Ms.", "Mrs."] as const;

export type FacultyTitle = typeof FACULTY_TITLES[number];

/**
 * Formats a faculty member's display name with their professional title/prefix.
 *
 * Rules:
 * - If title is provided, formats as: `[Title] [Full Name]` (e.g., "Dr. Rahul Sharma")
 * - If no title is selected or title is empty/null, returns the full name without a prefix.
 * - Prevents accidental duplicate prefix if the stored name already begins with the title.
 * - Trims extraneous whitespace.
 *
 * @param name The raw name of the faculty member
 * @param title The professional title / prefix (Dr., Mr., Ms., Mrs.)
 * @returns Formatted name string
 */
export function formatFacultyName(
  name?: string | null,
  title?: string | null
): string {
  if (!name) return "";
  const trimmedName = name.trim();
  if (!trimmedName) return "";

  if (!title) return trimmedName;
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return trimmedName;

  // Avoid duplicate prefix (e.g. if name is already "Dr. Rahul Sharma")
  if (
    trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase() + " ") ||
    trimmedName.toLowerCase() === trimmedTitle.toLowerCase()
  ) {
    return trimmedName;
  }

  return `${trimmedTitle} ${trimmedName}`;
}
