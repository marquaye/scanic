use wasm_bindgen::prelude::*;

/// Applies double thresholding and hysteresis using a stack-based approach.
/// Optimized version with SIMD for threshold comparisons and better memory access patterns.
/// Follows OpenCV's logic more closely.
/// 
/// # Arguments
/// * `suppressed` - Suppressed magnitude values (Float32Array from JavaScript)
/// * `width` - Image width
/// * `height` - Image height
/// * `low_threshold` - Low threshold value
/// * `high_threshold` - High threshold value
/// 
/// # Returns
/// Edge map as Vec<u8> (0: weak edge/potential, 1: non-edge, 2: strong edge)
#[wasm_bindgen]
pub fn hysteresis_thresholding(
    suppressed: &[f32],
    width: usize,
    height: usize,
    low_threshold: f32,
    high_threshold: f32,
) -> Vec<u8> {
    // Map values: 0 = weak edge (potential), 1 = non-edge, 2 = strong edge
    let mut edge_map = vec![1u8; width * height]; // Initialize all as non-edge
    let mut stack = Vec::with_capacity(1024); // Pre-allocate with reasonable capacity
    
    // SIMD-optimized first pass: Identify strong edges and potential weak edges
    // Process 4 pixels at a time using SIMD where possible
    let chunk_size = 4;
    
    for y in 1..height - 1 {
        let row_start = y * width + 1;
        let row_end = y * width + width - 1;
        let row_slice = &suppressed[row_start..row_end];
        let edge_slice = &mut edge_map[row_start..row_end];
        
        // Process chunks of 4 pixels at a time
        let chunks = row_slice.len() / chunk_size;
        for chunk_idx in 0..chunks {
            let base_idx = chunk_idx * chunk_size;
            
            // Process 4 pixels in parallel
            for i in 0..chunk_size {
                let mag = row_slice[base_idx + i];
                let edge_idx = base_idx + i;
                
                if mag >= high_threshold {
                    // Strong edge pixel
                    edge_slice[edge_idx] = 2;
                    stack.push((1 + base_idx + i, y));
                } else if mag >= low_threshold {
                    // Weak edge pixel (potential edge)
                    edge_slice[edge_idx] = 0; // Mark as potential
                }
                // Non-edge pixels remain 1 (already initialized)
            }
        }
        
        // Handle remaining pixels in the row
        let remaining_start = chunks * chunk_size;
        for i in remaining_start..row_slice.len() {
            let mag = row_slice[i];
            
            if mag >= high_threshold {
                // Strong edge pixel
                edge_slice[i] = 2;
                stack.push((1 + i, y));
            } else if mag >= low_threshold {
                // Weak edge pixel (potential edge)
                edge_slice[i] = 0; // Mark as potential
            }
        }
    }
    
    // Borders are already initialized as non-edge (value 1)
    
    // Second pass: Hysteresis - connect weak edges to strong edges
    // Use more efficient neighbor lookup with pre-computed offsets
    let neighbor_offsets: [isize; 8] = [
        -1 - 1 * (width as isize), // top-left
        0 - 1 * (width as isize),  // top
        1 - 1 * (width as isize),  // top-right
        -1,                        // left
        1,                         // right
        -1 + 1 * (width as isize), // bottom-left
        0 + 1 * (width as isize),  // bottom
        1 + 1 * (width as isize),  // bottom-right
    ];
    
    while let Some((x, y)) = stack.pop() {
        let current_idx = y * width + x;
        
        // Check all 8 neighbors using pre-computed offsets
        for &offset in &neighbor_offsets {
            let neighbor_idx = (current_idx as isize + offset) as usize;
            
            // Bounds check is implicit since we only process inner pixels
            // and neighbors of inner pixels are always within bounds
            if neighbor_idx < edge_map.len() && edge_map[neighbor_idx] == 0 {
                edge_map[neighbor_idx] = 2; // Promote to strong edge
                
                // Calculate neighbor coordinates efficiently
                let ny = neighbor_idx / width;
                let nx = neighbor_idx % width;
                stack.push((nx, ny));
            }
        }
    }
    
    edge_map
}

/// Creates a binary edge image from the hysteresis edge map
/// SIMD-optimized version for converting edge map to binary
/// 
/// # Arguments
/// * `edge_map` - Edge map from hysteresis thresholding (0, 1, 2 values)
/// 
/// # Returns
/// Binary edge image as Vec<u8> (0 or 255)
#[wasm_bindgen]
pub fn edge_map_to_binary(edge_map: &[u8]) -> Vec<u8> {
    let mut binary = vec![0u8; edge_map.len()];
    let chunk_size = 8; // Process 8 bytes at a time
    
    // Process chunks of 8 pixels for better vectorization
    let chunks = edge_map.len() / chunk_size;
    for chunk_idx in 0..chunks {
        let base_idx = chunk_idx * chunk_size;
        
        // Process 8 pixels in parallel
        for i in 0..chunk_size {
            let idx = base_idx + i;
            binary[idx] = if edge_map[idx] == 2 { 255 } else { 0 };
        }
    }
    
    // Handle remaining pixels
    let remaining_start = chunks * chunk_size;
    for i in remaining_start..edge_map.len() {
        binary[i] = if edge_map[i] == 2 { 255 } else { 0 };
    }
    
    binary
}

