use wasm_bindgen::prelude::*;
use std::arch::wasm32::*;

// Constants for optimization
const SIMD_WIDTH: usize = 4;
const FIXED_POINT_SHIFT: u32 = 16;
const FIXED_POINT_SCALE: f32 = 65536.0; // 2^16

// Fixed-point kernel for better performance
type FixedPoint = u32;

// Convert float to fixed point
#[inline]
fn to_fixed_point(val: f32) -> FixedPoint {
    (val * FIXED_POINT_SCALE + 0.5) as FixedPoint
}

// Convert fixed point to float (for final conversion)
#[inline]
fn from_fixed_point(val: FixedPoint) -> f32 {
    val as f32 / FIXED_POINT_SCALE
}

// Optimized 1D Gaussian kernel creation with fixed-point arithmetic
#[inline]
pub fn create_gaussian_kernel_fixed(size: usize, sigma: f32) -> Vec<FixedPoint> {
    let mut kernel = Vec::with_capacity(size);
    let mut float_kernel = Vec::with_capacity(size);
    
    let half_size = (size / 2) as i32;
    let neg_inv_2sigma_sq = -1.0 / (2.0 * sigma * sigma);
    let mut sum = 0.0;

    // Calculate kernel values in floating point first
    for i in 0..size {
        let x = i as i32 - half_size;
        let val = ((x * x) as f32 * neg_inv_2sigma_sq).exp();
        float_kernel.push(val);
        sum += val;
    }

    // Normalize and convert to fixed point
    let inv_sum = 1.0 / sum;
    for &val in float_kernel.iter() {
        kernel.push(to_fixed_point(val * inv_sum));
    }

    kernel
}

// Optimized horizontal pass with fixed-point arithmetic
#[target_feature(enable = "simd128")]
#[inline]
unsafe fn horizontal_pass_fixed(
    src: &[u8],
    dst: &mut [u32], // Use u32 for fixed-point intermediate results
    width: usize,
    height: usize,
    kernel: &[FixedPoint],
) {
    let half_kernel = kernel.len() / 2;
    let kernel_len = kernel.len();
    
    // Special optimization for kernel size 3 (most common)
    if kernel_len == 3 {
        horizontal_pass_3x3_fixed(src, dst, width, height, kernel);
        return;
    }
    
    // Special optimization for kernel size 5
    if kernel_len == 5 {
        horizontal_pass_5x5_fixed(src, dst, width, height, kernel);
        return;
    }
    
    // General case with SIMD optimization
    for y in 0..height {
        let row_offset = y * width;
        let src_row = &src[row_offset..row_offset + width];
        let dst_row = &mut dst[row_offset..row_offset + width];
        
        // Process pixels with SIMD when possible
        let simd_end = width.saturating_sub(SIMD_WIDTH);
        let mut x = 0;
        
        while x <= simd_end {
            let mut sum_vec = u32x4_splat(0);
            
            for k_idx in 0..kernel_len {
                let offset = k_idx as isize - half_kernel as isize;
                let kernel_val = u32x4_splat(kernel[k_idx]);
                
                // Load 4 pixels with bounds checking
                let mut pixels = [0u32; 4];
                for i in 0..4 {
                    let px = (x + i) as isize + offset;
                    let px_clamped = px.clamp(0, (width - 1) as isize) as usize;
                    pixels[i] = src_row[px_clamped] as u32;
                }
                
                let pixel_vec = u32x4(pixels[0], pixels[1], pixels[2], pixels[3]);
                
                // Fixed-point multiply and accumulate. Sum won't overflow u32.
                sum_vec = u32x4_add(sum_vec, u32x4_mul(pixel_vec, kernel_val));
            }
            
            // Store results, scaling down to Q8 to prevent overflow in vertical pass
            let scaled_sum = u32x4_shr(sum_vec, 8);
            v128_store(dst_row.as_mut_ptr().add(x) as *mut v128, scaled_sum);
            
            x += 4;
        }
        
        // Handle remaining pixels
        for x in x..width {
            let mut sum = 0u64; // Use u64 to prevent overflow
            for k_idx in 0..kernel_len {
                let offset = k_idx as isize - half_kernel as isize;
                let px = (x as isize + offset).clamp(0, (width - 1) as isize) as usize;
                sum += (src_row[px] as u64) * (kernel[k_idx] as u64);
            }
            dst_row[x] = (sum >> 8) as u32; // Store Q8 result
        }
    }
}

