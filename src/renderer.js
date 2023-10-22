// @author saccharineboi

//////////////////////////////////////////////////
const EPSILON = 1e-6;
const FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT;

const FOG_UBO_BINDING = 0;
const FOG_UBO_NAME = "FogBlock";

const PHONG_MAT_UBO_BINDING = 1;
const PHONG_MAT_UBO_NAME = "PhongMatBlock";

const DIR_LIGHT_UBO_BINDING = 2;
const DIR_LIGHT_UBO_NAME = "DirLightBlock";

const POINT_LIGHT_UBO_BINDING = 3;
const POINT_LIGHT_UBO_NAME = "PointLightBlock";

const SPOT_LIGHT_UBO_BINDING = 4;
const SPOT_LIGHT_UBO_NAME = "SpotLightBlock";

const MAX_DIR_LIGHTS = 2;
const MAX_POINT_LIGHTS = 4;
const MAX_SPOT_LIGHTS = 2;

const BASIC_SHADER_VERT_APOS_LOC = 0;
const BASIC_SHADER_VERT_ACOL_LOC = 1;

const BASIC_COLOR_SHADER_VERT_APOS_LOC = 0;

const BASIC_TEXTURE_SHADER_VERT_APOS_LOC = 0;
const BASIC_TEXTURE_SHADER_VERT_ATEXCOORD_LOC = 2;

const DOUBLE_TEXTURE_SHADER_VERT_APOS_LOC = 0;
const DOUBLE_TEXTURE_SHADER_VERT_ATEXCOORD_LOC = 2;

const PHONG_SHADER_VERT_APOS_LOC = 0;
const PHONG_SHADER_VERT_ANORM_LOC = 1;
const PHONG_SHADER_VERT_ATEXCOORD_LOC = 2;

const CUBEMAP_SHADER_VERT_APOS_LOC = 0;

const POSTPROCESS_SHADER_VERT_APOS_LOC = 0;
const POSTPROCESS_SHADER_VERT_ATEXCOORD_LOC = 1;

const SHADER_VERT_APOS_NAME = "a_pos";
const SHADER_VERT_ACOL_NAME = "a_col";
const SHADER_VERT_ATEXCOORD_NAME = "a_texcoord";
const SHADER_VERT_ANORM_NAME = "a_norm";

//////////////////////////////////////////////////
const Common = Object.freeze({
    floatEquals: (x, y) => Math.abs(x - y) <= EPSILON,
    toRadians: degrees => degrees * Math.PI / 180.0,
    toDegrees: radians => radians * 180.0 / Math.PI,
    genAttenuationFromRange: range => Object.freeze({
        linear: 4.5 / range,
        quadratic: 75.0 / (range * range)
    }),
    isPowerOfTwo: x => (x & (x - 1)) === 0
});

//////////////////////////////////////////////////
const Exception = message => {
    return Object.freeze({
        type: "hopper_exception",
        message: message,
        toString: () => `Hopper Exception: ${message}`
    });
};

//////////////////////////////////////////////////
const Canvas = id => {
    const canvas = document.getElementById(id);
    if (!canvas) {
        throw Exception(`canvas with id ${id} not found`);
    }

    return Object.freeze({
        getID: () => id,
        getCanvas: () => canvas,
        getWidth: () => canvas.width,
        getHeight: () => canvas.height,
        getAspect: () => canvas.width / canvas.height,
        getContext: (name, attributes) => canvas.getContext(name, attributes),
        resize: gl => {
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        }
    });
};

//////////////////////////////////////////////////
const Vec2 = (x = 0, y = 0) => Object.freeze({
    getX: () => x,
    getY: () => y,

    getR: () => x,
    getG: () => y,

    setX: _x => x = _x,
    setY: _y => y = _y,

    setR: _x => x = _x,
    setG: _y => y = _y,

    set: (_x = 0, _y = 0) => {
        x = _x;
        y = _y;
    },

    add: v => Vec2(x + v.getX(), y + v.getY()),
    sub: v => Vec2(x - v.getX(), y - v.getY()),
    mul: v => Vec2(x * v.getX(), y * v.getY()),
    div: v => Vec2(x / v.getX(), y / v.getY()),

    len: () => Math.sqrt(x * x + y * y),
    sqrlen: () => x * x + y * y,

    dot: v => x * v.getX() + y * v.getY(),

    dist: v => {
        const dx = x - v.getX();
        const dy = y - v.getY();
        return Math.sqrt(dx * dx + dy * dy);
    },

    sqrdist: v => {
        const dx = x - v.getX();
        const dy = y - v.getY();
        return dx * dx + dy * dy;
    },

    norm: () => {
        const sqrsum = x * x + y * y;
        if (!Common.floatEquals(sqrsum, 0.0)) {
            const invsum = 1.0 / Math.sqrt(sqrsum);
            return Vec2(x * invsum, y * invsum);
        }
        return Vec2(x, y);
    },

    inv: () => Vec2(1.0 / x, 1.0 / y),
    negate: () => Vec2(-x, -y),
    scale: s => Vec2(x * s, y * s),
    copy: () => Vec2(x, y),
    clone: v => {
        x = v.getX();
        y = v.getY();
    },

    lerp: (v, t) => Vec2(x + t * (v.getX() - x),
                         y + t * (v.getY() - y)),

    equals: v => Common.floatEquals(x, v.getX()) &&
                 Common.floatEquals(y, v.getY()),

    exactEquals: v => x === v.getX() && y === v.getY(),

    angle: v => {
        const vx = v.getX(), vy = v.getY();
        const mag = Math.sqrt(x * x + y * y) * Math.sqrt(vx * vx + vy * vy);
        const cosine = mag && (x * vx + y * vy) / mag;
        return Math.acos(Math.min(Math.max(cosine, -1.0), 1.0));
    },

    rotate: (origin, radians) => {
        const px = x - origin.getX();
        const py = y - origin.getY();
        const s = Math.sin(radians);
        const c = Math.cos(radians);
        return Vec2(px * c - py * s + origin.getX(),
                    px * s - py * c + origin.getY());
    },

    toString: (n = 2) => `[ ${x.toFixed(n)}, ${y.toFixed(n)} ]`
});

