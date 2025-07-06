use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

// This is the new SIMD-optimized implementation.
#[cfg(target_arch = "wasm32")]
#[target_feature(enable = "simd128")]
unsafe fn calculate_magnitude_simd(
    dx: &[i16],
    dy: &[i16],
    magnitude: &mut [f32],
    l2_gradient: bool,
) {
    let chunks = dx.len() / 4;
    for i in 0..chunks {
        let idx = i * 4;
        
        let gx1 = dx[idx] as f32;
        let gx2 = dx[idx + 1] as f32;
        let gx3 = dx[idx + 2] as f32;
        let gx4 = dx[idx + 3] as f32;
        let gx_vec = f32x4(gx1, gx2, gx3, gx4);

        let gy1 = dy[idx] as f32;
        let gy2 = dy[idx + 1] as f32;
        let gy3 = dy[idx + 2] as f32;
        let gy4 = dy[idx + 3] as f32;
        let gy_vec = f32x4(gy1, gy2, gy3, gy4);

        let mag_vec = if l2_gradient {
            let gx2_vec = f32x4_mul(gx_vec, gx_vec);
            let gy2_vec = f32x4_mul(gy_vec, gy_vec);
            f32x4_sqrt(f32x4_add(gx2_vec, gy2_vec))
        } else {
            f32x4_add(f32x4_abs(gx_vec), f32x4_abs(gy_vec))
        };

        let mag_ptr = magnitude.as_mut_ptr().add(idx) as *mut v128;
        v128_store(mag_ptr, mag_vec);
    }

    // Handle remainder scalar
    for i in (chunks * 4)..dx.len() {
        let gx = dx[i] as f32;
        let gy = dy[i] as f32;
        if l2_gradient {
            magnitude[i] = (gx * gx + gy * gy).sqrt();
        } else {
            magnitude[i] = gx.abs() + gy.abs();
        }
    }
}


#[wasm_bindgen]
pub fn non_maximum_suppression(
    dx: &[i16],
    dy: &[i16],
    width: usize,
    height: usize,
    l2_gradient: bool,
) -> Vec<f32> {
    let mut magnitude = vec![0.0f32; width * height];
    let mut suppressed = vec![0.0f32; width * height];

    // Calculate magnitude for all pixels first
    #[cfg(target_arch = "wasm32")]
    unsafe {
        calculate_magnitude_simd(dx, dy, &mut magnitude, l2_gradient);
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        for i in 0..dx.len() {
            let gx = dx[i] as f32;
            let gy = dy[i] as f32;
            if l2_gradient {
                magnitude[i] = (gx * gx + gy * gy).sqrt();
            } else {
                magnitude[i] = gx.abs() + gy.abs(); // L1 norm
            }
        }
    }

    // Perform non-maximum suppression
    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;
            let mag = magnitude[idx];

            if mag == 0.0 {
                suppressed[idx] = 0.0;
                continue;
            }

            let gx = dx[idx] as f32;
            let gy = dy[idx] as f32;

            let neighbor1;
            let neighbor2;

            let abs_gx = gx.abs();
            let abs_gy = gy.abs();

            // The constant 2.4142 is tan(67.5 degrees), which is used to partition
            // the gradient direction into 45-degree sectors. This is an approximation
            // of the gradient angle.
            if abs_gy > abs_gx * 2.4142 { // Vertical edge
                neighbor1 = magnitude[idx - width]; // top
                neighbor2 = magnitude[idx + width]; // bottom
            } else if abs_gx > abs_gy * 2.4142 { // Horizontal edge
                neighbor1 = magnitude[idx - 1]; // left
                neighbor2 = magnitude[idx + 1]; // right
            } else { // Diagonal edge
                // Check for 45 or 135 degree angles based on signs of gx and gy
                if (gx > 0.0 && gy > 0.0) || (gx < 0.0 && gy < 0.0) { // 45 degrees (top-right to bottom-left)
                    neighbor1 = magnitude[idx - width + 1];
                    neighbor2 = magnitude[idx + width - 1];
                } else { // 135 degrees (top-left to bottom-right)
                    neighbor1 = magnitude[idx - width - 1];
                    neighbor2 = magnitude[idx + width + 1];
                }
            }

            // If the pixel's magnitude is greater than or equal to its neighbors
            // along the gradient direction, keep it. Otherwise, suppress it.
            if mag >= neighbor1 && mag >= neighbor2 {
                suppressed[idx] = mag;
            } else {
                suppressed[idx] = 0.0;
            }
        }
    }

    suppressed
}