// Specialized 3x3 horizontal pass (most common case)
#[target_feature(enable = "simd128")]
#[inline]
unsafe fn horizontal_pass_3x3_fixed(
    src: &[u8],
    dst: &mut [u32],
    width: usize,
    height: usize,
    kernel: &[FixedPoint],
) {
    let k0 = u32x4_splat(kernel[0]);
    let k1 = u32x4_splat(kernel[1]);
    let k2 = u32x4_splat(kernel[2]);
    
    for y in 0..height {
        let row_offset = y * width;
        let src_row = &src[row_offset..row_offset + width];
        let dst_row = &mut dst[row_offset..row_offset + width];
        
        // First pixel (special case)
        dst_row[0] = kernel[0] * src_row[0] as u32 + 
                     kernel[1] * src_row[0] as u32 + 
                     kernel[2] * src_row[1] as u32;
        
        // SIMD processing for middle pixels
        let mut x = 1;
        let simd_end = width.saturating_sub(SIMD_WIDTH + 1);
        
        while x <= simd_end {
            // Load three sets of 4 pixels with offset
            let left_pixels = u32x4(
                src_row[x - 1] as u32,
                src_row[x] as u32,
                src_row[x + 1] as u32,
                src_row[x + 2] as u32,
            );
            let center_pixels = u32x4(
                src_row[x] as u32,
                src_row[x + 1] as u32,
                src_row[x + 2] as u32,
                src_row[x + 3] as u32,
            );
            let right_pixels = u32x4(
                src_row[x + 1] as u32,
                src_row[x + 2] as u32,
                src_row[x + 3] as u32,
                src_row[(x + 4).min(width - 1)] as u32,
            );
            
            let result = u32x4_add(u32x4_add(
                u32x4_mul(left_pixels, k0),
                u32x4_mul(center_pixels, k1)),
                u32x4_mul(right_pixels, k2));
            
            let scaled_result = u32x4_shr(result, 8);
            v128_store(dst_row.as_mut_ptr().add(x) as *mut v128, scaled_result);
            
            x += 4;
        }
        
        // Handle remaining pixels
        for x in x..width.saturating_sub(1) {
            dst_row[x] = ((kernel[0] as u64 * src_row[x - 1] as u64 + 
                         kernel[1] as u64 * src_row[x] as u64 + 
                         kernel[2] as u64 * src_row[x + 1] as u64) >> 8) as u32;
        }
        
        // Last pixel (special case)
        if width > 1 {
            let last = width - 1;
            dst_row[last] = ((kernel[0] as u64 * src_row[last - 1] as u64 + 
                           kernel[1] as u64 * src_row[last] as u64 + 
                           kernel[2] as u64 * src_row[last] as u64) >> 8) as u32;
        }
    }
}

// Specialized 5x5 horizontal pass
#[target_feature(enable = "simd128")]
#[inline]
unsafe fn horizontal_pass_5x5_fixed(
    src: &[u8],
    dst: &mut [u32],
    width: usize,
    height: usize,
    kernel: &[FixedPoint],
) {
    for y in 0..height {
        let row_offset = y * width;
        let src_row = &src[row_offset..row_offset + width];
        let dst_row = &mut dst[row_offset..row_offset + width];
        
        for x in 0..width {
            let mut sum = 0u64;
            for k_idx in 0..5 {
                let offset = k_idx as isize - 2;
                let px = (x as isize + offset).clamp(0, (width - 1) as isize) as usize;
                sum += (src_row[px] as u64) * (kernel[k_idx] as u64);
            }
            dst_row[x] = (sum >> 8) as u32;
        }
    }
}

