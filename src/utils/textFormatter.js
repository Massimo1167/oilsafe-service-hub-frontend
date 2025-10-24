/**
 * Utility functions for parsing and formatting markdown-style text.
 * Supports bold (**text**), italic (*text*), and bold-italic (***text***).
 * Used by pdfGenerator.js to render formatted text in PDFs.
 */

/**
 * Parses text with markdown-style formatting and returns an array of text segments with styles.
 *
 * Supported syntax:
 * - **text** → bold
 * - *text* → italic
 * - ***text*** → bolditalic
 *
 * @param {string} text - The input text with markdown formatting
 * @returns {Array<{text: string, style: string}>} - Array of segments with text and style
 *
 * @example
 * parseFormattedText("Normal **bold** and *italic*")
 * // Returns:
 * // [
 * //   { text: "Normal ", style: "normal" },
 * //   { text: "bold", style: "bold" },
 * //   { text: " and ", style: "normal" },
 * //   { text: "italic", style: "italic" }
 * // ]
 */
export const parseFormattedText = (text) => {
    if (!text || typeof text !== 'string') {
        return [{ text: text || '', style: 'normal' }];
    }

    const segments = [];

    // Regex pattern to match markdown formatting
    // Priority: *** (bolditalic) > ** (bold) > * (italic)
    const markdownPattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;

    let match;
    let lastIndex = 0;

    while ((match = markdownPattern.exec(text)) !== null) {
        // Add text before the match as normal
        if (match.index > lastIndex) {
            const normalText = text.substring(lastIndex, match.index);
            if (normalText) {
                segments.push({ text: normalText, style: 'normal' });
            }
        }

        // Determine style and text based on which group matched
        let matchedText = '';
        let style = 'normal';

        if (match[2] !== undefined) {
            // *** ... *** → bolditalic
            matchedText = match[2];
            style = 'bolditalic';
        } else if (match[3] !== undefined) {
            // ** ... ** → bold
            matchedText = match[3];
            style = 'bold';
        } else if (match[4] !== undefined) {
            // * ... * → italic
            matchedText = match[4];
            style = 'italic';
        }

        if (matchedText) {
            segments.push({ text: matchedText, style: style });
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            segments.push({ text: remainingText, style: 'normal' });
        }
    }

    // If no segments were found, return the entire text as normal
    if (segments.length === 0) {
        segments.push({ text: text, style: 'normal' });
    }

    return segments;
};

/**
 * Removes all markdown formatting markers from text, leaving only plain text.
 * Useful for display contexts that don't support formatting (e.g., table cells).
 *
 * @param {string} text - The input text with markdown formatting
 * @returns {string} - Plain text without markdown markers
 *
 * @example
 * stripMarkdown("Text with **bold** and *italic*")
 * // Returns: "Text with bold and italic"
 */
export const stripMarkdown = (text) => {
    if (!text || typeof text !== 'string') {
        return text || '';
    }

    // Remove all markdown markers: ***, **, *
    // Process in order of priority to avoid partial matches
    return text
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // Remove *** ... ***
        .replace(/\*\*(.+?)\*\*/g, '$1')      // Remove ** ... **
        .replace(/\*(.+?)\*/g, '$1');         // Remove * ... *
};

/**
 * Escapes markdown special characters in text.
 * Useful when you want to display literal asterisks without formatting.
 *
 * @param {string} text - The input text
 * @returns {string} - Text with escaped markdown characters
 *
 * @example
 * escapeMarkdown("Use * for multiplication")
 * // Returns: "Use \* for multiplication"
 */
export const escapeMarkdown = (text) => {
    if (!text || typeof text !== 'string') {
        return text || '';
    }

    return text.replace(/\*/g, '\\*');
};
