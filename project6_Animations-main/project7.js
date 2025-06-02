// Vertex shader for the mesh
var meshVS = `
	attribute vec3 pos;         
	attribute vec2 texCoord;    
	attribute vec3 normal;      

	uniform mat4 mvp;           
	uniform mat4 mv;            
	uniform mat3 mNorm;         
	uniform int swapYZ;         

	varying vec2 vTexCoord;     
	varying vec3 vNormalCam;    
	varying vec3 vPosCam;       

	void main()
	{
		vec3 p_modified = pos;
		vec3 n_modified = normal;

		if (swapYZ == 1) {
			p_modified = vec3(pos.x, pos.z, -pos.y);
			n_modified = vec3(normal.x, normal.z, -normal.y);
		}

		gl_Position = mvp * vec4(p_modified, 1.0);
		vPosCam = (mv * vec4(p_modified, 1.0)).xyz;
		vNormalCam = normalize(mNorm * n_modified);
		vTexCoord = texCoord;
	}
`;
// Fragment shader for the mesh
var meshFS = `
	precision mediump float;

	varying vec2 vTexCoord;    
	varying vec3 vNormalCam;    
	varying vec3 vPosCam;       

	uniform sampler2D texture;     
	uniform int showTexture;       
	uniform vec3 lightDir;         
	uniform float shininess;      

	const vec3 lightColor = vec3(1.0, 1.0, 1.0);     
	const vec3 specularColorKs = vec3(1.0, 1.0, 1.0); 

	void main()
	{
		vec3 N = normalize(vNormalCam);
		vec3 L = normalize(lightDir); 

		vec3 diffuseKd;
		if (showTexture == 1) {
			diffuseKd = texture2D(texture, vTexCoord).rgb;
		} else {
			diffuseKd = vec3(1.0, 1.0, 1.0); 
		}

		vec3 ambient = diffuseKd * 0.15; 

		// Diffuse (Lambertian)
		float lambertian = max(dot(N, L), 0.0);
		vec3 diffuse = diffuseKd * lambertian * lightColor;

		// Specular (Blinn-Phong)
		vec3 specular = vec3(0.0, 0.0, 0.0);
		if (lambertian > 0.0) { 
			vec3 V = normalize(-vPosCam); 
			vec3 H = normalize(L + V);    
			float specAngle = max(dot(N, H), 0.0);
			specular = specularColorKs * pow(specAngle, shininess) * lightColor;
		}
		
		vec3 finalColor = ambient + diffuse + specular;
		gl_FragColor = vec4(finalColor, 1.0);
	}
`;
// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// Create rotation matrix around Y axis
	
	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	var rotY = [ 
		cosY,  0,     -sinY, 0,  
		0,     1,     0,     0,
		sinY,  0,     cosY,  0,  
		0,     0,     0,     1
	];
	
	// Create rotation matrix around X axis
	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var rotX = [ 
		1,     0,     0,     0,
		0,     cosX,  sinX,  0,
		0,     -sinX, cosX,  0,
		0,     0,     0,     1
	];
	
	// Create translation matrix
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	
    // Combine matrices: translation * rotationX * rotationY
	var mv = MatrixMult(rotX, rotY); 
	mv = MatrixMult(trans, mv);            
	
	return mv;
}

