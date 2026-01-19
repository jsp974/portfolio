/**
 * Geometry generators
 */

export const Shapes = {
    createCube() {
        const positions = new Float32Array([
            // Front face
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5,
            // Back face
            -0.5, -0.5, -0.5,
            -0.5, 0.5, -0.5,
            0.5, 0.5, -0.5,
            0.5, -0.5, -0.5,
            // Top face
            -0.5, 0.5, -0.5,
            -0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            0.5, 0.5, -0.5,
            // Bottom face
            -0.5, -0.5, -0.5,
            0.5, -0.5, -0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, 0.5,
            // Right face
            0.5, -0.5, -0.5,
            0.5, 0.5, -0.5,
            0.5, 0.5, 0.5,
            0.5, -0.5, 0.5,
            // Left face
            -0.5, -0.5, -0.5,
            -0.5, -0.5, 0.5,
            -0.5, 0.5, 0.5,
            -0.5, 0.5, -0.5,
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3,    // front
            4, 5, 6, 4, 6, 7,    // back
            8, 9, 10, 8, 10, 11,   // top
            12, 13, 14, 12, 14, 15,   // bottom
            16, 17, 18, 16, 18, 19,   // right
            20, 21, 22, 20, 22, 23,   // left
        ]);

        const normals = new Float32Array([
            // Front
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // Back
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // Bottom
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // Left
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
        ]);

        return { positions, indices, normals };
    },

    createPlane() {
        // A simple quad on the XZ plane
        const positions = new Float32Array([
            -0.5, 0, 0.5,
            0.5, 0, 0.5,
            0.5, 0, -0.5,
            -0.5, 0, -0.5,
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);

        const normals = new Float32Array([
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
        ]);

        return { positions, indices, normals };
    },

    createPyramid() {
        // 4 sided pyramid
        const positions = new Float32Array([
            // Front
            0, 0.5, 0, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
            // Right
            0, 0.5, 0, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5,
            // Back
            0, 0.5, 0, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
            // Left
            0, 0.5, 0, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
            // Bottom
            -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5
        ]);

        const indices = new Uint16Array([
            0, 1, 2,  // Front
            3, 4, 5,  // Right
            6, 7, 8,  // Back
            9, 10, 11, // Left
            12, 13, 14, 12, 14, 15 // Bottom
        ]);

        // Simple flat normals calculations could be better but hardcoding for speed
        // Actually, let's just use simple up/out approximation or per face.
        // For low poly look, separate vertices (not shared) is better for flat shading which this is.
        // Positions above are 3 per face (triangles), so we can just set normals per vertex.

        // Helper to compute face normal
        const n = (p1, p2, p3) => {
            const u = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
            const v = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
            const nx = u[1] * v[2] - u[2] * v[1];
            const ny = u[2] * v[0] - u[0] * v[2];
            const nz = u[0] * v[1] - u[1] * v[0];
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            return [nx / len, ny / len, nz / len];
        };

        const normals = new Float32Array(positions.length);

        for (let i = 0; i < 12; i += 3) { // First 4 faces (triangles)
            const p1 = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
            const p2 = [positions[i * 3 + 3], positions[i * 3 + 4], positions[i * 3 + 5]];
            const p3 = [positions[i * 3 + 6], positions[i * 3 + 7], positions[i * 3 + 8]];
            const norm = n(p1, p2, p3);
            for (let k = 0; k < 3; k++) {
                normals[(i + k) * 3] = norm[0];
                normals[(i + k) * 3 + 1] = norm[1];
                normals[(i + k) * 3 + 2] = norm[2];
            }
        }

        // Bottom face normals (0, -1, 0)
        for (let i = 12; i < 16; i++) {
            normals[i * 3] = 0; normals[i * 3 + 1] = -1; normals[i * 3 + 2] = 0;
        }

        return { positions, indices, normals };
    },

    createSphere(radius = 0.5, latBands = 8, longBands = 8) {
        const positions = [];
        const normals = [];
        const indices = [];

        for (let latNumber = 0; latNumber <= latBands; latNumber++) {
            const theta = latNumber * Math.PI / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let longNumber = 0; longNumber <= longBands; longNumber++) {
                const phi = longNumber * 2 * Math.PI / longBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                normals.push(x, y, z);
                positions.push(radius * x, radius * y, radius * z);
            }
        }

        for (let latNumber = 0; latNumber < latBands; latNumber++) {
            for (let longNumber = 0; longNumber < longBands; longNumber++) {
                const first = (latNumber * (longBands + 1)) + longNumber;
                const second = first + longBands + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        return {
            positions: new Float32Array(positions),
            indices: new Uint16Array(indices),
            normals: new Float32Array(normals)
        };
    },

    createCylinder(height = 1, radius = 0.1) {
        // Simple low poly cylinder (actually a prism)
        const segments = 6;
        const positions = []; // flat shaded
        const normals = [];
        const indices = [];

        const halfH = height / 2;

        for (let i = 0; i < segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            const nextTheta = (i + 1) * 2 * Math.PI / segments;

            const x1 = Math.cos(theta) * radius;
            const z1 = Math.sin(theta) * radius;
            const x2 = Math.cos(nextTheta) * radius;
            const z2 = Math.sin(nextTheta) * radius;

            // Side Face (2 triangles)
            // Verts: TL, BL, BR, TR
            // Normals: Average for flat shading
            const pTL = [x1, halfH, z1];
            const pBL = [x1, -halfH, z1];
            const pBR = [x2, -halfH, z2];
            const pTR = [x2, halfH, z2];

            // Normal for side
            // Just stick out from center?
            // (x1+x2)/2, 0, (z1+z2)/2
            const nx = (x1 + x2) / 2; const nz = (z1 + z2) / 2;
            const len = Math.sqrt(nx * nx + nz * nz);
            const norm = [nx / len, 0, nz / len];

            const startIndex = positions.length / 3;

            positions.push(...pTL, ...pBL, ...pBR, ...pTR);
            for (let k = 0; k < 4; k++) normals.push(...norm);

            indices.push(startIndex, startIndex + 1, startIndex + 2);
            indices.push(startIndex, startIndex + 2, startIndex + 3);

            // Top Cap (Triangle fan center is a bit complex, just 1 triangle if segment small enough, else center point)
            // Let's assume just sides for sticks is enough visually or add simple cap later.
        }
        // Caps are nice for solid look
        const topCenter = [0, halfH, 0];
        const bottomCenter = [0, -halfH, 0];

        const topStart = positions.length / 3;
        positions.push(...topCenter); normals.push(0, 1, 0);

        // Add rim verts
        for (let i = 0; i <= segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            positions.push(x, halfH, z);
            normals.push(0, 1, 0);
        }

        // Indices for top fan
        for (let i = 0; i < segments; i++) {
            indices.push(topStart, topStart + 1 + i, topStart + 1 + i + 1);
        }

        // Bottom cap omitted for brevity (usually hidden on ground)

        return {
            positions: new Float32Array(positions),
            indices: new Uint16Array(indices),
            normals: new Float32Array(normals)
        };
    },

    createDecagon(radius = 0.5, height = 0.1) {
        // Flattened 10-sided cylinder
        const segments = 10;
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const halfH = height / 2;

        // 1. Sides
        for (let i = 0; i < segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            const nextTheta = (i + 1) * 2 * Math.PI / segments;

            const x1 = Math.cos(theta) * radius;
            const z1 = Math.sin(theta) * radius;
            const x2 = Math.cos(nextTheta) * radius;
            const z2 = Math.sin(nextTheta) * radius;

            // Verts: TL, BL, BR, TR
            const pTL = [x1, halfH, z1];
            const pBL = [x1, -halfH, z1];
            const pBR = [x2, -halfH, z2];
            const pTR = [x2, halfH, z2];

            // Normal (Flat)
            const nx = (x1 + x2) / 2; const nz = (z1 + z2) / 2;
            const len = Math.sqrt(nx * nx + nz * nz);
            const norm = [nx / len, 0, nz / len];

            // UVs (Wrap around)
            const u1 = i / segments;
            const u2 = (i + 1) / segments;

            const curIdx = positions.length / 3;
            positions.push(...pTL, ...pBL, ...pBR, ...pTR);
            // Normals
            for (let k = 0; k < 4; k++) normals.push(...norm);
            // UVs
            uvs.push(u1, 0, u1, 1, u2, 1, u2, 0); // V flipped? 0 top? simple map

            indices.push(curIdx, curIdx + 1, curIdx + 2);
            indices.push(curIdx, curIdx + 2, curIdx + 3);
        }

        // 2. Caps (Top and Bottom)
        // We want images on faces.
        // Top Cap
        const topCenterIdx = positions.length / 3;
        positions.push(0, halfH, 0);
        normals.push(0, 1, 0);
        uvs.push(0.5, 0.5); // Center

        for (let i = 0; i <= segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            positions.push(x, halfH, z);
            normals.push(0, 1, 0);

            // Map x,z (-r to r) to 0..1
            // u = (x/r + 1)/2
            uvs.push((x / radius + 1) / 2, (z / radius + 1) / 2);
        }

        // Top Indices
        for (let i = 0; i < segments; i++) {
            indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 1 + i + 1);
        }

        // Bottom Cap
        const botCenterIdx = positions.length / 3;
        positions.push(0, -halfH, 0);
        normals.push(0, -1, 0);
        uvs.push(0.5, 0.5);

        for (let i = 0; i <= segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius; // Clockwise for bottom?

            positions.push(x, -halfH, z);
            normals.push(0, -1, 0);
            uvs.push((x / radius + 1) / 2, (z / radius + 1) / 2);
        }

        // Bottom Indices
        for (let i = 0; i < segments; i++) {
            indices.push(botCenterIdx, botCenterIdx + 1 + i + 1, botCenterIdx + 1 + i);
        }

        return {
            positions: new Float32Array(positions),
            indices: new Uint16Array(indices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs)
        };
    },

    createTShape() {
        // T-Shape: Two cubes?
        // Vertical part: 0.2 width, 1.0 height?
        // Horizontal part: 0.8 width, 0.2 height?
        // Let's make it out of cubes for simplicity of normals.
        // Vertical post: 0, 0, 0 size 0.3x0.7x0.3
        // Top bar: 0, 0.35, 0 size 0.8x0.3x0.3

        // Actually, let's just use raw verts for a single mesh to avoid overlapping geometry aliasing if possible, 
        // but simple joined boxes are easier to generate.

        const positions = [];
        const indices = [];
        const normals = [];

        const addBox = (cx, cy, cz, sx, sy, sz) => {
            const hx = sx / 2, hy = sy / 2, hz = sz / 2;
            const startIdx = positions.length / 3;

            // Verts
            const verts = [
                // Front
                cx - hx, cy - hy, cz + hz, cx + hx, cy - hy, cz + hz, cx + hx, cy + hy, cz + hz, cx - hx, cy + hy, cz + hz,
                // Back
                cx - hx, cy - hy, cz - hz, cx - hx, cy + hy, cz - hz, cx + hx, cy + hy, cz - hz, cx + hx, cy - hy, cz - hz,
                // Top
                cx - hx, cy + hy, cz - hz, cx - hx, cy + hy, cz + hz, cx + hx, cy + hy, cz + hz, cx + hx, cy + hy, cz - hz,
                // Bottom
                cx - hx, cy - hy, cz - hz, cx + hx, cy - hy, cz - hz, cx + hx, cy - hy, cz + hz, cx - hx, cy - hy, cz + hz,
                // Right
                cx + hx, cy - hy, cz - hz, cx + hx, cy + hy, cz - hz, cx + hx, cy + hy, cz + hz, cx + hx, cy - hy, cz + hz,
                // Left
                cx - hx, cy - hy, cz - hz, cx - hx, cy - hy, cz + hz, cx - hx, cy + hy, cz + hz, cx - hx, cy + hy, cz - hz
            ];

            positions.push(...verts);

            // Normals
            const norms = [
                0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
                0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
                0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
                0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
                1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
                -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
            ];
            normals.push(...norms);

            // Indices
            const inds = [
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                8, 9, 10, 8, 10, 11,
                12, 13, 14, 12, 14, 15,
                16, 17, 18, 16, 18, 19,
                20, 21, 22, 20, 22, 23
            ];
            inds.forEach(i => indices.push(startIdx + i));
        };

        // Vertical Stem
        addBox(0, 0, 0, 0.3, 1.0, 0.3);
        // Top Bar
        addBox(0, 0.35, 0, 1.0, 0.3, 0.3); // High up

        return {
            positions: new Float32Array(positions),
            indices: new Uint16Array(indices),
            normals: new Float32Array(normals)
        };
    }
};
