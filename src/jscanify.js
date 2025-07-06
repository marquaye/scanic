/*! jscanify v1.4.0 | (c) ColonelParrot and other contributors | MIT License */

(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined"
      ? (module.exports = factory())
      : typeof define === "function" && define.amd
        ? define(factory)
        : (global.jscanify = factory());
  })(this, function () {
    "use strict";
  
    /**
     * Calculates distance between two points. Each point must have `x` and `y` property
     * @param {*} p1 point 1
     * @param {*} p2 point 2
     * @returns distance between two points
     */
    function distance(p1, p2) {
      return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
  
    class jscanify {
      constructor() { }
  
      /**
       * Finds the contour of the paper within the image
       * @param {*} img image to process (cv.Mat)
       * @param {Object} options Optional options object. If options.debug is provided, intermediate Mats will be stored in it.
       * @returns the biggest contour inside the image
       */
      findPaperContour(img, options = {}) {
        const timings = [];
        const tStart = performance.now();
        const debugInfo = options.debug;

        // Grayscale
        let t0 = performance.now();
        const imgGray = new cv.Mat();
        cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY, 0);
        let t1 = performance.now();
        timings.push({ step: 'Grayscale', ms: (t1 - t0).toFixed(2) });

        // Gaussian Blur
        t0 = performance.now();
        const imgBlur = new cv.Mat();
        cv.GaussianBlur(
          imgGray,
          imgBlur,
          new cv.Size(5, 5),
          0,
          0,
          cv.BORDER_DEFAULT
        );
        t1 = performance.now();
        timings.push({ step: 'Gaussian Blur', ms: (t1 - t0).toFixed(2) });
        if (debugInfo) debugInfo.blurred = imgBlur.clone();

        // Canny
        t0 = performance.now();
        const imgCanny = new cv.Mat();
        cv.Canny(imgBlur, imgCanny, 75, 200);
        t1 = performance.now();
        timings.push({ step: 'Canny', ms: (t1 - t0).toFixed(2) });
        if (debugInfo) debugInfo.canny = imgCanny.clone();

        // Dilation
        t0 = performance.now();
        const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
        const dilated = new cv.Mat();
        cv.dilate(imgCanny, dilated, kernel);
        t1 = performance.now();
        timings.push({ step: 'Dilation', ms: (t1 - t0).toFixed(2) });
        if (debugInfo) debugInfo.dilated = dilated.clone();
        kernel.delete();

        // Contour Detection
        t0 = performance.now();
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(
          dilated,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );
        t1 = performance.now();
        timings.push({ step: 'Find Contours', ms: (t1 - t0).toFixed(2) });

        if (debugInfo) {
            debugInfo.contoursMat = cv.Mat.zeros(img.rows, img.cols, cv.CV_8UC3);
            const colors = [
                new cv.Scalar(255, 0, 0, 255), new cv.Scalar(0, 255, 0, 255),
                new cv.Scalar(0, 0, 255, 255), new cv.Scalar(255, 255, 0, 255),
                new cv.Scalar(0, 255, 255, 255), new cv.Scalar(255, 0, 255, 255)
            ];
            let areas = [];
            for (let i = 0; i < contours.size(); ++i) {
                const color = colors[i % colors.length];
                cv.drawContours(debugInfo.contoursMat, contours, i, color, 1, cv.LINE_8, hierarchy, 0);
                areas.push(cv.contourArea(contours.get(i)));
            }
            debugInfo.contourAreas = areas;
            debugInfo.rawContours = contours;
        }

        // Polygon Approximation & Selection
        t0 = performance.now();
        let maxArea = 0;
        let maxContourIndex = -1;
        for (let i = 0; i < contours.size(); ++i) {
          let contour = contours.get(i);
          let peri = cv.arcLength(contour, true);
          let approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.02 * peri, true);
          if (approx.rows === 4 && cv.isContourConvex(approx)) {
              let contourArea = cv.contourArea(approx);
              if (contourArea > maxArea) {
                  maxArea = contourArea;
                  maxContourIndex = i;
              }
          }
          approx.delete();
          contour.delete();
        }
        t1 = performance.now();
        timings.push({ step: 'Polygon Approx/Select', ms: (t1 - t0).toFixed(2) });

        const maxContour =
          maxContourIndex >= 0 ?
            contours.get(maxContourIndex).clone() :
            null;

        // Clean up Mats that are not stored in debugInfo or returned
        if (true) imgGray.delete();
        if (!debugInfo || !debugInfo.blurred) imgBlur.delete();
        if (!debugInfo || !debugInfo.canny) imgCanny.delete();
        if (!debugInfo || !debugInfo.dilated) dilated.delete();
        if (!debugInfo || !debugInfo.rawContours) contours.delete(); 
        else { 
            if (maxContourIndex !== -1) {
                 for (let i = 0; i < contours.size(); ++i) {
                    if (i !== maxContourIndex) {
                        contours.get(i).delete();
                    }
                 }
            }
        }
        hierarchy.delete();

        const tEnd = performance.now();
        timings.unshift({ step: 'Total', ms: (tEnd - tStart).toFixed(2) });
        if (debugInfo) debugInfo.timings = timings;
        console.table(timings);

        return maxContour;
      }
  
      /**
       * Highlights the paper detected inside the image.
       * @param {*} image image to process
       * @param {Object} options options for highlighting. Accepts `color`, `thickness`, and `debug`
       * @returns `HTMLCanvasElement` with original image and paper highlighted
       */
      highlightPaper(image, options = {}) {
        options.color = options.color || "orange";
        options.thickness = options.thickness || 10;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = cv.imread(image);
        if (options.debug) options.debug.original = img.clone();
        
        // Pass debug object to findPaperContour
        const maxContour = this.findPaperContour(img, options);
        cv.imshow(canvas, img);
        
        if (maxContour) {
          const cornerPoints = this.getCornerPoints(maxContour);
          if (options.debug) options.debug.corners = cornerPoints;
          
          const {
            topLeftCorner,
            topRightCorner,
            bottomLeftCorner,
            bottomRightCorner,
          } = cornerPoints;
  
          if (
            topLeftCorner &&
            topRightCorner &&
            bottomLeftCorner &&
            bottomRightCorner
          ) {
            ctx.strokeStyle = options.color;
            ctx.lineWidth = options.thickness;
            ctx.beginPath();
            ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
            ctx.lineTo(topRightCorner.x, topRightCorner.y);
            ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y);
            ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
            ctx.closePath(); // Use closePath for quadrilateral
            ctx.stroke();
          }
          maxContour.delete(); // Clean up the cloned contour
        }
        
        // Clean up original Mat if not stored in debug
        if (!options.debug || !options.debug.original) img.delete();
        
        // Attach debug info to the canvas
        if (options.debug) {
            canvas.debugInfo = options.debug;
        }

        return canvas;
      }
  
      /**
       * Extracts and undistorts the image detected within the frame.
       * 
       * Returns `null` if no paper is detected.
       *  
      * @param {*} image image to process
       * @param {*} resultWidth desired result paper width
       * @param {*} resultHeight desired result paper height
       * @param {*} cornerPoints optional custom corner points, in case automatic corner points are incorrect
       * @returns `HTMLCanvasElement` containing undistorted image
       */
      extractPaper(image, resultWidth, resultHeight, cornerPoints) {
        const canvas = document.createElement("canvas");
        const img = cv.imread(image);
        const maxContour = cornerPoints ? null : this.findPaperContour(img);
  
        if(maxContour == null && cornerPoints === undefined){
          return null;
        }
  
        const {
          topLeftCorner,
          topRightCorner,
          bottomLeftCorner,
          bottomRightCorner,
        } = cornerPoints || this.getCornerPoints(maxContour, img);
        let warpedDst = new cv.Mat();
  
        let dsize = new cv.Size(resultWidth, resultHeight);
        let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          topLeftCorner.x,
          topLeftCorner.y,
          topRightCorner.x,
          topRightCorner.y,
          bottomLeftCorner.x,
          bottomLeftCorner.y,
          bottomRightCorner.x,
          bottomRightCorner.y,
        ]);
  
        let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0,
          0,
          resultWidth,
          0,
          0,
          resultHeight,
          resultWidth,
          resultHeight,
        ]);
  
        let M = cv.getPerspectiveTransform(srcTri, dstTri);
        cv.warpPerspective(
          img,
          warpedDst,
          M,
          dsize,
          cv.INTER_LINEAR,
          cv.BORDER_CONSTANT,
          new cv.Scalar()
        );
  
        cv.imshow(canvas, warpedDst);
  
        img.delete()
        warpedDst.delete()
        return canvas;
      }
  
      /**
       * Calculates the corner points of a contour.
       * @param {*} contour contour from {@link findPaperContour}
       * @returns object with properties `topLeftCorner`, `topRightCorner`, `bottomLeftCorner`, `bottomRightCorner`, each with `x` and `y` property
       */
      getCornerPoints(contour) {
        let rect = cv.minAreaRect(contour);
        const center = rect.center;
  
        let topLeftCorner;
        let topLeftCornerDist = 0;
  
        let topRightCorner;
        let topRightCornerDist = 0;
  
        let bottomLeftCorner;
        let bottomLeftCornerDist = 0;
  
        let bottomRightCorner;
        let bottomRightCornerDist = 0;
  
        for (let i = 0; i < contour.data32S.length; i += 2) {
          const point = { x: contour.data32S[i], y: contour.data32S[i + 1] };
          const dist = distance(point, center);
          if (point.x < center.x && point.y < center.y) {
            // top left
            if (dist > topLeftCornerDist) {
              topLeftCorner = point;
              topLeftCornerDist = dist;
            }
          } else if (point.x > center.x && point.y < center.y) {
            // top right
            if (dist > topRightCornerDist) {
              topRightCorner = point;
              topRightCornerDist = dist;
            }
          } else if (point.x < center.x && point.y > center.y) {
            // bottom left
            if (dist > bottomLeftCornerDist) {
              bottomLeftCorner = point;
              bottomLeftCornerDist = dist;
            }
          } else if (point.x > center.x && point.y > center.y) {
            // bottom right
            if (dist > bottomRightCornerDist) {
              bottomRightCorner = point;
              bottomRightCornerDist = dist;
            }
          }
        }
  
        return {
          topLeftCorner,
          topRightCorner,
          bottomLeftCorner,
          bottomRightCorner,
        };
      }
    }

    // Add a helper to draw Mat to canvas easily for debug
    jscanify.prototype.drawMat = function(canvasId, mat) {
        cv.imshow(canvasId, mat);
    };
  
    return jscanify;
  });
