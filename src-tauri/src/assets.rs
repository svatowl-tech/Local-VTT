use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskAssetItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub category: String,
    pub section: String, // "maps" | "props" | "music" | "sfx" | "effects"
    pub format: String,
    pub size_bytes: u64,
    pub modified_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskScanSummary {
    pub root_path: String,
    pub revision: String,
    pub total_files: usize,
    pub maps_count: usize,
    pub props_count: usize,
    pub music_count: usize,
    pub sfx_count: usize,
    pub effects_count: usize,
    pub items: Vec<DiskAssetItem>,
    pub categories_by_section: HashMap<String, Vec<String>>,
}

/// Scans the asset directory tree and groups assets by section and subfolder categories
pub fn scan_assets_folder(root_dir: &Path) -> Result<DiskScanSummary, std::io::Error> {
    let mut items = Vec::new();
    let mut categories_map: HashMap<String, Vec<String>> = HashMap::new();

    let sections = ["maps", "props", "music", "sfx", "effects", "systems", "lore", "data"];
    for section in &sections {
        let section_path = root_dir.join(section);
        if !section_path.exists() {
            let _ = fs::create_dir_all(&section_path);
        }

        let mut section_cats = Vec::new();
        scan_recursive(&section_path, section, &section_path, &mut items, &mut section_cats)?;
        section_cats.sort();
        section_cats.dedup();
        categories_map.insert(section.to_string(), section_cats);
    }

    let maps_count = items.iter().filter(|i| i.section == "maps").count();
    let props_count = items.iter().filter(|i| i.section == "props").count();
    let music_count = items.iter().filter(|i| i.section == "music").count();
    let sfx_count = items.iter().filter(|i| i.section == "sfx").count();
    let effects_count = items.iter().filter(|i| i.section == "effects").count();
    let total_files = items.len();

    let revision = format!("{:x}-{:x}", total_files, items.iter().map(|i| i.modified_ms).sum::<u64>());

    Ok(DiskScanSummary {
        root_path: root_dir.to_string_lossy().to_string(),
        revision,
        total_files,
        maps_count,
        props_count,
        music_count,
        sfx_count,
        effects_count,
        items,
        categories_by_section: categories_map,
    })
}

fn scan_recursive(
    dir: &Path,
    section: &str,
    base_dir: &Path,
    items: &mut Vec<DiskAssetItem>,
    categories: &mut Vec<String>,
) -> Result<(), std::io::Error> {
    if !dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        if file_name.starts_with('.') || file_name == "README.txt" {
            continue;
        }

        if path.is_dir() {
            let cat_name = file_name.clone();
            categories.push(cat_name);
            scan_recursive(&path, section, base_dir, items, categories)?;
        } else if path.is_file() {
            let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
            if is_valid_asset_extension(&ext, section) {
                let metadata = entry.metadata()?;
                let rel_path = path.strip_prefix(base_dir).unwrap_or(&path).to_string_lossy().to_string();
                let parent_folder = path.parent().and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "General".to_string());
                
                let id = format!("{}-{}", section, &rel_path.replace(['/', '\\'], "_"));
                let mtime = metadata.modified().ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);

                items.push(DiskAssetItem {
                    id,
                    name: file_name,
                    path: path.to_string_lossy().to_string(),
                    relative_path: rel_path,
                    category: parent_folder,
                    section: section.to_string(),
                    format: ext,
                    size_bytes: metadata.len(),
                    modified_ms: mtime,
                });
            }
        }
    }

    Ok(())
}

fn is_valid_asset_extension(ext: &str, section: &str) -> bool {
    match section {
        "maps" => ["jpg", "jpeg", "png", "webp", "mp4", "webm", "m4v"].contains(&ext),
        "props" => ["png", "webp", "jpg", "jpeg", "svg"].contains(&ext),
        "music" | "sfx" => ["mp3", "ogg", "wav", "m4a", "flac", "aac"].contains(&ext),
        "effects" => ["webm", "mp4", "gif", "png", "webp"].contains(&ext),
        "systems" | "lore" => ["json", "md", "txt", "yaml", "yml", "pdf", "xml", "csv"].contains(&ext),
        "data" => ["json"].contains(&ext),
        _ => false,
    }
}
