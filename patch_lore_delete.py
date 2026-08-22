import sys

with open("src/services/worldLoreService.ts", "r") as f:
    content = f.read()

import_statement = "import { writeDataToContentFolder, deleteDataFromContentFolder } from './universalSyncManager';\n"
if "deleteDataFromContentFolder" not in content:
    content = content.replace("import { writeDataToContentFolder } from './universalSyncManager';\n", import_statement)

new_delete = """  public async deleteItem(id: string, worldId?: string): Promise<boolean> {
    await this.init();
    const item = this.memoryLoreItems.get(id);
    const deleted = this.memoryLoreItems.delete(id);
    if (deleted) {
      await this.persist();

      const targetWorldId = worldId || item?.worldId || 'dnd5e_faerun';
      const worldFolder = targetWorldId.includes('faerun')
        ? 'Faerun_DND5e'
        : targetWorldId.includes('eberron')
        ? 'Eberron_DND5e'
        : targetWorldId.includes('night_city')
        ? 'Cyberpunk_RED'
        : targetWorldId.includes('arkham')
        ? 'Call_of_Cthulhu'
        : 'Generic_Worlds';

      const cleanFilename = item ? `lore_${item.category}_${item.id}.json` : `${id}.json`;
      await deleteDataFromContentFolder(['lore', worldFolder], cleanFilename);
    }
    return deleted;
  }"""

start = content.find("public async deleteItem(id: string, worldId?: string): Promise<boolean> {")
if start != -1:
    end = content.find("  public getAllWorlds(): WorldDefinition[] {", start)
    content = content[:start] + new_delete + "\n\n" + content[end:]
    with open("src/services/worldLoreService.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find method")
