use crate::types::{AnimatedEffectItem, EffectNode, ElementalClashResult, SteamVaporEvent};
use std::time::{SystemTime, UNIX_EPOCH};

#[inline]
pub fn distance(x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    ((x2 - x1).powi(2) + (y2 - y1).powi(2)).sqrt()
}

/// Normalizes effect nodes into a guaranteed non-empty vector
pub fn normalize_nodes(effect: &AnimatedEffectItem) -> Vec<EffectNode> {
    if let Some(nodes) = &effect.nodes {
        if !nodes.is_empty() {
            return nodes.clone();
        }
    }
    vec![EffectNode {
        x: effect.x,
        y: effect.y,
        r: effect.radius.max(20.0),
    }]
}

/// Fast Rust welding of newly placed effect nodes into organic ribbon trails
pub fn attach_node(
    mut effect: AnimatedEffectItem,
    new_node: EffectNode,
    min_dist: f64,
    max_connect_dist: f64,
) -> (AnimatedEffectItem, bool) {
    let mut nodes = normalize_nodes(&effect);

    let mut closest_dist = f64::MAX;
    let mut closest_idx = 0;

    for (i, n) in nodes.iter().enumerate() {
        let d = distance(n.x, n.y, new_node.x, new_node.y);
        if d < closest_dist {
            closest_dist = d;
            closest_idx = i;
        }
    }

    if closest_dist < min_dist {
        return (effect, true);
    }

    if closest_dist <= max_connect_dist {
        if closest_idx == nodes.len() - 1 {
            nodes.push(new_node);
        } else if closest_idx == 0 {
            nodes.insert(0, new_node);
        } else {
            nodes.insert(closest_idx + 1, new_node);
        }

        let sum_x: f64 = nodes.iter().map(|n| n.x).sum();
        let sum_y: f64 = nodes.iter().map(|n| n.y).sum();
        let len = nodes.len() as f64;

        effect.x = (sum_x / len).round();
        effect.y = (sum_y / len).round();
        effect.nodes = Some(nodes);

        return (effect, true);
    }

    (effect, false)
}

/// Fast batch elemental clashes (Water extinguishes Fire / creates Steam vapor)
pub fn process_elemental_clashes(effects: Vec<AnimatedEffectItem>) -> ElementalClashResult {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let mut fire_effects: Vec<AnimatedEffectItem> = Vec::new();
    let mut water_effects: Vec<AnimatedEffectItem> = Vec::new();
    let mut other_effects: Vec<AnimatedEffectItem> = Vec::new();

    for mut e in effects {
        e.nodes = Some(normalize_nodes(&e));
        if e.effect_type == "fire" {
            fire_effects.push(e);
        } else if e.effect_type == "water" {
            water_effects.push(e);
        } else {
            other_effects.push(e);
        }
    }

    let mut steam_events: Vec<SteamVaporEvent> = Vec::new();
    let mut modified = false;

    // Node-level collision detection
    for fire in &mut fire_effects {
        let mut surviving_fire_nodes: Vec<EffectNode> = Vec::new();

        if let Some(f_nodes) = &fire.nodes {
            for f_node in f_nodes {
                let mut extinguished = false;

                for water in &water_effects {
                    if let Some(w_nodes) = &water.nodes {
                        for w_node in w_nodes {
                            let d = distance(f_node.x, f_node.y, w_node.x, w_node.y);
                            let combined_r = f_node.r + w_node.r;

                            if d < combined_r * 0.85 {
                                extinguished = true;
                                modified = true;

                                // Spawn steam explosion at contact point
                                steam_events.push(SteamVaporEvent {
                                    id: format!("steam-{}-{}", now, steam_events.len()),
                                    x: (f_node.x + w_node.x) * 0.5,
                                    y: (f_node.y + w_node.y) * 0.5,
                                    radius: (f_node.r + w_node.r) * 0.65,
                                    created_at: now,
                                });
                                break;
                            }
                        }
                    }
                    if extinguished {
                        break;
                    }
                }

                if !extinguished {
                    surviving_fire_nodes.push(f_node.clone());
                }
            }
        }

        fire.nodes = Some(surviving_fire_nodes);
    }

    // Filter out completely extinguished fire effects
    fire_effects.retain(|f| {
        if let Some(nodes) = &f.nodes {
            !nodes.is_empty()
        } else {
            false
        }
    });

    let mut all_updated = Vec::with_capacity(fire_effects.len() + water_effects.len() + other_effects.len());
    all_updated.extend(water_effects);
    all_updated.extend(fire_effects);
    all_updated.extend(other_effects);

    let message = if modified {
        Some(format!("Elemental interaction: {} steam clouds created", steam_events.len()))
    } else {
        None
    };

    ElementalClashResult {
        updated_effects: all_updated,
        steam_events,
        message,
    }
}
