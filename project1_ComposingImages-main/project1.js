// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    const bgWidth = bgImg.width;
    const bgHeight = bgImg.height;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;

    for (let y = 0; y < fgHeight; y++) {
        for (let x = 0; x < fgWidth; x++) {
            // fgPos.x x-coordinate of the top-left corner of the foreground image
            // relative to the background image.
            // Position of the foreground image wrt the backgrounds image.
            const bgX = fgPos.x + x; // offset of the fg pixel wrt the left edge of the bg image
            const bgY = fgPos.y + y; 
            
            // check boundaries of the bg image
            if (bgX >= 0 && bgX < bgWidth && bgY >= 0 && bgY < bgHeight) {
                // map 2d image coordinates to the correct index in the 1D imagedata.data array
                // each pixel has 4 value RGBA
                const bgIndex = (bgY * bgWidth + bgX) * 4;
                const fgIndex = (y * fgWidth + x) * 4;

                // Get foreground pixel values
                const fgR = fgImg.data[fgIndex];
                const fgG = fgImg.data[fgIndex + 1];
                const fgB = fgImg.data[fgIndex + 2];
                let fgA = fgImg.data[fgIndex + 3] / 255; //normalization alpha [0,1]

                // Apply foreground opacity
                fgA *= fgOpac;

                // Get background pixel values
                const bgR = bgImg.data[bgIndex];
                const bgG = bgImg.data[bgIndex + 1];
                const bgB = bgImg.data[bgIndex + 2];
                const bgA = bgImg.data[bgIndex + 3] / 255;

                // Alpha Blending formula
                const newAlpha = fgA + bgA * (1 - fgA);

                // Check if the newAlpha is 0
                if (newAlpha === 0) {
                    bgImg.data[bgIndex] = 0;
                    bgImg.data[bgIndex + 1] = 0;
                    bgImg.data[bgIndex + 2] = 0;
                    bgImg.data[bgIndex + 3] = 0;
                } else {
                    // new RGB values
                    const newR = (fgR * fgA + bgR * bgA * (1 - fgA)) / newAlpha;
                    const newG = (fgG * fgA + bgG * bgA * (1 - fgA)) / newAlpha;
                    const newB = (fgB * fgA + bgB * bgA * (1 - fgA)) / newAlpha;
                    // change the colors of the background based on the opacity of the fg
                    // computed before. 
                    bgImg.data[bgIndex] = newR;
                    bgImg.data[bgIndex + 1] = newG;
                    bgImg.data[bgIndex + 2] = newB;
                    bgImg.data[bgIndex + 3] = newAlpha * 255; // back to [0, 255]
                }
            }
        }
    }
}
