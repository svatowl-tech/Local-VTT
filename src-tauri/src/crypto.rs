use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Computes a fast 64-bit non-cryptographic hash for rapid object identity checks
pub fn fast_hash_string(input: &str) -> String {
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Computes SHA256-like 64-bit checksum of structured serializable session data
pub fn compute_session_checksum<T: Serialize>(data: &T) -> Result<String, serde_json::Error> {
    let json_bytes = serde_json::to_vec(data)?;
    let mut hasher = DefaultHasher::new();
    json_bytes.hash(&mut hasher);
    Ok(format!("{:016x}", hasher.finish()))
}