//////////////////////////////////////////////////
const Vec3 = (x = 0, y = 0, z = 0) => Object.freeze({
    getX: () => x,
    getY: () => y,
    getZ: () => z,

    getR: () => x,
    getG: () => y,
    getB: () => z,

    setX: _x => x = _x,
    setY: _y => y = _y,
    setZ: _z => z = _z,

    setR: _x => x = _x,
    setG: _y => y = _y,
    setB: _z => z = _z,

    set: (_x = 0, _y = 0, _z = 0) => {
        x = _x;
        y = _y;
        z = _z;
    },

    add: v => Vec3(x + v.getX(), y + v.getY(), z + v.getZ()),
    sub: v => Vec3(x - v.getX(), y - v.getY(), z - v.getZ()),
    mul: v => Vec3(x * v.getX(), y * v.getY(), z * v.getZ()),
    div: v => Vec3(x / v.getX(), y / v.getY(), z / v.getZ()),

    len: () => Math.sqrt(x * x + y * y + z * z),
    sqrlen: () => x * x + y * y + z * z,

    dot: v => x * v.getX() + y * v.getY() + z * v.getZ(),

    dist: v => {
        const dx = x - v.getX();
        const dy = y - v.getY()
        const dz = z - v.getZ();
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    sqrdist: v => {
        const dx = x - v.getX();
        const dy = y - v.getY()
        const dz = z - v.getZ();
        return dx * dx + dy * dy + dz * dz;
    },

    norm: () => {
        const sqrsum = x * x + y * y + z * z;
        if (!Common.floatEquals(sqrsum, 0.0)) {
            const invsum = 1.0 / Math.sqrt(sqrsum);
            return Vec3(x * invsum, y * invsum, z * invsum);
        }
        return Vec3(x, y, z);
    },

    inv: () => Vec3(1.0 / x, 1.0 / y, 1.0 / z),
    negate: () => Vec3(-x, -y, -z),
    scale: s => Vec3(x * s, y * s, z * s),
    copy: () => Vec3(x, y, z),
    clone: v => {
        x = v.getX();
        y = v.getY();
        z = v.getZ();
    },

    cross: v => {
        const vx = v.getX(), vy = v.getY(), vz = v.getZ();
        return Vec3(y * vz - z * vy,
                    z * vx - vz * x,
                    x * vy - y * vx);
    },

    bezier: (control0, control1, dst, t) => {
        const inverseFactor = 1 - t;
        const inverseFactorSquared = inverseFactor * inverseFactor;
        const factorSquared = t * t;
        const factor0 = inverseFactorSquared * inverseFactor;
        const factor1 = 3 * t * inverseFactorSquared;
        const factor2 = 3 * factorSquared * inverseFactor;
        const factor3 = factorSquared * t;
        return Vec3(x * factor0 + control0.getX() * factor1 + control1.getX() * factor2 + dst.getX() * factor3,
                    y * factor0 + control0.getY() * factor1 + control1.getY() * factor2 + dst.getY() * factor3,
                    z * factor0 + control0.getZ() * factor1 + control1.getZ() * factor2 + dst.getZ() * factor3);
    },

    hermite: (control0, control1, dst, t) => {
        const factorSquared = t * t;
        const factor0 = factorSquared * (2 * t - 3) + 1;
        const factor1 = factorSquared * (t - 2) + t;
        const factor2 = factorSquared * (t - 1);
        const factor3 = factorSquared * (3 - 2 * t);
        return Vec3(x * factor0 + control0.getX() * factor1 + control1.getX() * factor2 + dst.getX() * factor3,
                    y * factor0 + control0.getY() * factor1 + control1.getY() * factor2 + dst.getY() * factor3,
                    z * factor0 + control0.getZ() * factor1 + control1.getZ() * factor2 + dst.getZ() * factor3);
    },

    rotateX: (origin, radians) => {
        // cache origin
        const ox = origin.getX();
        const oy = origin.getY();
        const oz = origin.getZ();

        // translate point to origin
        const px = x - ox;
        const py = y - oy;
        const pz = z - oz;

        // perform rotation
        const rx = px;
        const ry = py * Math.cos(radians) - pz * Math.sin(radians);
        const rz = py * Math.sin(radians) + pz * Math.cos(radians);

        // translate back to its original position
        return Vec3(rx + ox, ry + oy, rz + oz);
    },

    rotateY: (origin, radians) => {
        // cache origin
        const ox = origin.getX();
        const oy = origin.getY();
        const oz = origin.getZ();

        // translate point to origin
        const px = x - ox;
        const py = y - oy;
        const pz = z - oz;

        // perform rotation
        const rx = pz * Math.sin(radians) + px * Math.cos(radians);
        const ry = py;
        const rz = pz * Math.cos(radians) - px * Math.sin(radians);

        // translate back to its original position
        return Vec3(rx + ox, ry + oy, rz + oz);
    },

    rotateZ: (origin, radians) => {
        // cache origin
        const ox = origin.getX();
        const oy = origin.getY();
        const oz = origin.getZ();

        // translate point to origin
        const px = x - ox;
        const py = y - oy;
        const pz = z - oz;

        // perform rotation
        const rx = px * Math.cos(radians) - py * Math.sin(radians);
        const ry = px * Math.sin(radians) + py * Math.cos(radians);
        const rz = pz;

        // translate back to its original position
        return Vec3(rx + ox, ry + oy, rz + oz);
    },

    lerp: (v, t) => Vec3(x + t * (v.getX() - x),
                         y + t * (v.getY() - y),
                         z + t * (v.getZ() - z)),

    equals: v => Common.floatEquals(x, v.getX()) &&
                 Common.floatEquals(y, v.getY()) &&
                 Common.floatEquals(z, v.getZ()),

    exactEquals: v => x === v.getX() &&
                      y === v.getY() &&
                      z === v.getZ(),

    angle: v => {
        const vx = v.getX(), vy = v.getY(), vz = v.getZ();
        const mag0 = Math.sqrt(x * x + y * y + z * z);
        const mag1 = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const mag = mag0 * mag1;
        const cosine = mag && (x * vx + y * vy + z * vz) / mag;
        return Math.acos(Math.min(Math.max(cosine, -1.0), 1.0));
    },

    toString: (n = 2) => `[ ${x.toFixed(n)}, ${y.toFixed(n)}, ${z.toFixed(n)} ]`
});

//////////////////////////////////////////////////
const Vec4 = (x = 0, y = 0, z = 0, w = 1) => Object.freeze({
    getX: () => x,
    getY: () => y,
    getZ: () => z,
    getW: () => w,

    getR: () => x,
    getG: () => y,
    getB: () => z,
    getA: () => w,

    setX: _x => x = _x,
    setY: _y => y = _y,
    setZ: _z => z = _z,
    setW: _w => w = _w,

    setR: _x => x = _x,
    setG: _y => y = _y,
    setB: _z => z = _z,
    setA: _w => w = _w,

    set: (_x = 0, _y = 0, _z = 0, _w = 1) => {
        x = _x;
        y = _y;
        z = _z;
        w = _w;
    },

    add: v => Vec4(x + v.getX(), y + v.getY(), z + v.getZ(), w + v.getW()),
    sub: v => Vec4(x - v.getX(), y - v.getY(), z - v.getZ(), w - v.getW()),
    mul: v => Vec4(x * v.getX(), y * v.getY(), z * v.getZ(), w * v.getW()),
    div: v => Vec4(x / v.getX(), y / v.getY(), z / v.getZ(), w / v.getW()),

    len: () => Math.sqrt(x * x + y * y + z * z + w * w),
    sqrlen: () => x * x + y * y + z * z + w * w,

    dot: v => x * v.getX() + y * v.getY() + z * v.getZ() + w * v.getW(),

    dist: v => {
        const dx = x - v.getX();
        const dy = y - v.getY();
        const dz = z - v.getZ();
        const dw = w - v.getW();
        return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
    },

    sqrdist: v => {
        const dx = x - v.getX();
        const dy = y - v.getY();
        const dz = z - v.getZ();
        const dw = w - v.getW();
        return dx * dx + dy * dy + dz * dz + dw * dw;
    },

    norm: () => {
        const sqrsum = x * x + y * y + z * z + w * w;
        if (!Common.floatEquals(sqrsum, 0.0)) {
            const invsum = 1.0 / Math.sqrt(sqrsum);
            return Vec4(x * invsum, y * invsum, z * invsum, w * invsum);
        }
        return Vec4(x, y, z, w);
    },

    inv: () => Vec4(1.0 / x, 1.0 / y, 1.0 / z, 1.0 / w),
    negate: () => Vec4(-x, -y, -z, -w),
    scale: s => Vec4(x * s, y * s, z * s, w * s),
    copy: () => Vec4(x, y, z, w),
    clone: v => {
        x = v.getX();
        y = v.getY();
        z = v.getZ();
        w = v.getW();
    },

    cross: (v, w) => {
        const vx = v.getX(), vy = v.getY(), vz = v.getZ(), vw = v.getW();
        const wx = w.getX(), wy = w.getY(), wz = w.getZ(), ww = w.getW();

        const A = vx * wy - vy * wx;
        const B = vx * wz - vz * wx;
        const C = vx * ww - vw * wx;
        const D = vy * wz - vz * wy;
        const E = vy * ww - vw * wy;
        const F = vz * ww - vw * wz;

        const G = x;
        const H = y;
        const I = z;
        const J = w;

        return Vec4(H * F - I * E + J * D,
                    -(G * F) + I * C - J * B,
                    G * E - H * C + J * A,
                    -(G * D) + H * B - I * A);
    },

    lerp: (v, t) => Vec4(x + t * (v.getX() - x),
                         y + t * (v.getY() - y),
                         z + t * (v.getZ() - z),
                         w + t * (v.getW() - w)),

    equals: v => Common.floatEquals(x, v.getX()) &&
                 Common.floatEquals(y, v.getY()) &&
                 Common.floatEquals(z, v.getZ()) &&
                 Common.floatEquals(w, v.getW()),

    exactEquals: v => x === v.getX() &&
                      y === v.getY() &&
                      z === v.getZ() &&
                      w === v.getW(),

    toString: (n = 2) => `[ ${x.toFixed(n)}, ${y.toFixed(n)}, ${z.toFixed(n)}, ${w.toFixed(n)} ]`
});

//////////////////////////////////////////////////
const Quat = (x = 0, y = 0, z = 0, w = 1) => Object.freeze({
    getX: () => x,
    getY: () => y,
    getZ: () => z,
    getW: () => w,

    setX: _x => x = _x,
    setY: _y => y = _y,
    setZ: _z => z = _z,
    setW: _w => w = _w,

    set: (_x = 0, _y = 0, _z = 0, _w = 1) => {
        x = _x;
        y = _y;
        z = _z;
        w = _w;
    },

    setInd: (ind, value) => {
        switch (ind) {
            case 0:
                x = value;
                break;
            case 1:
                y = value;
                break;
            case 2:
                z = value;
                break;
            case 3:
                w = value;
                break;
            default:
                throw Exception(`Error: ${ind} is an invalid index for a Quat`);
        }
    },

    add: q => Quat(x + q.getX(), y + q.getY(), z + q.getZ(), w + q.getW()),
    sub: q => Quat(x - q.getX(), y - q.getY(), z - q.getZ(), w - q.getW()),
    mul: q => {
        const qx = q.getX(), qy = q.getY(), qz = q.getZ(), qw = q.getW();
        return Quat(x * qw + w * qx + y * qz - z * qy,
                    y * qw + w * qy + z * qx - x * qz,
                    z * qw + w * qz + x * qy - y * qx,
                    w * qw - x * qx - y * qy - z * qz);
    },
    div: q => Quat(x / q.getX(), y / q.getY(), z / q.getZ(), w / q.getW()),

    len: () => Math.sqrt(x * x + y * y + z * z + w * w),
    sqrlen: () => x * x + y * y + z * z + w * w,

    dot: q => x * q.getX() + y * q.getY() + z * q.getZ() + w * q.getW(),

    dist: q => {
        const dx = x - q.getX();
        const dy = y - q.getY();
        const dz = z - q.getZ();
        const dw = w - q.getW();
        return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
    },

    sqrdist: q => {
        const dx = x - q.getX();
        const dy = y - q.getY();
        const dz = z - q.getZ();
        const dw = w - q.getW();
        return dx * dx + dy * dy + dz * dz + dw * dw;
    },

    norm: () => {
        const sqrsum = x * x + y * y + z * z + w * w;
        if (!Common.floatEquals(sqrsum, 0.0)) {
            const invsum = 1.0 / Math.sqrt(sqrsum);
            return Quat(x * invsum, y * invsum, z * invsum, w * invsum);
        }
        return Quat(x, y, z, w);
    },

    copy: () => Quat(x, y, z, w),
    clone: q => {
        x = q.getX();
        y = q.getY();
        z = q.getZ();
        w = q.getW();
    },
    scale: s => Quat(x * s, y * s, z * s, w * s),
    conjugate: () => Quat(-x, -y, -z, w),

    inv: () => {
        const dotsum = x * x + y * y + z * z + w * w;
        if (!Common.floatEquals(dotsum, 0.0)) {
            const invdot = 1.0 / dotsum;
            return Quat(-x * invdot,
                        -y * invdot,
                        -z * invdot,
                         w * invdot);
        }
        return Quat(0, 0, 0, 0);
    },

    lerp: (q, t) => Quat(x + t * (q.getX() - x),
                         y + t * (q.getY() - y),
                         z + t * (q.getZ() - z),
                         w + t * (q.getW() - w)),

    slerp: (q, t) => {
        let qx = q.getX(), qy = q.getY(), qz = q.getZ(), qw = q.getW();
        let cosom = x * qx + y * qy + z * qz + w * qw;

        if (cosom < 0.0) {
            cosom = -cosom;
            qx = -qx;
            qy = -qy;
            qz = -qz;
            qw = -qw;
        }

        let scale0, scale1;
        if (1.0 - cosom > EPSILON) {
            const omega = Math.acos(cosom);
            const sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        }
        else {
            scale0 = 1.0 - t;
            scale1 = t;
        }

        return Quat(scale0 * x + scale1 * qx,
                    scale0 * y + scale1 * qy,
                    scale0 * z + scale1 * qz,
                    scale0 * w + scale1 * qw);
    },

    setIdentity: () => {
        x = 0;
        y = 0;
        z = 0;
        w = 1;
    },

    setAxisAngle: (axis, radians) => {
        const halfRadians = radians * 0.5;
        const s = Math.sin(halfRadians);
        return Quat(s * axis.getX(),
                    s * axis.getY(),
                    s * axis.getZ(),
                    Math.cos(halfRadians));
    },

    setEuler: (xrads, yrads, zrads) => {
        const halfX = xrads * 0.5;
        const halfY = yrads * 0.5;
        const halfZ = zrads * 0.5;

        const sx = Math.sin(halfX);
        const cx = Math.cos(halfX);

        const sy = Math.sin(halfY);
        const cy = Math.cos(halfY);

        const sz = Math.sin(halfZ);
        const cz = Math.cos(halfZ);

        return Quat(sx * cy * cz - cx * sy * sz,
                    cx * sy * cz + sx * cy * sz,
                    cx * cy * sz - sx * sy * cz,
                    cx * cy * cz + sx * sy * sz);
    },

    rotateX: radians => {
        const halfRadians = radians * 0.5;
        const bx = Math.sin(halfRadians);
        const bw = Math.cos(halfRadians);
        return Quat(x * bw + w * bx,
                    y * bw + z * bx,
                    z * bw - y * bx,
                    w * bw - x * bx);
    },

    rotateY: radians => {
        const halfRadians = radians * 0.5;
        const by = Math.sin(halfRadians);
        const bw = Math.cos(halfRadians);
        return Quat(x * bw - z * by,
                    y * bw + w * by,
                    z * bw + x * by,
                    w * bw - y * by);
    },

    rotateZ: radians => {
        const halfRadians = radians * 0.5;
        const bz = Math.sin(halfRadians);
        const bw = Math.cos(halfRadians);
        return Quat(x * bw + y * bz,
                    y * bw - x * bz,
                    z * bw + w * bz,
                    w * bw - z * bz);
    },

    angle: q => {
        const dotsum = x * q.getX() + y * q.getY() + z * q.getZ() + w * q.getW();
        return Math.acos(2 * dotsum * dotsum - 1);
    },

    equals: q => Common.floatEquals(x, q.getX()) &&
                 Common.floatEquals(y, q.getY()) &&
                 Common.floatEquals(z, q.getZ()) &&
                 Common.floatEquals(w, q.getW()),

    exactEquals: q => x === q.getX() &&
                      y === q.getY() &&
                      z === q.getZ() &&
                      w === q.getW(),

    toString: (n = 2) => `[ ${x.toFixed(n)}, ${y.toFixed(n)}, ${z.toFixed(n)}, ${w.toFixed(n)} ]`
});

//////////////////////////////////////////////////
const Mat2 = (m00 = 1.0, m01 = 0.0,
              m10 = 0.0, m11 = 1.0) => {
    const data = new Float32Array([m00, m01, m10, m11]);
    return Object.freeze({
        get: (row, col) => data[2 * row + col],
        getInd: ind => data[ind],
        getData: () => data,
        set: (row, col, value) => data[2 * row + col] = value,
        setInd: (ind, value) => data[ind] = value,
        setAll: (...values) => {
            data[0] = values[0];
            data[1] = values[1];
            data[2] = values[2];
            data[3] = values[3];
        },
        setIdentity: () => {
            data[0] = 1.0; data[1] = 0.0;
            data[2] = 0.0; data[3] = 1.0;
        },

        add: m => Mat2(data[0] + m.getInd(0), data[1] + m.getInd(1),
                       data[2] + m.getInd(2), data[3] + m.getInd(3)),
        sub: m => Mat2(data[0] - m.getInd(0), data[1] - m.getInd(1),
                       data[2] - m.getInd(2), data[3] - m.getInd(3)),
        mul: m => {
            const b0 = m.getInd(0);
            const b1 = m.getInd(1);
            const b2 = m.getInd(2);
            const b3 = m.getInd(3);

            return Mat2(data[0] * b0 + data[2] * b1,
                        data[1] * b0 + data[3] * b1,
                        data[0] * b2 + data[2] * b3,
                        data[1] * b2 + data[3] * b3);
        },
        div: m => Mat2(data[0] / m.getInd(0), data[1] / m.getInd(1),
                       data[2] / m.getInd(2), data[3] / m.getInd(3)),

        adjugate: () => Mat2(data[3], -data[1],
                            -data[2], data[0]),

        det: () => data[0] * data[3] - data[2] * data[1],

        copy: () => Mat2(data[0], data[1],
                         data[2], data[3]),

        clone: m => {
            data[0] = m.getInd(0);
            data[1] = m.getInd(1);
            data[2] = m.getInd(2);
            data[3] = m.getInd(3);
        },

        equals: m => Common.floatEquals(data[0], m.getInd(0)) &&
                     Common.floatEquals(data[1], m.getInd(1)) &&
                     Common.floatEquals(data[2], m.getInd(2)) &&
                     Common.floatEquals(data[3], m.getInd(3)),

        exactEquals: m => data[0] === m.getInd(0) &&
                          data[1] === m.getInd(1) &&
                          data[2] === m.getInd(2) &&
                          data[3] === m.getInd(3),

        inv: () => {
            const determinant = data[0] * data[3] - data[2] * data[1];
            if (Common.floatEquals(determinant, 0.0)) {
                return Mat2(data[0], data[1],
                            data[2], data[3]);
            }
            const invdet = 1.0 / determinant;
            return Mat2(data[3] * invdet, -data[1] * invdet,
                       -data[2] * invdet, data[0] * invdet);
        },

        transpose: () => Mat2(data[0], data[2],
                              data[1], data[3]),

        toString: () => `[ ${data[0]}, ${data[1]},
                           ${data[2]}, ${data[3]} ]`
    });
};

//////////////////////////////////////////////////
const Mat3 = (m00 = 1.0, m01 = 0.0, m02 = 0.0,
              m10 = 0.0, m11 = 1.0, m12 = 0.0,
              m20 = 0.0, m21 = 0.0, m22 = 1.0) => {
    const data = new Float32Array([
        m00, m01, m02,
        m10, m11, m12,
        m20, m21, m22
    ]);
    return Object.freeze({
        get: (row, col) => data[3 * row + col],
        getInd: ind => data[ind],
        getData: () => data,
        set: (row, col, value) => data[3 * row + col] = value,
        setInd: (ind, value) => data[ind] = value,
        setAll: (...values) => {
            data[0] = values[0];
            data[1] = values[1];
            data[2] = values[2];
            data[3] = values[3];
            data[4] = values[4];
            data[5] = values[5];
            data[6] = values[6];
            data[7] = values[7];
            data[8] = values[8];
        },
        setIdentity: () => {
            data[0] = 1.0; data[1] = 0.0; data[2] = 0.0;
            data[3] = 0.0; data[4] = 1.0; data[5] = 0.0;
            data[6] = 0.0; data[7] = 0.0; data[8] = 1.0;
        },

        add: m => Mat3(data[0] + m.getInd(0), data[1] + m.getInd(1), data[2] + m.getInd(2),
                       data[3] + m.getInd(3), data[4] + m.getInd(4), data[5] + m.getInd(5),
                       data[6] + m.getInd(6), data[7] + m.getInd(7), data[8] + m.getInd(8)),
        sub: m => Mat3(data[0] - m.getInd(0), data[1] - m.getInd(1), data[2] - m.getInd(2),
                       data[3] - m.getInd(3), data[4] - m.getInd(4), data[5] - m.getInd(5),
                       data[6] - m.getInd(6), data[7] - m.getInd(7), data[8] - m.getInd(8)),
        mul: m => {
            const b00 = m.get(0, 0), b01 = m.get(0, 1), b02 = m.get(0, 2);
            const b10 = m.get(1, 0), b11 = m.get(1, 1), b12 = m.get(1, 2);
            const b20 = m.get(2, 0), b21 = m.get(2, 1), b22 = m.get(2, 2);
            return Mat3(b00 * data[0] + b01 * data[3] + b02 * data[6],
                        b00 * data[1] + b01 * data[4] + b02 * data[7],
                        b00 * data[2] + b01 * data[5] + b02 * data[8],
                        b10 * data[0] + b11 * data[3] + b12 * data[6],
                        b10 * data[1] + b11 * data[4] + b12 * data[7],
                        b10 * data[2] + b11 * data[5] + b12 * data[8],
                        b20 * data[0] + b21 * data[3] + b22 * data[6],
                        b20 * data[1] + b21 * data[4] + b22 * data[7],
                        b20 * data[2] + b21 * data[5] + b22 * data[8]);
        },
        div: m => Mat3(data[0] / m.getInd(0), data[1] / m.getInd(1), data[2] / m.getInd(2),
                       data[3] / m.getInd(3), data[4] / m.getInd(4), data[5] / m.getInd(5),
                       data[6] / m.getInd(6), data[7] / m.getInd(7), data[8] / m.getInd(8)),

        adjugate: () => Mat3(data[4] * data[8] - data[5] * data[7],
                             data[2] * data[7] - data[1] * data[8],
                             data[1] * data[5] - data[2] * data[4],
                             data[5] * data[6] - data[3] * data[8],
                             data[0] * data[8] - data[2] * data[6],
                             data[2] * data[3] - data[0] * data[5],
                             data[3] * data[7] - data[4] * data[6],
                             data[1] * data[6] - data[0] * data[7],
                             data[0] * data[4] - data[1] * data[3]),

        det: () => data[0] * (data[8] * data[4] - data[5] * data[7]) +
                   data[1] * (-data[8] * data[3] + data[5] * data[6]) +
                   data[2] * (data[7] * data[3] - data[4] * data[6]),

        copy: () => Mat3(data[0], data[1], data[2],
                         data[3], data[4], data[5],
                         data[6], data[7], data[8]),

        clone: m => {
            data[0] = m.getInd(0);
            data[1] = m.getInd(1);
            data[2] = m.getInd(2);
            data[3] = m.getInd(3);
            data[4] = m.getInd(4);
            data[5] = m.getInd(5);
            data[6] = m.getInd(6);
            data[7] = m.getInd(7);
            data[8] = m.getInd(8);
        },

        equals: m => Common.floatEquals(data[0], m.getInd(0)) &&
                     Common.floatEquals(data[1], m.getInd(1)) &&
                     Common.floatEquals(data[2], m.getInd(2)) &&
                     Common.floatEquals(data[3], m.getInd(3)) &&
                     Common.floatEquals(data[4], m.getInd(4)) &&
                     Common.floatEquals(data[5], m.getInd(5)) &&
                     Common.floatEquals(data[6], m.getInd(6)) &&
                     Common.floatEquals(data[7], m.getInd(7)) &&
                     Common.floatEquals(data[8], m.getInd(8)),

        exactEquals: m => data[0] === m.getInd(0) &&
                          data[1] === m.getInd(1) &&
                          data[2] === m.getInd(2) &&
                          data[3] === m.getInd(3) &&
                          data[4] === m.getInd(4) &&
                          data[5] === m.getInd(5) &&
                          data[6] === m.getInd(6) &&
                          data[7] === m.getInd(7) &&
                          data[8] === m.getInd(8),

        inv: () => {
            const b01 = data[8] * data[4] - data[5] * data[7];
            const b11 = -data[8] * data[3] + data[5] * data[6];
            const b21 = data[7] * data[3] - data[4] * data[6];

            const determinant = data[0] * b01 + data[1] * b11 + data[2] * b21;
            if (!determinant) {
                return Mat3(data[0], data[1], data[2],
                            data[3], data[4], data[5],
                            data[6], data[7], data[8]);
            }

            const invdet = 1.0 / determinant;
            return Mat3(b01 * invdet,
                        (-data[8] * data[1] + data[2] * data[7]) * invdet,
                        (data[5] * data[1] - data[2] * data[4]) * invdet,
                        b11 * invdet,
                        (data[8] * data[0] - data[2] * data[6]) * invdet,
                        (-data[5] * data[0] + data[2] * data[3]) * invdet,
                        b21 * invdet,
                        (-data[7] * data[0] + data[1] * data[6]) * invdet,
                        (data[4] * data[0] - data[1] * data[3]) * invdet);
        },

        transpose: () => Mat3(data[0], data[3], data[6],
                              data[1], data[4], data[7],
                              data[2], data[5], data[8]),

        toString: () => `[ ${data[0]}, ${data[1]}, ${data[2]}, 
                           ${data[3]}, ${data[4]}, ${data[5]},
                           ${data[6]}, ${data[7]}, ${data[8]} ]`
    });
};

//////////////////////////////////////////////////
const Mat4 = (m00 = 1.0, m01 = 0.0, m02 = 0.0, m03 = 0.0,
              m10 = 0.0, m11 = 1.0, m12 = 0.0, m13 = 0.0,
              m20 = 0.0, m21 = 0.0, m22 = 1.0, m23 = 0.0,
              m30 = 0.0, m31 = 0.0, m32 = 0.0, m33 = 1.0) => {
    const data = new Float32Array([
        m00, m01, m02, m03,
        m10, m11, m12, m13,
        m20, m21, m22, m23,
        m30, m31, m32, m33
    ]);
    return Object.freeze({
        get: (row, col) => data[4 * row + col],
        getData: () => data,
        getInd: ind => data[ind],
        set: (row, col, value) => data[4 * row + col] = value,
        setInd: (ind, value) => data[ind] = value,
        setAll: (...values) => {
            data[0]  = values[0];
            data[1]  = values[1];
            data[2]  = values[2];
            data[3]  = values[3];
            data[4]  = values[4];
            data[5]  = values[5];
            data[6]  = values[6];
            data[7]  = values[7];
            data[8]  = values[8];
            data[9]  = values[9];
            data[10] = values[10];
            data[11] = values[11];
            data[12] = values[12];
            data[13] = values[13];
            data[14] = values[14];
            data[15] = values[15];
        },
        setIdentity: () => {
            data[0]  = 1.0; data[1]  = 0.0; data[2]  = 0.0; data[3]  = 0.0;
            data[4]  = 0.0; data[5]  = 1.0; data[6]  = 0.0; data[7]  = 0.0;
            data[8]  = 0.0; data[9]  = 0.0; data[10] = 1.0; data[11] = 0.0;
            data[12] = 0.0; data[13] = 0.0; data[14] = 0.0; data[15] = 1.0;
        },

        add: m => Mat4(data[0]  + m.getInd(0),  data[1]  + m.getInd(1),  data[2]  + m.getInd(2),  data[3]  + m.getInd(3),
                       data[4]  + m.getInd(4),  data[5]  + m.getInd(5),  data[6]  + m.getInd(6),  data[7]  + m.getInd(7),
                       data[8]  + m.getInd(8),  data[9]  + m.getInd(9),  data[10] + m.getInd(10), data[11] + m.getInd(11),
                       data[12] + m.getInd(12), data[13] + m.getInd(13), data[14] + m.getInd(14), data[15] + m.getInd(15)),
        sub: m => Mat4(data[0]  - m.getInd(0),  data[1]  - m.getInd(1),  data[2]  - m.getInd(2),  data[3]  - m.getInd(3),
                       data[4]  - m.getInd(4),  data[5]  - m.getInd(5),  data[6]  - m.getInd(6),  data[7]  - m.getInd(7),
                       data[8]  - m.getInd(8),  data[9]  - m.getInd(9),  data[10] - m.getInd(10), data[11] - m.getInd(11),
                       data[12] - m.getInd(12), data[13] - m.getInd(13), data[14] - m.getInd(14), data[15] - m.getInd(15)),
        mul: m => {
            let b0 = m.getInd(0), b1 = m.getInd(1), b2 = m.getInd(2), b3 = m.getInd(3);

            const m00 = b0 * data[0] + b1 * data[4] + b2 * data[8] + b3 * data[12];
            const m01 = b0 * data[1] + b1 * data[5] + b2 * data[9] + b3 * data[13];
            const m02 = b0 * data[2] + b1 * data[6] + b2 * data[10] + b3 * data[14];
            const m03 = b0 * data[3] + b1 * data[7] + b2 * data[11] + b3 * data[15];

            b0 = m.getInd(4), b1 = m.getInd(5), b2 = m.getInd(6), b3 = m.getInd(7);

            const m10 = b0 * data[0] + b1 * data[4] + b2 * data[8] + b3 * data[12];
            const m11 = b0 * data[1] + b1 * data[5] + b2 * data[9] + b3 * data[13];
            const m12 = b0 * data[2] + b1 * data[6] + b2 * data[10] + b3 * data[14];
            const m13 = b0 * data[3] + b1 * data[7] + b2 * data[11] + b3 * data[15];

            b0 = m.getInd(8), b1 = m.getInd(9), b2 = m.getInd(10), b3 = m.getInd(11);

            const m20 = b0 * data[0] + b1 * data[4] + b2 * data[8] + b3 * data[12];
            const m21 = b0 * data[1] + b1 * data[5] + b2 * data[9] + b3 * data[13];
            const m22 = b0 * data[2] + b1 * data[6] + b2 * data[10] + b3 * data[14];
            const m23 = b0 * data[3] + b1 * data[7] + b2 * data[11] + b3 * data[15];

            b0 = m.getInd(12), b1 = m.getInd(13), b2 = m.getInd(14), b3 = m.getInd(15);

            const m30 = b0 * data[0] + b1 * data[4] + b2 * data[8] + b3 * data[12];
            const m31 = b0 * data[1] + b1 * data[5] + b2 * data[9] + b3 * data[13];
            const m32 = b0 * data[2] + b1 * data[6] + b2 * data[10] + b3 * data[14];
            const m33 = b0 * data[3] + b1 * data[7] + b2 * data[11] + b3 * data[15];

            return Mat4(m00, m01, m02, m03,
                        m10, m11, m12, m13,
                        m20, m21, m22, m23,
                        m30, m31, m32, m33);
        },
        div: m => Mat4(data[0]  / m.getInd(0),  data[1]  / m.getInd(1),  data[2]  / m.getInd(2),  data[3]  / m.getInd(3),
                       data[4]  / m.getInd(4),  data[5]  / m.getInd(5),  data[6]  / m.getInd(6),  data[7]  / m.getInd(7),
                       data[8]  / m.getInd(8),  data[9]  / m.getInd(9),  data[10] / m.getInd(10), data[11] / m.getInd(11),
                       data[12] / m.getInd(12), data[13] / m.getInd(13), data[14] / m.getInd(14), data[15] / m.getInd(15)),

        adjugate: () => {
            const a00 = data[0],  a01 = data[1],  a02 = data[2],  a03 = data[3];
            const a10 = data[4],  a11 = data[5],  a12 = data[6],  a13 = data[7];
            const a20 = data[8],  a21 = data[9],  a22 = data[10], a23 = data[11];
            const a30 = data[12], a31 = data[13], a32 = data[14], a33 = data[15];

            const m00 = a11 * (a22 * a33 - a23 * a32) -
                        a21 * (a12 * a33 - a13 * a32) +
                        a31 * (a12 * a23 - a13 * a22);

            const m01 = -(a01 * (a22 * a33 - a23 * a32) -
                          a21 * (a02 * a33 - a03 * a32) +
                          a31 * (a02 * a23 - a03 * a22));

            const m02 = a01 * (a12 * a33 - a13 * a32) -
                        a11 * (a02 * a33 - a03 * a32) +
                        a31 * (a02 * a13 - a03 * a12);

            const m03 = -(a01 * (a12 * a23 - a13 * a22) -
                          a11 * (a02 * a23 - a03 * a22) +
                          a21 * (a02 * a13 - a03 * a12));

            const m10 = -(a10 * (a22 * a33 - a23 * a32) -
                          a20 * (a12 * a33 - a13 * a32) +
                          a30 * (a12 * a23 - a13 * a22));

            const m11 = a00 * (a22 * a33 - a23 * a32) -
                        a20 * (a02 * a33 - a03 * a32) +
                        a30 * (a02 * a23 - a03 * a22);

            const m12 = -(a00 * (a12 * a33 - a13 * a32) -
                          a10 * (a02 * a33 - a03 * a32) +
                          a30 * (a02 * a13 - a03 * a12));

            const m13 = a00 * (a12 * a23 - a13 * a22) -
                        a10 * (a02 * a23 - a03 * a22) +
                        a20 * (a02 * a13 - a03 * a12);

            const m20 = a10 * (a21 * a33 - a23 * a31) -
                        a20 * (a11 * a33 - a13 * a31) +
                        a30 * (a11 * a23 - a13 * a21);

            const m21 = -(a00 * (a21 * a33 - a23 * a31) -
                          a20 * (a01 * a33 - a03 * a31) +
                          a30 * (a01 * a23 - a03 * a21));

            const m22 = a00 * (a11 * a33 - a13 * a31) -
                        a10 * (a01 * a33 - a03 * a31) +
                        a30 * (a01 * a13 - a03 * a11);

            const m23 = -(a00 * (a11 * a23 - a13 * a21) -
                          a10 * (a01 * a23 - a03 * a21) +
                          a20 * (a01 * a13 - a03 * a11));

            const m30 = -(a10 * (a21 * a32 - a22 * a31) -
                          a20 * (a11 * a32 - a12 * a31) +
                          a30 * (a11 * a22 - a12 * a21));

            const m31 = a00 * (a21 * a32 - a22 * a31) -
                        a20 * (a01 * a32 - a02 * a31) +
                        a30 * (a01 * a22 - a02 * a21);

            const m32 = -(a00 * (a11 * a32 - a12 * a31) -
                          a10 * (a01 * a32 - a02 * a31) +
                          a30 * (a01 * a12 - a02 * a11));

            const m33 = a00 * (a11 * a22 - a12 * a21) -
                        a10 * (a01 * a22 - a02 * a21) +
                        a20 * (a01 * a12 - a02 * a11);

            return Mat4(m00, m01, m02, m03,
                        m10, m11, m12, m13,
                        m20, m21, m22, m23,
                        m30, m31, m32, m33);
        },
        det: () => {
            const a00 = data[0],  a01 = data[1],  a02 = data[2],  a03 = data[3];
            const a10 = data[4],  a11 = data[5],  a12 = data[6],  a13 = data[7];
            const a20 = data[8],  a21 = data[9],  a22 = data[10], a23 = data[11];
            const a30 = data[12], a31 = data[13], a32 = data[14], a33 = data[15];

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

            return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        },

        mulVec3: v => {
            const vx = v.getX();
            const vy = v.getY();
            const vz = v.getZ();
            const vw = 1.0;
            return Vec3(data[0] * vx + data[4] * vy + data[8]  * vz + data[12] * vw,
                        data[1] * vx + data[5] * vy + data[9]  * vz + data[13] * vw,
                        data[2] * vx + data[6] * vy + data[10] * vz + data[14] * vw,
                        data[3] * vx + data[7] * vy + data[11] * vz + data[15] * vw);
        },

        mulVec4: v => {
            const vx = v.getX();
            const vy = v.getY();
            const vz = v.getZ();
            const vw = v.getW();
            return Vec3(data[0] * vx + data[4] * vy + data[8]  * vz + data[12] * vw,
                        data[1] * vx + data[5] * vy + data[9]  * vz + data[13] * vw,
                        data[2] * vx + data[6] * vy + data[10] * vz + data[14] * vw,
                        data[3] * vx + data[7] * vy + data[11] * vz + data[15] * vw);
        },

        copy: () => Mat4(data[0],  data[1],  data[2],  data[3],
                         data[4],  data[5],  data[6],  data[7],
                         data[8],  data[9],  data[10], data[11],
                         data[12], data[13], data[14], data[15]),

        clone: m => {
            data[0]  = m.getInd(0);
            data[1]  = m.getInd(1);
            data[2]  = m.getInd(2);
            data[3]  = m.getInd(3);
            data[4]  = m.getInd(4);
            data[5]  = m.getInd(5);
            data[6]  = m.getInd(6);
            data[7]  = m.getInd(7);
            data[8]  = m.getInd(8);
            data[9]  = m.getInd(9);
            data[10] = m.getInd(10);
            data[11] = m.getInd(11);
            data[12] = m.getInd(12);
            data[13] = m.getInd(13);
            data[14] = m.getInd(14);
            data[15] = m.getInd(15);
        },

        equals: m => Common.floatEquals(data[0],  m.getInd(0))  &&
                     Common.floatEquals(data[1],  m.getInd(1))  &&
                     Common.floatEquals(data[2],  m.getInd(2))  &&
                     Common.floatEquals(data[3],  m.getInd(3))  &&
                     Common.floatEquals(data[4],  m.getInd(4))  &&
                     Common.floatEquals(data[5],  m.getInd(5))  &&
                     Common.floatEquals(data[6],  m.getInd(6))  &&
                     Common.floatEquals(data[7],  m.getInd(7))  &&
                     Common.floatEquals(data[8],  m.getInd(8))  &&
                     Common.floatEquals(data[9],  m.getInd(9))  &&
                     Common.floatEquals(data[10], m.getInd(10)) &&
                     Common.floatEquals(data[11], m.getInd(11)) &&
                     Common.floatEquals(data[12], m.getInd(12)) &&
                     Common.floatEquals(data[13], m.getInd(13)) &&
                     Common.floatEquals(data[14], m.getInd(14)) &&
                     Common.floatEquals(data[15], m.getInd(15)),

        exactEquals: m => data[0]  === m.getInd(0)  &&
                          data[1]  === m.getInd(1)  &&
                          data[2]  === m.getInd(2)  &&
                          data[3]  === m.getInd(3)  &&
                          data[4]  === m.getInd(4)  &&
                          data[5]  === m.getInd(5)  &&
                          data[6]  === m.getInd(6)  &&
                          data[7]  === m.getInd(7)  &&
                          data[8]  === m.getInd(8)  &&
                          data[9]  === m.getInd(9)  &&
                          data[10] === m.getInd(10) &&
                          data[11] === m.getInd(11) &&
                          data[12] === m.getInd(12) &&
                          data[13] === m.getInd(13) &&
                          data[14] === m.getInd(14) &&
                          data[15] === m.getInd(15),

        inv: () => {
            const a00 = data[0],  a01 = data[1],  a02 = data[2],  a03 = data[3];
            const a10 = data[4],  a11 = data[5],  a12 = data[6],  a13 = data[7];
            const a20 = data[8],  a21 = data[9],  a22 = data[10], a23 = data[11];
            const a30 = data[12], a31 = data[13], a32 = data[14], a33 = data[15];

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

            const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
            if (Common.floatEquals(determinant, 0.0)) {
                return Mat4(data[0],  data[1],  data[2],  data[3],
                            data[4],  data[5],  data[6],  data[7],
                            data[8],  data[9],  data[10], data[11],
                            data[12], data[13], data[14], data[15]);
            }

            const invdet = 1.0 / determinant;

            const m00 = (a11 * b11 - a12 * b10 + a13 * b09) * invdet;
            const m01 = (a02 * b10 - a01 * b11 - a03 * b09) * invdet;
            const m02 = (a31 * b05 - a32 * b04 + a33 * b03) * invdet;
            const m03 = (a22 * b04 - a21 * b05 - a23 * b03) * invdet;

            const m10 = (a12 * b08 - a10 * b11 - a13 * b07) * invdet;
            const m11 = (a00 * b11 - a02 * b08 + a03 * b07) * invdet;
            const m12 = (a32 * b02 - a30 * b05 - a33 * b01) * invdet;
            const m13 = (a20 * b05 - a22 * b02 + a23 * b01) * invdet;

            const m20 = (a10 * b10 - a11 * b08 + a13 * b06) * invdet;
            const m21 = (a01 * b08 - a00 * b10 - a03 * b06) * invdet;
            const m22 = (a30 * b04 - a31 * b02 + a33 * b00) * invdet;
            const m23 = (a21 * b02 - a20 * b04 - a23 * b00) * invdet;

            const m30 = (a11 * b07 - a10 * b09 - a12 * b06) * invdet;
            const m31 = (a00 * b09 - a01 * b07 + a02 * b06) * invdet;
            const m32 = (a31 * b01 - a30 * b03 - a32 * b00) * invdet;
            const m33 = (a20 * b03 - a21 * b01 + a22 * b00) * invdet;

            return Mat4(m00, m01, m02, m03,
                        m10, m11, m12, m13,
                        m20, m21, m22, m23,
                        m30, m31, m32, m33);
        },

        transpose: () => Mat4(data[0], data[4], data[8], data[12],
                              data[1], data[5], data[9], data[13],
                              data[2], data[6], data[10], data[14],
                              data[3], data[7], data[11], data[15]),

        toString: () => `[ ${data[0]},  ${data[1]},  ${data[2]},  ${data[3]},
                           ${data[4]},  ${data[5]},  ${data[6]},  ${data[7]},
                           ${data[8]},  ${data[9]},  ${data[10]}, ${data[11]},
                           ${data[12]}, ${data[13]}, ${data[14]}, ${data[15]} ]`
    });
};

//////////////////////////////////////////////////
const Transform = Object.freeze({
    mat4FromQuat: q => {
        const x = q.getX(), y = q.getY(), z = q.getZ(), w = q.getW();
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;
        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        return Mat4(1 - yy - zz,    yx + wz,        zx - wy,        0,
                    yx - wz,        1 - xx - zz,    zy + wx,        0,
                    zx + wy,        zy - wx,        1 - xx - yy,    0,
                    0,              0,              0,              1);
    },
    mat4FromRotation: (radians, axis) => {
        let x = axis.getX();
        let y = axis.getY();
        let z = axis.getZ();

        let len = Math.hypot(x, y, z);
        if (len < EPSILON) {
            return Mat4();
        }

        len = 1 / len;
        x *= len;
        y *= len;
        z *= len;

        const s = Math.sin(radians);
        const c = Math.cos(radians);
        const t = 1 - c;

        return Mat4(x * x * t + c,      y * x * t + z * s,      z * x * t - y * s,      0,
                    x * y * t - z * s,  y * y * t + c,          z * y * t + x * s,      0,
                    x * z * t + y * s,  y * z * t - x * s,      z * z * t + c,          0,
                    0,                  0,                      0,                      1);
    },
    mat4FromScaling: scale => Mat4(scale.getX(),    0,              0,              0,
                                   0,               scale.getY(),   0,              0,
                                   0,               0,              scale.getZ(),   0,
                                   0,               0,              0,              1),
    mat4FromTranslation: trans => Mat4(1,               0,              0,              0,
                                       0,               1,              0,              0,
                                       0,               0,              1,              0,
                                       trans.getX(),    trans.getY(),   trans.getZ(),   1),
    mat4FromXRotation: radians => {
        const s = Math.sin(radians);
        const c = Math.cos(radians);
        return Mat4(1,  0, 0, 0,
                    0,  c, s, 0,
                    0, -s, c, 0,
                    0,  0, 0, 1);
    },
    mat4FromYRotation: radians => {
        const s = Math.sin(radians);
        const c = Math.cos(radians);
        return Mat4(c, 0, -s, 0,
                    0, 1,  0, 0,
                    s, 0,  c, 0,
                    0, 0,  0, 1);
    },
    mat4FromZRotation: radians => {
        const s = Math.sin(radians);
        const c = Math.cos(radians);
        return Mat4( c, s, 0, 0,
                    -s, c, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1);
    },
    fromRotationTranslation: (q, v) => {
        const x = q.getX(), y = q.getY(), z = q.getZ(), w = q.getW();
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;
        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        return Mat4(1 - yy - zz,        yx + wz,        zx - wy,        0,
                    yx - wz,            1 - xx - zz,    zy + wx,        0,
                    zx + wy,            zy - wx,        1 - xx - yy,    0,
                    v.getX(),           v.getY(),       v.getZ(),       1);
    },
    fromRotationTranslationScale: (q, v, s) => {
        const x = q.getX(), y = q.getY(), z = q.getZ(), w = q.getW();
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;
        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        const sx = s.getX();
        const sy = s.getY();
        const sz = s.getZ();

        return Mat4((1 - yy - zz) * sx,     (yx + wz) * sx,     (zx - wy) * sx,     0,
                    (yx - wz) * sy,         (1 - xx - zz) * sy, (zy + wx) * sy,     0,
                    (zx + wy) * sz,         (zy - wx) * sz,     (1 - xx - yy) * sz, 0,
                    v.getX(),               v.getY(),           v.getZ(),           1);
    },
    frustum: (left, right, bottom, top, near, far) => {
        const rl = 1.0 / (right - left);
        const tb = 1.0 / (top - bottom);
        const nf = 1.0 / (near - far);
        return Mat4(near * 2 * rl,          0,                      0,                   0,
                    0,                      near * 2 * tb,          0,                   0,
                    (right + left) * rl,    (top + bottom) * tb,    (far + near) * nf,  -1,
                    0,                      0,                      far * near * 2 * nf, 0);
    },
    lookAt: (eye, center, up) => {
        if (eye.equals(center)) {
            return Mat4();
        }
        const z = eye.sub(center).norm();
        const x = up.cross(z).norm();
        const y = z.cross(x).norm();
        return Mat4(x.getX(),       y.getX(),       z.getX(),   0.0,
                    x.getY(),       y.getY(),       z.getY(),   0.0,
                    x.getZ(),       y.getZ(),       z.getZ(),   0.0,
                   -x.dot(eye),    -y.dot(eye),    -z.dot(eye), 1.0);
    },
    ortho: (left, right, bottom, top, near, far) => {
        const lr = 1.0 / (left - right);
        const bt = 1.0 / (bottom - top);
        const nf = 1.0 / (near - far);
        return Mat4(-2 * lr,                0,                      0,                  0,
                    0,                     -2 * bt,                 0,                  0,
                    0,                      0,                      2 * nf,             0,
                    (left + right) * lr,    (top + bottom) * bt,    (far + near) * nf,  1);
    },
    perspective: (fovy, aspect, near, far) => {
        const f = 1.0 / Math.tan(fovy / 2)
        const nf = 1.0 / (near - far);
        return Mat4(f / aspect,     0,  0,                      0,
                    0,              f,  0,                      0,
                    0,              0,  (far + near) * nf,     -1,
                    0,              0,  2 * far * near * nf,    0);
    },
    normalMat3FromMat4: a => {
        const a00 = a.getInd(0);
        const a01 = a.getInd(1);
        const a02 = a.getInd(2);
        const a03 = a.getInd(3);

        const a10 = a.getInd(4);
        const a11 = a.getInd(5);
        const a12 = a.getInd(6);
        const a13 = a.getInd(7);

        const a20 = a.getInd(8);
        const a21 = a.getInd(9);
        const a22 = a.getInd(10);
        const a23 = a.getInd(11);

        const a30 = a.getInd(12);
        const a31 = a.getInd(13);
        const a32 = a.getInd(14);
        const a33 = a.getInd(15);

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

        const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (Common.floatEquals(determinant, 0.0)) {
            return Mat4();
        }

        const invdet = 1.0 / determinant;
        return Mat3((a11 * b11 - a12 * b10 + a13 * b09) * invdet,
                    (a12 * b08 - a10 * b11 - a13 * b07) * invdet,
                    (a10 * b10 - a11 * b08 + a13 * b06) * invdet,
                    (a02 * b10 - a01 * b11 - a03 * b09) * invdet,
                    (a00 * b11 - a02 * b08 + a03 * b07) * invdet,
                    (a01 * b08 - a00 * b10 - a03 * b06) * invdet,
                    (a31 * b05 - a32 * b04 + a33 * b03) * invdet,
                    (a32 * b02 - a30 * b05 - a33 * b01) * invdet,
                    (a30 * b04 - a31 * b02 + a33 * b00) * invdet);
    },
    quatFromMat3: m => {
        // See "Quaternion Calculus and Fast Animation" by Ken Shoemake (SIGGRAPH 1987)
        const m0 = m.getInd(0), m1 = m.getInd(1), m2 = m.getInd(2),
              m3 = m.getInd(3), m4 = m.getInd(4), m5 = m.getInd(5),
              m6 = m.getInd(6), m7 = m.getInd(7), m8 = m.getInd(8);
        const fTrace = m0 + m4 + m8;
        if (fTrace > 0.0) {
            const fRoot = Math.sqrt(fTrace + 1.0);
            const fRoot2 = 0.5 / fRoot;
            return Quat((m5 - m7) * fRoot2, (m6 - m2) * fRoot2, (m1 - m3) * fRoot2, 0.5 * fRoot);
        }
        let i = 0;
        if (m4 > m0) {
            i = 1;
        }
        if (m8 > m.getInd(i * 3 + i)) {
            i = 2;
        }
        let j = (i + 1) % 3;
        let k = (i + 2) % 3;
        const fRoot = Math.sqrt(m.getInd(i * 3 + i) - m.getInd(j * 3 + j) - m.getInd(k * 3 + k) + 1.0);
        const fRoot2 = 0.5 / fRoot;
        const q = Quat();
        q.setInd(i, 0.5 * fRoot);
        q.setInd(j, (m.getInd(j * 3 + i) + m.getInd(i * 3 + j)) * fRoot2);
        q.setInd(k, (m.getInd(k * 3 + i) + m.getInd(i * 3 + k)) * fRoot2)
        q.setInd(3, (m.getInd(j * 3 + k) - m.getInd(k * 3 + j)) * fRoot2);
        return q;
    },
    quatFromAxes: (xAxis, yAxis, zAxis) => {
        const rotationMatrix = Mat3(xAxis.getX(), yAxis.getX(), zAxis.getX(),
                                    xAxis.getY(), yAxis.getY(), zAxis.getY(),
                                    xAxis.getZ(), yAxis.getZ(), zAxis.getZ());
        return Transform.quatFromMat3(rotationMatrix);
    },
    quatFromRotationTo: (a, b) => {
        const xUnitVec3 = Vec3(1.0, 0.0, 0.0);
        const yUnitVec3 = Vec3(0.0, 1.0, 0.0);
        const dot = a.dot(b);
        if (dot < -0.999999) {
            const tmpVec3 = xUnitVec3.cross(a);
            if (tmpVec3.len() < 0.000001) {
                tmpVec3.clone(yUnitVec3.cross(a));
            }
            tmpVec3.clone(tmpVec3.norm());
            return Quat().setAxisAngle(tmpVec3, Math.PI);
        }
        else if (dot > 0.999999) {
            return Quat();
        }
        else {
            const tmpVec3 = a.cross(b);
            return Quat(tmpVec3.getX(), tmpVec3.getY(), tmpVec3.getZ(), 1.0 + dot).norm();
        }
    },
});

//////////////////////////////////////////////////
const GEN_SHADER_VERSION = version => {
    if (version === 2) {
        return "#version 300 es";
    }
    else if (version === 1) {
        return "";
    }
    else {
        return "error: wrong webgl version";
    }
};

//////////////////////////////////////////////////
const GEN_SHADER_ATTRIBUTE = (version, loc, def) => {
    if (version === 2) {
        return `layout (location = ${loc}) in ${def};`;
    }
    else if (version === 1) {
        return `attribute ${def};`;
    }
    else {
        return "error: wrong webgl version";
    }
};

//////////////////////////////////////////////////
const GEN_SHADER_VARYING_OUT = (version, def) => {
    if (version === 2) {
        return `out ${def};`;
    }
    else if (version === 1) {
        return `varying ${def};`;
    }
    else {
        return "error: wrong webgl version";
    }
};

//////////////////////////////////////////////////
const GEN_SHADER_VARYING_IN = (version, def) => {
    if (version === 2) {
        return `in ${def};`;
    }
    else if (version === 1) {
        return `varying ${def};`;
    }
    else {
        return "error: wrong webgl version";
    }
};

//////////////////////////////////////////////////
const GEN_SHADER_PRECISION = gl => {
    if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0) {
        return "precision highp float;";
    }
    else if (gl.genShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT).precision > 0) {
        return "precision mediump float;";
    }
    else if (gl.genShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT).precision > 0) {
        return "precision lowp float;";
    }
    else {
        throw Exception("Couldn't determine floating-point precision in fragment shaders");
    }
};

