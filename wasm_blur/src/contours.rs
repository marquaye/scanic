use wasm_bindgen::prelude::*;

// Suzuki-Abe border following + CHAIN_APPROX_SIMPLE, ported 1:1 from
// src/contourDetection.js (RETR_LIST mode, which is the only mode the scanner
// pipeline uses). Keeping the trace on this side means the edge map never has to
// be walked in JavaScript, and only the simplified polygons cross back.
//
// Output encoding, as a flat i32 array:
//   [contour_count,
//    (id, is_outer, point_count, x0, y0, x1, y1, ...) * contour_count]
// Coordinates are already converted back to unpadded image space.
//
// Area and the bounding box stay on the JS side deliberately: computing them
// here means returning f64s, and doubling the size of the copy back into JS
// costs as much as the scan it saves (measured, roughly a wash).

// Deltas for 8-connectivity, clockwise from top. Must match the JS arrays.
const DX: [i32; 8] = [0, 1, 1, 1, 0, -1, -1, -1];
const DY: [i32; 8] = [-1, -1, 0, 1, 1, 1, 0, -1];

/// Traces one border starting at (start_x, start_y). Points are appended to
/// `points` as padded coordinates. Returns false when tracing failed, which the
/// caller treats as "no contour here".
#[allow(clippy::too_many_arguments)]
fn trace_contour(
    labels: &mut [i32],
    visit_stamp: &mut [i32],
    width: usize,
    height: usize,
    start_x: i32,
    start_y: i32,
    initial_direction: i32,
    contour_id: i32,
    points: &mut Vec<i32>,
) -> bool {
    points.clear();

    let mut current_x = start_x;
    let mut current_y = start_y;
    let mut prev_direction: i32 = -1;

    labels[(start_y as usize) * width + (start_x as usize)] = contour_id;

    let max_steps = width * height;
    let mut count = 0usize;

    while count < max_steps {
        count += 1;

        let mut search_direction: i32;
        if prev_direction == -1 {
            let mut found = false;
            search_direction = 0;
            for i in 0..8 {
                search_direction = (initial_direction + i) & 7;
                let next_x = current_x + DX[search_direction as usize];
                let next_y = current_y + DY[search_direction as usize];
                if next_x >= 0
                    && (next_x as usize) < width
                    && next_y >= 0
                    && (next_y as usize) < height
                    && labels[(next_y as usize) * width + (next_x as usize)] > 0
                {
                    found = true;
                    break;
                }
            }
            if !found {
                return false;
            }
        } else {
            search_direction = (prev_direction + 2) & 7;
        }

        let mut next_x: i32 = -1;
        let mut next_y: i32 = -1;

        for i in 0..8 {
            let check_direction = (search_direction + i) & 7;
            let check_x = current_x + DX[check_direction as usize];
            let check_y = current_y + DY[check_direction as usize];

            if check_x >= 0 && (check_x as usize) < width && check_y >= 0 && (check_y as usize) < height
            {
                if labels[(check_y as usize) * width + (check_x as usize)] > 0 {
                    next_x = check_x;
                    next_y = check_y;
                    prev_direction = (check_direction + 4) & 7;
                    break;
                }
            }
        }

        if next_x == -1 {
            // Isolated pixel: keep the single point, same as the JS version.
            if points.is_empty() {
                points.push(current_x);
                points.push(current_y);
            }
            break;
        }

        // contour_id is unique per contour, so stamping doubles as "visited by
        // this trace" without clearing the array between contours.
        let visited_idx = (current_y as usize) * width + (current_x as usize);
        if visit_stamp[visited_idx] == contour_id {
            return true; // duplicate point: bail out rather than loop forever
        }
        points.push(current_x);
        points.push(current_y);
        visit_stamp[visited_idx] = contour_id;

        let next_idx = (next_y as usize) * width + (next_x as usize);
        if labels[next_idx] == 1 {
            labels[next_idx] = contour_id;
        }

        current_x = next_x;
        current_y = next_y;

        if current_x == start_x && current_y == start_y {
            break;
        }
    }

    if count >= max_steps {
        return false;
    }

    true
}

