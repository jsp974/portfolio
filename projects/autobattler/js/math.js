/**
 * Minimal Math Library for WebGL
 */

export class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static add(a, b) { return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z); }
    static sub(a, b) { return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z); }
    static mul(a, s) { return new Vec3(a.x * s, a.y * s, a.z * s); }

    static cross(a, b) {
        return new Vec3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    static dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }

    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len > 0.00001) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }

    clone() { return new Vec3(this.x, this.y, this.z); }

    toArray() { return [this.x, this.y, this.z]; }
}

export class Mat4 {
    constructor() {
        this.data = new Float32Array(16);
        this.identity();
    }

    identity() {
        this.data.fill(0);
        this.data[0] = 1;
        this.data[5] = 1;
        this.data[10] = 1;
        this.data[15] = 1;
        return this;
    }

    static perspective(fovy, aspect, near, far) {
        const out = new Mat4();
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);

        out.data[0] = f / aspect;
        out.data[1] = 0;
        out.data[2] = 0;
        out.data[3] = 0;

        out.data[4] = 0;
        out.data[5] = f;
        out.data[6] = 0;
        out.data[7] = 0;

        out.data[8] = 0;
        out.data[9] = 0;
        out.data[10] = (far + near) * nf;
        out.data[11] = -1;

        out.data[12] = 0;
        out.data[13] = 0;
        out.data[14] = (2 * far * near) * nf;
        out.data[15] = 0;

        return out;
    }

    static lookAt(eye, center, up) {
        const out = new Mat4();
        const z = Vec3.sub(eye, center).normalize();
        const x = Vec3.cross(up, z).normalize();

        if (Vec3.dot(x, x) === 0) { // Check if parallel
            return out; // Should handle this better usually
        }

        const y = Vec3.cross(z, x).normalize();

        out.data[0] = x.x;
        out.data[1] = y.x;
        out.data[2] = z.x;
        out.data[3] = 0;

        out.data[4] = x.y;
        out.data[5] = y.y;
        out.data[6] = z.y;
        out.data[7] = 0;

        out.data[8] = x.z;
        out.data[9] = y.z;
        out.data[10] = z.z;
        out.data[11] = 0;

        out.data[12] = -Vec3.dot(x, eye);
        out.data[13] = -Vec3.dot(y, eye);
        out.data[14] = -Vec3.dot(z, eye);
        out.data[15] = 1;

        return out;
    }

    translate(v) {
        const x = v.x, y = v.y, z = v.z;
        const a = this.data;
        a[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        a[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        a[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        a[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        return this;
    }

    scale(v) {
        const x = v.x, y = v.y, z = v.z;
        const a = this.data;
        a[0] *= x; a[4] *= y; a[8] *= z;
        a[1] *= x; a[5] *= y; a[9] *= z;
        a[2] *= x; a[6] *= y; a[10] *= z;
        a[3] *= x; a[7] *= y; a[11] *= z;
        return this;
    }

    // Simple rotation around Y axis for this prototype
    rotateY(rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const a = this.data;

        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

        a[0] = a00 * c - a20 * s;
        a[1] = a01 * c - a21 * s;
        a[2] = a02 * c - a22 * s;
        a[3] = a03 * c - a23 * s;

        a[8] = a00 * s + a20 * c;
        a[9] = a01 * s + a21 * c;
        a[10] = a02 * s + a22 * c;
        a[11] = a03 * s + a23 * c;

        return this;
    }

    rotateX(rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const a = this.data;

        const a01 = a[1], a02 = a[2];
        const a11 = a[5], a12 = a[6];
        const a21 = a[9], a22 = a[10];
        const a31 = a[13], a32 = a[14];

        a[1] = a01 * c + a02 * s;
        a[2] = a02 * c - a01 * s;
        a[5] = a11 * c + a12 * s;
        a[6] = a12 * c - a11 * s;
        a[9] = a21 * c + a22 * s;
        a[10] = a22 * c - a21 * s;
        a[13] = a31 * c + a32 * s;
        a[14] = a32 * c - a31 * s;

        return this;
    }

    rotateZ(rad) {
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const a = this.data;

        const a00 = a[0], a01 = a[1];
        const a10 = a[4], a11 = a[5];
        const a20 = a[8], a21 = a[9];
        const a30 = a[12], a31 = a[13];

        a[0] = a00 * c + a01 * s;
        a[1] = a01 * c - a00 * s;
        a[4] = a10 * c + a11 * s;
        a[5] = a11 * c - a10 * s;
        a[8] = a20 * c + a21 * s;
        a[9] = a21 * c - a20 * s;
        a[12] = a30 * c + a31 * s;
        a[13] = a31 * c - a30 * s;

        return this;
    }

    static mul(a, b) {
        const out = new Mat4();
        const ae = a.data;
        const be = b.data;
        const oe = out.data;

        for (let i = 0; i < 4; i++) { // Row
            for (let j = 0; j < 4; j++) { // Col
                // out[i, j] = row(a, i) . col(b, j)
                // But data is column-major usually in WebGL...
                // data[0]=m00, data[1]=m10, data[2]=m20, data[3]=m30
                // data[4]=m01...

                // Let's assume standard column-major multiplication
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += ae[k * 4 + i] * be[j * 4 + k]; // Wait, this logic is tricky without indices mentally.
                    // out_col_j_row_i = sum(a_row_i_col_k * b_row_k_col_j)
                }
            }
        }

        // Easier implementation:
        const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3];
        const a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7];
        const a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11];
        const a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];

        let b0 = be[0], b1 = be[1], b2 = be[2], b3 = be[3];
        oe[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        oe[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        oe[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        oe[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = be[4]; b1 = be[5]; b2 = be[6]; b3 = be[7];
        oe[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        oe[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        oe[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        oe[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = be[8]; b1 = be[9]; b2 = be[10]; b3 = be[11];
        oe[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        oe[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        oe[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        oe[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = be[12]; b1 = be[13]; b2 = be[14]; b3 = be[15];
        oe[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        oe[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        oe[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        oe[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        return out;
    }

    invert() {
        const out = new Mat4();
        const a = this.data;
        const outd = out.data;

        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;

        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        outd[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        outd[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        outd[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        outd[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        outd[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        outd[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        outd[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        outd[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        outd[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        outd[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        outd[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        outd[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        outd[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        outd[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        outd[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        outd[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return out;
    }
}