// Optimized vertical pass with fixed-point arithmetic
#[target_feature(enable = "simd128")]
#[inline]
unsafe fn vertical_pass_fixed(
    src: &[u32],
    dst: &mut [u8],
    width: usize,
    height: usize,
    kernel: &[FixedPoint],
) {
    let half_kernel = kernel.len() / 2;
    let kernel_len = kernel.len();
    
    // Special optimization for kernel size 3 (most common)
    if kernel_len == 3 {
        vertical_pass_3x3_fixed(src, dst, width, height, kernel);
        return;
    }
    
    for y in 0..height {
        let dst_row = &mut dst[y * width..(y + 1) * width];
        
        // Process with SIMD
        let mut x = 0;
        let simd_end = width.saturating_sub(SIMD_WIDTH);
        
        while x <= simd_end {
            let mut sum_vec_lo = u64x2_splat(0);
            let mut sum_vec_hi = u64x2_splat(0);
            
            for k_idx in 0..kernel_len {
                let offset = k_idx as isize - half_kernel as isize;
                let ny = (y as isize + offset).clamp(0, (height - 1) as isize) as usize;
                let src_offset = ny * width + x;
                
                let kernel_val = kernel[k_idx] as u64;
                let kernel_vec = u64x2_splat(kernel_val);
                
                // Load 4 Q8 pixels 
                let pixels_q8 = v128_load(src.as_ptr().add(src_offset) as *const v128);
                
                // Widen to two u64x2 vectors for multiplication
                let pixels_lo = u64x2(
                    u32x4_extract_lane::<0>(pixels_q8) as u64,
                    u32x4_extract_lane::<1>(pixels_q8) as u64,
                );
                let pixels_hi = u64x2(
                    u32x4_extract_lane::<2>(pixels_q8) as u64,
                    u32x4_extract_lane::<3>(pixels_q8) as u64,
                );
                
                sum_vec_lo = u64x2_add(sum_vec_lo, u64x2_mul(pixels_lo, kernel_vec));
                sum_vec_hi = u64x2_add(sum_vec_hi, u64x2_mul(pixels_hi, kernel_vec));
            }
            
            // Convert Q24 result back to u8
            dst_row[x] = (u64x2_extract_lane::<0>(sum_vec_lo) >> 24).min(255) as u8;
            dst_row[x + 1] = (u64x2_extract_lane::<1>(sum_vec_lo) >> 24).min(255) as u8;
            dst_row[x + 2] = (u64x2_extract_lane::<0>(sum_vec_hi) >> 24).min(255) as u8;
            dst_row[x + 3] = (u64x2_extract_lane::<1>(sum_vec_hi) >> 24).min(255) as u8;
            
            x += 4;
        }
        
        // Handle remaining pixels
        for x in x..width {
            let mut sum = 0u64;
            for k_idx in 0..kernel_len {
                let offset = k_idx as isize - half_kernel as isize;
                let ny = (y as isize + offset).clamp(0, (height - 1) as isize) as usize;
                sum += (src[ny * width + x] as u64) * (kernel[k_idx] as u64);
            }
            let result = (sum >> 24).min(255);
            dst_row[x] = result as u8;
        }
    }
}