//////////////////////////////////////////////////
const INCLUDE_GAMMA_CORRECTION = `
    uniform float uGamma;

    vec4 ApplyGammaCorrection(vec4 inColor)
    {
        return vec4(pow(inColor.rgb, vec3(1.0 / uGamma)), inColor.a);
    }
    #define GAMMA_CORRECTION
`;

//////////////////////////////////////////////////
const INCLUDE_GAMMA_CORRECTION_TEXTURE = `
    uniform float uGamma;

    vec4 ApplyGammaCorrection(vec4 inColor)
    {
        return vec4(pow(inColor.rgb, vec3(uGamma)), inColor.a);
    }
    #define GAMMA_CORRECTION_TEXTURE
`;

//////////////////////////////////////////////////
const GEN_BASIC_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_ATTRIBUTE(version, BASIC_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, BASIC_SHADER_VERT_ACOL_LOC, `vec3 ${SHADER_VERT_ACOL_NAME}`)}

    uniform mat4 uProjection;
    uniform mat4 uModelView;

    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_col")}

    void main()
    {
        gl_Position = uProjection * uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_col = ${SHADER_VERT_ACOL_NAME};
    }
`;

//////////////////////////////////////////////////
const GEN_BASIC_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_col")}

#if __VERSION__ == 300
    out vec4 output_color;
#endif

    void main()
    {
#if __VERSION__ == 300
        output_color = vec4(v_col, 1.0);
#elif __VERSION__ == 100
        gl_FragColor = vec4(v_col, 1.0);
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_BASIC_COLOR_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_ATTRIBUTE(version, BASIC_COLOR_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}

    uniform mat4 uProjection;
    uniform mat4 uModelView;
    
    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_pos")}

    void main()
    {
        gl_Position = uProjection * uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_pos = vec3(uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0));
    }
`;

//////////////////////////////////////////////////
const GEN_BASIC_TEXTURE_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_ATTRIBUTE(version, BASIC_TEXTURE_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, BASIC_TEXTURE_SHADER_VERT_ATEXCOORD_LOC, `vec2 ${SHADER_VERT_ATEXCOORD_NAME}`)}

    uniform mat4 uProjection;
    uniform mat4 uModelView;
    uniform vec2 uTexTransform;
    uniform vec2 uTexMultiplier;

    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_pos")}
    ${GEN_SHADER_VARYING_OUT(version, "vec2 v_texcoord")}

    void main()
    {
        gl_Position = uProjection * uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_pos = vec3(uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0));
        v_texcoord = uTexTransform + ${SHADER_VERT_ATEXCOORD_NAME} * uTexMultiplier;
    }
`;

//////////////////////////////////////////////////
const GEN_DOUBLE_TEXTURE_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_ATTRIBUTE(version, DOUBLE_TEXTURE_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, DOUBLE_TEXTURE_SHADER_VERT_ATEXCOORD_LOC, `vec2 ${SHADER_VERT_ATEXCOORD_NAME}`)}

    uniform mat4 uProjection;
    uniform mat4 uModelView;

    uniform vec2 uTexTransform0;
    uniform vec2 uTexMultiplier0;

    uniform vec2 uTexTransform1;
    uniform vec2 uTexMultiplier1;

    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_pos")}        
    ${GEN_SHADER_VARYING_OUT(version, "vec2 v_texcoord0")}
    ${GEN_SHADER_VARYING_OUT(version, "vec2 v_texcoord1")}

    void main()
    {
        gl_Position = uProjection * uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_pos = vec3(uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0));
        v_texcoord0 = uTexTransform0 + ${SHADER_VERT_ATEXCOORD_NAME} * uTexMultiplier0;
        v_texcoord1 = uTexTransform1 + ${SHADER_VERT_ATEXCOORD_NAME} * uTexMultiplier1;
    }
`;

//////////////////////////////////////////////////
const GEN_FOG_STRUCT_SHADER = version => version === 2 ?
    `layout (std140) uniform ${FOG_UBO_NAME}
    {
        vec4 uFogColor;
        float uFogDistance;
        float uFogIntensity;
        float uFogPower;
    };
    ` :
    `uniform vec4 uFogColor;
     uniform float uFogDistance;
     uniform float uFogIntensity;
     uniform float uFogPower;
`;

//////////////////////////////////////////////////
const GEN_INCLUDE_FOG_SHADER = version => `
    ${GEN_FOG_STRUCT_SHADER(version)}
    
    vec4 ApplyFog(vec4 inColor)
    {
        float dist = length(v_pos);
        float fogMultiplier = clamp((dist - uFogDistance) / uFogDistance, 0.0, 1.0) * uFogIntensity;
        return mix(inColor, uFogColor, pow(fogMultiplier, uFogPower));
    }
`;

//////////////////////////////////////////////////
const GEN_BASIC_COLOR_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_pos")}
    
    uniform vec4 uColor;

    ${GEN_INCLUDE_FOG_SHADER(version)}
    
#if __VERSION__ == 300
    out vec4 output_color;
#endif

    void main()
    {
#if __VERSION__ == 300
        output_color = ApplyFog(uColor);
#elif __VERSION__ == 100
        gl_FragColor = ApplyFog(uColor);
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_BASIC_TEXTURE_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_pos")}
    ${GEN_SHADER_VARYING_IN(version, "vec2 v_texcoord")}

    uniform vec4 uColor;
    uniform sampler2D uTexture;

    ${GEN_INCLUDE_FOG_SHADER(version)}

#if __VERSION__ == 300
    out vec4 output_color;
#endif

    void main()
    {
#if __VERSION__ == 300
        vec4 texColor = texture(uTexture, v_texcoord);
        output_color = ApplyFog(uColor * texColor);
#elif __VERSION__ == 100
        vec4 texColor = texture2D(uTexture, v_texcoord);
        gl_FragColor = ApplyFog(uColor * texColor);
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_DOUBLE_TEXTURE_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_pos")}
    ${GEN_SHADER_VARYING_IN(version, "vec2 v_texcoord0")}
    ${GEN_SHADER_VARYING_IN(version, "vec2 v_texcoord1")}

    uniform vec4 uColor0;
    uniform vec4 uColor1;

    uniform sampler2D uTexture0;
    uniform sampler2D uTexture1;

    uniform float uMix;

    ${GEN_INCLUDE_FOG_SHADER(version)} 

#if __VERSION__ == 300
    out vec4 output_color;
#endif

    void main()
    {
#if __VERSION__ == 300
        vec4 texColor0 = uColor0 * texture(uTexture0, v_texcoord0);
        vec4 texColor1 = uColor1 * texture(uTexture1, v_texcoord1);
        output_color = ApplyFog(vec4(mix(texColor0.rgb, texColor1.rgb, uMix), 1.0));
#elif __VERSION__ == 100
        vec4 texColor0 = uColor0 * texture2D(uTexture0, v_texcoord0);
        vec4 texColor1 = uColor1 * texture2D(uTexture1, v_texcoord1);
        gl_FragColor = ApplyFog(vec4(mix(texColor0.rgb, texColor1.rgb, uMix), 1.0));
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_PHONG_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_ATTRIBUTE(version, PHONG_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, PHONG_SHADER_VERT_ANORM_LOC, `vec3 ${SHADER_VERT_ANORM_NAME}`)}

    uniform mat4 uProjection;
    uniform mat4 uModelView;
    uniform mat3 uNorm;
    
    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_norm")}
    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_pos")}
    
    void main()
    {
        gl_Position = uProjection * uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_norm = uNorm * ${SHADER_VERT_ANORM_NAME};
        v_pos = vec3(uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0));
    }
`;

//////////////////////////////////////////////////
const GEN_PHONG_TEXTURE_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_ATTRIBUTE(version, PHONG_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, PHONG_SHADER_VERT_ANORM_LOC, `vec3 ${SHADER_VERT_ANORM_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, PHONG_SHADER_VERT_ATEXCOORD_LOC, `vec2 ${SHADER_VERT_ATEXCOORD_NAME}`)}

    uniform mat4 uProjection;
    uniform mat4 uModelView;
    uniform mat3 uNorm;

    uniform vec2 uAmbientTexTransform;
    uniform vec2 uAmbientTexMultiplier;

    uniform vec2 uDiffuseTexTransform;
    uniform vec2 uDiffuseTexMultiplier;

    uniform vec2 uSpecularTexTransform;
    uniform vec2 uSpecularTexMultiplier;

    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_norm")}
    ${GEN_SHADER_VARYING_OUT(version, "vec3 v_pos")}

    ${GEN_SHADER_VARYING_OUT(version, "vec2 v_ambient_texcoord")}
    ${GEN_SHADER_VARYING_OUT(version, "vec2 v_diffuse_texcoord")}
    ${GEN_SHADER_VARYING_OUT(version, "vec2 v_specular_texcoord")}

    void main()
    {
        gl_Position = uProjection * uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_norm = uNorm * ${SHADER_VERT_ANORM_NAME};
        v_pos = vec3(uModelView * vec4(${SHADER_VERT_APOS_NAME}, 1.0));

        v_ambient_texcoord = uAmbientTexTransform + ${SHADER_VERT_ATEXCOORD_NAME} * uAmbientTexMultiplier;
        v_diffuse_texcoord = uDiffuseTexTransform + ${SHADER_VERT_ATEXCOORD_NAME} * uDiffuseTexMultiplier;
        v_specular_texcoord = uSpecularTexTransform + ${SHADER_VERT_ATEXCOORD_NAME} * uSpecularTexMultiplier;
    }
`;

//////////////////////////////////////////////////
const GEN_INCLUDE_PHONG_SHADER_MATERIAL = version => version === 2 ? `
    layout (std140) uniform ${PHONG_MAT_UBO_NAME}
    {
        vec3 uPhongMatAmbient;
        vec3 uPhongMatDiffuse;
        vec3 uPhongMatSpecular;
        float uPhongMatShininess;
    };
` : `uniform vec3 uPhongMatAmbient;
     uniform vec3 uPhongMatDiffuse;
     uniform vec3 uPhongMatSpecular;
     uniform float uPhongMatShininess;
`;

//////////////////////////////////////////////////
const GEN_INCLUDE_PHONG_SHADER_DIR_LIGHT = version => version === 2 ? `
    layout (std140) uniform ${DIR_LIGHT_UBO_NAME}
    {
        vec3 uDirLightAmbient[${MAX_DIR_LIGHTS}];
        vec3 uDirLightDiffuse[${MAX_DIR_LIGHTS}];
        vec3 uDirLightSpecular[${MAX_DIR_LIGHTS}];
        vec3 uDirLightDir[${MAX_DIR_LIGHTS}];
        float uDirLightIntensity[${MAX_DIR_LIGHTS}];
    };
` : `uniform vec3 uDirLightAmbient[${MAX_DIR_LIGHTS}];
     uniform vec3 uDirLightDiffuse[${MAX_DIR_LIGHTS}];
     uniform vec3 uDirLightSpecular[${MAX_DIR_LIGHTS}];
     uniform vec3 uDirLightDir[${MAX_DIR_LIGHTS}];
     uniform float uDirLightIntensity[${MAX_DIR_LIGHTS}];
`;

//////////////////////////////////////////////////
const GEN_INCLUDE_PHONG_SHADER_POINT_LIGHT = version => version === 2 ? `
    layout (std140) uniform ${POINT_LIGHT_UBO_NAME}
    {
        vec3 uPointLightDiffuse[${MAX_POINT_LIGHTS}];
        vec3 uPointLightSpecular[${MAX_POINT_LIGHTS}];
        vec3 uPointLightPos[${MAX_POINT_LIGHTS}];
        float uPointLightConstant[${MAX_POINT_LIGHTS}];
        float uPointLightLinear[${MAX_POINT_LIGHTS}];
        float uPointLightQuadratic[${MAX_POINT_LIGHTS}];
        float uPointLightIntensity[${MAX_POINT_LIGHTS}];
    };
` : `uniform vec3 uPointLightDiffuse[${MAX_POINT_LIGHTS}];
     uniform vec3 uPointLightSpecular[${MAX_POINT_LIGHTS}];
     uniform vec3 uPointLightPos[${MAX_POINT_LIGHTS}];
     uniform float uPointLightConstant[${MAX_POINT_LIGHTS}];
     uniform float uPointLightLinear[${MAX_POINT_LIGHTS}];
     uniform float uPointLightQuadratic[${MAX_POINT_LIGHTS}];
     uniform float uPointLightIntensity[${MAX_POINT_LIGHTS}];
`;

//////////////////////////////////////////////////
const GEN_INCLUDE_PHONG_SHADER_SPOT_LIGHT = version => version === 2 ? `
    layout (std140) uniform ${SPOT_LIGHT_UBO_NAME}
    {
        vec3 uSpotLightDiffuse[${MAX_SPOT_LIGHTS}];
        vec3 uSpotLightSpecular[${MAX_SPOT_LIGHTS}];
        vec3 uSpotLightPos[${MAX_SPOT_LIGHTS}];
        vec3 uSpotLightDir[${MAX_SPOT_LIGHTS}];
        float uSpotLightConstant[${MAX_SPOT_LIGHTS}];
        float uSpotLightLinear[${MAX_SPOT_LIGHTS}];
        float uSpotLightQuadratic[${MAX_SPOT_LIGHTS}];
        float uSpotLightIntensity[${MAX_SPOT_LIGHTS}];
        float uSpotLightInnerCutoff[${MAX_SPOT_LIGHTS}];
        float uSpotLightOuterCutoff[${MAX_SPOT_LIGHTS}];
    };
` : `uniform vec3 uSpotLightDiffuse[${MAX_SPOT_LIGHTS}];
     uniform vec3 uSpotLightSpecular[${MAX_SPOT_LIGHTS}];
     uniform vec3 uSpotLightPos[${MAX_SPOT_LIGHTS}];
     uniform vec3 uSpotLightDir[${MAX_SPOT_LIGHTS}];
     uniform float uSpotLightConstant[${MAX_SPOT_LIGHTS}];
     uniform float uSpotLightLinear[${MAX_SPOT_LIGHTS}];
     uniform float uSpotLightQuadratic[${MAX_SPOT_LIGHTS}];
     uniform float uSpotLightIntensity[${MAX_SPOT_LIGHTS}];
     uniform float uSpotLightInnerCutoff[${MAX_SPOT_LIGHTS}];
     uniform float uSpotLightOuterCutoff[${MAX_SPOT_LIGHTS}];
`;

//////////////////////////////////////////////////
const INCLUDE_PHONG_SHADER_COMPUTE_DIR_LIGHT = `
    vec3 computeDirLight(vec3 normal, vec3 pixelPos)
    {
        vec3 result = vec3(0.0);
        for (int i = 0; i < ${MAX_DIR_LIGHTS}; ++i) {
            vec3 ambient = uDirLightAmbient[i] * uPhongMatAmbient;

            vec3 lightDir = normalize(-uDirLightDir[i]);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uDirLightDiffuse[i] * uPhongMatDiffuse;

            vec3 viewDir = normalize(-pixelPos);
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), uPhongMatShininess);
            vec3 specular = spec * uDirLightSpecular[i] * uPhongMatSpecular;

            result += ambient + uDirLightIntensity[i] * (diffuse + specular);
        }
        return result;
    }
`;

//////////////////////////////////////////////////
const INCLUDE_PHONG_TEXTURE_SHADER_COMPUTE_DIR_LIGHT = `
    vec3 computeDirLight(vec3 normal, vec3 pixelPos, vec3 ambientTex, vec3 diffuseTex, vec3 specularTex)
    {
        vec3 result = vec3(0.0);
        for (int i = 0; i < ${MAX_DIR_LIGHTS}; ++i) {
            vec3 ambient = uDirLightAmbient[i] * uPhongMatAmbient * ambientTex;

            vec3 lightDir = normalize(-uDirLightDir[i]);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uDirLightDiffuse[i] * uPhongMatDiffuse * diffuseTex;

            vec3 viewDir = normalize(-pixelPos);
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), uPhongMatShininess);
            vec3 specular = spec * uDirLightSpecular[i] * uPhongMatSpecular * specularTex;

            result += ambient + uDirLightIntensity[i] * (diffuse + specular);
        }
        return result;
    }
`;

//////////////////////////////////////////////////
const INCLUDE_PHONG_SHADER_COMPUTE_POINT_LIGHT = `
    vec3 computePointLight(vec3 normal, vec3 pixelPos)
    {
        vec3 result = vec3(0.0);
        for (int i = 0; i < ${MAX_POINT_LIGHTS}; ++i) {
            vec3 lightDir = normalize(uPointLightPos[i] - pixelPos);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uPointLightDiffuse[i] * uPhongMatDiffuse;

            vec3 viewDir = normalize(-pixelPos);
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), uPhongMatShininess);
            vec3 specular = spec * uPointLightSpecular[i] * uPhongMatSpecular;

            float distance = length(uPointLightPos[i] - pixelPos);
            float attenuation = 1.0 / (uPointLightConstant[i] + distance * uPointLightLinear[i] + distance * distance * uPointLightQuadratic[i]);

            result += uPointLightIntensity[i] * attenuation * (diffuse + specular);
        }
        return result;
    }
`;

//////////////////////////////////////////////////
const INCLUDE_PHONG_TEXTURE_SHADER_COMPUTE_POINT_LIGHT = `
    vec3 computePointLight(vec3 normal, vec3 pixelPos, vec3 diffuseTex, vec3 specularTex)
    {
        vec3 result = vec3(0.0);
        for (int i = 0; i < ${MAX_POINT_LIGHTS}; ++i) {
            vec3 lightDir = normalize(uPointLightPos[i] - pixelPos);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uPointLightDiffuse[i] * uPhongMatDiffuse * diffuseTex;

            vec3 viewDir = normalize(-pixelPos);
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), uPhongMatShininess);
            vec3 specular = spec * uPointLightSpecular[i] * uPhongMatSpecular * specularTex;

            float distance = length(uPointLightPos[i] - pixelPos);
            float attenuation = 1.0 / (uPointLightConstant[i] + distance * uPointLightLinear[i] + distance * distance * uPointLightQuadratic[i]);

            result += uPointLightIntensity[i] * attenuation * (diffuse + specular);
        }
        return result;
    }
`;

//////////////////////////////////////////////////
const INCLUDE_PHONG_SHADER_COMPUTE_SPOT_LIGHT = `
    vec3 computeSpotLight(vec3 normal, vec3 pixelPos)
    {
        vec3 result = vec3(0.0);
        for (int i = 0; i < ${MAX_SPOT_LIGHTS}; ++i) {
            vec3 lightDir = normalize(uSpotLightPos[i] - pixelPos);
            float theta = dot(lightDir, normalize(-uSpotLightDir[i]));
            float epsilon = uSpotLightInnerCutoff[i] - uSpotLightOuterCutoff[i];
            float intensity = clamp((theta - uSpotLightOuterCutoff[i]) / epsilon, 0.0, 1.0);

            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uSpotLightDiffuse[i] * uPhongMatDiffuse;

            vec3 viewDir = normalize(-pixelPos);
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), uPhongMatShininess);
            vec3 specular = spec * uSpotLightSpecular[i] * uPhongMatSpecular;

            float distance = length(uSpotLightPos[i] - pixelPos);
            float attenuation = 1.0 / (uSpotLightConstant[i] + distance * uSpotLightLinear[i] + distance * distance * uSpotLightQuadratic[i]);

            result += intensity * uSpotLightIntensity[i] * attenuation * (diffuse + specular);
        }
        return result;
    }
`;

//////////////////////////////////////////////////
const INCLUDE_PHONG_TEXTURE_SHADER_COMPUTE_SPOT_LIGHT = `
    vec3 computeSpotLight(vec3 normal, vec3 pixelPos, vec3 diffuseTex, vec3 specularTex)
    {
        vec3 result = vec3(0.0);
        for (int i = 0; i < ${MAX_SPOT_LIGHTS}; ++i) {
            vec3 lightDir = normalize(uSpotLightPos[i] - pixelPos);
            float theta = dot(lightDir, normalize(-uSpotLightDir[i]));
            float epsilon = uSpotLightInnerCutoff[i] - uSpotLightOuterCutoff[i];
            float intensity = clamp((theta - uSpotLightOuterCutoff[i]) / epsilon, 0.0, 1.0);

            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uSpotLightDiffuse[i] * uPhongMatDiffuse * diffuseTex;

            vec3 viewDir = normalize(-pixelPos);
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), uPhongMatShininess);
            vec3 specular = spec * uSpotLightSpecular[i] * uPhongMatSpecular * specularTex;

            float distance = length(uSpotLightPos[i] - pixelPos);
            float attenuation = 1.0 / (uSpotLightConstant[i] + distance * uSpotLightLinear[i] + distance * distance * uSpotLightQuadratic[i]);

            result += intensity * uSpotLightIntensity[i] * attenuation * (diffuse + specular);
        }
        return result;
    }
`;

//////////////////////////////////////////////////
const GEN_PHONG_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_norm")}
    ${GEN_SHADER_VARYING_IN(version, "vec3 v_pos")}

    ${GEN_INCLUDE_PHONG_SHADER_MATERIAL(version)}

    ${GEN_INCLUDE_PHONG_SHADER_DIR_LIGHT(version)}
    ${GEN_INCLUDE_PHONG_SHADER_POINT_LIGHT(version)}
    ${GEN_INCLUDE_PHONG_SHADER_SPOT_LIGHT(version)}

    ${INCLUDE_PHONG_SHADER_COMPUTE_DIR_LIGHT}
    ${INCLUDE_PHONG_SHADER_COMPUTE_POINT_LIGHT}
    ${INCLUDE_PHONG_SHADER_COMPUTE_SPOT_LIGHT}

    ${GEN_INCLUDE_FOG_SHADER(version)}

#if __VERSION__ == 300
    out vec4 output_color;
#endif
    void main()
    {
#if __VERSION__ == 300
        output_color = vec4(0.0, 0.0, 0.0, 1.0);
#elif __VERSION__ == 100
        vec4 output_color = vec4(0.0, 0.0, 0.0, 1.0);
#endif

        vec3 normal = normalize(v_norm);

        output_color.rgb += computeDirLight(normal, v_pos);
        output_color.rgb += computePointLight(normal, v_pos);
        output_color.rgb += computeSpotLight(normal, v_pos);

#if __VERSION__ == 300
        output_color = ApplyFog(output_color);
#elif __VERSION__ == 100
        gl_FragColor = ApplyFog(output_color);
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_PHONG_TEXTURE_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_norm")}
    ${GEN_SHADER_VARYING_IN(version, "vec3 v_pos")}

    ${GEN_SHADER_VARYING_IN(version, "vec2 v_ambient_texcoord")}
    ${GEN_SHADER_VARYING_IN(version, "vec2 v_diffuse_texcoord")}
    ${GEN_SHADER_VARYING_IN(version, "vec2 v_specular_texcoord")}

    ${GEN_INCLUDE_PHONG_SHADER_MATERIAL(version)}

    uniform sampler2D uAmbientTexture;
    uniform sampler2D uDiffuseTexture;
    uniform sampler2D uSpecularTexture;

    ${GEN_INCLUDE_PHONG_SHADER_DIR_LIGHT(version)}
    ${GEN_INCLUDE_PHONG_SHADER_POINT_LIGHT(version)}
    ${GEN_INCLUDE_PHONG_SHADER_SPOT_LIGHT(version)}

    ${INCLUDE_PHONG_TEXTURE_SHADER_COMPUTE_DIR_LIGHT}
    ${INCLUDE_PHONG_TEXTURE_SHADER_COMPUTE_POINT_LIGHT}
    ${INCLUDE_PHONG_TEXTURE_SHADER_COMPUTE_SPOT_LIGHT}

    ${GEN_INCLUDE_FOG_SHADER(version)}

    ${INCLUDE_GAMMA_CORRECTION_TEXTURE}

#if __VERSION__ == 300
    out vec4 output_color;
#endif
    void main()
    {
#if __VERSION__ == 300
        output_color = vec4(0.0, 0.0, 0.0, 1.0);

        vec3 ambientTexColor = ApplyGammaCorrection(texture(uAmbientTexture, v_ambient_texcoord)).rgb;
        vec3 diffuseTexColor = ApplyGammaCorrection(texture(uDiffuseTexture, v_diffuse_texcoord)).rgb;
        vec3 specularTexColor = ApplyGammaCorrection(texture(uSpecularTexture, v_specular_texcoord)).rgb;
#elif __VERSION__ == 100
        vec4 output_color = vec4(0.0, 0.0, 0.0, 1.0);

        vec3 ambientTexColor = ApplyGammaCorrection(texture2D(uAmbientTexture, v_ambient_texcoord)).rgb;
        vec3 diffuseTexColor = ApplyGammaCorrection(texture2D(uDiffuseTexture, v_diffuse_texcoord)).rgb;
        vec3 specularTexColor = ApplyGammaCorrection(texture2D(uSpecularTexture, v_specular_texcoord)).rgb;
#endif
        vec3 normal = normalize(v_norm);

        output_color.rgb += computeDirLight(normal, v_pos, ambientTexColor, diffuseTexColor, specularTexColor);
        output_color.rgb += computePointLight(normal, v_pos, diffuseTexColor, specularTexColor);
        output_color.rgb += computeSpotLight(normal, v_pos, diffuseTexColor, specularTexColor);

#if __VERSION__ == 300
        output_color = ApplyFog(output_color);
#elif __VERSION__ == 100
        gl_FragColor = ApplyFog(output_color);
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_CUBEMAP_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

#if __VERSION__ == 300
    // assuming right-handed coordinate system
    const vec3 ${SHADER_VERT_APOS_NAME}[36] = vec3[](
        // front face
        vec3(-1.0, -1.0, -1.0),
        vec3( 1.0, -1.0, -1.0),
        vec3( 1.0,  1.0, -1.0),

        vec3( 1.0,  1.0, -1.0),
        vec3(-1.0,  1.0, -1.0),
        vec3(-1.0, -1.0, -1.0),

        // back face
        vec3(-1.0, -1.0, 1.0),
        vec3(-1.0,  1.0, 1.0),
        vec3( 1.0,  1.0, 1.0),

        vec3( 1.0,  1.0, 1.0),
        vec3( 1.0, -1.0, 1.0),
        vec3(-1.0, -1.0, 1.0),

        // left face
        vec3(-1.0, -1.0,  1.0),
        vec3(-1.0, -1.0, -1.0),
        vec3(-1.0,  1.0, -1.0),

        vec3(-1.0,  1.0, -1.0),
        vec3(-1.0,  1.0,  1.0),
        vec3(-1.0, -1.0,  1.0),

        // right face
        vec3(1.0, -1.0, -1.0),
        vec3(1.0, -1.0,  1.0),
        vec3(1.0,  1.0,  1.0),

        vec3(1.0,  1.0,  1.0),
        vec3(1.0,  1.0, -1.0),
        vec3(1.0, -1.0, -1.0),

        // top face
        vec3(-1.0, 1.0,  1.0),
        vec3(-1.0, 1.0, -1.0),
        vec3( 1.0, 1.0, -1.0),

        vec3( 1.0, 1.0, -1.0),
        vec3( 1.0, 1.0,  1.0),
        vec3(-1.0, 1.0,  1.0),

        // bottom face
        vec3(-1.0, -1.0,  1.0),
        vec3( 1.0, -1.0,  1.0),
        vec3( 1.0, -1.0, -1.0),

        vec3( 1.0, -1.0, -1.0),
        vec3(-1.0, -1.0, -1.0),
        vec3(-1.0, -1.0,  1.0)
    );
#elif __VERSION__ == 100
    ${GEN_SHADER_ATTRIBUTE(version, CUBEMAP_SHADER_VERT_APOS_LOC, `vec3 ${SHADER_VERT_APOS_NAME}`)}
#endif

    ${GEN_SHADER_VARYING_OUT(version, `vec3 v_texcoord`)}

    uniform mat4 uProjection;
    uniform mat4 uView;

    void main()
    {
#if __VERSION__ == 300
        vec4 output_pos = uProjection * mat4(mat3(uView)) * vec4(${SHADER_VERT_APOS_NAME}[gl_VertexID], 1.0);
        v_texcoord = ${SHADER_VERT_APOS_NAME}[gl_VertexID];
#elif __VERSION__ == 100
        vec4 output_pos = uProjection * mat4(mat3(uView)) * vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_texcoord = ${SHADER_VERT_APOS_NAME};
#endif
        gl_Position = output_pos.xyww;
    }
`;