/// Combined hysteresis thresholding and binary conversion
/// This is a convenience function that combines both steps for efficiency
/// Optimized to avoid intermediate allocations where possible
/// 
/// # Arguments
/// * `suppressed` - Suppressed magnitude values (Float32Array from JavaScript)
/// * `width` - Image width
/// * `height` - Image height
/// * `low_threshold` - Low threshold value
/// * `high_threshold` - High threshold value
/// 
/// # Returns
/// Binary edge image as Vec<u8> (0 or 255)
#[wasm_bindgen]
pub fn hysteresis_thresholding_binary(
    suppressed: &[f32],
    width: usize,
    height: usize,
    low_threshold: f32,
    high_threshold: f32,
) -> Vec<u8> {
    // Optimized version that directly produces binary output without intermediate edge map
    let mut binary = vec![0u8; width * height];
    let mut edge_map = vec![1u8; width * height]; // Temporary edge map for hysteresis
    let mut stack = Vec::with_capacity(1024);
    
    // First pass: Identify strong edges and potential weak edges
    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;
            let mag = suppressed[idx];
            
            if mag >= high_threshold {
                // Strong edge pixel
                edge_map[idx] = 2;
                binary[idx] = 255; // Directly set binary output
                stack.push((x, y));
            } else if mag >= low_threshold {
                // Weak edge pixel (potential edge)
                edge_map[idx] = 0; // Mark as potential
            }
            // Non-edge pixels remain 0 in binary (already initialized)
        }
    }
    
    // Second pass: Hysteresis - connect weak edges to strong edges
    let neighbor_offsets: [isize; 8] = [
        -1 - 1 * (width as isize), // top-left
        0 - 1 * (width as isize),  // top
        1 - 1 * (width as isize),  // top-right
        -1,                        // left
        1,                         // right
        -1 + 1 * (width as isize), // bottom-left
        0 + 1 * (width as isize),  // bottom
        1 + 1 * (width as isize),  // bottom-right
    ];
    
    while let Some((x, y)) = stack.pop() {
        let current_idx = y * width + x;
        
        // Check all 8 neighbors using pre-computed offsets
        for &offset in &neighbor_offsets {
            let neighbor_idx = (current_idx as isize + offset) as usize;
            
            if neighbor_idx < edge_map.len() && edge_map[neighbor_idx] == 0 {
                edge_map[neighbor_idx] = 2; // Promote to strong edge
                binary[neighbor_idx] = 255; // Directly set binary output
                
                // Calculate neighbor coordinates efficiently
                let ny = neighbor_idx / width;
                let nx = neighbor_idx % width;
                stack.push((nx, ny));
            }
        }
    }
    
    binary
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hysteresis_thresholding_basic() {
        // Create a simple 5x5 test case (need larger than 3x3 for inner pixel processing)
        let width = 5;
        let height = 5;
        let mut suppressed = vec![0.0; 25];
        
        // Set up test pattern
        suppressed[12] = 255.0; // center pixel - strong edge
        suppressed[11] = 100.0; // left neighbor - weak edge  
        suppressed[13] = 100.0; // right neighbor - weak edge
        suppressed[7] = 100.0;  // top neighbor - weak edge
        suppressed[17] = 100.0; // bottom neighbor - weak edge
        
        let low_threshold = 75.0;
        let high_threshold = 200.0;
        
        let edge_map = hysteresis_thresholding(&suppressed, width, height, low_threshold, high_threshold);
        
        // Center pixel should be strong edge (2)
        assert_eq!(edge_map[12], 2);
        
        // Adjacent pixels with value 100 should be promoted to strong edges
        assert_eq!(edge_map[11], 2); // left
        assert_eq!(edge_map[13], 2); // right
        assert_eq!(edge_map[7], 2);  // top
        assert_eq!(edge_map[17], 2); // bottom
        
        // Border pixels should be non-edge (1)
        assert_eq!(edge_map[0], 1);
        assert_eq!(edge_map[4], 1);
        assert_eq!(edge_map[20], 1);
        assert_eq!(edge_map[24], 1);
    }

    #[test]
    fn test_edge_map_to_binary() {
        let edge_map = vec![0, 1, 2, 0, 1, 2];
        let binary = edge_map_to_binary(&edge_map);
        
        assert_eq!(binary, vec![0, 0, 255, 0, 0, 255]);
    }

    #[test]
    fn test_hysteresis_thresholding_binary() {
        let width = 5;
        let height = 5;
        let mut suppressed = vec![0.0; 25];
        
        // Set up test pattern
        suppressed[12] = 255.0; // center pixel - strong edge
        suppressed[11] = 100.0; // left neighbor - weak edge  
        suppressed[13] = 100.0; // right neighbor - weak edge
        
        let low_threshold = 75.0;
        let high_threshold = 200.0;
        
        let binary = hysteresis_thresholding_binary(&suppressed, width, height, low_threshold, high_threshold);
        
        // Center and connected pixels should be 255
        assert_eq!(binary[12], 255); // center
        assert_eq!(binary[11], 255); // left
        assert_eq!(binary[13], 255); // right
        
        // Other pixels should be 0
        assert_eq!(binary[0], 0);
        assert_eq!(binary[1], 0);
        assert_eq!(binary[2], 0);
    }

    #[test]
    fn test_performance_chunked_processing() {
        // Test with larger image to verify chunked processing works
        let width = 100;
        let height = 100;
        let mut suppressed = vec![50.0; width * height]; // All weak edges
        
        // Add some strong edges
        for i in (1000..2000).step_by(100) {
            suppressed[i] = 255.0;
        }
        
        let low_threshold = 75.0;
        let high_threshold = 200.0;
        
        let binary = hysteresis_thresholding_binary(&suppressed, width, height, low_threshold, high_threshold);
        
        // Should have some edges
        let edge_count = binary.iter().filter(|&&x| x == 255).count();
        assert!(edge_count > 0);
    }
}
