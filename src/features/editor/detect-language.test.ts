import { detectLanguage } from "@/features/editor/detect-language";
import { describe, expect, it } from "vite-plus/test";

const SAMPLES = {
  tsx: `import { useState } from "react";

export function Counter({ start }: { start: number }) {
  const [count, setCount] = useState<number>(start);
  return (
    <button className="counter" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}`,
  ts: `export interface User {
  id: string;
  name: string;
}

export function findUser(users: User[], id: string): User | undefined {
  return users.find((user) => user.id === id);
}`,
  jsx: `import { useState } from "react";

export function Counter({ start }) {
  const [count, setCount] = useState(start);
  return (
    <button className="counter" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}`,
  js: `const users = [];

export function addUser(name) {
  const user = { id: crypto.randomUUID(), name };
  users.push(user);
  return user;
}`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
  int *values = malloc(sizeof(int) * 10);
  for (int i = 0; i < 10; i++) {
    values[i] = i * i;
    printf("%d\\n", values[i]);
  }
  free(values);
  return 0;
}`,
  cpp: `#include <memory>
#include <vector>

template <typename T>
class Stack {
 public:
  void push(const T &value) { items_.push_back(value); }
  T pop() {
    T value = items_.back();
    items_.pop_back();
    return value;
  }

 private:
  std::vector<T> items_;
};`,
  cuda: `__global__ void saxpy(int n, float a, const float *x, float *y) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) {
    y[i] = a * x[i] + y[i];
  }
}

void run(int n, float *d_x, float *d_y) {
  saxpy<<<(n + 255) / 256, 256>>>(n, 2.0f, d_x, d_y);
  cudaDeviceSynchronize();
}`,
  rust: `use std::collections::HashMap;

pub fn word_counts(text: &str) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
}`,
  llvm: `define i32 @factorial(i32 %n) {
entry:
  %cmp = icmp sle i32 %n, 1
  br i1 %cmp, label %base, label %recurse

base:
  ret i32 1

recurse:
  %sub = sub nsw i32 %n, 1
  %call = call i32 @factorial(i32 %sub)
  %mul = mul nsw i32 %n, %call
  ret i32 %mul
}`,
} as const;

describe("detectLanguage", () => {
  it.each(Object.entries(SAMPLES))("recognises %s", async (expected, code) => {
    expect(await detectLanguage(code)).toBe(expected);
  });

  it.each([
    [
      "a bare kernel, which highlight.js scores as LLVM IR",
      `__global__ void saxpy(int n, float a, const float *x, float *y) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i] + y[i];
}`,
    ],
    [
      "a launch with no qualifier in sight",
      `void run(int n, float *d_x, float *d_y) {
  saxpy<<<(n + 255) / 256, 256>>>(n, 2.0f, d_x, d_y);
}`,
    ],
  ])("recognises CUDA from %s", async (_name, code) => {
    expect(await detectLanguage(code)).toBe("cuda");
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   \n\n  "],
    ["a single short word", "hello"],
    ["prose", "The quick brown fox."],
  ])("declines to guess from %s", async (_name, code) => {
    expect(await detectLanguage(code)).toBeUndefined();
  });
});
