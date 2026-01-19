/**
 * WebGL Renderer
 */
import { createProgram, createBuffer } from './gl.js';
import { Mat4, Vec3 } from './math.js';
import { Shapes } from './shapes.js';

const VS_SOURCE = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform vec3 uColor;

    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec2 vTexCoord;

    void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
        vNormal = (uModel * vec4(aNormal, 0.0)).xyz;
        vColor = uColor;
        vTexCoord = aTexCoord;
    }
`;

const FS_SOURCE = `
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec2 vTexCoord;

    uniform sampler2D uSampler;
    uniform bool uHasTexture;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float diff = max(dot(normal, lightDir), 0.2); // Ambient + Diffuse
        
        vec4 texColor = vec4(1.0);
        if (uHasTexture) {
            texColor = texture2D(uSampler, vTexCoord);
        }

        gl_FragColor = vec4(vColor * diff, 1.0) * texColor;
    }
`;

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');

        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        this.program = createProgram(this.gl, VS_SOURCE, FS_SOURCE);

        this.attribs = {
            position: this.gl.getAttribLocation(this.program, 'aPosition'),
            normal: this.gl.getAttribLocation(this.program, 'aNormal'),
            texCoord: this.gl.getAttribLocation(this.program, 'aTexCoord'),
        };

        this.uniforms = {
            model: this.gl.getUniformLocation(this.program, 'uModel'),
            view: this.gl.getUniformLocation(this.program, 'uView'),
            projection: this.gl.getUniformLocation(this.program, 'uProjection'),
            color: this.gl.getUniformLocation(this.program, 'uColor'),
            sampler: this.gl.getUniformLocation(this.program, 'uSampler'),
            hasTexture: this.gl.getUniformLocation(this.program, 'uHasTexture'),
        };

        this.meshes = {};
        this.initGeometry();

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    }

    initGeometry() {
        const cubeData = Shapes.createCube();
        const planeData = Shapes.createPlane();
        const pyramidData = Shapes.createPyramid();
        const sphereData = Shapes.createSphere();
        const cylinderData = Shapes.createCylinder(); // Standard stick
        const tshapeData = Shapes.createTShape();
        const decagonData = Shapes.createDecagon(0.5, 0.1); // Default

        this.meshes.cube = this.createMesh(cubeData);
        this.meshes.plane = this.createMesh(planeData);
        this.meshes.pyramid = this.createMesh(pyramidData);
        this.meshes.sphere = this.createMesh(sphereData);
        this.meshes.cylinder = this.createMesh(cylinderData);
        this.meshes.tshape = this.createMesh(tshapeData);
        this.meshes.decagon = this.createMesh(decagonData);
    }

    createMesh(data) {
        // Handle Missing UVs
        let uvs = data.uvs;
        if (!uvs) {
            const count = (data.positions.length / 3) * 2;
            uvs = new Float32Array(count); // Zeros
        }

        return {
            position: createBuffer(this.gl, data.positions),
            normal: createBuffer(this.gl, data.normals),
            texCoord: createBuffer(this.gl, uvs),
            indices: createBuffer(this.gl, data.indices, this.gl.ELEMENT_ARRAY_BUFFER),
            count: data.indices.length
        };
    }

    createTexture(image) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Upload
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Mips / parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return texture;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    render(scene, camera) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.program);

        // Setup Camera
        const projection = Mat4.perspective(Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100.0);
        const view = Mat4.lookAt(camera.position, camera.target, new Vec3(0, 1, 0));

        this.gl.uniformMatrix4fv(this.uniforms.projection, false, projection.data);
        this.gl.uniformMatrix4fv(this.uniforms.view, false, view.data);

        // Draw Scene Objects
        for (const obj of scene) {
            this.drawObject(obj);
        }
    }

    drawObject(obj) {
        const mesh = this.meshes[obj.type]; // 'cube', 'plane'
        if (!mesh) return;

        // Bind attributes
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.position);
        this.gl.vertexAttribPointer(this.attribs.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attribs.position);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normal);
        this.gl.vertexAttribPointer(this.attribs.normal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.attribs.normal);

        // UVs
        if (this.attribs.texCoord !== -1 && mesh.texCoord) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.texCoord);
            this.gl.vertexAttribPointer(this.attribs.texCoord, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.attribs.texCoord);
        }

        // Set Uniforms
        this.gl.uniformMatrix4fv(this.uniforms.model, false, obj.transform.data);

        if (obj.color) {
            this.gl.uniform3fv(this.uniforms.color, obj.color.toArray());
        } else {
            this.gl.uniform3f(this.uniforms.color, 1, 1, 1);
        }

        // Texture
        if (obj.texture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, obj.texture);
            this.gl.uniform1i(this.uniforms.sampler, 0);
            this.gl.uniform1i(this.uniforms.hasTexture, 1);
        } else {
            this.gl.uniform1i(this.uniforms.hasTexture, 0);
        }

        // Draw
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
        this.gl.drawElements(this.gl.TRIANGLES, mesh.count, this.gl.UNSIGNED_SHORT, 0);
    }
}
