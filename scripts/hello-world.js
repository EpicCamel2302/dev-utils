#!/usr/bin/env bun
/**
 * @name Hello World
 * @description Simple test script that greets you
 * @param name:string:required Your name
 * @param excited:boolean:optional Add excitement to the greeting
 * @context terminal
 * @category testing
 */

const name = process.argv[2];
const excited = process.argv[3] === 'true';

if (!name) {
  console.error('Error: Name is required');
  process.exit(1);
}

const greeting = excited ? `Hello, ${name}!!!` : `Hello, ${name}`;

console.log(greeting);
console.log(`Script executed at: ${new Date().toLocaleString()}`);

// Simulate some async work
console.log('Processing...');
await new Promise(resolve => setTimeout(resolve, 1000));
console.log('Done!');
