import sys

with open("server.ts", "r") as f:
    content = f.read()

route = """
  app.post('/api/fs/delete', (req, res) => {
    try {
      const { rootPath, subPath, fileName } = req.body;
      if (!subPath || !fileName) {
        res.status(400).json({ error: 'Missing subPath or fileName' });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      
      let basePath = path.join(process.cwd(), 'assets');
      if (rootPath && path.isAbsolute(rootPath)) {
        basePath = rootPath;
      }

      let currentDir = basePath;
      if (Array.isArray(subPath)) {
        for (const folder of subPath) {
          currentDir = path.join(currentDir, folder);
        }
      } else {
        currentDir = path.join(currentDir, subPath);
      }
      
      const filePath = path.join(currentDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete file' });
    }
  });
"""

insert_idx = content.find("app.post('/api/lore/delete'")
if insert_idx != -1:
    content = content[:insert_idx] + route + "\n  " + content[insert_idx:]
    with open("server.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find insertion point")