//////////////////////////////////////////////////
const GEN_CUBEMAP_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec3 v_texcoord")}

    ${INCLUDE_GAMMA_CORRECTION_TEXTURE}

    uniform samplerCube uCubemap;

#if __VERSION__ == 300
    out vec4 output_color;
#endif
    void main()
    {
#if __VERSION__ == 300
        output_color = ApplyGammaCorrection(texture(uCubemap, v_texcoord));
#elif __VERSION__ == 100
        gl_FragColor = ApplyGammaCorrection(textureCube(uCubemap, v_texcoord));
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_POSTPROCESS_SHADER_VERT = version => `${GEN_SHADER_VERSION(version)}

#if __VERSION__ == 300
    // assuming right-handed coordinate system
    const vec3 ${SHADER_VERT_APOS_NAME}[6] = vec3[](
        // bottom-left triangle
        vec3(-1.0, -1.0, 0.0),
        vec3( 1.0, -1.0, 0.0),
        vec3( 1.0,  1.0, 0.0),
        // top-right triangle
        vec3( 1.0,  1.0, 0.0),
        vec3(-1.0,  1.0, 0.0),
        vec3(-1.0, -1.0, 0.0)
    );
    const vec2 ${SHADER_VERT_ATEXCOORD_NAME}[6] = vec2[](
        // bottom left triangle
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        // top-right triangle
        vec2(1.0, 1.0),
        vec2(0.0, 1.0),
        vec2(0.0, 0.0)
    );
#elif __VERSION__ == 100
    ${GEN_SHADER_ATTRIBUTE(version, 0, `vec3 ${SHADER_VERT_APOS_NAME}`)}
    ${GEN_SHADER_ATTRIBUTE(version, 1, `vec2 ${SHADER_VERT_ATEXCOORD_NAME}`)}
#endif

    ${GEN_SHADER_VARYING_OUT(version, `vec2 v_texcoord`)}

    void main()
    {
#if __VERSION__ == 300
        gl_Position = vec4(${SHADER_VERT_APOS_NAME}[gl_VertexID], 1.0);
        v_texcoord = ${SHADER_VERT_ATEXCOORD_NAME}[gl_VertexID];
#elif __VERSION__ == 100
        gl_Position = vec4(${SHADER_VERT_APOS_NAME}, 1.0);
        v_texcoord = ${SHADER_VERT_ATEXCOORD_NAME};
#endif
    }
`;

//////////////////////////////////////////////////
const GEN_POSTPROCESS_SHADER_FRAG = (gl, version) => `${GEN_SHADER_VERSION(version)}

    ${GEN_SHADER_PRECISION(gl)}

    ${GEN_SHADER_VARYING_IN(version, "vec2 v_texcoord")}

    uniform sampler2D uColor0;

    ${INCLUDE_GAMMA_CORRECTION}

#if __VERSION__ == 300
    out vec4 output_color;
#endif
    void main()
    {
#if __VERSION__ == 300
        output_color = ApplyGammaCorrection(texture(uColor0, v_texcoord));
#elif __VERSION__ == 100
        gl_FragColor = ApplyGammaCorrection(texture2D(uColor0, v_texcoord));
#endif
    }
`;

//////////////////////////////////////////////////
const Shader = (gl, type, source) => {
    const id = gl.createShader(type);
    gl.shaderSource(id, source);
    gl.compileShader(id);

    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        throw Exception(`error message: ${gl.getShaderInfoLog(id)}
                         shader dump: ${source}`);
    }

    return Object.freeze({
        getID: () => id,
        getType: () => type,
        getSource: () => source,
        delete: () => gl.deleteShader(id)
    });
};

//////////////////////////////////////////////////
const Program = (gl, ...shaders) => {
    const id = gl.createProgram();
    shaders.forEach(shader => gl.attachShader(id, shader.getID()));
    gl.linkProgram(id);

    if (!gl.getProgramParameter(id, gl.LINK_STATUS)) {
        throw Exception(gl.getProgramInfoLog(id));
    }

    const uniforms = new Map();
    const findUniform = name => {
        if (!uniforms.has(name)) {
            const loc = gl.getUniformLocation(id, name);
            if (!loc) {
                throw Exception(`uniform ${name} not found`);
            }
            uniforms.set(name, loc);
            return loc;
        }
        return uniforms.get(name);
    }

    return Object.freeze({
        getID: () => id,
        getShaders: () => shaders,
        getUniformLoc: findUniform,
        delete: () => gl.deleteProgram(id),
        use: () => gl.useProgram(id),
        halt: () => gl.useProgram(null),
        uniformMatrix2: (name, m) => gl.uniformMatrix2fv(findUniform(name), false, m.getData()),
        uniformMatrix3: (name, m) => gl.uniformMatrix3fv(findUniform(name), false, m.getData()),
        uniformMatrix4: (name, m) => gl.uniformMatrix4fv(findUniform(name), false, m.getData()),
        uniform1i: (name, x) => gl.uniform1i(findUniform(name), x),
        uniform2i: (name, x, y) => gl.uniform2i(findUniform(name), x, y),
        uniform3i: (name, x, y, z) => gl.uniform3i(findUniform(name), x, y, z),
        uniform4i: (name, x, y, z, w) => gl.uniform4i(findUniform(name), x, y, z, w),
        uniform1f: (name, x) => gl.uniform1f(findUniform(name), x),
        uniform2f: (name, x, y) => gl.uniform2f(findUniform(name), x, y),
        uniform3f: (name, x, y, z) => gl.uniform3f(findUniform(name), x, y, z),
        uniform4f: (name, x, y, z, w) => gl.uniform4f(findUniform(name), x, y, z, w),
        uniformVec2: (name, v) => gl.uniform2f(findUniform(name), v.getX(), v.getY()),
        uniformVec3: (name, v) => gl.uniform3f(findUniform(name), v.getX(), v.getY(), v.getZ()),
        uniformVec4: (name, v) => gl.uniform4f(findUniform(name), v.getX(), v.getY(), v.getZ(), v.getW()),
        setUniformBlockBinding: (name, i) => gl.uniformBlockBinding(id, gl.getUniformBlockIndex(id, name), i)
    });
};

//////////////////////////////////////////////////
const Buffer = (gl, type, data, usage, size) => {
    const id = gl.createBuffer();
    gl.bindBuffer(type, id);
    if (data) {
        gl.bufferData(type, data, usage);
        size = data.buffer.byteLength;
    }
    else {
        gl.bufferData(type, size, usage);
    }
    gl.bindBuffer(type, null);

    return Object.freeze({
        getID: () => id,
        getType: () => type,
        getData: () => data,
        getUsage: () => usage,
        getSize: () => size,
        getCount: () => data.length,
        bind: () => gl.bindBuffer(type, id),
        unbind: () => gl.bindBuffer(type, null),
        delete: () => gl.deleteBuffer(id),
        update: (offsetInBytes, newData) => gl.bufferSubData(type, offsetInBytes, newData),
        updateOffset: (dstOffsetInBytes, newData, srcOffset, length) => gl.bufferSubData(type, dstOffsetInBytes, newData, srcOffset, length),
        bindBase: index => gl.bindBufferBase(type, index, id),
        bindRange: (index, offset, size) => gl.bindBufferRange(type, index, id, offset, size)
    });
};

//////////////////////////////////////////////////
const FogUBO = (gl, version) => {
    const __data = new Float32Array([
        // color
        0.0, 0.0, 0.0, 1.0,
        // distance
        30.0,
        // intensity
        1.0,
        // power
        1.0
    ]);

    const buffer = version === 2 ? Buffer(gl, gl.UNIFORM_BUFFER, null, gl.DYNAMIC_DRAW, 8 * FLOAT32_SIZE) : null;
    buffer?.bindBase(FOG_UBO_BINDING);

    buffer?.bind();
    buffer?.update(0, __data);
    buffer?.unbind();

    return Object.freeze({
        getColor: () => Vec4(__data[0], __data[1], __data[2], __data[3]),
        getDistance: () => __data[4],
        getIntensity: () => __data[5],
        getPower: () => __data[6],
        get: () => Object.freeze({
            color: Vec4(__data[0], __data[1], __data[2], __data[3]),
            distance: __data[4],
            intensity: __data[5],
            power: __data[6]
        }),

        setColor: v => {
            __data[0] = v.getR(), __data[1] = v.getG(), __data[2] = v.getB(), __data[3] = v.getA();
            buffer?.updateOffset(0, __data, 0, 4);
        },
        setDistance: d => {
            __data[4] = d;
            buffer?.updateOffset(4 * FLOAT32_SIZE, __data, 4, 1);
        },
        setIntensity: i => {
            __data[5] = i;
            buffer?.updateOffset(5 * FLOAT32_SIZE, __data, 5, 1);
        },
        setPower: p => {
            __data[6] = p;
            buffer?.updateOffset(6 * FLOAT32_SIZE, __data, 6, 1);
        },
        set: ({ color, distance, intensity, power }) => {
            __data[0] = color.getR();
            __data[1] = color.getG();
            __data[2] = color.getB();

            __data[4] = distance;
            __data[5] = intensity;
            __data[6] = power;

            buffer?.update(0, __data);
        },

        bind: () => buffer?.bind(),
        unbind: () => buffer?.unbind(),
        delete: () => buffer?.delete()
    });
};

//////////////////////////////////////////////////
const PhongMaterialUBO = (gl, version) => {
    const __data = new Float32Array([
        // ambient
        1.0, 1.0, 1.0, /* padding */ 0.0,

        // diffuse
        0.0, 0.0, 0.0,  /* padding */ 0.0,

        // specular
        0.0, 0.0, 0.0,

        // shininess
        0.0
    ]);

    const buffer = version === 2 ? Buffer(gl, gl.UNIFORM_BUFFER, null, gl.DYNAMIC_DRAW, 12 * FLOAT32_SIZE) : null;
    buffer?.bindBase(PHONG_MAT_UBO_BINDING);

    buffer?.bind();
    buffer?.update(0, __data);
    buffer?.unbind();

    return Object.freeze({
        getAmbient: () => Vec3(__data[0], __data[1], __data[2]),
        getDiffuse: () => Vec3(__data[4], __data[5], __data[6]),
        getSpecular: () => Vec3(__data[8], __data[9], __data[10]),
        getShininess: () => __data[11],
        get: () => Object.freeze({
            ambient: Vec3(__data[0], __data[1], __data[2]),
            diffuse: Vec3(__data[4], __data[5], __data[6]),
            specular: Vec3(__data[8], __data[9], __data[10]),
            shininess: __data[11]
        }),

        setAmbient: v => {
            __data[0] = v.getR(), __data[1] = v.getG(), __data[2] = v.getB();
            buffer?.updateOffset(0, __data, 0, 3);
        },

        setDiffuse: v => {
            __data[4] = v.getR(), __data[5] = v.getG(), __data[6] = v.getB();
            buffer?.updateOffset(4 * FLOAT32_SIZE, __data, 4, 3);
        },

        setSpecular: v => {
            __data[8] = v.getR(), __data[9] = v.getG(), __data[10] = v.getB();
            buffer?.updateOffset(8 * FLOAT32_SIZE, __data, 8, 3);
        },

        setShininess: s => {
            __data[11] = s;
            buffer?.updateOffset(11 * FLOAT32_SIZE, __data, 11, 1);
        },

        set: ({ ambient, diffuse, specular, shininess }) => {
            __data[0] = ambient.getR(), __data[1] = ambient.getG(), __data[2] = ambient.getB();
            __data[4] = diffuse.getR(), __data[5] = diffuse.getG(), __data[6] = diffuse.getB();
            __data[8] = specular.getR(), __data[9] = specular.getG(), __data[10] = specular.getB();
            __data[11] = shininess;
            buffer?.update(0, __data);
        },
        
        bind: () => buffer?.bind(),
        unbind: () => buffer?.unbind(),
        delete: () => buffer?.delete()
    });
};

