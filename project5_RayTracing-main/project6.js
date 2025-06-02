var raytraceFS = `
//origin and direction of the ray
struct Ray {
    vec3 pos;
    vec3 dir;
};

struct Material {
    vec3  k_d;    // diffuse coefficient
    vec3  k_s;    // specular coefficient
    float n;    // specular exponent
};

struct Sphere {
    vec3     center;
    float    radius;
    Material mtl;
};

struct Light {
    vec3 position;
    vec3 intensity;
};

struct HitInfo {
    float    t;   //distance along the ray to the hit
    vec3     position; //point of the intersection
    vec3     normal; //normal at the intersection
    Material mtl; //material of the hit object
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
// blinn-phong lighting model
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
    vec3 color = vec3(0,0,0);
	// iterate through all the lights in the scene
    for ( int i=0; i<NUM_LIGHTS; ++i ) {
        // Check for shadows
		// direction from the surface point to light position
        vec3 lightDir = normalize(lights[i].position - position);
        // create a shadow ray
		Ray shadowRay;
		// offset the ray from the position to avoid self-intersection
        shadowRay.pos = position + lightDir * 0.001; 
        // point the shadow ray in the light direction
		shadowRay.dir = lightDir;
        HitInfo shadowHit;
		// check visibility if the shadow ray hits something
        bool inShadow = IntersectRay(shadowHit, shadowRay) && shadowHit.t < length(lights[i].position - position);
        
		if (!inShadow) {
            // If not shadowed, perform shading using the Blinn model
            vec3 halfwayDir = normalize(lightDir + view);
            float diffuse = max(dot(normal, lightDir), 0.0);
            float specular = pow(max(dot(normal, halfwayDir), 0.0), mtl.n);
            color += (mtl.k_d * diffuse + mtl.k_s * specular) * lights[i].intensity;
        }
    }
    return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
    hit.t = 1e30;
    bool foundHit = false;
	// for each sphere:
    for ( int i=0; i<NUM_SPHERES; ++i ) {
	    // vec from sphere center to ray origin
        vec3 oc = ray.pos - spheres[i].center;
        // quadratic formula coefficients to find intersection
		float a = dot(ray.dir, ray.dir);
        float b = 2.0 * dot(oc, ray.dir);
        float c = dot(oc, oc) - spheres[i].radius * spheres[i].radius;
        float discriminant = b*b - 4.0*a*c;
        // if there is at least one intersection
		if (discriminant > 0.0) {
            float temp = (-b - sqrt(discriminant)) / (2.0*a);
            // check if the intersection is closer than the previous found intersections
			if (temp < hit.t && temp > 0.001) {
                hit.t = temp;
                hit.position = ray.pos + ray.dir * hit.t;
                hit.normal = normalize(hit.position - spheres[i].center);
                hit.mtl = spheres[i].mtl;
                foundHit = true;
            }
        }
    }
    return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
// determine the pixel color
vec4 RayTracer( Ray ray )
{
    HitInfo hit;
    if ( IntersectRay( hit, ray ) ) {
        vec3 view = normalize( -ray.dir );
        vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
        
        // Compute reflections
        vec3 k_s = hit.mtl.k_s;
		// Loop over the maximum number of bounces
        for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
            if ( bounce >= bounceLimit ) break;
            if ( k_s.r + k_s.g + k_s.b <= 0.0 ) break;
            
            Ray r;    // this is the reflection ray
            HitInfo h;    // reflection hit info
            
			// Initialize the reflection ray
			r.pos = hit.position + hit.normal * 0.001; // offset to avoid self-intersection
            r.dir = reflect(ray.dir, hit.normal);

            if ( IntersectRay( h, r ) ) {
                // Hit found, so shade the hit point
                clr += k_s * Shade(h.mtl, h.position, h.normal, normalize(-r.dir));
                // Update the loop variables for tracing the next reflection ray
                k_s *= h.mtl.k_s;
                ray = r;
                hit = h;
            } else {
                // The reflection ray did not intersect with anything,
                // so we are using the environment color
                clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
                break;    // no more reflections
            }
        }
        return vec4( clr, 1 );    // return the accumulated color, including the reflections
    } else {
        return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 1.0 );    // return the environment color
    }
}
`;