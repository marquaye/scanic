use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

#[cfg(target_arch = "wasm32")]
#[target_feature(enable = "simd128")]
unsafe fn dilate_fast(
    edges: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
    dilated: &mut [u8],
) {
    let half_kernel = kernel_size / 2;
    let mut temp = vec![0u8; width * height];

    // Horizontal pass (scalar for simplicity and because it's cache-friendly)
    for y in 0..height {
        for x in 0..width {
            let mut max_val = 0;
            for k in 0..kernel_size {
                let dx = k as isize - half_kernel as isize;
                let nx = (x as isize + dx).clamp(0, (width - 1) as isize) as usize;
                let val = edges[y * width + nx];
                if val > max_val {
                    max_val = val;
                }
            }
            temp[y * width + x] = max_val;
        }
    }

    // Vertical pass (SIMD optimized)
    let x_chunks = width / 16;
    let y_safe_start = half_kernel;
    let y_safe_end = height.saturating_sub(half_kernel);

    // Process top edge rows with scalar code
    for y in 0..y_safe_start {
        for x in 0..width {
            let mut max_val = 0;
            for k in 0..kernel_size {
                let dy = k as isize - half_kernel as isize;
                let ny = (y as isize + dy).clamp(0, (height - 1) as isize) as usize;
                let val = temp[ny * width + x];
                if val > max_val {
                    max_val = val;
                }
            }
            dilated[y * width + x] = max_val;
        }
    }

    // Process middle rows with SIMD
    for y in y_safe_start..y_safe_end {
        // SIMD part for full chunks
        for chunk_idx in 0..x_chunks {
            let x = chunk_idx * 16;
            // Since we are in the safe y-zone, we don't need to clamp ny.
            // The first load can be the initial max_vec
            let mut max_vec = v128_load(temp.as_ptr().add((y as isize - half_kernel as isize) as usize * width + x) as *const v128);

            for k in 1..kernel_size {
                let dy = k as isize - half_kernel as isize;
                let ny = (y as isize + dy) as usize;
                let current_vec = v128_load(temp.as_ptr().add(ny * width + x) as *const v128);
                max_vec = u8x16_max(max_vec, current_vec);
            }
            v128_store(dilated.as_mut_ptr().add(y * width + x) as *mut v128, max_vec);
        }

        // Scalar part for the remainder of the row
        for x in (x_chunks * 16)..width {
            let mut max_val = 0;
            for k in 0..kernel_size {
                let dy = k as isize - half_kernel as isize;
                let ny = (y as isize + dy) as usize; // No clamping needed here
                let val = temp[ny * width + x];
                if val > max_val {
                    max_val = val;
                }
            }
            dilated[y * width + x] = max_val;
        }
    }

    // Process bottom edge rows with scalar code
    for y in y_safe_end..height {
        for x in 0..width {
            let mut max_val = 0;
            for k in 0..kernel_size {
                let dy = k as isize - half_kernel as isize;
                let ny = (y as isize + dy).clamp(0, (height - 1) as isize) as usize;
                let val = temp[ny * width + x];
                if val > max_val {
                    max_val = val;
                }
            }
            dilated[y * width + x] = max_val;
        }
    }
}

#[wasm_bindgen]
pub fn dilate(
    edges: &[u8],
    width: usize,
    height: usize,
    kernel_size: usize,
) -> Vec<u8> {
    let mut dilated = vec![0u8; width * height];

    #[cfg(target_arch = "wasm32")]
    unsafe {
        dilate_fast(edges, width, height, kernel_size, &mut dilated);
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let half_kernel = kernel_size / 2;
        let mut temp = vec![0u8; width * height];
        // Horizontal pass
        for y in 0..height {
            for x in 0..width {
                let mut max_val = 0;
                for k in 0..kernel_size {
                    let dx = k as isize - half_kernel as isize;
                    let nx = (x as isize + dx).clamp(0, (width - 1) as isize) as usize;
                    let val = edges[y * width + nx];
                    if val > max_val {
                        max_val = val;
                    }
                }
                temp[y * width + x] = max_val;
            }
        }

        // Vertical pass
        for y in 0..height {
            for x in 0..width {
                let mut max_val = 0;
                for k in 0..kernel_size {
                    let dy = k as isize - half_kernel as isize;
                    let ny = (y as isize + dy).clamp(0, (height - 1) as isize) as usize;
                    let val = temp[ny * width + x];
                    if val > max_val {
                        max_val = val;
                    }
                }
                dilated[y * width + x] = max_val;
            }
        }
    }

    dilated
}