//////////////////////////////////////////////////
const DirLightUBO = (gl, version) => {
    const __data = (() => {
        const arr = [];
        for (let i = 0; i < MAX_DIR_LIGHTS; ++i) {
            // ambient
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_DIR_LIGHTS; ++i) {
            // diffuse
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_DIR_LIGHTS; ++i) {
            // specular
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_DIR_LIGHTS; ++i) {
            // direction
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_DIR_LIGHTS; ++i) {
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        return new Float32Array(arr);
    })();

    const buffer = version === 2 ? Buffer(gl, gl.UNIFORM_BUFFER, null, gl.DYNAMIC_DRAW, 4 * 5 * FLOAT32_SIZE * MAX_DIR_LIGHTS) : null;
    buffer?.bindBase(DIR_LIGHT_UBO_BINDING);

    buffer?.bind();
    buffer?.update(0, __data);
    buffer?.unbind();

    return Object.freeze({
        getAmbient: i => Vec3(__data[0 * MAX_DIR_LIGHTS + i * 4 + 0],
                              __data[0 * MAX_DIR_LIGHTS + i * 4 + 1],
                              __data[0 * MAX_DIR_LIGHTS + i * 4 + 2]),
        getDiffuse: i => Vec3(__data[4 * MAX_DIR_LIGHTS + i * 4 + 0],
                              __data[4 * MAX_DIR_LIGHTS + i * 4 + 1],
                              __data[4 * MAX_DIR_LIGHTS + i * 4 + 2]),
        getSpecular: i => Vec3(__data[8 * MAX_DIR_LIGHTS + i * 4 + 0],
                               __data[8 * MAX_DIR_LIGHTS + i * 4 + 1],
                               __data[8 * MAX_DIR_LIGHTS + i * 4 + 2]),
        getDirection: i => Vec3(__data[12 * MAX_DIR_LIGHTS + i * 4 + 0],
                                __data[12 * MAX_DIR_LIGHTS + i * 4 + 1],
                                __data[12 * MAX_DIR_LIGHTS + i * 4 + 2]),
        getIntensity: i => __data[16 * MAX_DIR_LIGHTS + i * 4 + 0],
        get: i => Object.freeze({
            ambient: Vec3(__data[0 * MAX_DIR_LIGHTS + i * 4 + 0],
                          __data[0 * MAX_DIR_LIGHTS + i * 4 + 1],
                          __data[0 * MAX_DIR_LIGHTS + i * 4 + 2]),
            diffuse: Vec3(__data[4 * MAX_DIR_LIGHTS + i * 4 + 0],
                          __data[4 * MAX_DIR_LIGHTS + i * 4 + 1],
                          __data[4 * MAX_DIR_LIGHTS + i * 4 + 2]),
            specular: Vec3(__data[8 * MAX_DIR_LIGHTS + i * 4 + 0],
                           __data[8 * MAX_DIR_LIGHTS + i * 4 + 1],
                           __data[8 * MAX_DIR_LIGHTS + i * 4 + 2]),
            direction: Vec3(__data[12 * MAX_DIR_LIGHTS + i * 4 + 0],
                            __data[12 * MAX_DIR_LIGHTS + i * 4 + 1],
                            __data[12 * MAX_DIR_LIGHTS + i * 4 + 2]),
            intensity: __data[16 * MAX_DIR_LIGHTS + i * 4 + 0]
        }),

        setAmbient: (i, v) => {
            __data[0 * MAX_DIR_LIGHTS + i * 4 + 0] = v.getR();
            __data[0 * MAX_DIR_LIGHTS + i * 4 + 1] = v.getG();
            __data[0 * MAX_DIR_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((0 * MAX_DIR_LIGHTS + i * 4) * FLOAT32_SIZE, __data, i * 4, 3);
        },

        setDiffuse: (i, v) => {
            __data[4 * MAX_DIR_LIGHTS + i * 4 + 0] = v.getR();
            __data[4 * MAX_DIR_LIGHTS + i * 4 + 1] = v.getG();
            __data[4 * MAX_DIR_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((4 * MAX_DIR_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_DIR_LIGHTS * 4 + i * 4, 3);
        },

        setSpecular: (i, v) => {
            __data[8 * MAX_DIR_LIGHTS + i * 4 + 0] = v.getR();
            __data[8 * MAX_DIR_LIGHTS + i * 4 + 1] = v.getG();
            __data[8 * MAX_DIR_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((8 * MAX_DIR_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_DIR_LIGHTS * 8 + i * 4, 3);
        },

        setDirection: (i, v) => {
            __data[12 * MAX_DIR_LIGHTS + i * 4 + 0] = v.getX();
            __data[12 * MAX_DIR_LIGHTS + i * 4 + 1] = v.getY();
            __data[12 * MAX_DIR_LIGHTS + i * 4 + 2] = v.getZ();
            buffer?.updateOffset((12 * MAX_DIR_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_DIR_LIGHTS * 12 + i * 4, 3);
        },

        setIntensity: (i, s) => {
            __data[16 * MAX_DIR_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((16 * MAX_DIR_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_DIR_LIGHTS * 16 + i * 4, 1);
        },

        set: (i, {ambient, diffuse, specular, direction, intensity}) => {
            __data[0 * MAX_DIR_LIGHTS + i * 4 + 0] = ambient.getR();
            __data[0 * MAX_DIR_LIGHTS + i * 4 + 1] = ambient.getG();
            __data[0 * MAX_DIR_LIGHTS + i * 4 + 2] = ambient.getB();

            __data[4 * MAX_DIR_LIGHTS + i * 4 + 0] = diffuse.getR();
            __data[4 * MAX_DIR_LIGHTS + i * 4 + 1] = diffuse.getG();
            __data[4 * MAX_DIR_LIGHTS + i * 4 + 2] = diffuse.getB();

            __data[8 * MAX_DIR_LIGHTS + i * 4 + 0] = specular.getR();
            __data[8 * MAX_DIR_LIGHTS + i * 4 + 1] = specular.getG();
            __data[8 * MAX_DIR_LIGHTS + i * 4 + 2] = specular.getB();

            __data[12 * MAX_DIR_LIGHTS + i * 4 + 0] = direction.getX();
            __data[12 * MAX_DIR_LIGHTS + i * 4 + 1] = direction.getY();
            __data[12 * MAX_DIR_LIGHTS + i * 4 + 2] = direction.getZ();

            __data[16 * MAX_DIR_LIGHTS + i * 4 + 0] = intensity;
            buffer?.update(0, __data);
        },

        bind: () => buffer?.bind(),
        unbind: () => buffer?.unbind(),
        delete: () => buffer?.delete()
    });
};

//////////////////////////////////////////////////
const PointLightUBO = (gl, version) => {
    const __data = (() => {
        const arr = [];
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // diffuse
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // specular
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // position
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // constant
            arr.push(1.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // linear
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // quadratic
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_POINT_LIGHTS; ++i) {
            // intensity
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        return new Float32Array(arr);
    })();

    const buffer = version === 2 ? Buffer(gl, gl.UNIFORM_BUFFER, null, gl.DYNAMIC_DRAW, 4 * 7 * FLOAT32_SIZE * MAX_POINT_LIGHTS) : null;
    buffer?.bindBase(POINT_LIGHT_UBO_BINDING);

    buffer?.bind();
    buffer?.update(0, __data);
    buffer?.unbind();

    return Object.freeze({
        getDiffuse: i => Vec3(__data[0 * MAX_POINT_LIGHTS + i * 4 + 0],
                              __data[0 * MAX_POINT_LIGHTS + i * 4 + 1],
                              __data[0 * MAX_POINT_LIGHTS + i * 4 + 2]),
        getSpecular: i => Vec3(__data[4 * MAX_POINT_LIGHTS + i * 4 + 0],
                               __data[4 * MAX_POINT_LIGHTS + i * 4 + 1],
                               __data[4 * MAX_POINT_LIGHTS + i * 4 + 2]),
        getPosition: i => Vec3(__data[8 * MAX_POINT_LIGHTS + i * 4 + 0],
                               __data[8 * MAX_POINT_LIGHTS + i * 4 + 1],
                               __data[8 * MAX_POINT_LIGHTS + i * 4 + 2]),
        getConstant: i => __data[12 * MAX_POINT_LIGHTS + i * 4 + 0],
        getLinear: i => __data[16 * MAX_POINT_LIGHTS + i * 4 + 0],
        getQuadratic: i => __data[20 * MAX_POINT_LIGHTS + i * 4 + 0],
        getIntensity: i => __data[24 * MAX_POINT_LIGHTS + i * 4 + 0],
        get: i => Object.freeze({
            diffuse: Vec3(__data[0 * MAX_POINT_LIGHTS + i * 4 + 0],
                          __data[0 * MAX_POINT_LIGHTS + i * 4 + 1],
                          __data[0 * MAX_POINT_LIGHTS + i * 4 + 2]),
            specular: Vec3(__data[4 * MAX_POINT_LIGHTS + i * 4 + 0],
                           __data[4 * MAX_POINT_LIGHTS + i * 4 + 1],
                           __data[4 * MAX_POINT_LIGHTS + i * 4 + 2]),
            position: Vec3(__data[8 * MAX_POINT_LIGHTS + i * 4 + 0],
                           __data[8 * MAX_POINT_LIGHTS + i * 4 + 1],
                           __data[8 * MAX_POINT_LIGHTS + i * 4 + 2]),
            constant: __data[12 * MAX_POINT_LIGHTS + i * 4 + 0],
            linear: __data[16 * MAX_POINT_LIGHTS + i * 4 + 0],
            quadratic: __data[20 * MAX_POINT_LIGHTS + i * 4 + 0],
            intensity: __data[24 * MAX_POINT_LIGHTS + i * 4 + 0]
        }),

        setDiffuse: (i, v) => {
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 0] = v.getR();
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 1] = v.getG();
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((0 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, i * 4, 3);
        },

        setSpecular: (i, v) => {
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 0] = v.getR();
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 1] = v.getG();
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((4 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_POINT_LIGHTS * 4 + i * 4, 3);
        },

        setPosition: (i, v) => {
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 0] = v.getX();
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 1] = v.getY();
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 2] = v.getZ();
            buffer?.updateOffset((8 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_POINT_LIGHTS * 8 + i * 4, 3);
        },

        setConstant: (i, s) => {
            __data[12 * MAX_POINT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((12 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_POINT_LIGHTS * 12 + i * 4, 1);
        },

        setLinear: (i, s) => {
            __data[16 * MAX_POINT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((16 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_POINT_LIGHTS * 16 + i * 4, 1);
        },

        setQuadratic: (i, s) => {
            __data[20 * MAX_POINT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((20 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_POINT_LIGHTS * 20 + i * 4, 1);
        },

        setIntensity: (i, s) => {
            __data[24 * MAX_POINT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((24 * MAX_POINT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_POINT_LIGHTS * 24 + i * 4, 1);
        },

        set: (i, { diffuse, specular, position, constant, linear, quadratic, intensity }) => {
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 0] = diffuse.getR();
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 1] = diffuse.getG();
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 2] = diffuse.getB();

            __data[4 * MAX_POINT_LIGHTS + i * 4 + 0] = specular.getR();
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 1] = specular.getG();
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 2] = specular.getB();

            __data[8 * MAX_POINT_LIGHTS + i * 4 + 0] = position.getX();
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 1] = position.getY();
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 2] = position.getZ();

            __data[12 * MAX_POINT_LIGHTS + i * 4 + 0] = constant;
            __data[16 * MAX_POINT_LIGHTS + i * 4 + 0] = linear;
            __data[20 * MAX_POINT_LIGHTS + i * 4 + 0] = quadratic;
            __data[24 * MAX_POINT_LIGHTS + i * 4 + 0] = intensity;

            buffer?.update(0, __data);
        },

        setWithRange: (i, { diffuse, specular, position, range, intensity }) => {
            const constant = 1.0;
            const linear = 4.5 / range;
            const quadratic = 75.0 / (range * range);

            __data[0 * MAX_POINT_LIGHTS + i * 4 + 0] = diffuse.getR();
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 1] = diffuse.getG();
            __data[0 * MAX_POINT_LIGHTS + i * 4 + 2] = diffuse.getB();

            __data[4 * MAX_POINT_LIGHTS + i * 4 + 0] = specular.getR();
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 1] = specular.getG();
            __data[4 * MAX_POINT_LIGHTS + i * 4 + 2] = specular.getB();

            __data[8 * MAX_POINT_LIGHTS + i * 4 + 0] = position.getX();
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 1] = position.getY();
            __data[8 * MAX_POINT_LIGHTS + i * 4 + 2] = position.getZ();

            __data[12 * MAX_POINT_LIGHTS + i * 4 + 0] = constant;
            __data[16 * MAX_POINT_LIGHTS + i * 4 + 0] = linear;
            __data[20 * MAX_POINT_LIGHTS + i * 4 + 0] = quadratic;
            __data[24 * MAX_POINT_LIGHTS + i * 4 + 0] = intensity;

            buffer?.update(0, __data);
        },

        bind: () => buffer?.bind(),
        unbind: () => buffer?.unbind(),
        delete: () => buffer?.delete()
    });
};

//////////////////////////////////////////////////
const SpotLightUBO = (gl, version) => {
    const __data = (() => {
        const arr = [];
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // diffuse
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // specular
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // position
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // direction
            arr.push(0.0, 0.0, 0.0, /* padding */ 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // constant
            arr.push(1.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // linear
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // quadratic
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // intensity
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // inner cutoff
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i) {
            // outer cutoff
            arr.push(0.0, /* padding */ 0.0, 0.0, 0.0);
        }
        return new Float32Array(arr);
    })();

    const buffer = version === 2 ? Buffer(gl, gl.UNIFORM_BUFFER, null, gl.DYNAMIC_DRAW, 4 * 10 * FLOAT32_SIZE * MAX_SPOT_LIGHTS) : null;
    buffer?.bindBase(SPOT_LIGHT_UBO_BINDING);

    buffer?.bind();
    buffer?.update(0, __data);
    buffer?.unbind();

    return Object.freeze({
        getDiffuse: i => Vec3(__data[0 * MAX_SPOT_LIGHTS + i * 4 + 0],
                              __data[0 * MAX_SPOT_LIGHTS + i * 4 + 1],
                              __data[0 * MAX_SPOT_LIGHTS + i * 4 + 2]),
        getSpecular: i => Vec3(__data[4 * MAX_SPOT_LIGHTS + i * 4 + 0],
                               __data[4 * MAX_SPOT_LIGHTS + i * 4 + 1],
                               __data[4 * MAX_SPOT_LIGHTS + i * 4 + 2]),
        getPosition: i => Vec3(__data[8 * MAX_SPOT_LIGHTS + i * 4 + 0],
                               __data[8 * MAX_SPOT_LIGHTS + i * 4 + 1],
                               __data[8 * MAX_SPOT_LIGHTS + i * 4 + 2]),
        getDirection: i => Vec3(__data[12 * MAX_SPOT_LIGHTS + i * 4 + 0],
                                __data[12 * MAX_SPOT_LIGHTS + i * 4 + 1],
                                __data[12 * MAX_SPOT_LIGHTS + i * 4 + 2]),
        getConstant: i => __data[16 * MAX_SPOT_LIGHTS + i * 4 + 0],
        getLinear: i => __data[20 * MAX_SPOT_LIGHTS + i * 4 + 0],
        getQuadratic: i => __data[24 * MAX_SPOT_LIGHTS + i * 4 + 0],
        getIntensity: i => __data[28 * MAX_SPOT_LIGHTS + i * 4 + 0],
        getInnerCutoff: i => __data[32 * MAX_SPOT_LIGHTS + i * 4 + 0],
        getOuterCutoff: i => __data[36 * MAX_SPOT_LIGHTS + i * 4 + 0],
        get: i => Object.freeze({
            diffuse: Vec3(__data[0 * MAX_SPOT_LIGHTS + i * 4 + 0],
                          __data[0 * MAX_SPOT_LIGHTS + i * 4 + 1],
                          __data[0 * MAX_SPOT_LIGHTS + i * 4 + 2]),
            specular: Vec3(__data[4 * MAX_SPOT_LIGHTS + i * 4 + 0],
                           __data[4 * MAX_SPOT_LIGHTS + i * 4 + 1],
                           __data[4 * MAX_SPOT_LIGHTS + i * 4 + 2]),
            position: Vec3(__data[8 * MAX_SPOT_LIGHTS + i * 4 + 0],
                           __data[8 * MAX_SPOT_LIGHTS + i * 4 + 1],
                           __data[8 * MAX_SPOT_LIGHTS + i * 4 + 2]),
            direction: Vec3(__data[12 * MAX_SPOT_LIGHTS + i * 4 + 0],
                            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 1],
                            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 2]),
            constant: __data[16 * MAX_SPOT_LIGHTS + i * 4 + 0],
            linear: __data[20 * MAX_SPOT_LIGHTS + i * 4 + 0],
            quadratic: __data[24 * MAX_SPOT_LIGHTS + i * 4 + 0],
            intensity: __data[28 * MAX_SPOT_LIGHTS + i * 4 + 0],
            innerCutoff: __data[32 * MAX_SPOT_LIGHTS + i * 4 + 0],
            outerCutoff: __data[36 * MAX_SPOT_LIGHTS + i * 4 + 0]
        }),

        setDiffuse: (i, v) => {
            __data[0 * MAX_SPOT_LIGHTS + i * 4 + 0] = v.getR();
            __data[0 * MAX_SPOT_LIGHTS + i * 4 + 1] = v.getG();
            __data[0 * MAX_SPOT_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((0 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, i * 4, 3);
        },

        setSpecular: (i, v) => {
            __data[4 * MAX_SPOT_LIGHTS + i * 4 + 0] = v.getR();
            __data[4 * MAX_SPOT_LIGHTS + i * 4 + 1] = v.getG();
            __data[4 * MAX_SPOT_LIGHTS + i * 4 + 2] = v.getB();
            buffer?.updateOffset((4 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 4 + i * 4, 3);
        },

        setPosition: (i, v) => {
            __data[8 * MAX_SPOT_LIGHTS + i * 4 + 0] = v.getX();
            __data[8 * MAX_SPOT_LIGHTS + i * 4 + 1] = v.getY();
            __data[8 * MAX_SPOT_LIGHTS + i * 4 + 2] = v.getZ();
            buffer?.updateOffset((8 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 8 + i * 4, 3);
        },

        setDirection: (i, v) => {
            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 0] = v.getX();
            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 1] = v.getY();
            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 2] = v.getZ();
            buffer?.updateOffset((12 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 12 + i * 4, 3);
        },

        setConstant: (i, s) => {
            __data[16 * MAX_SPOT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((16 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 16 + i * 4, 1);
        },

        setLinear: (i, s) => {
            __data[20 * MAX_SPOT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((20 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 20 + i * 4, 1);
        },

        setQuadratic: (i, s) => {
            __data[24 * MAX_SPOT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((24 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 24 + i * 4, 1);
        },

        setIntensity: (i, s) => {
            __data[28 * MAX_SPOT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((28 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 28 + i * 4, 1);
        },

        setInnerCutoff: (i, s) => {
            __data[32 * MAX_SPOT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((32 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 32 + i * 4, 1);
        },

        setOuterCutoff: (i, s) => {
            __data[36 * MAX_SPOT_LIGHTS + i * 4 + 0] = s;
            buffer?.updateOffset((36 * MAX_SPOT_LIGHTS + i * 4) * FLOAT32_SIZE, __data, MAX_SPOT_LIGHTS * 36 + i * 4, 1);
        },

        set: (i, { diffuse, specular, position, direction, constant, linear, quadratic, intensity, innerCutoff, outerCutoff  }) => {
            __data[0 * MAX_SPOT_LIGHTS + i * 4 + 0] = diffuse.getR();
            __data[0 * MAX_SPOT_LIGHTS + i * 4 + 1] = diffuse.getG();
            __data[0 * MAX_SPOT_LIGHTS + i * 4 + 2] = diffuse.getB();

            __data[4 * MAX_SPOT_LIGHTS + i * 4 + 0] = specular.getR();
            __data[4 * MAX_SPOT_LIGHTS + i * 4 + 1] = specular.getG();
            __data[4 * MAX_SPOT_LIGHTS + i * 4 + 2] = specular.getB();

            __data[8 * MAX_SPOT_LIGHTS + i * 4 + 0] = position.getX();
            __data[8 * MAX_SPOT_LIGHTS + i * 4 + 1] = position.getY();
            __data[8 * MAX_SPOT_LIGHTS + i * 4 + 2] = position.getZ();

            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 0] = direction.getX();
            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 1] = direction.getY();
            __data[12 * MAX_SPOT_LIGHTS + i * 4 + 2] = direction.getZ();

            __data[16 * MAX_SPOT_LIGHTS + i * 4 + 0] = constant;
            __data[20 * MAX_SPOT_LIGHTS + i * 4 + 0] = linear;
            __data[24 * MAX_SPOT_LIGHTS + i * 4 + 0] = quadratic;
            __data[28 * MAX_SPOT_LIGHTS + i * 4 + 0] = intensity;
            __data[32 * MAX_SPOT_LIGHTS + i * 4 + 0] = innerCutoff;
            __data[36 * MAX_SPOT_LIGHTS + i * 4 + 0] = outerCutoff;

            buffer?.update(0, __data);
        },

        bind: () => buffer?.bind(),
        unbind: () => buffer?.unbind(),
        delete: () => buffer?.delete()
    });
};

//////////////////////////////////////////////////
const VAO = (gl, vbo, ebo, version, program, ...configs) => {
    const elementType = (() => {
        if (ebo) {
            const elementData = ebo.getData();
            if (elementData.BYTES_PER_ELEMENT === 4) {
                return gl.UNSIGNED_INT;
            }
            else if (elementData.BYTES_PER_ELEMENT === 2) {
                return gl.UNSIGNED_SHORT;
            }
            throw Exception("EBO element data type is unrecognized");
        }
        return null;
    })();

    if (version === 2) {
        const id = gl.createVertexArray();
        gl.bindVertexArray(id);
        vbo.bind();
        let totalSize = 0;
        for (const config of configs) {
            gl.enableVertexAttribArray(config.index);
            gl.vertexAttribPointer(config.index,
                                   config.size,
                                   config.type,
                                   config.normalized,
                                   config.stride,
                                   config.offset);
            totalSize += config.size;
        }
        const vertexCount = vbo.getCount() / totalSize;
        vbo.unbind();
        ebo?.bind();
        gl.bindVertexArray(null);
        ebo?.unbind();

        return Object.freeze({
            getID: () => id,
            getVbo: () => vbo,
            getEbo: () => ebo,
            getVersion: () => version,
            getConfigs: () => configs,
            getVertexCount: () => vertexCount,
            bind: () => gl.bindVertexArray(id),
            unbind: () => gl.bindVertexArray(null),
            draw: (mode = gl.TRIANGLES) => ebo ? gl.drawElements(mode, ebo.getCount(), elementType, 0) : gl.drawArrays(mode, 0, vertexCount)
        });
    }
    else if (version === 1) {
        const ext = gl.getExtension("OES_vertex_array_object");
        if (!ext) {
            const attributes = new Map();
            let totalSize = 0;
            for (const config of configs) {
                const attribLoc = gl.getAttribLocation(program.getID(), config.name);
                if (-1 === attribLoc) {
                    console.warn(`[Hopper] couldn't find attribute ${config.name}`);
                    // throw Exception(`couldn't find attribute ${config.name}`);
                }
                else {
                    attributes.set(config.name, attribLoc)
                }
                totalSize += config.size;
            }
            const vertexCount = vbo.getCount() / totalSize;

            return Object.freeze({
                getID: () => null,
                getVbo: () => vbo,
                getEbo: () => ebo,
                getVersion: () => version,
                getConfigs: () => configs,
                getVertexCount: () => vertexCount,
                bind: () => {
                    vbo.bind();
                    ebo?.bind();
                    for (const config of configs) {
                        if (attributes.has(config.name)) {
                            const attribLoc = attributes.get(config.name);
                            gl.enableVertexAttribArray(attribLoc);
                            gl.vertexAttribPointer(attribLoc,
                                                   config.size,
                                                   config.type,
                                                   config.normalized,
                                                   config.stride,
                                                   config.offset);
                        }
                    }
                },
                unbind: () => {
                    vbo.unbind();
                    ebo?.unbind();
                },
                draw: (mode = gl.TRIANGLES) => ebo ? gl.drawElements(mode, ebo.getCount(), elementType, 0) : gl.drawArrays(mode, 0, vertexCount)
            });
        }
        else {
            const attributes = new Map();
            for (const config of configs) {
                const attribLoc = gl.getAttribLocation(program.getID(), config.name);
                if (-1 === attribLoc) {
                    console.warn(`[Hopper] couldn't find attribute ${config.name}`);
                    // throw Exception(`couldn't find attribute ${config.name}`);
                }
                else {
                    attributes.set(config.name, attribLoc);
                }
            }

            const id = ext.createVertexArrayOES();
            ext.bindVertexArrayOES(id);
            vbo.bind();
            let totalSize = 0;
            for (const config of configs) {
                if (attributes.has(config.name)) {
                    const attribLoc = attributes.get(config.name);
                    gl.enableVertexAttribArray(attribLoc);
                    gl.vertexAttribPointer(attribLoc,
                                           config.size,
                                           config.type,
                                           config.normalized,
                                           config.stride,
                                           config.offset);
                }
                totalSize += config.size;
            }
            const vertexCount = vbo.getCount() / totalSize;
            vbo.unbind();
            ebo?.bind();
            ext.bindVertexArrayOES(null);
            ebo?.unbind();

            return Object.freeze({
                getID: () => id,
                getVbo: () => vbo,
                getEbo: () => ebo,
                getVersion: () => version,
                getConfigs: () => configs,
                getVertexCount: () => vertexCount,
                bind: () => ext.bindVertexArrayOES(id),
                unbind: () => ext.bindVertexArrayOES(null),
                draw: (mode = gl.TRIANGLES) => ebo ? gl.drawElements(mode, ebo.getCount(), elementType, 0) : gl.drawArrays(mode, 0, vertexCount)
            });
        }
    }
    else {
        throw Exception(`version ${version} is invalid in VAO`);
    }
};

//////////////////////////////////////////////////
const Mesh = (gl, vertices, indices, version, program, ...configs) => {
    const vbo = Buffer(gl, gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const ebo = indices ? Buffer(gl, gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW) : null;
    const vao = VAO(gl, vbo, ebo, version, program, ...configs);

    return Object.freeze({
        getVertices: () => vertices,
        getIndices: () => indices,
        getConfigs: () => configs,
        getVbo: () => vbo,
        getEbo: () => ebo,
        getVao: () => vao,
        draw: (mode = gl.TRIANGLES) => vao.draw(mode),
        drawWireframe: () => vao.draw(gl.LINE_STRIP),
        bind: () => vao.bind(),
        unbind: () => vao.unbind(),
        getVersion: () => version,
        getProgram: () => program
    });
};

//////////////////////////////////////////////////
const FramebufferAttachment = (gl, width, height, internalFormat, format, type) => {
    const initParameters = () => {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    const initTexture = id => {
        gl.bindTexture(gl.TEXTURE_2D, id);
        initParameters();
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    let id = gl.createTexture();
    initTexture(id);

    return Object.freeze({
        getID: () => id,
        getWidth: () => width,
        getHeight: () => height,
        getInternalFormat: () => internalFormat,
        getFormat: () => format,
        getType: () => type,
        bind: (ind = 0) => {
            gl.activeTexture(gl.TEXTURE0 + ind);
            gl.bindTexture(gl.TEXTURE_2D, id);
        },
        unbind: (ind = 0) =>  {
            gl.activeTexture(gl.TEXTURE0 + ind);
            gl.bindTexture(gl.TEXTURE_2D, null);
        },
        delete: () => gl.deleteTexture(id),
        resize: (newWidth, newHeight) => {
            if (width !== newWidth || height !== newHeight) {
                width = newWidth;
                height = newHeight;
                gl.deleteTexture(id);
                id = gl.createTexture();
                initTexture(id);
            }
        }
    });
};

//////////////////////////////////////////////////
const Renderbuffer = (gl, width, height, type) => {
    let id = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, id);
    gl.renderbufferStorage(gl.RENDERBUFFER, type, width, height);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return Object.freeze({
        getID: () => id,
        getWidth: () => width,
        getHeight: () => height,
        getType: () => type,
        bind: () => gl.bindRenderbuffer(gl.RENDERBUFFER, id),
        unbind: () => gl.bindRenderbuffer(gl.RENDERBUFFER, null),
        delete: () => gl.deleteRenderbuffer(id),
        resize: (newWidth, newHeight) => {
            if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                gl.deleteRenderbuffer(id);
                id = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, id);
                gl.renderbufferStorage(gl.RENDERBUFFER, type, width, height);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            }
        }
    });
};

//////////////////////////////////////////////////
const RenderbufferMS = (gl, width, height, type, samples) => {
    let id = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, id);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, type, width, height);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return Object.freeze({
        getID: () => id,
        getWidth: () => width,
        getHeight: () => height,
        getType: () => type,
        getSamples: () => samples,
        bind: () => gl.bindRenderbuffer(gl.RENDERBUFFER, id),
        unbind: () => gl.bindRenderbuffer(gl.RENDERBUFFER, null),
        delete: () => gl.deleteRenderbuffer(id),
        resize: (newWidth, newHeight) => {
            if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                gl.deleteRenderbuffer(id);
                id = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, id);
                gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, type, width, height);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            }
        }
    });
};

//////////////////////////////////////////////////
const Framebuffer = gl => {
    let id = gl.createFramebuffer();
    const attachments = [];

    return Object.freeze({
        getID: () => id,
        bind: () => gl.bindFramebuffer(gl.FRAMEBUFFER, id),
        bindRead: () => gl.bindFramebuffer(gl.READ_FRAMEBUFFER, id),
        bindDraw: () => gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, id),
        unbind: () => gl.bindFramebuffer(gl.FRAMEBUFFER, null),
        isComplete: () => gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE,
        delete: () => gl.deleteFramebuffer(id),
        recreate: () => id = gl.createFramebuffer(),
        attachColorTexture: (texture, attachment = 0) => {
            attachments.push(texture);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachment, gl.TEXTURE_2D, texture.getID(), null);
        },
        attachDepthStencilTexture: texture => {
            attachments.push(texture);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, texture.getID(), null);
        },
        attachDepthStencilRenderbuffer: rbo => {
            attachments.push(rbo);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rbo.getID());
        },
        attachColorRenderbuffer: (rbo, attachment = 0) => {
            attachments.push(rbo);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attachment, gl.RENDERBUFFER, rbo.getID());
        },
        clearAttachments: () => attachments.length = 0,
        getAttachmentCount: () => attachments.length
    });
};

//////////////////////////////////////////////////
const Texture2D = (gl, version, data,
                  { width, height, internalFormat, format, type, minf, magf, wraps, wrapt, mipmap, anisotropy }) => {
    const id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, id);
    if (data instanceof Image) {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, type, data);
    }
    else {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magf);
    if (mipmap) {
        if (version === 1 && Common.isPowerOfTwo(width) && Common.isPowerOfTwo(height)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else if (version === 2) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wraps);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapt);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }
    else if (minf) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minf);
    }
    else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    const ext = gl.getExtension("EXT_texture_filter_anisotropic") ||
                gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
                gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (ext) {
        const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        if (anisotropy && anisotropy < maxAnisotropy) {
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
        }
        else {
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return Object.freeze({
        getID: () => id,
        getVersion: () => version,
        getData: () => data,
        getWidth: () => width,
        getHeight: () => height,
        getInternalFormat: () => internalFormat,
        getFormat: () => format,
        getType: () => type,
        getMinF: () => minf,
        getMagF: () => magf,
        getWrapS: () => wraps,
        getWrapT: () => wrapt,
        getMipMap: () => mipmap,
        bind: () => gl.bindTexture(gl.TEXTURE_2D, id),
        unbind: () => gl.bindTexture(gl.TEXTURE_2D, null),
        active: (i = 0) => gl.activeTexture(gl.TEXTURE0 + i)
    });
};

//////////////////////////////////////////////////
const Cubemap = (gl, version,
                { width, height, internalFormat, format, type, anisotropy }, ...imageBuffer) => {

    const uploadImage = (target, data) => {
        if (data instanceof Image) {
            gl.texImage2D(target, 0, internalFormat, format, type, data);
        }
        else {
            gl.texImage2D(target, 0, internalFormat, width, height, 0, format, type, data);
        }
    };

    const id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, id);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (version === 2) {
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    }
    for (const image of imageBuffer) {
        switch (image.face) {
            case "positive_x":
                uploadImage(gl.TEXTURE_CUBE_MAP_POSITIVE_X, image.data);
                break;
            case "negative_x":
                uploadImage(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, image.data);
                break;
            case "positive_y":
                uploadImage(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, image.data);
                break;
            case "negative_y":
                uploadImage(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, image.data);
                break;
            case "positive_z":
                uploadImage(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, image.data);
                break;
            case "negative_z":
                uploadImage(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, image.data);
                break;
            default:
                throw Exception(`${image.face} is an invalid face for cubemap`);
        }
    }
    if (version === 1 && Common.isPowerOfTwo(width) && Common.isPowerOfTwo(height)) {
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    }
    else if (version === 2) {
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    }
    else {
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    const ext = gl.getExtension("EXT_texture_filter_anisotropic") ||
                gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
                gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (ext) {
        const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        if (anisotropy && anisotropy < maxAnisotropy) {
            gl.texParameterf(gl.TEXTURE_CUBE_MAP, ext.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
        }
        else {
            gl.texParameterf(gl.TEXTURE_CUBE_MAP, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }
    }
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    return Object.freeze({
        getID: () => id,
        getVersion: () => version,
        getWidth: () => width,
        getHeight: () => height,
        getInternalFormat: () => internalFormat,
        getFormat: () => format,
        getType: () => type,
        bind: () => gl.bindTexture(gl.TEXTURE_CUBE_MAP, id),
        unbind: () => gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
    });
};

//////////////////////////////////////////////////
const TextureLoader = (gl, version) => {
    const loadedTextures = new Map();

    const loadImage = url => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.crossOrigin = "anonymous";
        image.src = url;
    });

    const __load = async (url) => {
        if (!loadedTextures.has(url)) {
            try {
                if (version === 2) {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const imageBitmap = await createImageBitmap(blob);
                    loadedTextures.set(url, imageBitmap);
                    return imageBitmap;
                }
                else {
                    const image = await loadImage(url);
                    loadedTextures.set(url, image);
                    return image;
                }
            }
            catch (e) {
                throw Exception(`could not load ${url}: ${e.toString()}`);
            }
        }
        return loadedTextures.get(url);
    };

    const tokenizeFilter = filter => {
        switch (filter) {
            case "nearest":
                return gl.NEAREST;
            case "linear":
                return gl.LINEAR;
            case "nearest_mipmap_nearest":
                return gl.NEAREST_MIPMAP_NEAREST;
            case "nearest_mipmap_linear":
                return gl.NEAREST_MIPMAP_LINEAR;
            case "linear_mipmap_nearest":
                return gl.LINEAR_MIPMAP_NEAREST;
            case "linear_mipmap_linear":
                return gl.LINEAR_MIPMAP_LINEAR;
            default:
                throw Exception(`${filter} is not a valid filter`);
        }
    };

    const tokenizeWrap = wrap => {
        switch (wrap) {
            case "repeat":
                return gl.REPEAT;
            case "clamp_to_edge":
                return gl.CLAMP_TO_EDGE;
            default:
                throw Exception(`${wrap} is not a valid wrapping mode`);
        }
    };

    const tokenizeFormat = format => {
        switch (format) {
            case "rgb":
                return gl.RGB;
            case "rgba":
                return gl.RGBA;
            default:
                throw Exception(`${format} is not a valid format`);
        }
    };

    const tokenizeType = type => {
        switch (type) {
            case "uint8":
                return gl.UNSIGNED_BYTE;
            case "uint16":
                return gl.UNSIGNED_SHORT;
            case "uint32":
                return gl.UNSIGNED_INT;
            default:
                throw Exception(`${type} is not a valid type`);
        }
    };

    return Object.freeze({
        load2D: async (url, {
            internalFormat,
            format,
            type,
            minf,
            magf,
            wraps,
            wrapt,
            mipmap,
            anisotropy
        }) => {
            const data = await __load(url);
            return Texture2D(gl, version, data, {
                width: data.width,
                height: data.height,
                internalFormat: tokenizeFormat(internalFormat),
                format: tokenizeFormat(format),
                type: tokenizeType(type),
                minf: tokenizeFilter(minf),
                magf: tokenizeFilter(magf),
                wraps: tokenizeWrap(wraps),
                wrapt: tokenizeWrap(wrapt),
                mipmap: mipmap,
                anisotropy: anisotropy
            });
        },
        loadCheckerboard2D: ({
            darkColor,
            brightColor,
            minf,
            magf,
            wraps,
            wrapt,
            mipmap,
            anisotropy
        }) => {
            const data = new Uint8Array([
                darkColor.getR(), darkColor.getG(), darkColor.getB(), darkColor.getA(),
                brightColor.getR(), brightColor.getG(), brightColor.getB(), brightColor.getA(),
                brightColor.getR(), brightColor.getG(), brightColor.getB(), brightColor.getA(),
                darkColor.getR(), darkColor.getG(), darkColor.getB(), darkColor.getA()
            ]);
            return Texture2D(gl, version, data, {
                width: 2,
                height: 2,
                internalFormat: gl.RGBA,
                format: gl.RGBA,
                type: gl.UNSIGNED_BYTE,
                minf: tokenizeFilter(minf),
                magf: tokenizeFilter(magf),
                wraps: tokenizeWrap(wraps),
                wrapt: tokenizeWrap(wrapt),
                mipmap: mipmap,
                anisotropy: anisotropy
            });
        },
        loadSingleColor2D: ({
            color,
            minf,
            magf,
            wraps,
            wrapt,
            mipmap,
            anisotropy 
        }) => {
            const data = new Uint8Array([
                color.getR(), color.getG(), color.getB(), color.getA()
            ]);
            return Texture2D(gl, version, data, {
                width: 1,
                height: 1,
                internalFormat: gl.RGBA,
                format: gl.RGBA,
                type: gl.UNSIGNED_BYTE,
                minf: tokenizeFilter(minf),
                magf: tokenizeFilter(magf),
                wraps: tokenizeWrap(wraps),
                wrapt: tokenizeWrap(wrapt),
                mipmap: mipmap,
                anisotropy: anisotropy
            });
        },
        loadCubemap: async ({
            internalFormat,
            format,
            type,
            anisotropy
        }, ...imageBuffer) => {
            let width = null, height = null;
            for (const image of imageBuffer) {
                image.data = await __load(image.url);
                if (!width || !height) {
                    width = image.data.width;
                    height = image.data.height;
                }
            }
            if (!width || !height) {
                throw Exception("Couldn't determine width and/or height of one of the cubemap faces");
            }
            return Cubemap(gl, version, {
                width: width,
                height: height,
                internalFormat: tokenizeFormat(internalFormat),
                format: tokenizeFormat(format),
                type: tokenizeType(type),
                anisotropy: anisotropy
            }, ...imageBuffer);
        }
    });
};

//////////////////////////////////////////////////
const SpaceCamera = ({
    elemID,
    position,
    orientation,
    speed,
    orientationSpeed,
    rotationSpeed,
    fovy,
    minFovy,
    maxFovy,
    fovySmoothing,
    fovyDeltaSpeed,
    near,
    far,
    aspectRatio,
    movementSmoothing,
    orientationSmoothing,
    enableDebug
}) => {
    let isActive = false;

    const projectionMatrix = Transform.perspective(fovy, aspectRatio, near, far);
    const viewMatrix = Mat4();

    let targetFovy = fovy;

    const state = {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        moveUp: false,
        moveDown: false,
        rollLeft: false,
        rollRight: false,
        moveFaster: false
    };

    const bindings = {
        moveForward: "KeyW",
        moveBackward: "KeyS",
        moveLeft: "KeyA",
        moveRight: "KeyD",
        moveUp: "KeyQ",
        moveDown: "KeyE",
        rollLeft: "KeyZ",
        rollRight: "KeyC",
        moveFaster0: "ShiftLeft",
        moveFaster1: "ShiftRight"
    };

    document.addEventListener("keydown", e => {
        if (e.code === bindings.moveForward) {
            state.moveForward = true;
            state.moveBackward = false;
        }
        else if (e.code === bindings.moveBackward) {
            state.moveForward = false;
            state.moveBackward = true;
        }
        if (e.code === bindings.moveLeft) {
            state.moveLeft = true;
            state.moveRight = false;
        }
        else if (e.code === bindings.moveRight) {
            state.moveLeft = false;
            state.moveRight = true;
        }
        if (e.code === bindings.moveUp) {
            state.moveUp = true;
            state.moveDown = false;
        }
        else if (e.code === bindings.moveDown) {
            state.moveUp = false;
            state.moveDown = true;
        }
        if (e.code === bindings.rollLeft) {
            state.rollLeft = true;
            state.rollRight = false;
        }
        else if (e.code === bindings.rollRight) {
            state.rollLeft = false;
            state.rollRight = true;
        }
        if (e.code === bindings.moveFaster0 || e.code === bindings.moveFaster1) {
            state.moveFaster = true;
        }
    });

    document.addEventListener("keyup", e => {
        if (e.code === bindings.moveForward) {
            state.moveForward = false;
        }
        else if (e.code === bindings.moveBackward) {
            state.moveBackward = false;
        }
        if (e.code === bindings.moveLeft) {
            state.moveLeft = false;
        }
        else if (e.code === bindings.moveRight) {
            state.moveRight = false;
        }
        if (e.code === bindings.moveUp) {
            state.moveUp = false;
        }
        else if (e.code === bindings.moveDown) {
            state.moveDown = false;
        }
        if (e.code === bindings.rollLeft) {
            state.rollLeft = false;
        }
        else if (e.code === bindings.rollRight) {
            state.rollRight = false;
        }
        if (e.code === bindings.moveFaster0 || e.code === bindings.moveFaster1) {
            state.moveFaster = false;
        }
    });

    document.addEventListener("wheel", e => {
        if (isActive) {
            targetFovy += e.deltaY * fovyDeltaSpeed;
            if (targetFovy > maxFovy) {
                targetFovy = maxFovy;
            }
            else if (targetFovy < minFovy) {
                targetFovy = minFovy;
            }
        }
    });

    const nextOrientation = orientation.copy();
    document.addEventListener("mousemove", e => {
        if (isActive) {
            const deltaX = e.movementX;
            const deltaY = e.movementY;
            nextOrientation.clone(nextOrientation.rotateY(Common.toRadians(-deltaX * orientationSpeed))
                                                 .rotateX(Common.toRadians(-deltaY * orientationSpeed)));
        }
    });

    const elem = document.getElementById(elemID);
    if (!elem) {
        throw Exception(`${elemID} not found`);
    }
    elem.requestPointerLock = elem.requestPointerLock ||
                              elem.mozRequestPointerLock;
    elem.onclick = () => elem.requestPointerLock();
    const lockChangeListener = () => {
        if (document.pointerLockElement === elem ||
            document.mozPointerLockElement === elem) {
            isActive = true;
        }
        else {
            isActive = false;
        }
    };
    document.addEventListener("pointerlockchange", lockChangeListener);
    document.addEventListener("mozpointerlockchange", lockChangeListener);

    const nextPosition = position.copy();

    const debugElements = enableDebug ? Object.freeze({
        position: document.getElementById("hopper-camera-position"),
        direction: document.getElementById("hopper-camera-direction"),
        up: document.getElementById("hopper-camera-up"),
        orientation: document.getElementById("hopper-camera-orientation"),
        movementSpeed: document.getElementById("hopper-camera-movement-speed"),
        orientationSpeed: document.getElementById("hopper-camera-orientation-speed"),
        rotationSpeed: document.getElementById("hopper-camera-rotation-speed"),
        movementSmoothing: document.getElementById("hopper-camera-movement-smoothing"),
        orientationSmoothing: document.getElementById("hopper-camera-orientation-smoothing"),
        fovy: document.getElementById("hopper-camera-fovy"),
        near: document.getElementById("hopper-camera-near"),
        far: document.getElementById("hopper-camera-far"),
        aspect: document.getElementById("hopper-camera-aspect")
    }) : null;

    return Object.freeze({
        getElemID: () => elemID,
        getPosition: () => position,
        getOrientation: () => orientation,

        setPosition: v => position.clone(v),
        setOrientation: q => orientation.clone(q),

        getSpeed: () => speed,
        getOrientationSpeed: () => orientationSpeed,
        getRotationSpeed: () => rotationSpeed,
        getFovy: () => fovy,
        getMinFovy: () => minFovy,
        getMaxFovy: () => maxFovy,
        getFovySmoothing: () => fovySmoothing,
        getFovyDeltaSpeed: () => fovyDeltaSpeed,
        getNear: () => near,
        getFar: () => far,
        getAspectRatio: () => aspectRatio,

        getMovementSmoothing: () => movementSmoothing,
        getOrientationSmoothing: () => orientationSmoothing,

        setSpeed: s => speed = s,
        setOrientationSpeed: s => orientationSpeed = s,
        setRotationSpeed: s => rotationSpeed = s,
        setFovy: s => fovy = s,
        setMinFovy: s => minFovy = s,
        setMaxFovy: s => maxFovy = s,
        setFovySmoothing: s => fovySmoothing = s,
        setFovyDeltaSpeed: s => fovyDeltaSpeed = s,
        setNear: s => near = s,
        setFar: s => far = s,
        setAspectRatio: s => aspectRatio = s,

        setMovementSmoothing: s => movementSmoothing = s,
        setOrientationSmoothing: s => orientationSmoothing = s,

        getIsActive: () => isActive,

        update: dt => {
            const rotationMatrix = Transform.mat4FromQuat(orientation);
            const direction = rotationMatrix.mulVec3(Vec3(0.0, 0.0, -1.0));
            const up = rotationMatrix.mulVec3(Vec3(0.0, 1.0, 0.0));
            const newSpeed = state.moveFaster ? 2.0 * speed : speed;

            if (isActive) {
                if (state.moveForward) {
                    nextPosition.clone(nextPosition.add(direction.scale(newSpeed * dt)));
                }
                else if (state.moveBackward) {
                    nextPosition.clone(nextPosition.sub(direction.scale(newSpeed * dt)));
                }
                if (state.moveLeft) {
                    nextPosition.clone(nextPosition.sub(direction.cross(up).norm().scale(newSpeed * dt)));
                }
                else if (state.moveRight) {
                    nextPosition.clone(nextPosition.add(direction.cross(up).norm().scale(newSpeed * dt)));
                }
                if (state.moveUp) {
                    nextPosition.clone(nextPosition.add(up.scale(newSpeed * dt)));
                }
                else if (state.moveDown) {
                    nextPosition.clone(nextPosition.sub(up.scale(newSpeed * dt)));
                }
                if (state.rollLeft) {
                    nextOrientation.clone(nextOrientation.rotateZ(rotationSpeed));
                }
                else if (state.rollRight) {
                    nextOrientation.clone(nextOrientation.rotateZ(-rotationSpeed));
                }
            }

            position.clone(position.lerp(nextPosition, dt * movementSmoothing));
            orientation.clone(orientation.slerp(nextOrientation.norm(), dt * orientationSmoothing));

            fovy = fovy + dt * (targetFovy - fovy) * fovySmoothing;

            projectionMatrix.clone(Transform.perspective(fovy, aspectRatio, near, far));
            viewMatrix.clone(Transform.mat4FromQuat(orientation.inv()).mul(Transform.mat4FromTranslation(position.negate())));

            if (enableDebug) {
                debugElements.position.innerHTML = `Position: ${position.toString()}`;
                debugElements.direction.innerHTML = `Direction: ${direction.toString()}`;
                debugElements.up.innerHTML = `Up: ${up.toString()}`;
                debugElements.orientation.innerHTML = `Orientation: ${orientation.toString()}`;
                debugElements.movementSpeed.innerHTML = `Movement speed: ${speed.toFixed(2)}`;
                debugElements.orientationSpeed.innerHTML = `Orientation speed: ${orientationSpeed.toFixed(2)}`;
                debugElements.rotationSpeed.innerHTML = `Rotation speed: ${rotationSpeed.toFixed(2)}`;
                debugElements.movementSmoothing.innerHTML = `Movement smoothing: ${movementSmoothing.toFixed(2)}`;
                debugElements.orientationSmoothing.innerHTML = `Orientation smoothing: ${orientationSmoothing.toFixed(2)}`;
                debugElements.fovy.innerHTML = `Vertical field of view: ${Common.toDegrees(fovy).toFixed(2)}`;
                debugElements.near.innerHTML = `Near: ${near.toFixed(2)}`;
                debugElements.far.innerHTML = `Far: ${far.toFixed(2)}`;
                debugElements.aspect.innerHTML = `Aspect ratio: ${aspectRatio.toFixed(2)}`;
            }
        },

        getProjectionMatrix: () => projectionMatrix,
        getViewMatrix: () => viewMatrix
    });
};

//////////////////////////////////////////////////
const FPSCamera = ({
    elemID,
    position,
    target,
    up,
    speed,
    movementSmoothing,
    rotationSpeed,
    rotationSmoothing,
    fovy,
    minFovy,
    maxFovy,
    fovySmoothing,
    fovyDeltaSpeed,
    near,
    far,
    aspectRatio,
    enableDebug
}) => {
    let isActive = false;

    const projectionMatrix = Transform.perspective(fovy, aspectRatio, near, far);
    const viewMatrix = Mat4();

    let targetFovy = fovy;
    let yaw = -90.0, pitch = 0.0;
    let targetYaw = yaw, targetPitch = pitch;

    const state = {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        moveUp: false,
        moveDown: false,
        moveFaster: false
    };

    const bindings = {
        moveForward: "KeyW",
        moveBackward: "KeyS",
        moveLeft: "KeyA",
        moveRight: "KeyD",
        moveUp: "KeyQ",
        moveDown: "KeyE",
        moveFaster0: "ShiftLeft",
        moveFaster1: "ShiftRight"
    };

    document.addEventListener("keydown", e => {
        if (e.code === bindings.moveForward) {
            state.moveForward = true;
            state.moveBackward = false;
        }
        else if (e.code === bindings.moveBackward) {
            state.moveForward = false;
            state.moveBackward = true;
        }
        if (e.code === bindings.moveLeft) {
            state.moveLeft = true;
            state.moveRight = false;
        }
        else if (e.code === bindings.moveRight) {
            state.moveLeft = false;
            state.moveRight = true;
        }
        if (e.code === bindings.moveUp) {
            state.moveUp = true;
            state.moveDown = false;
        }
        else if (e.code === bindings.moveDown) {
            state.moveUp = false;
            state.moveDown = true;
        }
        if (e.code === bindings.moveFaster0 || e.code === bindings.moveFaster1) {
            state.moveFaster = true;
        }
    });

    document.addEventListener("keyup", e => {
        if (e.code === bindings.moveForward) {
            state.moveForward = false;
        }
        else if (e.code === bindings.moveBackward) {
            state.moveBackward = false;
        }
        if (e.code === bindings.moveLeft) {
            state.moveLeft = false;
        }
        else if (e.code === bindings.moveRight) {
            state.moveRight = false;
        }
        if (e.code === bindings.moveUp) {
            state.moveUp = false;
        }
        else if (e.code === bindings.moveDown) {
            state.moveDown = false;
        }
        if (e.code === bindings.moveFaster0 || e.code === bindings.moveFaster1) {
            state.moveFaster = false;
        }
    });

    document.addEventListener("wheel", e => {
        if (isActive) {
            targetFovy += e.deltaY * fovyDeltaSpeed;
            if (targetFovy > maxFovy) {
                targetFovy = maxFovy;
            }
            else if (targetFovy < minFovy) {
                targetFovy = minFovy;
            }
        }
    });

    document.addEventListener("mousemove", e => {
        if (isActive) {
            const deltaX = e.movementX;
            const deltaY = e.movementY;

            targetYaw += deltaX * rotationSpeed;
            targetPitch -= deltaY * rotationSpeed;

            if (targetPitch > 89.0) {
                targetPitch = 89.0;
            }
            else if (targetPitch < -89.0) {
                targetPitch = -89.0;
            }
        }
    });

    const elem = document.getElementById(elemID);
    if (!elem) {
        throw Exception(`${elemID} not found`);
    }
    elem.requestPointerLock = elem.requestPointerLock ||
                              elem.mozRequestPointerLock;
    elem.onclick = () => elem.requestPointerLock();
    const lockChangeListener = () => {
        if (document.pointerLockElement === elem ||
            document.mozPointerLockElement === elem) {
            isActive = true;
        }
        else {
            isActive = false;
        }
    };
    document.addEventListener("pointerlockchange", lockChangeListener);
    document.addEventListener("mozpointerlockchange", lockChangeListener);

    const nextPosition = position.copy();

    const debugElements = enableDebug ? Object.freeze({
        position: document.getElementById("hopper-camera-position"),
        direction: document.getElementById("hopper-camera-direction"),
        up: document.getElementById("hopper-camera-up"),
        movementSpeed: document.getElementById("hopper-camera-movement-speed"),
        rotationSpeed: document.getElementById("hopper-camera-rotation-speed"),
        movementSmoothing: document.getElementById("hopper-camera-movement-smoothing"),
        rotationSmoothing: document.getElementById("hopper-camera-rotation-smoothing"),
        fovy: document.getElementById("hopper-camera-fovy"),
        near: document.getElementById("hopper-camera-near"),
        far: document.getElementById("hopper-camera-far"),
        aspect: document.getElementById("hopper-camera-aspect")
    }) : null;

    return Object.freeze({
        getElemID: () => elemID,
        getPosition: () => position,
        getTarget: () => target,
        getUp: () => up,

        setPosition: v => position.clone(v),
        setTarget: v => target.clone(v),
        setUp: v => up.clone(v),

        getSpeed: () => speed,
        getMovementSmoothing: () => movementSmoothing,
        getRotationSpeed: () => rotationSpeed,
        getRotationSmoothing: () => rotationSmoothing,
        getFovy: () => fovy,
        getMinFovy: () => minFovy,
        getMaxFovy: () => maxFovy,
        getFovySmoothing: () => fovySmoothing,
        getFovyDeltaSpeed: () => fovyDeltaSpeed,
        getNear: () => near,
        getFar: () => far,
        getAspectRatio: () => aspectRatio,

        setSpeed: s => speed = s,
        setMovementSmoothing: s => movementSmoothing = s,
        setRotationSpeed: s => rotationSpeed = s,
        setRotationSmoothing: s => rotationSmoothing = s,
        setFovy: s => fovy = s,
        setMinFovy: s => minFovy = s,
        setMaxFovy: s => maxFovy = s,
        setFovySmoothing: s => fovySmoothing = s,
        setFovyDeltaSpeed: s => fovyDeltaSpeed = s,
        setNear: s => near = s,
        setFar: s => far = s,
        setAspectRatio: s => aspectRatio = s,

        getIsActive: () => isActive,

        update: dt => {
            const direction = Vec3(Math.cos(Common.toRadians(yaw)) * Math.cos(Common.toRadians(pitch)),
                                   Math.sin(Common.toRadians(pitch)),
                                   Math.sin(Common.toRadians(yaw)) * Math.cos(Common.toRadians(pitch))).norm();
            const newSpeed = state.moveFaster ? 2.0 * speed : speed;

            if (isActive) {
                if (state.moveForward) {
                    nextPosition.clone(nextPosition.add(direction.scale(newSpeed * dt)));
                }
                else if (state.moveBackward) {
                    nextPosition.clone(nextPosition.sub(direction.scale(newSpeed * dt)));
                }
                if (state.moveLeft) {
                    nextPosition.clone(nextPosition.sub(direction.cross(up).norm().scale(newSpeed * dt)));
                }
                else if (state.moveRight) {
                    nextPosition.clone(nextPosition.add(direction.cross(up).norm().scale(newSpeed * dt)));
                }
                if (state.moveUp) {
                    nextPosition.clone(nextPosition.add(up.scale(newSpeed * dt)));
                }
                else if (state.moveDown) {
                    nextPosition.clone(nextPosition.sub(up.scale(newSpeed * dt)));
                }
            }

            position.clone(position.lerp(nextPosition, dt * movementSmoothing));

            fovy = fovy + dt * (targetFovy - fovy) * fovySmoothing;
            yaw = yaw + dt * (targetYaw - yaw) * rotationSmoothing;
            pitch = pitch + dt * (targetPitch - pitch) * rotationSmoothing;

            projectionMatrix.clone(Transform.perspective(fovy, aspectRatio, near, far));
            viewMatrix.clone(Transform.lookAt(position, position.add(direction), up));

            if (enableDebug) {
                debugElements.position.innerHTML = `Position: ${position.toString()}`;
                debugElements.direction.innerHTML = `Direction: ${direction.toString()}`;
                debugElements.up.innerHTML = `Up: ${up.toString()}`;
                debugElements.movementSpeed.innerHTML = `Movement speed: ${speed.toFixed(2)}`;
                debugElements.rotationSpeed.innerHTML = `Rotation speed: ${rotationSpeed.toFixed(2)}`;
                debugElements.movementSmoothing.innerHTML = `Movement smoothing: ${movementSmoothing.toFixed(2)}`;
                debugElements.rotationSmoothing.innerHTML = `Rotation smoothing: ${rotationSmoothing.toFixed(2)}`;
                debugElements.fovy.innerHTML = `Vertical field of view: ${Common.toDegrees(fovy).toFixed(2)}`;
                debugElements.near.innerHTML = `Near: ${near.toFixed(2)}`;
                debugElements.far.innerHTML = `Far: ${far.toFixed(2)}`;
                debugElements.aspect.innerHTML = `Aspect ratio: ${aspectRatio.toFixed(2)}`;
            }
        },

        getProjectionMatrix: () => projectionMatrix,
        getViewMatrix: () => viewMatrix
    });
};

//////////////////////////////////////////////////
const OrbitalCamera = ({
    elemID,
    position,
    target,
    up,
    rotationSpeed,
    rotationSmoothing,
    distanceDeltaMultiplier,
    minDistanceMultiplier,
    maxDistanceMultiplier,
    distanceSmoothing,
    rollSpeed,
    fovy,
    near,
    far,
    aspectRatio,
    enableDebug
}) => {
    let isActive = false;

    const state = {
        rollLeft: false,
        rollRight: false
    };

    const bindings = {
        rollLeft: "KeyA",
        rollRight: "KeyD"
    };

    const projectionMatrix = Transform.perspective(fovy, aspectRatio, near, far);
    const viewMatrix = Mat4();

    const staticDirection = target.sub(position).norm();

    let distanceMultiplier = 1.0;
    let nextDistanceMultiplier = distanceMultiplier;
    document.addEventListener("wheel", e => {
        if (isActive) {
            nextDistanceMultiplier += e.deltaY * distanceDeltaMultiplier;
            if (nextDistanceMultiplier < minDistanceMultiplier) {
                nextDistanceMultiplier = minDistanceMultiplier;
            }
            else if (nextDistanceMultiplier > maxDistanceMultiplier) {
                nextDistanceMultiplier = maxDistanceMultiplier;
            }
        }
    });

    document.addEventListener("keydown", e => {
        if (e.code === bindings.rollLeft) {
            state.rollLeft = true;
            state.rollRight = false;
        }
        else if (e.code === bindings.rollRight) {
            state.rollLeft = false;
            state.rollRight = true;
        }
    });

    document.addEventListener("keyup", e => {
        if (e.code === bindings.rollLeft) {
            state.rollLeft = false;
        }
        else if (e.code === bindings.rollRight) {
            state.rollRight = false;
        }
    });

    const orientation = Quat();
    const nextOrientation = orientation.copy();
    document.addEventListener("mousemove", e => {
        if (isActive) {
            const deltaX = e.movementX;
            const deltaY = e.movementY;
            nextOrientation.clone(nextOrientation.rotateY(Common.toRadians(-deltaX * rotationSpeed))
                                                 .rotateX(Common.toRadians(-deltaY * rotationSpeed)));
        }
    });

    const elem = document.getElementById(elemID);
    if (!elem) {
        throw Exception(`${elemID} not found`);
    }
    elem.requestPointerLock = elem.requestPointerLock ||
                              elem.mozRequestPointerLock;
    elem.onclick = () => elem.requestPointerLock();
    const lockChangeListener = () => {
        if (document.pointerLockElement === elem ||
            document.mozPointerLockElement === elem) {
            isActive = true;
        }
        else {
            isActive = false;
        }
    };
    document.addEventListener("pointerlockchange", lockChangeListener);
    document.addEventListener("mozpointerlockchange", lockChangeListener);

    const debugElements = enableDebug ? Object.freeze({
        position: document.getElementById("hopper-camera-position"),
        direction: document.getElementById("hopper-camera-direction"),
        target: document.getElementById("hopper-camera-target"),
        up: document.getElementById("hopper-camera-up"),
        orientation: document.getElementById("hopper-camera-orientation"),
        rotationSpeed: document.getElementById("hopper-camera-rotation-speed"),
        rotationSmoothing: document.getElementById("hopper-camera-rotation-smoothing"),
        distanceDeltaMultiplier: document.getElementById("hopper-camera-distance-delta-multiplier"),
        distanceDeltaMultiplierMin: document.getElementById("hopper-camera-distance-delta-multiplier-min"),
        distanceDeltaMultiplierMax: document.getElementById("hopper-camera-distance-delta-multiplier-max"),
        distanceSmoothing: document.getElementById("hopper-camera-distance-smoothing"),
        rollSpeed: document.getElementById("hopper-camera-roll-speed"),
        fovy: document.getElementById("hopper-camera-fovy"),
        near: document.getElementById("hopper-camera-near"),
        far: document.getElementById("hopper-camera-far"),
        aspect: document.getElementById("hopper-camera-aspect")
    }) : null;

    return Object.freeze({
        getElemID: () => elemID,
        getPosition: () => position,
        getTarget: () => target,
        getUp: () => up,
        getRotationSpeed: () => rotationSpeed,
        getRotationSmoothing: () => rotationSmoothing,
        getDistanceDeltaMultiplier: () => distanceDeltaMultiplier,
        getDistanceSmoothing: () => distanceSmoothing,
        getRollSpeed: () => rollSpeed,
        getFovy: () => fovy,
        getNear: () => near,
        getFar: () => far,
        getAspectRatio: () => aspectRatio,

        getIsActive: () => isActive,

        setPosition: v => position.clone(v),
        setTarget: v => target.clone(v),
        setUp: v => up.clone(v),
        setRotationSpeed: s => rotationSpeed = s,
        setRotationSmoothing: s => rotationSmoothing = s,
        setDistanceDeltaMultiplier: s => distanceDeltaMultiplier = s,
        setDistanceSmoothing: s => distanceSmoothing = s,
        setRollSpeed: s => rollSpeed = s,
        setFovy: s => fovy = s,
        setNear: s => near = s,
        setFar: s => far = s,
        setAspectRatio: s => aspectRatio = s,

        update: dt => {
            const distance = target.sub(position).len();
            const rotationMatrix = Transform.mat4FromQuat(orientation);
            const newUp = rotationMatrix.mulVec3(up);
            const direction = rotationMatrix.mulVec3(staticDirection);
            const nextPosition = target.sub(direction.scale(distance));

            if (isActive) {
                if (state.rollLeft) {
                    nextOrientation.clone(nextOrientation.rotateZ(Common.toRadians(dt * rollSpeed)));
                }
                else if (state.rollRight) {
                    nextOrientation.clone(nextOrientation.rotateZ(Common.toRadians(-dt * rollSpeed)));
                }
            }

            projectionMatrix.clone(Transform.perspective(fovy, aspectRatio, near, far));
            viewMatrix.clone(Transform.lookAt(position.scale(distanceMultiplier), target, newUp));

            orientation.clone(orientation.slerp(nextOrientation.norm(), dt * rotationSmoothing));
            distanceMultiplier = distanceMultiplier + dt * (nextDistanceMultiplier - distanceMultiplier) * distanceSmoothing;
            position.clone(nextPosition);

            if (enableDebug) {
                debugElements.position.innerHTML = `Position: ${position.scale(distanceMultiplier).toString()}`;
                debugElements.direction.innerHTML = `Direction: ${direction.toString()}`;
                debugElements.target.innerHTML = `Target: ${target.toString()}`;
                debugElements.up.innerHTML = `Up: ${newUp.toString()}`;
                debugElements.orientation.innerHTML = `Orientation: ${orientation.toString()}`;
                debugElements.rotationSpeed.innerHTML = `Rotation speed: ${rotationSpeed.toFixed(2)}`;
                debugElements.rotationSmoothing.innerHTML = `Rotation smoothing: ${rotationSmoothing.toFixed(2)}`;
                debugElements.distanceDeltaMultiplier.innerHTML = `Distance delta multiplier: ${distanceDeltaMultiplier.toFixed(2)}`;
                debugElements.distanceDeltaMultiplierMin.innerHTML = `Minimum distance delta multiplier: ${minDistanceMultiplier.toFixed(2)}`;
                debugElements.distanceDeltaMultiplierMax.innerHTML = `Maximum distance delta multiplier: ${maxDistanceMultiplier.toFixed(2)}`;
                debugElements.distanceSmoothing.innerHTML = `Distance smoothing: ${distanceSmoothing.toFixed(2)}`;
                debugElements.rollSpeed.innerHTML = `Roll speed: ${rollSpeed.toFixed(2)}`;
                debugElements.fovy.innerHTML = `Vertical field of view: ${Common.toDegrees(fovy).toFixed(2)}`;
                debugElements.near.innerHTML = `Near: ${near.toFixed(2)}`;
                debugElements.far.innerHTML = `Far: ${far.toFixed(2)}`;
                debugElements.aspect.innerHTML = `Aspect ratio: ${aspectRatio.toFixed(2)}`;
            }
        },

        getProjectionMatrix: () => projectionMatrix,
        getViewMatrix: () => viewMatrix
    });
};

//////////////////////////////////////////////////
const DebugUI = ({
    refreshDelay,
    webglVersion,
    webglContext
}) => {
    document.getElementById("hopper-webgl-version").innerHTML = `WebGL version: ${webglVersion}`;
    document.getElementById("hopper-webgl-debug-mode").innerHTML = `Debug mode: on`;
    document.getElementById("hopper-webgl-antialias").innerHTML = `Antialiasing: ${webglContext.getContextAttributes().antialias}`;
    document.getElementById("hopper-webgl-stencil").innerHTML = `Stencil: ${webglContext.getContextAttributes().stencil}`;
    document.getElementById("hopper-webgl-power").innerHTML = `Power preference: ${webglContext.getContextAttributes().powerPreference}`;
    document.getElementById("hopper-webgl-extension-count").innerHTML = `Extension count: ${webglContext.getSupportedExtensions().length}`;
    document.getElementById("hopper-webgl-vao").innerHTML = (() => {
        if (webglVersion === 2) {
            return "VAO support: native";
        }
        else if (webglVersion === 1) {
            if (webglContext.getExtension("OES_vertex_array_object")) {
                return "VAO support: extension";
            }
            return "VAO support: none";
        }
    })();
    document.getElementById("hopper-webgl-index-uint").innerHTML = (() => {
        if (webglVersion == 2) {
            return "32-bit index support: native";
        }
        else if (webglContext.getExtension("OES_element_index_uint")) {
            return "32-bit index support: extension";
        }
        return "32-bit index support: none";
    })();
    document.getElementById("hopper-webgl-anisotropy").innerHTML = (() => {
        const ext = webglContext.getExtension("EXT_texture_filter_anisotropic") ||
                    webglContext.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
                    webglContext.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
        if (!ext) {
            return "Anisotropy support: false";
        }
        else {
            const maxAnisotropy = webglContext.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            document.getElementById("hopper-webgl-anisotropy-max").innerHTML = `Max anisotropy: ${maxAnisotropy}`;
            return "Anisotropy support: true";
        }
    })();
    document.getElementById("hopper-webgl-fragment-shader-precision").innerHTML = (() => {
        if (webglContext.getShaderPrecisionFormat(webglContext.FRAGMENT_SHADER, webglContext.HIGH_FLOAT).precision > 0) {
            return "Fragment float precision: highp";
        }
        else if (webglContext.getShaderPrecisionFormat(webglContext.FRAGMENT_SHADER, webglContext.MEDIUM_FLOAT).precision > 0) {
            return "Fragment float precision: mediump";
        }
        else if (webglContext.getShaderPrecisionFormat(webglContext.FRAGMENT_SHADER, webglContext.LOW_FLOAT).precision > 0) {
            return "Fragment float precision: lowp";
        }
        else {
            throw Exception("Couldn't retrieve fragment shader precision");
        }
    })();
    document.getElementById("hopper-webgl-vertex-shader-precision").innerHTML = (() => {
        if (webglContext.getShaderPrecisionFormat(webglContext.VERTEX_SHADER, webglContext.HIGH_FLOAT).precision > 0) {
            return "Vertex float precision: highp";
        }
        else if (webglContext.getShaderPrecisionFormat(webglContext.VERTEX_SHADER, webglContext.MEDIUM_FLOAT).precision > 0) {
            return "Vertex float precision: mediump";
        }
        else if (webglContext.getShaderPrecisionFormat(webglContext.VERTEX_SHADER, webglContext.LOW_FLOAT).precision > 0) {
            return "Vertex float precision: lowp";
        }
        else {
            throw Exception("Couldn't retrieve fragment shader precision");
        }
    })();
    document.getElementById("hopper-webgl-max-texture-size").innerHTML = (() => {
        const maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE);
        return `Max texture size: ${maxTextureSize}`;
    })();

    let frameCount = 0;

    const performanceRealMSElement = document.getElementById("hopper-performance-real-ms");
    const performanceEffectiveMSElement = document.getElementById("hopper-performance-effective-ms");

    let totalPerformanceRealMS = 0;
    let totalPerformanceEffectiveMS = 0;

    const performanceRealFPSElement = document.getElementById("hopper-performance-real-fps");
    const performanceEffectiveFPSElement = document.getElementById("hopper-performance-effective-fps");

    let lastTime = 0;
    return Object.freeze({
        update: ({
            performanceRealMS,
            performanceEffectiveMS
        }) => {
            ++frameCount;

            totalPerformanceRealMS += performanceRealMS;
            totalPerformanceEffectiveMS += performanceEffectiveMS;

            if (performance.now() - lastTime > refreshDelay) {
                performanceRealMSElement.innerHTML = `Real ms: ${(totalPerformanceRealMS / frameCount).toFixed(4)}`;
                performanceRealFPSElement.innerHTML = `Real fps: ${(1000.0 / (totalPerformanceRealMS / frameCount)).toFixed(0)}`;
                totalPerformanceRealMS = 0;

                performanceEffectiveMSElement.innerHTML = `Effective ms: ${(totalPerformanceEffectiveMS / frameCount).toFixed(4)}`;
                performanceEffectiveFPSElement.innerHTML = `Effective fps: ${(1000.0 / (totalPerformanceEffectiveMS / frameCount)).toFixed(0)}`;
                totalPerformanceEffectiveMS = 0;

                lastTime = performance.now();
                frameCount = 0;
            }
        }
    });
};

