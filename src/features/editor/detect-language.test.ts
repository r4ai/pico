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
  python: `from dataclasses import dataclass

@dataclass
class User:
    name: str
    active: bool = True

def greet(user: User) -> str:
    return f"Hello, {user.name}!"`,
  java: `package dev.pico;

import java.util.List;

public final class Greeter {
  public static String join(List<String> names) {
    return String.join(", ", names);
  }
}`,
  go: `package main

import "fmt"

func main() {
	values := []int{1, 2, 3}
	for _, value := range values {
		fmt.Println(value)
	}
}`,
  csharp: `using System;
using System.Collections.Generic;

namespace Pico.Demo;

public record User(string Name, bool Active);

public static class Greeter {
  public static string Greet(User user) => $"Hello, {user.Name}!";
}`,
  kotlin: `package dev.pico

data class User(val name: String, val active: Boolean = true)

fun greet(user: User): String = buildString {
    append("Hello, ")
    append(user.name)
}`,
  swift: `import Foundation

struct User: Codable {
    let name: String
    let isActive: Bool
}

func greet(_ user: User) -> String {
    return "Hello, (user.name)!"
}`,
  dart: `import 'dart:async';

class User {
  const User(this.name, {this.active = true});
  final String name;
  final bool active;
}

Future<String> greet(User user) async => 'Hello, \${user.name}!';`,
  scala: `package dev.pico

case class User(name: String, active: Boolean = true)

object Greeter {
  def greet(user: User): String = s"Hello, \${user.name}!"
}`,
  ruby: `class User
  attr_reader :name

  def initialize(name, active: true)
    @name = name
    @active = active
  end
end

def greet(user)
  "Hello, #{user.name}!"
end`,
  php: `<?php

declare(strict_types=1);

namespace Pico\\Demo;

final readonly class User {
    public function __construct(public string $name, public bool $active = true) {}
}

function greet(User $user): string {
    return "Hello, {$user->name}!";
}`,
  shellscript: `#!/usr/bin/env bash
set -euo pipefail

for file in "$@"; do
  if [[ -f "$file" ]]; then
    printf '%s\\n' "$file"
  fi
done`,
  powershell: `param(
  [Parameter(Mandatory = $true)]
  [string]$Path
)

Get-ChildItem -Path $Path -File |
  Where-Object { $_.Length -gt 1KB } |
  Select-Object Name, Length`,
  sql: `SELECT users.id, users.name, COUNT(orders.id) AS order_count
FROM users
LEFT JOIN orders ON orders.user_id = users.id
WHERE users.active = TRUE
GROUP BY users.id, users.name
ORDER BY order_count DESC;`,
  json: `{
  "name": "pico",
  "private": true,
  "scripts": {
    "build": "vp build",
    "test": "vp test --run"
  },
  "keywords": ["code", "image"]
}`,
  yaml: `services:
  web:
    image: example/pico:latest
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
    ports:
      - "8080:8080"`,
  html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Pico</title>
  </head>
  <body>
    <main><h1>Code, framed.</h1></main>
  </body>
</html>`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<catalog xmlns="https://example.com/catalog">
  <book id="pico">
    <title>Code, framed.</title>
    <available>true</available>
  </book>
</catalog>`,
  css: `:root {
  --accent: oklch(0.7 0.2 250);
}

.button:hover {
  display: inline-flex;
  align-items: center;
  background: var(--accent);
}`,
  lua: `local function greet(user)
  if user.active then
    return string.format("Hello, %s!", user.name)
  end
  return nil
end

for _, user in ipairs(users) do
  print(greet(user))
end`,
  r: `library(dplyr)

active_users <- users |>
  filter(active == TRUE) |>
  mutate(greeting = paste("Hello", name))

print(summary(active_users))`,
  elixir: `defmodule Pico.Greeter do
  def greet(%{name: name, active: true}) do
    name
    |> String.trim()
    |> then(&"Hello, #{&1}!")
  end

  def greet(_user), do: nil
end`,
} as const;

describe("detectLanguage", () => {
  it("covers the curated set of 30 detectable languages", () => {
    expect(Object.keys(SAMPLES)).toHaveLength(30);
  });

  it.each(Object.entries(SAMPLES))("recognises %s", async (expected, code) => {
    expect(await detectLanguage(code)).toBe(expected);
  });

  it.each([
    [
      "C# classes",
      "csharp",
      `using System;

public class Customer {
  public string Name { get; set; } = string.Empty;
}`,
    ],
    [
      "Kotlin singleton objects",
      "kotlin",
      `object Main {
  @JvmStatic
  fun main(args: Array<String>) {
    println("Hello")
  }
}`,
    ],
  ])("does not let signature markers steal %s", async (_name, expected, code) => {
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