// Specialized 3x3 vertical pass (most common case)
#[target_feature(enable = "simd128")]
#[inline]
unsafe fn vertical_pass_3x3_fixed(
    src: &[u32],
    dst: &mut [u8],
    width: usize,
    height: usize,
    kernel: &[FixedPoint],
) {
    let k0 = kernel[0] as u64;
    let k1 = kernel[1] as u64;
    let k2 = kernel[2] as u64;
    
    // First row
    {
        let dst_row = &mut dst[0..width];
        for x in 0..width {
            let sum = k0 * (src[x] as u64) + 
                     k1 * (src[x] as u64) + 
                     k2 * (src[width + x] as u64);
            dst_row[x] = ((sum >> 24).min(255)) as u8;
        }
    }
    
    // Middle rows with SIMD
    for y in 1..height.saturating_sub(1) {
        let dst_row = &mut dst[y * width..(y + 1) * width];
        let mut x = 0;
        
        // SIMD processing
        while x + 4 <= width {
            let above_q16 = v128_load(src.as_ptr().add((y - 1) * width + x) as *const v128);
            let center_q16 = v128_load(src.as_ptr().add(y * width + x) as *const v128);
            let below_q16 = v128_load(src.as_ptr().add((y + 1) * width + x) as *const v128);

            // Widen and multiply
            let k0_vec = u64x2_splat(k0);
            let k1_vec = u64x2_splat(k1);
            let k2_vec = u64x2_splat(k2);

            let above_lo = u64x2(u32x4_extract_lane::<0>(above_q16) as u64, u32x4_extract_lane::<1>(above_q16) as u64);
            let above_hi = u64x2(u32x4_extract_lane::<2>(above_q16) as u64, u32x4_extract_lane::<3>(above_q16) as u64);
            let center_lo = u64x2(u32x4_extract_lane::<0>(center_q16) as u64, u32x4_extract_lane::<1>(center_q16) as u64);
            let center_hi = u64x2(u32x4_extract_lane::<2>(center_q16) as u64, u32x4_extract_lane::<3>(center_q16) as u64);
            let below_lo = u64x2(u32x4_extract_lane::<0>(below_q16) as u64, u32x4_extract_lane::<1>(below_q16) as u64);
            let below_hi = u64x2(u32x4_extract_lane::<2>(below_q16) as u64, u32x4_extract_lane::<3>(below_q16) as u64);

            let sum_lo = u64x2_add(u64x2_add(u64x2_mul(above_lo, k0_vec), u64x2_mul(center_lo, k1_vec)), u64x2_mul(below_lo, k2_vec));
            let sum_hi = u64x2_add(u64x2_add(u64x2_mul(above_hi, k0_vec), u64x2_mul(center_hi, k1_vec)), u64x2_mul(below_hi, k2_vec));

            dst_row[x] = (u64x2_extract_lane::<0>(sum_lo) >> 24).min(255) as u8;
            dst_row[x + 1] = (u64x2_extract_lane::<1>(sum_lo) >> 24).min(255) as u8;
            dst_row[x + 2] = (u64x2_extract_lane::<0>(sum_hi) >> 24).min(255) as u8;
            dst_row[x + 3] = (u64x2_extract_lane::<1>(sum_hi) >> 24).min(255) as u8;
            
            x += 4;
        }
        
        // Handle remaining pixels
        for x in x..width {
            let sum = k0 * (src[(y - 1) * width + x] as u64) + 
                     k1 * (src[y * width + x] as u64) + 
                     k2 * (src[(y + 1) * width + x] as u64);
            dst_row[x] = ((sum >> 24).min(255)) as u8;
        }
    }
    
    // Last row
    if height > 1 {
        let y = height - 1;
        let dst_row = &mut dst[y * width..(y + 1) * width];
        for x in 0..width {
            let sum = k0 * (src[(y - 1) * width + x] as u64) + 
                     k1 * (src[y * width + x] as u64) + 
                     k2 * (src[y * width + x] as u64);
            dst_row[x] = ((sum >> 24).min(255)) as u8;
        }
    }
}

// Main blur function using the optimized fixed-point implementation
#[wasm_bindgen]
pub fn blur(
    grayscale: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    mut sigma: f32,
) -> Vec<u8> {
    // Validate inputs
    if grayscale.len() != width * height {
        panic!("Input array size doesn't match width * height");
    }
    if kernel_size == 0 || kernel_size % 2 == 0 {
        panic!("Kernel size must be odd and greater than 0");
    }

    // Calculate sigma using OpenCV's default formula if not provided
    if sigma <= 0.0 {
        sigma = 0.3 * (((kernel_size - 1) as f32) * 0.5 - 1.0) + 0.8;
    }

    // Use fixed-point kernel for better performance
    let kernel_fixed = create_gaussian_kernel_fixed(kernel_size, sigma);
    
    // Pre-allocate buffers with exact capacity
    let pixel_count = width * height;
    let mut temp_buffer = vec![0u32; pixel_count];
    let mut result = vec![0u8; pixel_count];

    // Execute optimized fixed-point blur
    unsafe {
        horizontal_pass_fixed(grayscale, &mut temp_buffer, width, height, &kernel_fixed);
        vertical_pass_fixed(&temp_buffer, &mut result, width, height, &kernel_fixed);
    }

    result
}