// Complete the implementation of the following class.
class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// Initialize shader program
		this.prog = InitShaderProgram(meshVS, meshFS);
		
		// Get uniform and attribute locations
		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal'); 
		
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.mvLoc = gl.getUniformLocation(this.prog, 'mv');          
		this.mNormLoc = gl.getUniformLocation(this.prog, 'mNorm');      
		this.swapYZLoc = gl.getUniformLocation(this.prog, 'swapYZ');
		this.showTextureLoc = gl.getUniformLocation(this.prog, 'showTexture');
		this.textureLoc = gl.getUniformLocation(this.prog, 'texture');     
        this.lightDirLoc = gl.getUniformLocation(this.prog, 'lightDir');   
        this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess'); 
		
		// Create buffers
		this.posBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();
		this.normalBuffer = gl.createBuffer(); 
		this.numTriangles = 0; 

		// Create texture object
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  
        const placeholderPixel = new Uint8Array([255, 255, 255]); 
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, placeholderPixel);
		
		// Initialize default uniform values
    
		this.swapYZ(false);
		this.showTexture(true); 
        this.setLightDir(0.0, 0.0, 1.0); 
        this.setShininess(30.0);         
	}

	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
        //Update the contents of the vertex buffer objects.
		// Set position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		
		// Set texture coordinate buffer data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		
		// Set normal buffer data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		
       
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
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{  
		//Complete the WebGL initializations before drawing
		gl.useProgram(this.prog);
		
		// Set matrix uniforms
		gl.uniformMatrix4fv(this.mvpLoc, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvLoc, false, matrixMV);         
		gl.uniformMatrix3fv(this.mNormLoc, false, matrixNormal); 
		
		// Bind and set up position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.vertPosLoc);
		
		if (this.texCoordLoc !== -1) { 
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
			gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.texCoordLoc);
		}
		
		if (this.normalLoc !== -1) { 
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.normalLoc);
		}
		
       
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.textureLoc, 0); 

		// Draw triangles
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles); 


        gl.disableVertexAttribArray(this.vertPosLoc);
        if (this.texCoordLoc !== -1) {
            gl.disableVertexAttribArray(this.texCoordLoc);
        }
        if (this.normalLoc !== -1) {
            gl.disableVertexAttribArray(this.normalLoc);
        }
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
        // Bind the texture
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

        // Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
        gl.useProgram(this.prog); 
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture); 
        gl.uniform1i(this.textureLoc, 0); 
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
	
	setLightDir( x, y, z )
	{
		// set the uniform parameter(s) of the fragment shader to specify the light direction.
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirLoc, x, y, z);
	}

	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// set the uniform parameter(s) of the fragment shader to specify the shininess.
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessLoc, shininess > 0.0 ? shininess : 0.001 );
	}
}

// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep(dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution) {
    var forces = Array(positions.length).fill(0).map(() => new Vec3(0, 0, 0)); // The total force per particle

    // Compute the total force for each particle
    for (let spring of springs) {
        let p0 = spring.p0;
        let p1 = spring.p1;
        let restLength = spring.rest;

        let pos0 = positions[p0];
        let pos1 = positions[p1];

        // Compute the displacement vector, its length, and its direction
        let delta = pos1.sub(pos0);
        let dist = delta.len();
        let direction = delta.unit();

        // Spring force: Hooke's Law (F = -k * (dist - restLength) * direction)
        let springForce = direction.mul(stiffness * (dist - restLength));

        // Damping force: F = -d * (v1 - v0) * direction
        let vel0 = velocities[p0];
        let vel1 = velocities[p1];
        let relativeVelocity = vel1.sub(vel0);
        let dampingForce = direction.mul(damping * relativeVelocity.dot(direction));

        // Apply forces to the particles
        forces[p0].inc(springForce.add(dampingForce));
        forces[p1].dec(springForce.add(dampingForce));
    }

    // Apply gravity force to all particles
    let gravityForce = gravity.mul(particleMass);
    for (let i = 0; i < positions.length; i++) {
        forces[i].inc(gravityForce);
    }

    // Update positions and velocities using semi-implicit Euler method
    for (let i = 0; i < positions.length; i++) {
        // Update velocity
        let acceleration = forces[i].div(particleMass);
        velocities[i].inc(acceleration.mul(dt));

        // Update position
        positions[i].inc(velocities[i].mul(dt));

        // Handle collisions with the bounding box
        for (let axis of ['x', 'y', 'z']) {
            if (positions[i][axis] < -1) {
                positions[i][axis] = -1;
                velocities[i][axis] *= -restitution;
            } else if (positions[i][axis] > 1) {
                positions[i][axis] = 1;
                velocities[i][axis] *= -restitution;
            }
        }
    }
}