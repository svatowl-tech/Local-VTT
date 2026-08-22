import sys

with open("src/services/worldLoreService.ts", "r") as f:
    content = f.read()

import_statement = "import { writeDataToContentFolder } from './universalSyncManager';\n"
if "import { writeDataToContentFolder }" not in content:
    content = import_statement + content

new_save = """  public async saveItem(item: WorldLoreItem): Promise<WorldLoreItem> {
    await this.init();
    const updated: WorldLoreItem = {
      ...item,
      updatedAt: Date.now(),
      createdAt: item.createdAt || Date.now(),
    };
    this.memoryLoreItems.set(updated.id, updated);
    await this.persist();

    // Persist as individual JSON file on disk
    const worldFolder = item.worldId.includes('faerun')
      ? 'Faerun_DND5e'
      : item.worldId.includes('eberron')
      ? 'Eberron_DND5e'
      : item.worldId.includes('night_city')
      ? 'Cyberpunk_RED'
      : item.worldId.includes('arkham')
      ? 'Call_of_Cthulhu'
      : 'Generic_Worlds';

    const cleanFilename = `lore_${item.category}_${item.id}.json`;
    await writeDataToContentFolder(['lore', worldFolder], cleanFilename, updated);
    return updated;
  }"""

start = content.find("public async saveItem(item: WorldLoreItem): Promise<WorldLoreItem> {")
if start != -1:
    end = content.find("  public async deleteItem", start)
    content = content[:start] + new_save + "\n\n" + content[end:]
    with open("src/services/worldLoreService.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find method")
