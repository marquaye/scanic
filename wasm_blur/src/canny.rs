use wasm_bindgen::prelude::*;

// Hysteresis thresholding implementation, a key part of the Canny algorithm.
fn hysteresis_thresholding(
    suppressed: &[f32],
    width: usize,
    height: usize,
    low_threshold: f32,
    high_threshold: f32,
) -> Vec<u8> {
    let mut edge_map = vec![0u8; width * height];
    let mut stack = Vec::new();

    // Apply double thresholding to identify strong and weak edges.
    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = y * width + x;
            let mag = suppressed[idx];
            if mag >= high_threshold {
                edge_map[idx] = 2; // Strong edge
                stack.push((x, y));
            } else if mag >= low_threshold {
                edge_map[idx] = 1; // Weak edge
            }
        }
    }

    // Perform edge tracking by hysteresis.
    while let Some((x, y)) = stack.pop() {
        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }
                let nx = (x as isize + dx) as usize;
                let ny = (y as isize + dy) as usize;

                if nx > 0 && nx < width && ny > 0 && ny < height {
                    let neighbor_idx = ny * width + nx;
                    if edge_map[neighbor_idx] == 1 { // Connect weak edges
                        edge_map[neighbor_idx] = 2; // Promote to strong edge
                        stack.push((nx, ny));
                    }
                }
            }
        }
    }

    // Create the final binary edge image (255 for edges, 0 for non-edges).
    let mut final_edges = vec![0u8; width * height];
    for i in 0..(width * height) {
        if edge_map[i] == 2 {
            final_edges[i] = 255;
        }
    }

    final_edges
}

#[wasm_bindgen]
pub fn canny_edge_detector_full(
    grayscale: &[u8],
    width: usize,
    height: usize,
    low_threshold: f32,
    high_threshold: f32,
    kernel_size: usize,
    sigma: f32,
    l2_gradient: bool,
    apply_dilation: bool,
    dilation_kernel_size: usize,
) -> Vec<u8> {
    // Step 1: Apply Gaussian Blur.
    let blurred = crate::blur(grayscale, width, height, kernel_size, sigma);

    // Step 2: Calculate Gradients.
    let gradients = crate::gradient_calculation::calculate_gradients(&blurred, width, height);
    let mut dx_i16 = Vec::with_capacity(width * height);
    let mut dy_i16 = Vec::with_capacity(width * height);
    for i in 0..(width * height) {
        dx_i16.push(gradients[2 * i]);
        dy_i16.push(gradients[2 * i + 1]);
    }

    // Step 3: Apply Non-Maximum Suppression.
    let suppressed = crate::non_maximum_suppression::non_maximum_suppression(
        &dx_i16,
        &dy_i16,
        width,
        height,
        l2_gradient,
    );

    // Step 4: Perform Hysteresis Thresholding.
    let final_low_threshold = if l2_gradient { low_threshold * low_threshold } else { low_threshold };
    let final_high_threshold = if l2_gradient { high_threshold * high_threshold } else { high_threshold };

    let mut canny_edges = hysteresis_thresholding(
        &suppressed,
        width,
        height,
        final_low_threshold,
        final_high_threshold,
    );

    // Step 5: Apply Dilation if requested.
    if apply_dilation {
        canny_edges = crate::dilation::dilate(&canny_edges, width, height, dilation_kernel_size);
    }

    canny_edges
}