/// CHAIN_APPROX_SIMPLE: keep only points where the path changes direction.
/// Fills `kept` with indices into `points`.
fn simplify_chain_approx_simple(points: &[i32], kept: &mut Vec<usize>) {
    kept.clear();
    let n = points.len() / 2;

    if n <= 2 {
        kept.extend(0..n);
        return;
    }

    for i in 0..n {
        let prev = (if i == 0 { n - 1 } else { i - 1 }) * 2;
        let curr = i * 2;
        let next = (if i == n - 1 { 0 } else { i + 1 }) * 2;

        let dx1 = points[curr] - points[prev];
        let dy1 = points[curr + 1] - points[prev + 1];
        let dx2 = points[next] - points[curr];
        let dy2 = points[next + 1] - points[curr + 1];

        if dx1 * dy2 != dy1 * dx2 {
            kept.push(i);
        }
    }

    if kept.is_empty() {
        // Fully collinear: keep the endpoints of the longest span.
        let mut max_dist_sq: i64 = 0;
        let mut farthest_idx = 1usize;
        let p0x = points[0] as i64;
        let p0y = points[1] as i64;
        for i in 1..n {
            let dx = points[i * 2] as i64 - p0x;
            let dy = points[i * 2 + 1] as i64 - p0y;
            let dist_sq = dx * dx + dy * dy;
            if dist_sq > max_dist_sq {
                max_dist_sq = dist_sq;
                farthest_idx = i;
            }
        }
        kept.push(0);
        kept.push(farthest_idx);
    }
}

/// Finds all contours in a binary edge image (pixels > 0 are foreground).
/// `min_points` mirrors the JS length filter applied after simplification.
#[wasm_bindgen]
pub fn find_contours(edges: &[u8], width: usize, height: usize, min_points: usize) -> Vec<i32> {
    let padded_width = width + 2;
    let padded_height = height + 2;

    let mut labels = vec![0i32; padded_width * padded_height];
    for y in 0..height {
        for x in 0..width {
            if edges[y * width + x] > 0 {
                labels[(y + 1) * padded_width + (x + 1)] = 1;
            }
        }
    }

    let mut visit_stamp = vec![0i32; padded_width * padded_height];
    let mut points: Vec<i32> = Vec::with_capacity(2048);
    let mut kept: Vec<usize> = Vec::with_capacity(512);
    let mut out: Vec<i32> = vec![0]; // slot 0 holds the contour count
    let mut contour_count = 0i32;
    let mut next_contour_id = 2i32;

    for y in 1..=height {
        for x in 1..=width {
            let current_label = labels[y * padded_width + x];
            let left_label = labels[y * padded_width + (x - 1)];

            let mut has_start = false;
            let mut start_x = 0i32;
            let mut start_y = 0i32;
            let mut is_outer = false;
            let mut initial_direction = -1i32;

            if current_label == 1 && left_label == 0 {
                is_outer = true;
                has_start = true;
                start_x = x as i32;
                start_y = y as i32;
                initial_direction = 2;
            } else if current_label == 0 && left_label == 1 {
                is_outer = false;
                has_start = true;
                start_x = (x - 1) as i32;
                start_y = y as i32;
                initial_direction = 6;
            }

            if !has_start {
                continue;
            }

            let contour_id = next_contour_id;
            next_contour_id += 1;

            let traced = trace_contour(
                &mut labels,
                &mut visit_stamp,
                padded_width,
                padded_height,
                start_x,
                start_y,
                initial_direction,
                contour_id,
                &mut points,
            );

            if traced && !points.is_empty() {
                simplify_chain_approx_simple(&points, &mut kept);

                if kept.len() >= min_points {
                    contour_count += 1;
                    out.push(contour_id);
                    out.push(if is_outer { 1 } else { 0 });
                    out.push(kept.len() as i32);
                    for &idx in kept.iter() {
                        // Drop the padding offset on the way out.
                        out.push(points[idx * 2] - 1);
                        out.push(points[idx * 2 + 1] - 1);
                    }
                }
            } else {
                let start_idx = (start_y as usize) * padded_width + (start_x as usize);
                if labels[start_idx] == 1 {
                    labels[start_idx] = contour_id;
                }
            }
        }
    }

    out[0] = contour_count;
    out
}
