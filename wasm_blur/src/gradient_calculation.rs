use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_gradients(blurred: &[u8], width: usize, height: usize) -> Vec<i16> {
    let size = width * height;
    let mut result = vec![0i16; 2 * size];

    // Full 3×3 Sobel operator (matches the JS calculateGradients implementation)
    for y in 1..height - 1 {
        let prev_row = (y - 1) * width;
        let curr_row = y * width;
        let next_row = (y + 1) * width;

        for x in 1..width - 1 {
            let p0 = blurred[prev_row + x - 1] as i16;
            let p1 = blurred[prev_row + x]     as i16;
            let p2 = blurred[prev_row + x + 1] as i16;
            let p3 = blurred[curr_row + x - 1] as i16;
            let p5 = blurred[curr_row + x + 1] as i16;
            let p6 = blurred[next_row + x - 1] as i16;
            let p7 = blurred[next_row + x]     as i16;
            let p8 = blurred[next_row + x + 1] as i16;

            let gx = (p2 - p0) + 2 * (p5 - p3) + (p8 - p6);
            let gy = (p6 + 2 * p7 + p8) - (p0 + 2 * p1 + p2);

            let idx = curr_row + x;
            result[2 * idx] = gx;
            result[2 * idx + 1] = gy;
        }
    }

    result
}
