import sys

with open("src/services/defaultSession.ts", "r") as f:
    content = f.read()

import_statement = "import { writeDataToContentFolder } from './universalSyncManager';\n"
if "import { writeDataToContentFolder }" not in content:
    content = import_statement + content

new_save = """export async function saveLocalSessionState(session: TabletopSessionState): Promise<void> {
  inMemorySessionCache = session;
  await saveIDBSessionState(session);
  // Auto-backup to content folder
  writeDataToContentFolder(['data', 'Sessions'], 'active_session.json', session).catch(() => {});
}"""

start = content.find("export async function saveLocalSessionState")
if start != -1:
    end = content.find("/**\n * Emergency recovery", start)
    content = content[:start] + new_save + "\n\n" + content[end:]
    with open("src/services/defaultSession.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find method")
