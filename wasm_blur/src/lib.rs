pub mod non_maximum_suppression;
pub mod dilation;
pub mod gradient_calculation;
pub mod canny;
pub mod gaussian_blur;
pub mod hysteresis;

// Re-export the blur function from gaussian_blur module for backward compatibility
pub use gaussian_blur::blur;