//////////////////////////////////////////////////
const Hopper = ({
    canvasID,
    forceWebGL1,
    enableDebug,
    debugRefreshDelay,
    antialias,
    stencil,
    failIfMajorPerformanceCaveat,
    powerPreference
}) => {
    const canvas = Canvas(canvasID);

    const gl_attributes = {
        antialias: antialias,
        stencil: stencil,
        failIfMajorPerformanceCaveat: failIfMajorPerformanceCaveat,
        powerPreference: powerPreference
    };

    const { gl, version } = (() => {
        if (forceWebGL1) {
            let __gl = canvas.getContext("webgl", gl_attributes) ||
                       canvas.getContext("experimental-webgl", gl_attributes);
            if (__gl) {
                return { gl: __gl, version: 1 };
            }
            throw Exception("webgl 1.0 is not supported");
        }
        let __gl = canvas.getContext("webgl2", gl_attributes);
        if (__gl) {
            return { gl: __gl, version: 2 };
        }
        __gl = canvas.getContext("webgl", gl_attributes) ||
               canvas.getContext("experimental-webgl", gl_attributes);
        if (__gl) {
            return { gl: __gl, version: 1 };
        }
        throw Exception("webgl 1.0 not supported");
    })();

    if (version === 2) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    }

    const debugUI = enableDebug ? DebugUI({
        refreshDelay: debugRefreshDelay,
        webglVersion: version,
        webglContext: gl
    }) : null;

    let lastTime = 0;

    const is32bitIndicesSupported = version === 2 ||
                                    !!gl.getExtension("OES_element_index_uint");

    const fogUBO = FogUBO(gl, version);
    const phongMaterialUBO = PhongMaterialUBO(gl, version);
    const dirLightUBO = DirLightUBO(gl, version);
    const pointLightUBO = PointLightUBO(gl, version);
    const spotLightUBO = SpotLightUBO(gl, version);

    gl.depthFunc(gl.LEQUAL);

    return Object.freeze({
        Common: Common,
        Vec2: Vec2,
        Vec3: Vec3,
        Vec4: Vec4,
        Quat: Quat,
        Mat2: Mat2,
        Mat3: Mat3,
        Mat4: Mat4,
        Transform: Transform,

        sleep_ms: ms => new Promise(resolve => setTimeout(resolve, ms)),
        sleep: s => new Promise(resolve => setTimeout(resolve, s * 1000)),

        turnOffLoadingScreen: () => document.getElementById("hopper-loading-screen").style.display = "none",

        bindFogUBO: () => fogUBO.bind(),
        unbindFogUBO: () => fogUBO.unbind(),
        getFog: () => fogUBO.get(),
        setFog: ({ color,
                   distance,
                   intensity,
                   power }) => fogUBO.set({ color: color,
                                            distance: distance,
                                            intensity: intensity,
                                            power: power }),

        bindPhongMaterialUBO: () => phongMaterialUBO.bind(),
        unbindPhongMaterialUBO: () => phongMaterialUBO.unbind(),
        getPhongMaterial: () => phongMaterialUBO.get(),
        setPhongMaterial: ({ ambient,
                             diffuse,
                             specular,
                             shininess }) => phongMaterialUBO.set({ ambient: ambient,
                                                                    diffuse: diffuse,
                                                                    specular: specular,
                                                                    shininess: shininess }),

        bindDirLightUBO: () => dirLightUBO.bind(),
        unbindDirLightUBO: () => dirLightUBO.unbind(),
        getDirLight: i => dirLightUBO.get(i),
        setDirLight: (i, { ambient,
                           diffuse,
                           specular,
                           direction,
                           intensity }) => dirLightUBO.set(i, { ambient: ambient,
                                                                diffuse: diffuse,
                                                                specular: specular,
                                                                direction: direction,
                                                                intensity: intensity }),

        bindPointLightUBO: () => pointLightUBO.bind(),
        unbindPointLightUBO: () => pointLightUBO.unbind(),
        getPointLight: i => pointLightUBO.get(i),
        setPointLight: (i, { diffuse,
                             specular,
                             position,
                             constant,
                             linear,
                             quadratic,
                             intensity }) => pointLightUBO.set(i, { diffuse: diffuse,
                                                                    specular: specular,
                                                                    position: position,
                                                                    constant: constant,
                                                                    linear: linear,
                                                                    quadratic: quadratic,
                                                                    intensity: intensity }),

        bindSpotLight: () => spotLightUBO.bind(),
        unbindSpotLight: () => spotLightUBO.unbind(),
        getSpotLight: i => spotLightUBO.get(i),
        setSpotLight: (i, { diffuse,
                            specular,
                            position,
                            direction,
                            constant,
                            linear,
                            quadratic,
                            intensity,
                            innerCutoff,
                            outerCutoff }) => spotLightUBO.set(i, { diffuse: diffuse,
                                                                    specular: specular,
                                                                    position: position,
                                                                    direction: direction,
                                                                    constant: constant,
                                                                    linear: linear,
                                                                    quadratic: quadratic,
                                                                    intensity: intensity,
                                                                    innerCutoff: innerCutoff,
                                                                    outerCutoff: outerCutoff }),

        dt: () => {
            const currentTime = performance.now();
            const deltaTime = lastTime ? currentTime - lastTime : 0;
            lastTime = currentTime;
            return deltaTime;
        },

        render: callback => {
            let realTimestamp = performance.now();
            const animate = () => {
                const effectiveTimestamp = performance.now();

                const currentTime = performance.now();
                const deltaTime = lastTime ? currentTime - lastTime : 0;
                lastTime = currentTime;

                callback(deltaTime);

                if (enableDebug) {
                    const error = gl.getError();
                    if (gl.NO_ERROR !== error) {
                        throw Exception(`WebGL Error: ${error}`);
                    }
                }

                const effectiveMS = performance.now() - effectiveTimestamp;
                const realMS = performance.now() - realTimestamp;
                if (enableDebug) {
                    debugUI.update({
                        performanceRealMS: realMS,
                        performanceEffectiveMS: effectiveMS
                    });
                }
                realTimestamp = performance.now();

                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        },

        clear: () => gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT),
        clearColor: color => gl.clearColor(color.getR(), color.getG(), color.getB(), color.getA()),

        enableDepth: () => gl.enable(gl.DEPTH_TEST),
        enableStencil: () => gl.enable(gl.STENCIL_TEST),
        enableCulling: () => gl.enable(gl.CULL_FACE),

        disableDepth: () => gl.disable(gl.DEPTH_TEST),
        disableStencil: () => gl.disable(gl.STENCIL_TEST),
        disableCulling: () => gl.disable(gl.CULL_FACE),

        setDepthMask: mask => gl.depthMask(mask),

        resize: callback => {
            canvas.resize(gl);
            if (callback) {
                callback(canvas.getWidth(), canvas.getHeight());
            }
        },
        getAspect: () => canvas.getAspect(),
        getWidth: () => canvas.getWidth(),
        getHeight: () => canvas.getHeight(),

        loadCubemap: async (name, root, textureLoader) => {
            switch (name) {
                case "clouds1":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/clouds1/clouds1_down.bmp`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/clouds1/clouds1_east.bmp`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/clouds1/clouds1_south.bmp`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/clouds1/clouds1_north.bmp`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/clouds1/clouds1_up.bmp`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/clouds1/clouds1_west.bmp`,
                        face: "negative_x"
                    });
                case "retro/Apocalypse":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse/vz_apocalypse_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse/vz_apocalypse_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse/vz_apocalypse_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse/vz_apocalypse_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse/vz_apocalypse_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse/vz_apocalypse_left.png`,
                        face: "negative_x"
                    });
                case "retro/Apocalypse Land":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Land/vz_apocalypse_land_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Land/vz_apocalypse_land_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Land/vz_apocalypse_land_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Land/vz_apocalypse_land_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Land/vz_apocalypse_land_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Land/vz_apocalypse_land_left.png`,
                        face: "negative_x"
                    });
                case "retro/Apocalypse Ocean":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Ocean/vz_apocalypse_ocean_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Ocean/vz_apocalypse_ocean_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Ocean/vz_apocalypse_ocean_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Ocean/vz_apocalypse_ocean_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Ocean/vz_apocalypse_ocean_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Apocalypse Ocean/vz_apocalypse_ocean_left.png`,
                        face: "negative_x"
                    });
                case "retro/Classic":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Classic/vz_classic_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Classic/vz_classic_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Classic/vz_classic_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Classic/vz_classic_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Classic/vz_classic_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Classic/vz_classic_left.png`,
                        face: "negative_x"
                    });
                case "retro/Classic Land":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Classic Land/vz_classic_land_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Classic Land/vz_classic_land_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Classic Land/vz_classic_land_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Classic Land/vz_classic_land_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Classic Land/vz_classic_land_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Classic Land/vz_classic_land_left.png`,
                        face: "negative_x"
                    });
                case "retro/Clear":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Clear/vz_clear_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Clear/vz_clear_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Clear/vz_clear_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Clear/vz_clear_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Clear/vz_clear_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Clear/vz_clear_left.png`,
                        face: "negative_x"
                    });
                case "retro/Clear Ocean":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Clear Ocean/vz_clear_ocean_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Clear Ocean/vz_clear_ocean_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Clear Ocean/vz_clear_ocean_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Clear Ocean/vz_clear_ocean_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Clear Ocean/vz_clear_ocean_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Clear Ocean/vz_clear_ocean_left.png`,
                        face: "negative_x"
                    });
                case "retro/Dawn":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Dawn/vz_dawn_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dawn/vz_dawn_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Dawn/vz_dawn_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dawn/vz_dawn_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dawn/vz_dawn_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dawn/vz_dawn_left.png`,
                        face: "negative_x"
                    });
                case "retro/Dusk":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Dusk/vz_dusk_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk/vz_dusk_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk/vz_dusk_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk/vz_dusk_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk/vz_dusk_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk/vz_dusk_left.png`,
                        face: "negative_x"
                    });
                case "retro/Dusk Land":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Land/vz_dusk_land_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Land/vz_dusk_land_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Land/vz_dusk_land_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Land/vz_dusk_land_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Land/vz_dusk_land_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Land/vz_dusk_land_left.png`,
                        face: "negative_x"
                    });
                case "retro/Dusk Ocean":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Ocean/vz_dusk_ocean_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Ocean/vz_dusk_ocean_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Ocean/vz_dusk_ocean_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Ocean/vz_dusk_ocean_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Ocean/vz_dusk_ocean_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Dusk Ocean/vz_dusk_ocean_left.png`,
                        face: "negative_x"
                    });
                case "retro/Empty Space":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Empty Space/vz_empty_space_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Empty Space/vz_empty_space_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Empty Space/vz_empty_space_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Empty Space/vz_empty_space_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Empty Space/vz_empty_space_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Empty Space/vz_empty_space_left.png`,
                        face: "negative_x"
                    });
                case "retro/Gray":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Gray/vz_gray_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Gray/vz_gray_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Gray/vz_gray_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Gray/vz_gray_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Gray/vz_gray_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Gray/vz_gray_left.png`,
                        face: "negative_x"
                    });
                case "retro/Moody":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Moody/vz_moody_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Moody/vz_moody_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Moody/vz_moody_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Moody/vz_moody_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Moody/vz_moody_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Moody/vz_moody_left.png`,
                        face: "negative_x"
                    });
                case "retro/Netherworld":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Netherworld/vz_netherworld_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Netherworld/vz_netherworld_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Netherworld/vz_netherworld_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Netherworld/vz_netherworld_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Netherworld/vz_netherworld_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Netherworld/vz_netherworld_left.png`,
                        face: "negative_x"
                    });
                case "retro/Sinister":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Sinister/vz_sinister_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister/vz_sinister_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister/vz_sinister_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister/vz_sinister_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister/vz_sinister_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister/vz_sinister_left.png`,
                        face: "negative_x"
                    });
                case "retro/Sinister Land":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Land/vz_sinister_land_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Land/vz_sinister_land_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Land/vz_sinister_land_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Land/vz_sinister_land_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Land/vz_sinister_land_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Land/vz_sinister_land_left.png`,
                        face: "negative_x"
                    });
                case "retro/Sinister Ocean":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Ocean/vz_sinister_ocean_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Ocean/vz_sinister_ocean_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Ocean/vz_sinister_ocean_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Ocean/vz_sinister_ocean_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Ocean/vz_sinister_ocean_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sinister Ocean/vz_sinister_ocean_left.png`,
                        face: "negative_x"
                    });
                case "retro/Sunshine":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Sunshine/vz_sunshine_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sunshine/vz_sunshine_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Sunshine/vz_sunshine_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sunshine/vz_sunshine_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Sunshine/vz_sunshine_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Sunshine/vz_sunshine_left.png`,
                        face: "negative_x"
                    });
                case "retro/Techno":
                    return await textureLoader.loadCubemap({
                        internalFormat: "rgb",
                        format: "rgb",
                        type: "uint8",
                    }, {
                        url: `${root}/skyboxes/retro/Techno/vz_techno_down.png`,
                        face: "negative_y"
                    }, {
                        url: `${root}/skyboxes/retro/Techno/vz_techno_right.png`,
                        face: "positive_x"
                    }, {
                        url: `${root}/skyboxes/retro/Techno/vz_techno_back.png`,
                        face: "negative_z"
                    }, {
                        url: `${root}/skyboxes/retro/Techno/vz_techno_front.png`,
                        face: "positive_z"
                    }, {
                        url: `${root}/skyboxes/retro/Techno/vz_techno_up.png`,
                        face: "positive_y"
                    }, {
                        url: `${root}/skyboxes/retro/Techno/vz_techno_left.png`,
                        face: "negative_x"
                    });
                default:
                    throw Exception(`${name} is not a recognized cubemap`);
            }
        },

        createBasicProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_BASIC_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_BASIC_SHADER_FRAG(gl, version)));

            return Object.freeze({
                getID: () => prog.getID(),
                use: () => prog.use(),
                halt: () => prog.halt(),
                delete: () => prog.delete(),
                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateModelView: m => prog.uniformMatrix4("uModelView", m)
            });
        },

        createBasicColorProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_BASIC_COLOR_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_BASIC_COLOR_SHADER_FRAG(gl, version)));
            if (version === 2) {
                prog.use();
                prog.setUniformBlockBinding(FOG_UBO_NAME, FOG_UBO_BINDING);
                prog.halt();
            }

            return Object.freeze({
                getID: () => prog.getID(),
                use: () => {
                    prog.use();

                    if (version === 1) {
                        const color = fogUBO.getColor();
                        const distance = fogUBO.getDistance();
                        const intensity = fogUBO.getIntensity();
                        const power = fogUBO.getPower();

                        prog.uniformVec4("uFogColor", color);
                        prog.uniform1f("uFogDistance", distance);
                        prog.uniform1f("uFogIntensity", intensity);
                        prog.uniform1f("uFogPower", power);
                    }
                },
                halt: () => prog.halt(),
                delete: () => prog.delete(),

                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateModelView: m => prog.uniformMatrix4("uModelView", m),
                updateColor: v => prog.uniform4f("uColor", v.getR(), v.getG(), v.getB(), v.getA()),
            });
        },

        createBasicTextureProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_BASIC_TEXTURE_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_BASIC_TEXTURE_SHADER_FRAG(gl, version)));

            prog.use();
            if (version === 2) {
                prog.setUniformBlockBinding(FOG_UBO_NAME, FOG_UBO_BINDING);
            }
            prog.uniform1i("uTexture", 0);
            prog.halt();

            return Object.freeze({
                getID: () => prog.getID(),
                use: () => {
                    prog.use();

                    if (version === 1) {
                        const color = fogUBO.getColor();
                        const distance = fogUBO.getDistance();
                        const intensity = fogUBO.getIntensity();
                        const power = fogUBO.getPower();

                        prog.uniformVec4("uFogColor", color);
                        prog.uniform1f("uFogDistance", distance);
                        prog.uniform1f("uFogIntensity", intensity);
                        prog.uniform1f("uFogPower", power);
                    }
                },
                halt: () => prog.halt(),
                delete: () => prog.delete(),

                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateModelView: m => prog.uniformMatrix4("uModelView", m),
                updateTexTransform: v => prog.uniform2f("uTexTransform", v.getX(), v.getY()),
                updateTexMultiplier: v => prog.uniform2f("uTexMultiplier", v.getX(), v.getY()),
                updateColor: v => prog.uniform4f("uColor", v.getR(), v.getG(), v.getB(), v.getA()),

                setTexture: t => {
                    t.active(0);
                    t.bind();
                }
            });
        },

        createDoubleTextureProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_DOUBLE_TEXTURE_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_DOUBLE_TEXTURE_SHADER_FRAG(gl, version)));

            prog.use();
            if (version === 2) {
                prog.setUniformBlockBinding(FOG_UBO_NAME, FOG_UBO_BINDING);
            }
            prog.uniform1i("uTexture0", 0);
            prog.uniform1i("uTexture1", 1);
            prog.halt();

            return Object.freeze({
                getID: () => prog.getID(),
                use: () => {
                    prog.use();

                    if (version === 1) {
                        const color = fogUBO.getColor();
                        const distance = fogUBO.getDistance();
                        const intensity = fogUBO.getIntensity();
                        const power = fogUBO.getPower();

                        prog.uniformVec4("uFogColor", color);
                        prog.uniform1f("uFogDistance", distance);
                        prog.uniform1f("uFogIntensity", intensity);
                        prog.uniform1f("uFogPower", power);
                    }
                },
                halt: () => prog.halt(),
                delete: () => prog.delete(),

                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateModelView: m => prog.uniformMatrix4("uModelView", m),
                updateTexTransform: (i, v) => prog.uniformVec2(`uTexTransform${i}`, v),
                updateTexMultiplier: (i, v) => prog.uniformVec2(`uTexMultiplier${i}`, v),
                updateColor: (i, v) => prog.uniformVec4(`uColor${i}`, v),
                updateMix: s => prog.uniform1f("uMix", s),

                setTextures: ({ texture0, texture1 }) => {
                    texture0.active(0);
                    texture0.bind();
                    texture1.active(1);
                    texture1.bind();
                }
            });
        },

        createPhongProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_PHONG_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_PHONG_SHADER_FRAG(gl, version)));
            if (version === 2) {
                prog.use();
                prog.setUniformBlockBinding(FOG_UBO_NAME, FOG_UBO_BINDING);
                prog.setUniformBlockBinding(DIR_LIGHT_UBO_NAME, DIR_LIGHT_UBO_BINDING);
                prog.setUniformBlockBinding(POINT_LIGHT_UBO_NAME, POINT_LIGHT_UBO_BINDING);
                prog.setUniformBlockBinding(SPOT_LIGHT_UBO_NAME, SPOT_LIGHT_UBO_BINDING);
                prog.setUniformBlockBinding(PHONG_MAT_UBO_NAME, PHONG_MAT_UBO_BINDING);
                prog.halt();
            }
            return Object.freeze({
                getID: () => prog.getID(),
                use: () => {
                    prog.use();

                    if (version === 1) {
                        {
                            const { color,
                                    distance,
                                    intensity,
                                    power } = fogUBO.get();
                            prog.uniformVec4("uFogColor", color);
                            prog.uniform1f("uFogDistance", distance);
                            prog.uniform1f("uFogIntensity", intensity);
                            prog.uniform1f("uFogPower", power);
                        }
                        {
                            const { ambient,
                                    diffuse,
                                    specular,
                                    shininess } = phongMaterialUBO.get();
                            prog.uniformVec3("uPhongMatAmbient", ambient);
                            prog.uniformVec3("uPhongMatDiffuse", diffuse);
                            prog.uniformVec3("uPhongMatSpecular", specular);
                            prog.uniform1f("uPhongMatShininess", shininess);
                        }
                        for (let i = 0; i < MAX_DIR_LIGHTS; ++i)
                        {
                            const { ambient,
                                    diffuse,
                                    specular,
                                    direction,
                                    intensity } = dirLightUBO.get(i);
                            prog.uniformVec3(`uDirLightAmbient[${i}]`, ambient);
                            prog.uniformVec3(`uDirLightDiffuse[${i}]`, diffuse);
                            prog.uniformVec3(`uDirLightSpecular[${i}]`, specular);
                            prog.uniformVec3(`uDirLightDir[${i}]`, direction);
                            prog.uniform1f(`uDirLightIntensity[${i}]`, intensity);
                        }
                        for (let i = 0; i < MAX_POINT_LIGHTS; ++i)
                        {
                            const { diffuse,
                                    specular,
                                    position,
                                    constant,
                                    linear,
                                    quadratic,
                                    intensity } = pointLightUBO.get(i);
                            prog.uniformVec3(`uPointLightDiffuse[${i}]`, diffuse);
                            prog.uniformVec3(`uPointLightSpecular[${i}]`, specular);
                            prog.uniformVec3(`uPointLightPos[${i}]`, position);
                            prog.uniform1f(`uPointLightConstant[${i}]`, constant);
                            prog.uniform1f(`uPointLightLinear[${i}]`, linear);
                            prog.uniform1f(`uPointLightQuadratic[${i}]`, quadratic);
                            prog.uniform1f(`uPointLightIntensity[${i}]`, intensity);
                        }
                        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i)
                        {
                            const { diffuse,
                                    specular,
                                    position,
                                    direction,
                                    constant,
                                    linear,
                                    quadratic,
                                    intensity,
                                    innerCutoff,
                                    outerCutoff } = spotLightUBO.get(i);
                            prog.uniformVec3(`uSpotLightDiffuse[${i}]`, diffuse);
                            prog.uniformVec3(`uSpotLightSpecular[${i}]`, specular);
                            prog.uniformVec3(`uSpotLightPos[${i}]`, position);
                            prog.uniformVec3(`uSpotLightDir[${i}]`, direction);
                            prog.uniform1f(`uSpotLightConstant[${i}]`, constant);
                            prog.uniform1f(`uSpotLightLinear[${i}]`, linear);
                            prog.uniform1f(`uSpotLightQuadratic[${i}]`, quadratic);
                            prog.uniform1f(`uSpotLightIntensity[${i}]`, intensity);
                            prog.uniform1f(`uSpotLightInnerCutoff[${i}]`, innerCutoff);
                            prog.uniform1f(`uSpotLightOuterCutoff[${i}]`, outerCutoff);
                        }
                    }
                },
                halt: () => prog.halt(),
                delete: () => prog.delete(),

                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateModelView: m => prog.uniformMatrix4("uModelView", m),
                updateNormal: m => prog.uniformMatrix3("uNorm", m)
            });
        },

        createPhongTextureProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_PHONG_TEXTURE_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_PHONG_TEXTURE_SHADER_FRAG(gl, version)));
            prog.use();
            if (version === 2) {
                prog.setUniformBlockBinding(FOG_UBO_NAME, FOG_UBO_BINDING);
                prog.setUniformBlockBinding(DIR_LIGHT_UBO_NAME, DIR_LIGHT_UBO_BINDING);
                prog.setUniformBlockBinding(POINT_LIGHT_UBO_NAME, POINT_LIGHT_UBO_BINDING);
                prog.setUniformBlockBinding(SPOT_LIGHT_UBO_NAME, SPOT_LIGHT_UBO_BINDING);
                prog.setUniformBlockBinding(PHONG_MAT_UBO_NAME, PHONG_MAT_UBO_BINDING);
            }
            prog.uniform1i("uAmbientTexture", 0);
            prog.uniform1i("uDiffuseTexture", 1);
            prog.uniform1i("uSpecularTexture", 2);
            prog.halt();
            return Object.freeze({
                getID: () => prog.getID(),
                use: () => {
                    prog.use();

                    if (version === 1) {
                        {
                            const { color,
                                    distance,
                                    intensity,
                                    power } = fogUBO.get();
                            prog.uniformVec4("uFogColor", color);
                            prog.uniform1f("uFogDistance", distance);
                            prog.uniform1f("uFogIntensity", intensity);
                            prog.uniform1f("uFogPower", power);
                        }
                        {
                            const { ambient,
                                    diffuse,
                                    specular,
                                    shininess } = phongMaterialUBO.get();
                            prog.uniformVec3("uPhongMatAmbient", ambient);
                            prog.uniformVec3("uPhongMatDiffuse", diffuse);
                            prog.uniformVec3("uPhongMatSpecular", specular);
                            prog.uniform1f("uPhongMatShininess", shininess);
                        }
                        for (let i = 0; i < MAX_DIR_LIGHTS; ++i)
                        {
                            const { ambient,
                                    diffuse,
                                    specular,
                                    direction,
                                    intensity } = dirLightUBO.get(i);
                            prog.uniformVec3(`uDirLightAmbient[${i}]`, ambient);
                            prog.uniformVec3(`uDirLightDiffuse[${i}]`, diffuse);
                            prog.uniformVec3(`uDirLightSpecular[${i}]`, specular);
                            prog.uniformVec3(`uDirLightDir[${i}]`, direction);
                            prog.uniform1f(`uDirLightIntensity[${i}]`, intensity);
                        }
                        for (let i = 0; i < MAX_POINT_LIGHTS; ++i)
                        {
                            const { diffuse,
                                    specular,
                                    position,
                                    constant,
                                    linear,
                                    quadratic,
                                    intensity } = pointLightUBO.get(i);
                            prog.uniformVec3(`uPointLightDiffuse[${i}]`, diffuse);
                            prog.uniformVec3(`uPointLightSpecular[${i}]`, specular);
                            prog.uniformVec3(`uPointLightPos[${i}]`, position);
                            prog.uniform1f(`uPointLightConstant[${i}]`, constant);
                            prog.uniform1f(`uPointLightLinear[${i}]`, linear);
                            prog.uniform1f(`uPointLightQuadratic[${i}]`, quadratic);
                            prog.uniform1f(`uPointLightIntensity[${i}]`, intensity);
                        }
                        for (let i = 0; i < MAX_SPOT_LIGHTS; ++i)
                        {
                            const { diffuse,
                                    specular,
                                    position,
                                    direction,
                                    constant,
                                    linear,
                                    quadratic,
                                    intensity,
                                    innerCutoff,
                                    outerCutoff } = spotLightUBO.get(i);
                            prog.uniformVec3(`uSpotLightDiffuse[${i}]`, diffuse);
                            prog.uniformVec3(`uSpotLightSpecular[${i}]`, specular);
                            prog.uniformVec3(`uSpotLightPos[${i}]`, position);
                            prog.uniformVec3(`uSpotLightDir[${i}]`, direction);
                            prog.uniform1f(`uSpotLightConstant[${i}]`, constant);
                            prog.uniform1f(`uSpotLightLinear[${i}]`, linear);
                            prog.uniform1f(`uSpotLightQuadratic[${i}]`, quadratic);
                            prog.uniform1f(`uSpotLightIntensity[${i}]`, intensity);
                            prog.uniform1f(`uSpotLightInnerCutoff[${i}]`, innerCutoff);
                            prog.uniform1f(`uSpotLightOuterCutoff[${i}]`, outerCutoff);
                        }
                    }
                },
                halt: () => prog.halt(),
                delete: () => prog.delete(),

                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateModelView: m => prog.uniformMatrix4("uModelView", m),
                updateNormal: m => prog.uniformMatrix3("uNorm", m),

                updateAmbientTexTransform: v => prog.uniformVec2("uAmbientTexTransform", v),
                updateAmbientTexMultiplier: v => prog.uniformVec2("uAmbientTexMultiplier", v),

                updateDiffuseTexTransform: v => prog.uniformVec2("uDiffuseTexTransform", v),
                updateDiffuseTexMultiplier: v => prog.uniformVec2("uDiffuseTexMultiplier", v),

                updateSpecularTexTransform: v => prog.uniformVec2("uSpecularTexTransform", v),
                updateSpecularTexMultiplier: v => prog.uniformVec2("uSpecularTexMultiplier", v),

                updateGamma: gamma => prog.uniform1f("uGamma", gamma),

                setAmbientTexture: t => {
                    t.active(0);
                    t.bind();
                },

                setDiffuseTexture: t => {
                    t.active(1);
                    t.bind();
                },

                setSpecularTexture: t => {
                    t.active(2);
                    t.bind();
                },

                setTextures: ({ ambient, diffuse, specular }) => {
                    ambient.active(0);
                    ambient.bind();
                    diffuse.active(1);
                    diffuse.bind();
                    specular.active(2);
                    specular.bind();
                }
            });
        },

        createCubemapProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_CUBEMAP_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_CUBEMAP_SHADER_FRAG(gl, version)));
            prog.use();
            prog.uniform1i("uCubemap", 0);
            prog.halt();
            if (version === 2) {
                return Object.freeze({
                    getID: () => prog.getID(),
                    use: () => prog.use(),
                    halt: () => prog.halt(),
                    delete: () => prog.delete(),
                    updateProjection: m => prog.uniformMatrix4("uProjection", m),
                    updateView: m => prog.uniformMatrix4("uView", m),
                    setCubemapTexture: cubemap => {
                        gl.activeTexture(gl.TEXTURE0);
                        cubemap.bind();
                    },
                    updateGamma: gamma => prog.uniform1f("uGamma", gamma),
                    draw: () => gl.drawArrays(gl.TRIANGLES, 0, 36)
                });
            }

            const vertices = new Float32Array([
                // front face
                -1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                 1.0,  1.0, -1.0,

                 1.0,  1.0, -1.0,
                -1.0,  1.0, -1.0,
                -1.0, -1.0, -1.0,

                // back face
                -1.0, -1.0, 1.0,
                -1.0,  1.0, 1.0,
                 1.0,  1.0, 1.0,

                 1.0,  1.0, 1.0,
                 1.0, -1.0, 1.0,
                -1.0, -1.0, 1.0,

                // left face
                -1.0, -1.0,  1.0,
                -1.0, -1.0, -1.0,
                -1.0,  1.0, -1.0,

                -1.0,  1.0, -1.0,
                -1.0,  1.0,  1.0,
                -1.0, -1.0,  1.0,

                // right face
                1.0, -1.0, -1.0,
                1.0, -1.0,  1.0,
                1.0,  1.0,  1.0,

                1.0,  1.0,  1.0,
                1.0,  1.0, -1.0,
                1.0, -1.0, -1.0,

                // top face
                -1.0, 1.0,  1.0,
                -1.0, 1.0, -1.0,
                 1.0, 1.0, -1.0,

                 1.0, 1.0, -1.0,
                 1.0, 1.0,  1.0,
                -1.0, 1.0,  1.0,

                // bottom face
                -1.0, -1.0,  1.0,
                 1.0, -1.0,  1.0,
                 1.0, -1.0, -1.0,

                 1.0, -1.0, -1.0,
                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0
            ]);

            const cubeMesh = Mesh(gl, vertices, null, version, prog, {
                name: SHADER_VERT_APOS_NAME,
                index: CUBEMAP_SHADER_VERT_APOS_LOC,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 0,
                offset: 0
            });

            return Object.freeze({
                getID: () => prog.getID(),
                use: () => prog.use(),
                halt: () => prog.halt(),
                delete: () => prog.delete(),
                updateProjection: m => prog.uniformMatrix4("uProjection", m),
                updateView: m => prog.uniformMatrix4("uView", m),
                setCubemapTexture: cubemap => {
                    gl.activeTexture(gl.TEXTURE0);
                    cubemap.bind();
                },
                updateGamma: gamma => prog.uniform1f("uGamma", gamma),
                draw: () => {
                    cubeMesh.bind();
                    cubeMesh.draw();
                    cubeMesh.unbind();
                }
            });
        },

        createPostProcessProgram: () => {
            const prog = Program(gl, Shader(gl, gl.VERTEX_SHADER, GEN_POSTPROCESS_SHADER_VERT(version)),
                                     Shader(gl, gl.FRAGMENT_SHADER, GEN_POSTPROCESS_SHADER_FRAG(gl, version)));
            prog.use();
            prog.uniform1i("uColor0", 0);
            prog.uniform1f("uGamma", 2.2);
            prog.halt();
            if (version === 2) {
                return Object.freeze({
                    getID: () => prog.getID(),
                    use: () => prog.use(),
                    halt: () => prog.halt(),
                    delete: () => prog.delete(),
                    setTexture: t => {
                        gl.activeTexture(gl.TEXTURE0);
                        t.bind();
                    },
                    draw: () => gl.drawArrays(gl.TRIANGLES, 0, 6)
                });
            }

            const vertices = new Float32Array([
                // positions            // texcoords
                -1.0, -1.0, 0.0,        0.0, 0.0,
                 1.0, -1.0, 0.0,        1.0, 0.0,
                 1.0,  1.0, 0.0,        1.0, 1.0,

                 1.0,  1.0, 0.0,        1.0, 1.0,
                -1.0,  1.0, 0.0,        0.0, 1.0,
                -1.0, -1.0, 0.0,        0.0, 0.0
            ]);

            const quadMesh = Mesh(gl, vertices, null, version, prog, {
                name: SHADER_VERT_APOS_NAME,
                index: POSTPROCESS_SHADER_VERT_APOS_LOC,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 5 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: POSTPROCESS_SHADER_VERT_ATEXCOORD_LOC,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 5 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            });

            return Object.freeze({
                getID: () => prog.getID(),
                use: () => prog.use(),
                halt: () => prog.halt(),
                delete: () => prog.delete(),
                setTexture: t => {
                    gl.activeTexture(gl.TEXTURE0);
                    t.bind();
                },
                draw: () => {
                    quadMesh.bind();
                    quadMesh.draw();
                    quadMesh.unbind();
                }
            });
        },

        createTextureLoader: () => TextureLoader(gl, version),

        createColoredTriangle: program => {
            const vertices = new Float32Array([
                -0.5, -0.5, 0.0,    1.0, 0.0, 0.0,
                 0.5, -0.5, 0.0,    0.0, 1.0, 0.0,
                 0.0,  0.5, 0.0,    0.0, 0.0, 1.0
            ]);
            const indices = is32bitIndicesSupported ? new Uint32Array([0, 1, 2])
                                                    : new Uint16Array([0, 1, 2]);

            return Mesh(gl, vertices, indices, version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 6 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ACOL_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normaliized: false,
                stride: 6 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            });
        },

        createColoredRectangle: program => {
            const vertices = new Float32Array([
                -0.5, -0.5, 0.0,        1.0, 0.0, 0.0,
                 0.5, -0.5, 0.0,        0.0, 1.0, 0.0,
                 0.5,  0.5, 0.0,        0.0, 0.0, 1.0,
                -0.5,  0.5, 0.0,        1.0, 0.0, 1.0
            ]);
            const indices = is32bitIndicesSupported ? new Uint32Array([0, 1, 2, 2, 3, 0])
                                                    : new Uint16Array([0, 1, 2, 2, 3, 0]);

            return Mesh(gl, vertices, indices, version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 6 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ACOL_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normaliized: false,
                stride: 6 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            });
        },

        createTriangle: program => {
            const vertices = new Float32Array([
                -0.5, -0.5, 0.0,        0.0, 0.0, 1.0,      0.0, 0.0,
                 0.5, -0.5, 0.0,        0.0, 0.0, 1.0,      1.0, 0.0,
                 0.0,  0.5, 0.0,        0.0, 0.0, 1.0,      0.5, 1.0
            ]);
            const indices = is32bitIndicesSupported ? new Uint32Array([0, 1, 2])
                                                    : new Uint16Array([0, 1, 2]);

            return Mesh(gl, vertices, indices, version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createRectangle: program => {
            const vertices = new Float32Array([
                -0.5, -0.5, 0.0,        0.0, 0.0, 1.0,      0.0, 0.0,
                 0.5, -0.5, 0.0,        0.0, 0.0, 1.0,      1.0, 0.0,
                 0.5,  0.5, 0.0,        0.0, 0.0, 1.0,      1.0, 1.0,
                -0.5,  0.5, 0.0,        0.0, 0.0, 1.0,      0.0, 1.0
            ]);
            const indices = is32bitIndicesSupported ? new Uint32Array([0, 1, 2, 2, 3, 0])
                                                    : new Uint16Array([0, 1, 2, 2, 3, 0]);

            return Mesh(gl, vertices, indices, version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createCircle: (program, radius, divisions) => {
            const vertices = [ 0.0, 0.0, 0.0,   0.0, 0.0, 1.0,  0.5, 0.5 ];
            const angle = 2.0 * Math.PI / divisions;
            for (let i = 0; i < divisions; ++i) {
                const px = radius * Math.cos(i * angle);
                const py = radius * Math.sin(i * angle);
                const pz = 0.0;

                const nx = 0.0;
                const ny = 0.0;
                const nz = 1.0;

                const tx = (px + radius / 2) / radius;
                const ty = (py + radius / 2) / radius;

                vertices.push(px, py, pz);
                vertices.push(nx, ny, nz);
                vertices.push(tx, ty);
            }
            const indices = [];
            for (let i = 0; i < divisions; ++i) {
                indices.push(0, i + 1, i + 2);
            }
            indices.push(0, divisions, 1);

            return Mesh(gl, new Float32Array(vertices), is32bitIndicesSupported ? new Uint32Array(indices)
                                                                                : new Uint16Array(indices), version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createCube: program => {
            const vertices = new Float32Array([
                // front face
                -0.5, -0.5, 0.5,    0.0, 0.0, 1.0,      0.0, 0.0,
                 0.5, -0.5, 0.5,    0.0, 0.0, 1.0,      1.0, 0.0,
                 0.5,  0.5, 0.5,    0.0, 0.0, 1.0,      1.0, 1.0,
                -0.5,  0.5, 0.5,    0.0, 0.0, 1.0,      0.0, 1.0,

                // back face
                 0.5, -0.5, -0.5,   0.0, 0.0, -1.0,     0.0, 0.0,
                -0.5, -0.5, -0.5,   0.0, 0.0, -1.0,     1.0, 0.0,
                -0.5,  0.5, -0.5,   0.0, 0.0, -1.0,     1.0, 1.0,
                 0.5,  0.5, -0.5,   0.0, 0.0, -1.0,     0.0, 1.0,

                // left face
                -0.5, -0.5, -0.5,  -1.0, 0.0,  0.0,     0.0, 0.0,
                -0.5, -0.5,  0.5,  -1.0, 0.0,  0.0,     1.0, 0.0,
                -0.5,  0.5,  0.5,  -1.0, 0.0,  0.0,     1.0, 1.0,
                -0.5,  0.5, -0.5,  -1.0, 0.0,  0.0,     0.0, 1.0,

                // right face
                0.5, -0.5,  0.5,    1.0, 0.0, 0.0,      0.0, 0.0,
                0.5, -0.5, -0.5,    1.0, 0.0, 0.0,      1.0, 0.0,
                0.5,  0.5, -0.5,    1.0, 0.0, 0.0,      1.0, 1.0,
                0.5,  0.5,  0.5,    1.0, 0.0, 0.0,      0.0, 1.0,

                // top face
                -0.5, 0.5,  0.5,    0.0, 1.0, 0.0,      0.0, 0.0,
                 0.5, 0.5,  0.5,    0.0, 1.0, 0.0,      1.0, 0.0,
                 0.5, 0.5, -0.5,    0.0, 1.0, 0.0,      1.0, 1.0,
                -0.5, 0.5, -0.5,    0.0, 1.0, 0.0,      0.0, 1.0,

                // bottom face
                -0.5, -0.5,  0.5,   0.0, -1.0, 0.0,     0.0, 0.0,
                 0.5, -0.5,  0.5,   0.0, -1.0, 0.0,     1.0, 0.0,
                 0.5, -0.5, -0.5,   0.0, -1.0, 0.0,     1.0, 1.0,
                -0.5, -0.5, -0.5,   0.0, -1.0, 0.0,     0.0, 1.0
            ]);
            const indices = is32bitIndicesSupported ? new Uint32Array([
                // front face
                0, 1, 2, 2, 3, 0,
                // back face
                4, 5, 6, 6, 7, 4,
                // left face
                8, 9, 10, 10, 11, 8,
                // right face
                12, 13, 14, 14, 15, 12,
                // top face
                16, 17, 18, 18, 19, 16,
                // bottom face
                20, 22, 21, 22, 20, 23
            ]) : new Uint16Array([
                // front face
                0, 1, 2, 2, 3, 0,
                // back face
                4, 5, 6, 6, 7, 4,
                // left face
                8, 9, 10, 10, 11, 8,
                // right face
                12, 13, 14, 14, 15, 12,
                // top face
                16, 17, 18, 18, 19, 16,
                // bottom face
                20, 22, 21, 22, 20, 23
            ]);

            return Mesh(gl, vertices, indices, version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createUVSphere: (program, radius, stackCount, sectorCount) => {
            const vertices = [], indices = [];

            const sectorStep = 2 * Math.PI / sectorCount;
            const stackStep = Math.PI / stackCount;
            const lengthInv = 1.0 / radius;

            for (let i = 0; i <= stackCount; ++i) {
                const stackAngle = Math.PI / 2 - i * stackStep;
                const xy = radius * Math.cos(stackAngle);
                const z = radius * Math.sin(stackAngle);

                for (let j = 0; j <= sectorCount; ++j) {
                    const sectorAngle = j * sectorStep;

                    const x = xy * Math.cos(sectorAngle);
                    const y = xy * Math.sin(sectorAngle);

                    const nx = x * lengthInv;
                    const ny = y * lengthInv;
                    const nz = z * lengthInv;

                    const s = j / sectorCount;
                    const t = i / stackCount;

                    vertices.push(x, y, z, nx, ny, nz, s, t);
                }
            }

            for (let i = 0; i < stackCount; ++i) {
                let k1 = i * (sectorCount + 1);
                let k2 = k1 + sectorCount + 1;

                for (let j = 0; j < sectorCount; ++j) {
                    if (i !== 0) {
                        indices.push(k1);
                        indices.push(k2);
                        indices.push(k1 + 1);
                    }
                    if (i !== (stackCount - 1)) {
                        indices.push(k1 + 1);
                        indices.push(k2);
                        indices.push(k2 + 1);
                    }

                    ++k1;
                    ++k2;
                }
            }

            return Mesh(gl, new Float32Array(vertices), is32bitIndicesSupported ? new Uint32Array(indices)
                                                                                : new Uint16Array(indices), version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createIcoSphere: (program, radius, subdivisions) => {
            const S_STEP = 186 / 2048;
            const T_STEP = 322 / 1024;

            const tmpVertices = (() => {
                const H_ANGLE = Math.PI / 180.0 * 72;
                const V_ANGLE = Math.atan(1 / 2);

                let hAngle1 = -Math.PI / 2 - H_ANGLE / 2;
                let hAngle2 = -Math.PI / 2;

                const vertices = new Float32Array(12 * 3);

                vertices[0] = 0.0;
                vertices[1] = 0.0;
                vertices[2] = radius;

                for (let i = 1; i <= 5; ++i) {
                    const i1 = i * 3;
                    const i2 = (i + 5) * 3;

                    const z = radius * Math.sin(V_ANGLE);
                    const xy = radius * Math.cos(V_ANGLE);

                    vertices[i1] = xy * Math.cos(hAngle1);
                    vertices[i2] = xy * Math.cos(hAngle2);

                    vertices[i1 + 1] = xy * Math.sin(hAngle1);
                    vertices[i2 + 1] = xy * Math.sin(hAngle2);

                    vertices[i1 + 2] = z;
                    vertices[i2 + 2] = -z;

                    hAngle1 += H_ANGLE;
                    hAngle2 += H_ANGLE;
                }

                vertices[33] = 0.0;
                vertices[34] = 0.0;
                vertices[35] = -radius;
                return vertices;
            })();

            const vertices = [];
            const indices = [];

            vertices.push(tmpVertices[0], tmpVertices[1], tmpVertices[2]);
            vertices.push(0, 0, 1);
            vertices.push(S_STEP, 0);

            vertices.push(tmpVertices[0], tmpVertices[1], tmpVertices[2]);
            vertices.push(0, 0, 1);
            vertices.push(S_STEP * 3, 0);

            vertices.push(tmpVertices[0], tmpVertices[1], tmpVertices[2]);
            vertices.push(0, 0, 1);
            vertices.push(S_STEP * 5, 0);

            vertices.push(tmpVertices[0], tmpVertices[1], tmpVertices[2]);
            vertices.push(0, 0, 1);
            vertices.push(S_STEP * 7, 0);

            vertices.push(tmpVertices[0], tmpVertices[1], tmpVertices[2]);
            vertices.push(0, 0, 1);
            vertices.push(S_STEP * 9, 0);

            vertices.push(tmpVertices[33], tmpVertices[34], tmpVertices[35]);
            vertices.push(0, 0, -1);
            vertices.push(S_STEP * 2, T_STEP * 3);

            vertices.push(tmpVertices[33], tmpVertices[34], tmpVertices[35]);
            vertices.push(0, 0, -1);
            vertices.push(S_STEP * 4, T_STEP * 3);

            vertices.push(tmpVertices[33], tmpVertices[34], tmpVertices[35]);
            vertices.push(0, 0, -1);
            vertices.push(S_STEP * 6, T_STEP * 3);

            vertices.push(tmpVertices[33], tmpVertices[34], tmpVertices[35]);
            vertices.push(0, 0, -1);
            vertices.push(S_STEP * 8, T_STEP * 3);

            vertices.push(tmpVertices[33], tmpVertices[34], tmpVertices[35]);
            vertices.push(0, 0, -1);
            vertices.push(S_STEP * 10, T_STEP * 3);

            let v = Vec3(tmpVertices[3], tmpVertices[4], tmpVertices[5]);
            let n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(0, T_STEP);

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 10, T_STEP);

            v = Vec3(tmpVertices[18], tmpVertices[19], tmpVertices[20]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP, T_STEP * 2);

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 11, T_STEP * 2);

            v = Vec3(tmpVertices[6], tmpVertices[7], tmpVertices[8]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 2, T_STEP);

            const sharedIndices = new Map();
            sharedIndices.set(Vec2(S_STEP * 2, T_STEP).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[9], tmpVertices[10], tmpVertices[11]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 4, T_STEP);

            sharedIndices.set(Vec2(S_STEP * 4, T_STEP).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[12], tmpVertices[13], tmpVertices[14]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 6, T_STEP);

            sharedIndices.set(Vec2(S_STEP * 6, T_STEP).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[15], tmpVertices[16], tmpVertices[17]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 8, T_STEP);

            sharedIndices.set(Vec2(S_STEP * 8, T_STEP).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[21], tmpVertices[22], tmpVertices[23]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 3, T_STEP * 2);

            sharedIndices.set(Vec2(S_STEP * 3, T_STEP * 2).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[24], tmpVertices[25], tmpVertices[26]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 5, T_STEP * 2);

            sharedIndices.set(Vec2(S_STEP * 5, T_STEP * 2).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[27], tmpVertices[28], tmpVertices[29]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 7, T_STEP * 2);

            sharedIndices.set(Vec2(S_STEP * 7, T_STEP * 2).toString(), vertices.length / 8 - 1);

            v = Vec3(tmpVertices[30], tmpVertices[31], tmpVertices[32]);
            n = v.norm();

            vertices.push(v.getX(), v.getY(), v.getZ());
            vertices.push(n.getX(), n.getY(), n.getZ());
            vertices.push(S_STEP * 9, T_STEP * 2);

            sharedIndices.set(Vec2(S_STEP * 9, T_STEP * 2).toString(), vertices.length / 8 - 1);

            indices.push(0, 10, 14);
            indices.push(1, 14, 15);
            indices.push(2, 15, 16);
            indices.push(3, 16, 17);
            indices.push(4, 17, 11);
            indices.push(10, 12, 14);
            indices.push(12, 18, 14);
            indices.push(14, 18, 15);
            indices.push(18, 19, 15);
            indices.push(15, 19, 16);
            indices.push(19, 20, 16);
            indices.push(16, 20, 17);
            indices.push(20, 21, 17);
            indices.push(17, 21, 11);
            indices.push(21, 13, 11);
            indices.push(5, 18, 12);
            indices.push(6, 19, 18);
            indices.push(7, 20, 19);
            indices.push(8, 21, 20);
            indices.push(9, 13, 21);

            const isOnlineSegment = (a, b, c) => {
                const cross = ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
                if (cross > EPSILON || cross < -EPSILON) {
                    return false;
                }
                if ((c[0] > a[0] && c[0] > b[0]) || (c[0] < a[0] && c[0] < b[0])) {
                    return false;
                }
                if ((c[1] > a[1] && c[1] > b[1]) || (c[1] < a[1] && c[1] < b[1])) {
                    return false;
                }
                return true;
            };

            const isSharedTexCoord = t => {
                const S = 1 / 11;
                const T = 1 / 3;
                const segments = [
                    S, 0,               0, T,
                    S, 0,               S * 2, T,
                    S * 3, 0,           S * 2, T,
                    S * 3, 0,           S * 4, T,
                    S * 5, 0,           S * 4, T,
                    S * 5, 0,           S * 6, T,
                    S * 7, 0,           S * 6, T,
                    S * 7, 0,           S * 8, T,
                    S * 9, 0,           S * 8, T,
                    S * 9, 0,           1, T * 2,
                    0, T,               S * 2, 1,
                    S * 3, T * 2,       S * 2, 1,
                    S * 3, T * 2,       S * 4, 1,
                    S * 5, T * 2,       S * 4, 1,
                    S * 5, T * 2,       S * 6, 1,
                    S * 7, T * 2,       S * 6, 1,
                    S * 7, T * 2,       S * 8, 1,
                    S * 9, T * 2,       S * 8, 1,
                    S * 9, T * 2,       S * 10, 1,
                    1, T * 2,           S * 10, 1
                ];
                for (let i = 0, j = 2; i < segments.length; i += 4, j += 4) {
                    if (isOnlineSegment([segments[i], segments[i + 1]], [segments[j], segments[j + 1]], [t.getX(), t.getY()])) {
                        return false;
                    }
                }
                return true;
            };

            const addSubVertexAttribs = (p, n, t) => {
                let index;
                if (isSharedTexCoord(t)) {
                    if (sharedIndices.has(t.toString())) {
                        index = sharedIndices.get(t.toString());
                    }
                    else {
                        vertices.push(p.getX(), p.getY(), p.getZ());
                        vertices.push(n.getX(), n.getY(), n.getZ());
                        vertices.push(t.getX(), t.getY());

                        index = vertices.length / 8 - 1;
                        sharedIndices.set(t.toString(), index);
                    }
                }
                else {
                    vertices.push(p.getX(), p.getY(), p.getZ());
                    vertices.push(n.getX(), n.getY(), n.getZ());
                    vertices.push(t.getX(), t.getY());

                    index = vertices.length / 8 - 1;
                }
                return index;
            };

            for (let i = 1; i < subdivisions; ++i) {
                const tmpIndices = [...indices];
                indices.length = 0;

                for (let j = 0; j < tmpIndices.length; j += 3) {
                    const i1 = tmpIndices[j];
                    const i2 = tmpIndices[j + 1];
                    const i3 = tmpIndices[j + 2];

                    const v1 = Vec3(vertices[i1 * 8], vertices[i1 * 8 + 1], vertices[i1 * 8 + 2]);
                    const v2 = Vec3(vertices[i2 * 8], vertices[i2 * 8 + 1], vertices[i2 * 8 + 2]);
                    const v3 = Vec3(vertices[i3 * 8], vertices[i3 * 8 + 1], vertices[i3 * 8 + 2]);

                    const t1 = Vec2(vertices[i1 * 8 + 6], vertices[i1 * 8 + 7]);
                    const t2 = Vec2(vertices[i2 * 8 + 6], vertices[i2 * 8 + 7]);
                    const t3 = Vec2(vertices[i3 * 8 + 6], vertices[i3 * 8 + 7]);

                    const newV1 = v1.add(v2).norm().scale(radius);
                    const newV2 = v2.add(v3).norm().scale(radius);
                    const newV3 = v1.add(v3).norm().scale(radius);

                    const newN1 = newV1.norm();
                    const newN2 = newV2.norm();
                    const newN3 = newV3.norm();

                    const newT1 = t1.add(t2).scale(0.5);
                    const newT2 = t2.add(t3).scale(0.5);
                    const newT3 = t1.add(t3).scale(0.5);

                    const newI1 = addSubVertexAttribs(newV1, newN1, newT1);
                    const newI2 = addSubVertexAttribs(newV2, newN2, newT2);
                    const newI3 = addSubVertexAttribs(newV3, newN3, newT3);

                    indices.push(i1, newI1, newI3);
                    indices.push(newI1, i2, newI2);
                    indices.push(newI1, newI2, newI3);
                    indices.push(newI3, newI2, i3);
                }
            }
            return Mesh(gl, new Float32Array(vertices), is32bitIndicesSupported ? new Uint32Array(indices)
                                                                                : new Uint16Array(indices), version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createCubeSphere: (program, radius, subdivisions) => {
            const vertexCountPerRow = Math.pow(2, subdivisions) + 1;

            const unitVertices = (() => {
                const buffer = [];
                for (let i = 0; i < vertexCountPerRow; ++i) {
                    const a2 = Common.toRadians(45.0 - 90.0 * i / (vertexCountPerRow - 1));
                    const n2 = Vec3(-Math.sin(a2), Math.cos(a2), 0.0);
                    for (let j = 0; j < vertexCountPerRow; ++j) {
                        const a1 = Common.toRadians(-45.0 + 90.0 * j / (vertexCountPerRow - 1));
                        const n1 = Vec3(-Math.sin(a1), 0, -Math.cos(a1));
                        const v = n1.cross(n2).norm();
                        buffer.push(v.getX(), v.getY(), v.getZ());
                    }
                }
                return buffer;
            })();

            const vertices = [];
            const indices = [];

            let k = 0;
            for (let i = 0; i < vertexCountPerRow; ++i) {
                let k1 = i * vertexCountPerRow;
                let k2 = k1 + vertexCountPerRow;
                const t = i / (vertexCountPerRow - 1);

                for (let j = 0; j < vertexCountPerRow; ++j) {
                    const x = unitVertices[k];
                    const y = unitVertices[k + 1];
                    const z = unitVertices[k + 2];
                    const s = j / (vertexCountPerRow - 1);

                    vertices.push(x * radius, y * radius, z * radius);
                    vertices.push(x, y, z);
                    vertices.push(s, t);

                    if (i < (vertexCountPerRow - 1) && j < (vertexCountPerRow - 1)) {
                        indices.push(k1, k2, k1 + 1);
                        indices.push(k1 + 1, k2, k2 + 1);
                    }

                    k += 3;
                    ++k1;
                    ++k2;
                }
            }

            const vertexSize = vertices.length;
            const indexSize = indices.length;

            let startIndex = vertices.length / 8;
            for (let i = 0; i < vertexSize; i += 8) {
                vertices.push(-vertices[i], vertices[i + 1], -vertices[i + 2]);
                vertices.push(-vertices[i + 3], vertices[i + 4], -vertices[i + 5]);
                vertices.push(vertices[i + 6], vertices[i + 7]);
            }
            for (let i = 0; i < indexSize; ++i) {
                indices.push(startIndex + indices[i]);
            }

            startIndex = vertices.length / 8;
            for (let i = 0; i < vertexSize; i += 8) {
                vertices.push(-vertices[i + 2], vertices[i], -vertices[i + 1]);
                vertices.push(-vertices[i + 5], vertices[i + 3], -vertices[i + 4]);
                vertices.push(vertices[i + 6], vertices[i + 7]);
            }
            for (let i = 0; i < indexSize; ++i) {
                indices.push(startIndex + indices[i]);
            }

            startIndex = vertices.length / 8;
            for (let i = 0; i < vertexSize; i += 8) {
                vertices.push(-vertices[i + 2], -vertices[i], vertices[i + 1]);
                vertices.push(-vertices[i + 5], -vertices[i + 3], vertices[i + 4]);
                vertices.push(vertices[i + 6], vertices[i + 7]);
            }
            for (let i = 0; i < indexSize; ++i) {
                indices.push(startIndex + indices[i]);
            }

            startIndex = vertices.length / 8;
            for (let i = 0; i < vertexSize; i += 8) {
                vertices.push(-vertices[i + 2], vertices[i + 1], vertices[i]);
                vertices.push(-vertices[i + 5], vertices[i + 4], vertices[i + 3]);
                vertices.push(vertices[i + 6], vertices[i + 7]);
            }
            for (let i = 0; i < indexSize; ++i) {
                indices.push(startIndex + indices[i]);
            }

            startIndex = vertices.length / 8;
            for (let i = 0; i < vertexSize; i += 8) {
                vertices.push(vertices[i + 2], vertices[i + 1], -vertices[i]);
                vertices.push(vertices[i + 5], vertices[i + 4], -vertices[i + 3]);
                vertices.push(vertices[i + 6], vertices[i + 7]);
            }
            for (let i = 0; i < indexSize; ++i) {
                indices.push(startIndex + indices[i]);
            }
            return Mesh(gl, new Float32Array(vertices), is32bitIndicesSupported ? new Uint32Array(indices)
                                                                                : new Uint16Array(indices), version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createPrism: (program, baseRadius, topRadius, height, sectors, stacks) => {
            const sideNormals = (() => {
                const sectorStep = 2.0 * Math.PI / sectors;
                const zAngle = Math.atan2(baseRadius - topRadius, height);
                const x0 = Math.cos(zAngle);
                const y0 = 0.0;
                const z0 = Math.sin(zAngle);

                const normals = [];
                for (let i = 0; i <= sectors; ++i) {
                    const sectorAngle = i * sectorStep;
                    normals.push(Math.cos(sectorAngle) * x0 - Math.sin(sectorAngle) * y0);
                    normals.push(Math.sin(sectorAngle) * x0 + Math.cos(sectorAngle) * y0);
                    normals.push(z0);
                }
                return normals;
            })();

            const unitCircleVertices = (() => {
                const sectorStep = 2.0 * Math.PI / sectors;
                const buffer = [];
                for (let i = 0; i <= sectors; ++i) {
                    const sectorAngle = i * sectorStep;
                    buffer.push(Math.cos(sectorAngle), Math.sin(sectorAngle), 0.0);
                }
                return buffer;
            })();

            const vertices = [];
            for (let i = 0; i <= stacks; ++i) {
                const z = -(height * 0.5) + i / stacks * height;
                const radius = baseRadius + i / stacks * (topRadius - baseRadius);
                const t = 1.0 - i / stacks;
                for (let j = 0, k = 0; j <= sectors; ++j, k += 3) {
                    const x = unitCircleVertices[k];
                    const y = unitCircleVertices[k + 1];
                    vertices.push(x * radius, y * radius, z);
                    vertices.push(sideNormals[k], sideNormals[k + 1], sideNormals[k + 2]);
                    vertices.push(j / sectors, t);
                }
            }

            const baseVertexIndex = vertices.length / 8;

            let z = -height * 0.5;
            vertices.push(0.0, 0.0, z);
            vertices.push(0.0, 0.0, -1.0);
            vertices.push(0.5, 0.5);
            for (let i = 0, j = 0; i < sectors; ++i, j += 3) {
                const x = unitCircleVertices[j];
                const y = unitCircleVertices[j + 1];
                vertices.push(x * baseRadius, y * baseRadius, z);
                vertices.push(0.0, 0.0, -1.0);
                vertices.push(-x * 0.5 + 0.5, -y * 0.5 + 0.5);
            }

            const topVertexIndex = vertices.length / 8;

            z = height * 0.5;
            vertices.push(0.0, 0.0, z);
            vertices.push(0.0, 0.0, 1.0);
            vertices.push(0.5, 0.5);
            for (let i = 0, j = 0; i < sectors; ++i, j += 3) {
                const x = unitCircleVertices[j];
                const y = unitCircleVertices[j + 1];
                vertices.push(x * topRadius, y * topRadius, z);
                vertices.push(0.0, 0.0, 1.0);
                vertices.push(x * 0.5 + 0.5, -y * 0.5 + 0.5);
            }

            const indices = [];
            for (let i = 0; i < stacks; ++i) {
                let k1 = i * (sectors + 1);
                let k2 = k1 + sectors + 1;
                for (let j = 0; j < sectors; ++j) {
                    indices.push(k1, k1 + 1, k2);
                    indices.push(k2, k1 + 1, k2 + 1);
                    ++k1;
                    ++k2;
                }
            }
            for (let i = 0, k = baseVertexIndex + 1; i < sectors; ++i, ++k) {
                if (i < (sectors - 1)) {
                    indices.push(baseVertexIndex, k + 1, k);
                }
                else {
                    indices.push(baseVertexIndex, baseVertexIndex + 1, k);
                }
            }
            for (let i = 0, k = topVertexIndex + 1; i < sectors; ++i, ++k) {
                if (i < (sectors - 1)) {
                    indices.push(topVertexIndex, k, k + 1);
                }
                else {
                    indices.push(topVertexIndex, k, topVertexIndex + 1);
                }
            }

            return Mesh(gl, new Float32Array(vertices), is32bitIndicesSupported ? new Uint32Array(indices)
                                                                                : new Uint16Array(indices), version, program, {
                name: SHADER_VERT_APOS_NAME,
                index: 0,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 0
            }, {
                name: SHADER_VERT_ANORM_NAME,
                index: 1,
                size: 3,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 3 * FLOAT32_SIZE
            }, {
                name: SHADER_VERT_ATEXCOORD_NAME,
                index: 2,
                size: 2,
                type: gl.FLOAT,
                normalized: false,
                stride: 8 * FLOAT32_SIZE,
                offset: 6 * FLOAT32_SIZE
            });
        },

        createSpaceCamera: conf => SpaceCamera(conf),
        createFPSCamera: conf => FPSCamera(conf),
        createOrbitalCamera: conf => OrbitalCamera(conf),

        createFramebuffer: () => Framebuffer(gl),
        createColorAttachment: (width, height) => FramebufferAttachment(gl, width, height, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE),
        createDepthStencilAttachmentAsTexture: (width, height) => FramebufferAttachment(gl, width, height, gl.DEPTH24_STENCIL8, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8),
        createDepthStencilAttachmentAsRenderbuffer: (width, height) => Renderbuffer(gl, width, height, version === 2 ? gl.DEPTH24_STENCIL8 : gl.DEPTH_STENCIL),
        createColorAttachmentAsRenderbufferMS: (width, height, samples) => RenderbufferMS(gl, width, height, gl.RGB8, samples),
        createDepthStencilAttachmentAsRenderbufferMS: (width, height, samples) => RenderbufferMS(gl, width, height, version === 2 ? gl.DEPTH24_STENCIL8 : gl.DEPTH_STENCIL, samples),

        blit: (width, height) => gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST)
    });
};

export { Hopper };
