import sys

with open("server.ts", "r") as f:
    content = f.read()

route = """
  app.post('/api/fs/write', (req, res) => {
    try {
      const { rootPath, subPath, fileName, data } = req.body;
      if (!subPath || !fileName || !data) {
        res.status(400).json({ error: 'Missing subPath, fileName, or data' });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      
      // Default to process.cwd()/assets if rootPath is not provided or not absolute
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
      
      if (!fs.existsSync(currentDir)) {
        fs.mkdirSync(currentDir, { recursive: true });
      }
      
      const filePath = path.join(currentDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      res.json({ success: true, filePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to write file' });
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
