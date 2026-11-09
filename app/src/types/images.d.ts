// Tells `tsc` about image imports (`import milk from "./img/milk.jpg"`) without needing next-env.d.ts, which Next
// writes during a build and which is gitignored. CI runs the typecheck before the build.
/// <reference types="next/image-types/global" />
