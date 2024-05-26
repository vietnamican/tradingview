#!/bin/bash

while true
do
  nohup ./run_once.sh &
  pid=$!
  wait $pid
  echo "Process exited with status $?. Restarting..."
done
