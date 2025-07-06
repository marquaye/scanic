use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_gradients(blurred: &[u8], width: usize, height: usize) -> Vec<i16> {
    let size = width * height;
    let mut result = vec![0i16; 2 * size];

    // Fast central difference, no Sobel, no SIMD, no bounds checks for inner pixels
    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let idx = y * width + x;
            let gx = blurred[idx + 1] as i16 - blurred[idx - 1] as i16;
            let gy = blurred[idx + width] as i16 - blurred[idx - width] as i16;
            result[2 * idx] = gx;
            result[2 * idx + 1] = gy;
        }
    }

    result
}
