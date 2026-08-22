import sys

with open("src/services/mapVaultService.ts", "r") as f:
    content = f.read()

import_statement = "import { writeDataToContentFolder } from './universalSyncManager';\n"
if "import { writeDataToContentFolder }" not in content:
    content = import_statement + content

new_persist = """  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Persist all user items (and overridden presets)
        localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(this.items));
        localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(this.categories));
      }
      
      // Also persist universally to the content folder
      writeDataToContentFolder(['data', 'Vault'], 'vault_items.json', this.items).catch(() => {});
      writeDataToContentFolder(['data', 'Vault'], 'vault_categories.json', this.categories).catch(() => {});
      
    } catch (e) {
      console.warn('MapVaultService persist error:', e);
    }
    this.notify();
  }"""

start = content.find("private persist() {")
if start != -1:
    end = content.find("private notify() {", start)
    content = content[:start] + new_persist + "\n\n  " + content[end:]
    with open("src/services/mapVaultService.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find persist method")
