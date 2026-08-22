/**
 * Shared utility for sanitizing raw HTML tags, VTT macros (@Embed, @UUID, @Compendium),
 * and 5eTools markup tags into clean Markdown formatting.
 */
export class TextSanitizer {
  public static cleanHtmlAndMacros(input: string): string {
    if (!input) return '';
    let str = String(input);

    // 1. Clean VTT Macros & Embeds
    // @UUID[Compendium.dnd5e.rules...]{Label} -> Label
    str = str.replace(/@(UUID|Compendium|JournalEntry)\[[^\]]+\]\{([^}]+)\}/gi, '$2');

    // @Embed[Compendium...inline] -> replace with readable embedded section indicator
    str = str.replace(/@Embed\[Compendium\.([^\.\]]+\.)*JournalEntryPage\.([^\.\]]+)\]/gi, '*[Встроенный раздел правил]*');
    str = str.replace(/@Embed\[[^\]]+\]/gi, '*[Встроенный элемент]*');

    // @UUID[...] or @Compendium[...] without label -> extract last path component or label
    str = str.replace(/@(UUID|Compendium|JournalEntry)\[([^\]]+)\]/gi, (_, _type, path) => {
      const parts = path.split('.');
      const last = parts[parts.length - 1];
      return `**${last || 'Ссылка'}**`;
    });

    // @Check[type:dc] -> DC
    str = str.replace(/@Check\[[^\]]*dc:(\d+)[^\]]*\]/gi, 'СЛ $1');
    str = str.replace(/@Check\[[^\]]*\]/gi, 'Проверка');
    str = str.replace(/@Damage\[[^\]]+\]/gi, 'Урон');

    // 1b. Clean Foundry VTT Double Bracket Inline Rolls / Enrichers
    // Handle inline rolls/enrichers with custom labels: [[/item .A3q2gTNqG6fvNgrv]]{disguise self} -> **disguise self**
    str = str.replace(/\[\[[^\]]+\]\]\{([^}]+)\}/gi, '**$1**');

    // Handle slash commands without labels
    // [[/attack]] or [[/attack extended]]
    str = str.replace(/\[\[\s*\/attack(?:\s+[^\]]+)?\]\]/gi, '⚔️ Атака');
    // [[/damage]] or [[/damage extended]]
    str = str.replace(/\[\[\s*\/damage(?:\s+[^\]]+)?\]\]/gi, '💥 Урон');

    // [[/check dex]] or [[/save dex]]
    str = str.replace(/\[\[\s*\/check\s+([^\]]+)\]\]/gi, 'Проверка: $1');
    str = str.replace(/\[\[\s*\/save\s+([^\]]+)\]\]/gi, 'Спасбросок: $1');

    // [[/r 1d20+5]] or [[/roll 1d20+5]] or [[/damage 1d6]] -> 1d20+5
    str = str.replace(/\[\[\s*\/(?:r|roll|damage)\s+([^\]]+)\]\]/gi, '$1');

    // Generic double brackets [[1d20+5]] -> 1d20+5
    str = str.replace(/\[\[([^\]]+)\]\]/gi, '$1');

    // 2. Clean 5eTools markup tags {@spell fireball|phb} -> fireball
    str = str.replace(/\{@(damage|dice|d20|hit|savingThrow|scaledamage|scaledice)\s+([^}]+)\}/gi, '$2');
    str = str.replace(/\{@(spell|item|creature|skill|condition|sense|hazard|action|race|background|feat)\s+([^}|]+)(?:\|[^}]+)?\}/gi, '$2');
    str = str.replace(/\{@b\s+([^}]+)\}/gi, '**$1**');
    str = str.replace(/\{@i\s+([^}]+)\}/gi, '*$1*');
    str = str.replace(/\{@note\s+([^}]+)\}/gi, '> $1');

    // 3. Convert HTML Headings to Markdown
    str = str.replace(/<h1\b[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
    str = str.replace(/<h2\b[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
    str = str.replace(/<h3\b[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
    str = str.replace(/<h[4-6]\b[^>]*>(.*?)<\/h[4-6]>/gi, '\n\n#### $1\n\n');

    // 4. Convert HTML Formatting to Markdown
    str = str.replace(/<(strong|b)\b[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    str = str.replace(/<(em|i)\b[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
    str = str.replace(/<p\b[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    str = str.replace(/<br\s*\/?>/gi, '\n');
    str = str.replace(/<li\b[^>]*>(.*?)<\/li>/gi, '- $1\n');

    // 5. Strip any remaining raw HTML tags
    str = str.replace(/<[^>]+>/g, '');

    // 6. Normalize whitespace
    str = str.replace(/\n{3,}/g, '\n\n').trim();

    return str;
  }
}
