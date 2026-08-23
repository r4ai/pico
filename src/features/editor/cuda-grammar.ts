import type { LanguageRegistration } from "shiki/core";

/**
 * Shiki ships no CUDA grammar, so `cuda` is C++ — which CUDA is a superset of —
 * under its own scope name.
 */
const cudaBase: LanguageRegistration = {
  name: "cuda",
  scopeName: "source.cuda",
  displayName: "CUDA C++",
  aliases: ["cu"],
  patterns: [{ include: "source.cpp" }],
  repository: {},
};

/**
 * The CUDA-specific spellings, layered on as an injection.
 *
 * They have to be an injection rather than plain patterns on {@link cudaBase}:
 * top-level patterns stop applying as soon as C++ opens a nested context, and
 * almost every interesting token (`blockIdx`, `__shared__`) sits inside a
 * function body. `L:` gives these rules precedence over the C++ ones at the
 * same offset, and `-comment -string` keeps them out of prose and literals.
 */
const cudaInjection: LanguageRegistration = {
  name: "cuda-injection",
  scopeName: "cuda.injection",
  injectionSelector: "L:source.cuda -comment -string",
  injectTo: ["source.cuda"],
  patterns: [
    { include: "#kernel-launch" },
    { include: "#execution-space" },
    { include: "#builtin-variables" },
    { include: "#builtin-types" },
    { include: "#builtin-functions" },
  ],
  repository: {
    // __global__, __device__, __shared__ and friends.
    "execution-space": {
      name: "storage.modifier.cuda",
      match:
        "\\b__(?:global|device|host|shared|constant|managed|restrict|forceinline|noinline|launch_bounds|grid_constant)__",
    },
    // kernel<<<grid, block, shmem, stream>>>(args)
    "kernel-launch": {
      begin: "<<<",
      end: ">>>",
      beginCaptures: { 0: { name: "keyword.operator.kernel-launch.cuda" } },
      endCaptures: { 0: { name: "keyword.operator.kernel-launch.cuda" } },
      patterns: [{ include: "source.cpp" }],
    },
    "builtin-variables": {
      name: "variable.language.cuda",
      match: "\\b(?:threadIdx|blockIdx|blockDim|gridDim|warpSize)\\b",
    },
    "builtin-types": {
      name: "support.type.cuda",
      match:
        "\\b(?:dim3|(?:char|uchar|short|ushort|int|uint|long|ulong|longlong|ulonglong|float|double)[1-4])\\b",
    },
    "builtin-functions": {
      name: "support.function.cuda",
      match:
        "\\b(?:__syncthreads|__syncwarp|__activemask|__threadfence(?:_block|_system)?|__(?:all|any|ballot)_sync|__shfl(?:_up|_down|_xor)?_sync|__ldg|atomic(?:Add|Sub|Exch|Min|Max|And|Or|Xor|CAS)|cuda(?:Malloc|MallocManaged|Free|Memcpy|MemcpyAsync|Memset|DeviceSynchronize|StreamSynchronize|StreamCreate|StreamDestroy|GetLastError|GetErrorString))\\b",
    },
  },
};

/** Registrations that together highlight CUDA. Requires `cpp` in the same highlighter. */
export const cudaGrammars: LanguageRegistration[] = [cudaBase, cudaInjection];
