use crate::types::Combatant;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitiativeState {
    pub combatants: Vec<Combatant>,
    pub current_turn_index: usize,
    pub round_number: u32,
    pub is_active: bool,
}

/// Sorts combatants by initiative descending with tie-breakers (dexterity / players first)
pub fn sort_initiative(combatants: &mut [Combatant]) {
    combatants.sort_by(|a, b| {
        b.initiative
            .cmp(&a.initiative)
            .then_with(|| b.is_player.cmp(&a.is_player))
            .then_with(|| a.name.cmp(&b.name))
    });
}

/// Advances turn order and increments round if cycled
pub fn next_turn(state: &mut InitiativeState) {
    if state.combatants.is_empty() {
        return;
    }

    state.current_turn_index += 1;
    if state.current_turn_index >= state.combatants.len() {
        state.current_turn_index = 0;
        state.round_number += 1;
    }
}

/// Rolls d20 + modifier for a batch of monsters/tokens
pub fn roll_d20_initiative(modifier: i32) -> i32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(42);
    // Simple LCG pseudo-random d20
    let roll = ((seed % 20) + 1) as i32;
    roll + modifier
}
