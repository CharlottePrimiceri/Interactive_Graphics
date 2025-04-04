// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
    // from grades to radians
    const radians = rotation * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // transformation matrix in column-major order: [a, b, 0, c, d, 0, e, f, 1]
    return [
        cos * scale,  sin * scale, 0,   // Column 0
        -sin * scale, cos * scale, 0,   // Column 1
        positionX,    positionY,    1    // Column 2
    ];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.


function ApplyTransform(trans1, trans2) {
    // Matrix multiplication (trans2 × trans1)
    return [
        trans2[0] * trans1[0] + trans2[3] * trans1[1],  // a
        trans2[1] * trans1[0] + trans2[4] * trans1[1],  // b
        0,
        trans2[0] * trans1[3] + trans2[3] * trans1[4],  // c
        trans2[1] * trans1[3] + trans2[4] * trans1[4],  // d
        0,
        trans2[0] * trans1[6] + trans2[3] * trans1[7] + trans2[6],  // e
        trans2[1] * trans1[6] + trans2[4] * trans1[7] + trans2[7],  // f
        1
    ];
}
