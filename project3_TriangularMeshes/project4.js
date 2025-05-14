// Vertex shader for the mesh
var meshVS = `
	attribute vec3 pos;
	attribute vec2 texCoord;
	uniform mat4 mvp;
	uniform int swapYZ;
	varying vec2 vTexCoord;
	
	void main()
	{
		vec3 p = pos;
		if (swapYZ == 1) {
			p = vec3(p.x, p.z, -p.y);
		}
		gl_Position = mvp * vec4(p, 1);
		vTexCoord = texCoord;
	}
`;

// Fragment shader for the mesh
var meshFS = `
	precision mediump float;
	varying vec2 vTexCoord;
	uniform sampler2D texture;
	uniform int showTexture;
	
	void main()
	{
		if (showTexture == 1) {
			gl_FragColor = texture2D(texture, vTexCoord);
		} else {
			gl_FragColor = vec4(1, 1, 1, 1);
		}
	}
`;
// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	// Create rotation matrix around Y axis
	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	var rotY = [
		cosY, 0, -sinY, 0,
		0, 1, 0, 0,
		sinY, 0, cosY, 0,
		0, 0, 0, 1
	];
	
	// Create rotation matrix around X axis
	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var rotX = [
		1, 0, 0, 0,
		0, cosX, sinX, 0,
		0, -sinX, cosX, 0,
		0, 0, 0, 1
	];
	
	// form the transformation matrix
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	
	// Combine matrices: projection * translation * rotationX * rotationY
	var mvp = MatrixMult(rotX, rotY);
	mvp = MatrixMult(trans, mvp);
	mvp = MatrixMult(projectionMatrix, mvp);
	
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// Initialize shader program
		this.prog = InitShaderProgram(meshVS, meshFS);
		
		// Get uniform and attribute locations
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.swapYZLoc = gl.getUniformLocation(this.prog, 'swapYZ');
		this.showTextureLoc = gl.getUniformLocation(this.prog, 'showTexture');
		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
		
		// Create buffers
		this.posBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();
		this.numTriangles = 0;
		
		// Create texture
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		
		// Initialize default values
		this.swapYZ(false);
		this.showTexture(true);
	}

	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
		//Update the contents of the vertex buffer objects.
		// Set position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		
		// Set texture coordinate buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		
		this.numTriangles = vertPos.length / 3;
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		gl.useProgram(this.prog);
		gl.uniform1i(this.swapYZLoc, swap ? 1 : 0);

	}

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans )
	{   
		//Complete the WebGL initializations before drawing
		gl.useProgram(this.prog);
		
		// Set model-view-projection matrix
		gl.uniformMatrix4fv(this.mvpLoc, false, trans);
		
		// Set position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.vertPosLoc);
		
		// Set texture coordinate attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texCoordLoc);
		
		// Draw triangles
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		//Bind the texture 
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		// Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(gl.getUniformLocation(this.prog, 'texture'), 0);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTextureLoc, show ? 1 : 0);
	}
}
