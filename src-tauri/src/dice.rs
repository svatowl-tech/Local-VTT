use crate::types::{DiceDistributionResult, DiceRollResult};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Fast pseudo-random number generator (Xorshift64Star)
pub struct FastRng {
    state: u64,
}

impl FastRng {
    pub fn new() -> Self {
        let seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x853c49e6748fea9b);
        let non_zero_seed = if seed == 0 { 0x123456789ABCDEF } else { seed };
        Self { state: non_zero_seed }
    }

    #[inline]
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.state = x;
        x.wrapping_mul(0x2545F4914F6CDD1D)
    }

    #[inline]
    pub fn roll_die(&mut self, sides: u32) -> u32 {
        if sides <= 1 {
            return 1;
        }
        ((self.next_u64() % (sides as u64)) + 1) as u32
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParsedDiceTerm {
    pub count: u32,
    pub sides: u32,
    pub keep_highest: Option<u32>,
    pub keep_lowest: Option<u32>,
    pub is_exploding: bool,
    pub is_subtraction: bool,
}

/// Parses dice notation strings like "4d6kh3 + 2d8 - 3 + 1d20"
pub fn parse_dice_expression(expression: &str) -> (Vec<ParsedDiceTerm>, i32) {
    let clean = expression.replace(' ', "").to_lowercase();
    let mut terms = Vec::new();
    let mut modifier = 0;

    let mut current_token = String::new();
    let mut is_sub = false;

    let flush_token = |token: &str, sub: bool, terms: &mut Vec<ParsedDiceTerm>, mod_val: &mut i32| {
        if token.is_empty() {
            return;
        }

        if token.contains('d') {
            let parts: Vec<&str> = token.split('d').collect();
            let count = parts[0].parse::<u32>().unwrap_or(1).clamp(1, 100);
            let rest = parts.get(1).unwrap_or(&"6");

            let exploding = rest.contains('!');
            let clean_rest = rest.replace('!', "");

            let (sides, keep_h, keep_l) = if clean_rest.contains("kh") {
                let kh_parts: Vec<&str> = clean_rest.split("kh").collect();
                let s = kh_parts[0].parse::<u32>().unwrap_or(6);
                let kh = kh_parts.get(1).and_then(|val| val.parse::<u32>().ok());
                (s, kh, None)
            } else if clean_rest.contains("kl") {
                let kl_parts: Vec<&str> = clean_rest.split("kl").collect();
                let s = kl_parts[0].parse::<u32>().unwrap_or(6);
                let kl = kl_parts.get(1).and_then(|val| val.parse::<u32>().ok());
                (s, None, kl)
            } else {
                let s = clean_rest.parse::<u32>().unwrap_or(6);
                (s, None, None)
            };

            terms.push(ParsedDiceTerm {
                count,
                sides: sides.clamp(2, 1000),
                keep_highest: keep_h,
                keep_lowest: keep_l,
                is_exploding: exploding,
                is_subtraction: sub,
            });
        } else if let Ok(val) = token.parse::<i32>() {
            if sub {
                *mod_val -= val;
            } else {
                *mod_val += val;
            }
        }
    };

    for ch in clean.chars() {
        if ch == '+' || ch == '-' {
            flush_token(&current_token, is_sub, &mut terms, &mut modifier);
            current_token.clear();
            is_sub = ch == '-';
        } else {
            current_token.push(ch);
        }
    }
    flush_token(&current_token, is_sub, &mut terms, &mut modifier);

    (terms, modifier)
}

/// Evaluates a dice roll with detailed breakdowns
pub fn evaluate_roll(expression: &str, extra_modifier: i32) -> DiceRollResult {
    let mut rng = FastRng::new();
    let (terms, base_modifier) = parse_dice_expression(expression);
    let total_modifier = base_modifier + extra_modifier;

    let mut all_rolls = Vec::new();
    let mut terms_breakdown = Vec::new();
    let mut running_total = 0;
    let mut is_crit = false;
    let mut is_fumble = false;

    for term in &terms {
        let mut raw_rolls: Vec<u32> = Vec::new();

        for _ in 0..term.count {
            let mut r = rng.roll_die(term.sides);
            raw_rolls.push(r);

            // Exploding dice check
            if term.is_exploding {
                let mut explosions = 0;
                while r == term.sides && explosions < 5 {
                    r = rng.roll_die(term.sides);
                    raw_rolls.push(r);
                    explosions += 1;
                }
            }
        }

        // Single d20 crit / fumble checks
        if term.count == 1 && term.sides == 20 {
            if raw_rolls.contains(&20) {
                is_crit = true;
            } else if raw_rolls.contains(&1) {
                is_fumble = true;
            }
        }

        // Handle Keep Highest / Keep Lowest
        let mut sorted_indices: Vec<usize> = (0..raw_rolls.len()).collect();
        sorted_indices.sort_by_key(|&idx| raw_rolls[idx]);

        let mut kept_set = vec![true; raw_rolls.len()];

        if let Some(kh) = term.keep_highest {
            let drop_count = raw_rolls.len().saturating_sub(kh as usize);
            for &idx in sorted_indices.iter().take(drop_count) {
                kept_set[idx] = false;
            }
        } else if let Some(kl) = term.keep_lowest {
            let drop_count = raw_rolls.len().saturating_sub(kl as usize);
            for &idx in sorted_indices.iter().rev().take(drop_count) {
                kept_set[idx] = false;
            }
        }

        let mut term_sum = 0i32;
        for (i, &roll_val) in raw_rolls.iter().enumerate() {
            all_rolls.push(roll_val as i32);
            if kept_set[i] {
                term_sum += roll_val as i32;
            }
        }

        if term.is_subtraction {
            running_total -= term_sum;
            terms_breakdown.push(format!("-({:?})", raw_rolls));
        } else {
            running_total += term_sum;
            terms_breakdown.push(format!("+({:?})", raw_rolls));
        }
    }

    let final_total = running_total + total_modifier;
    let formatted = if total_modifier != 0 {
        format!(
            "{} {}{:+}",
            expression,
            terms_breakdown.join(" "),
            total_modifier
        )
    } else {
        format!("{} {}", expression, terms_breakdown.join(" "))
    };

    DiceRollResult {
        total: final_total,
        rolls: all_rolls,
        modifier: total_modifier,
        is_crit,
        is_fumble,
        breakdown: terms_breakdown.join(" "),
        formatted,
    }
}

/// Runs high-speed Monte Carlo simulation (e.g. 50,000 iterations) to compute exact probability curves
pub fn simulate_distribution(expression: &str, iterations: u32) -> DiceDistributionResult {
    let mut rng = FastRng::new();
    let (terms, modifier) = parse_dice_expression(expression);
    let runs = iterations.clamp(100, 100_000);

    let mut histogram: BTreeMap<i32, u32> = BTreeMap::new();
    let mut min_val = i32::MAX;
    let mut max_val = i32::MIN;
    let mut total_sum = 0i64;
    let mut crit_count = 0u32;

    for _ in 0..runs {
        let mut sim_total = 0i32;

        for term in &terms {
            let mut raw_rolls: Vec<u32> = (0..term.count)
                .map(|_| rng.roll_die(term.sides))
                .collect();

            if term.count == 1 && term.sides == 20 && raw_rolls.contains(&20) {
                crit_count += 1;
            }

            if let Some(kh) = term.keep_highest {
                raw_rolls.sort_unstable();
                let kept: u32 = raw_rolls.iter().rev().take(kh as usize).sum();
                sim_total += if term.is_subtraction { -(kept as i32) } else { kept as i32 };
            } else if let Some(kl) = term.keep_lowest {
                raw_rolls.sort_unstable();
                let kept: u32 = raw_rolls.iter().take(kl as usize).sum();
                sim_total += if term.is_subtraction { -(kept as i32) } else { kept as i32 };
            } else {
                let sum: u32 = raw_rolls.iter().sum();
                sim_total += if term.is_subtraction { -(sum as i32) } else { sum as i32 };
            }
        }

        let run_result = sim_total + modifier;
        min_val = min_val.min(run_result);
        max_val = max_val.max(run_result);
        total_sum += run_result as i64;
        *histogram.entry(run_result).or_insert(0) += 1;
    }

    let average = (total_sum as f64) / (runs as f64);

    // Compute standard deviation
    let mut variance_sum = 0.0;
    for (&value, &count) in &histogram {
        let diff = (value as f64) - average;
        variance_sum += (diff * diff) * (count as f64);
    }
    let standard_deviation = (variance_sum / (runs as f64)).sqrt();
    let crit_percentage = (crit_count as f64 / runs as f64) * 100.0;

    DiceDistributionResult {
        expression: expression.to_string(),
        iterations: runs,
        min: if min_val == i32::MAX { 0 } else { min_val },
        max: if max_val == i32::MIN { 0 } else { max_val },
        average,
        standard_deviation,
        crit_percentage,
        histogram,
    }
}
