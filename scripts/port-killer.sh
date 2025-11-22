#!/usr/bin/env bash
# @name Port Killer
# @description Kill processes running on a specific port
# @param port:number:required The port number to kill
# @context terminal
# @category debugging

PORT=$1

if [ -z "$PORT" ]; then
  echo "Error: Port number is required"
  exit 1
fi

echo "Searching for processes on port $PORT..."

# Find the process ID using the port
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "No process found running on port $PORT"
  exit 0
fi

echo "Found process(es): $PID"
echo "Killing process(es)..."

kill -9 $PID

if [ $? -eq 0 ]; then
  echo "Successfully killed process(es) on port $PORT"
else
  echo "Failed to kill process(es)"
  exit 1
fi
